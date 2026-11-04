
const express = require("express");
const {
  getDeviceAuthHelpers,
  MAX_OTP_ATTEMPTS,
  RESEND_COOLDOWN_SECONDS,
  DEVICE_VALIDITY_DAYS
} = require("./deviceAuth");

const { sendOtpEmail } = require("./emailService");

function deviceAuthRoutes(pool, jwt, cookieOptions, authenticateToken) {
  const router = express.Router();
  const helpers = getDeviceAuthHelpers(pool);

  const setup = helpers.createDeviceTables(pool);

  const challengeCookieOptions = {
    ...cookieOptions,
    maxAge: 5 * 60 * 1000
  };

  router.post("/verify-otp", async (req, res) => {
    try {
      await setup;

      const { otp } = req.body;
      const challenge = req.cookies.spendwise_login_challenge;

      if (
        typeof otp !== "string" ||
        !/^\d{6}$/.test(otp) ||
        !challenge
      ) {
        return res.status(400).json({
          message: "Enter your six-digit verification code."
        });
      }

      const challengeHash = helpers.hashToken(challenge);

      const [rows] = await pool.execute(
        `SELECT id, user_id, otp_hash, attempts
         FROM login_otps
         WHERE challenge_hash = ?
         AND expires_at > NOW()`,
        [challengeHash]
      );

      if (rows.length === 0) {
        res.clearCookie("spendwise_login_challenge", cookieOptions);

        return res.status(400).json({
          message: "Your verification code has expired. Please log in again."
        });
      }

      const record = rows[0];

      if (record.attempts >= MAX_OTP_ATTEMPTS) {
        await pool.execute(
          "DELETE FROM login_otps WHERE id = ?",
          [record.id]
        );

        res.clearCookie("spendwise_login_challenge", cookieOptions);

        return res.status(429).json({
          message: "Too many incorrect attempts. Please log in again."
        });
      }

      const expectedHash = helpers.hashOtp(
        record.user_id,
        challenge,
        otp,
        process.env.JWT_SECRET
      );

      if (!helpers.safeCompare(record.otp_hash, expectedHash)) {
        await pool.execute(
          "UPDATE login_otps SET attempts = attempts + 1 WHERE id = ?",
          [record.id]
        );

        return res.status(401).json({
          message: "Incorrect verification code."
        });
      }

      const [users] = await pool.execute(
        "SELECT id, name, email FROM users WHERE id = ?",
        [record.user_id]
      );

      if (users.length === 0) {
        await pool.execute(
          "DELETE FROM login_otps WHERE id = ?",
          [record.id]
        );

        return res.status(401).json({
          message: "User account not found."
        });
      }

      const user = users[0];
      const deviceToken = helpers.generateSecureToken();

      await helpers.saveTrustedDevice(
        user.id,
        deviceToken,
        req.get("user-agent") || "Unknown device"
      );

      const sessionToken = jwt.sign(
        {
          userId: user.id,
          email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      await pool.execute(
        "DELETE FROM login_otps WHERE id = ?",
        [record.id]
      );

      res.clearCookie("spendwise_login_challenge", cookieOptions);

      res.cookie("spendwise_device", deviceToken, {
        ...cookieOptions,
        maxAge: DEVICE_VALIDITY_DAYS * 24 * 60 * 60 * 1000
      });

      res.cookie("spendwise_token", sessionToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 1000
      });

      res.json({
        message: "Device verified. Login successful!",
        user
      });
    } catch (error) {
      console.error("OTP verification error:", error.message);

      res.status(500).json({
        message: "Unable to verify your code. Please try again."
      });
    }
  });

  router.post("/resend-otp", async (req, res) => {
    try {
      await setup;

      const challenge = req.cookies.spendwise_login_challenge;

      if (!challenge) {
        return res.status(400).json({
          message: "Please log in again to request a new code."
        });
      }

      const challengeHash = helpers.hashToken(challenge);

      const [rows] = await pool.execute(
        `SELECT id, user_id, attempts,
         TIMESTAMPDIFF(SECOND, last_sent_at, NOW()) AS seconds_since_sent
         FROM login_otps
         WHERE challenge_hash = ?
         AND expires_at > NOW()`,
        [challengeHash]
      );

      if (rows.length === 0) {
        return res.status(400).json({
          message: "Your verification session has expired. Please log in again."
        });
      }

      const record = rows[0];

      if (record.attempts >= MAX_OTP_ATTEMPTS) {
        return res.status(429).json({
          message: "Too many incorrect attempts. Please log in again."
        });
      }

      const secondsPassed = Number(record.seconds_since_sent);

      if (secondsPassed < RESEND_COOLDOWN_SECONDS) {
        return res.status(429).json({
          message: `Please wait ${RESEND_COOLDOWN_SECONDS - secondsPassed} seconds before requesting another code.`
        });
      }

      const [users] = await pool.execute(
        "SELECT email FROM users WHERE id = ?",
        [record.user_id]
      );

      if (users.length === 0) {
        return res.status(400).json({
          message: "User account not found."
        });
      }

      const otp = helpers.generateOtp();
      const otpHash = helpers.hashOtp(
        record.user_id,
        challenge,
        otp,
        process.env.JWT_SECRET
      );

      await pool.execute(
        `UPDATE login_otps
         SET otp_hash = ?,
         attempts = 0,
         expires_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE),
         last_sent_at = NOW()
         WHERE id = ?`,
        [otpHash, record.id]
      );

      try {
        await sendOtpEmail(users[0].email, otp);
      } catch (emailError) {
        await pool.execute(
          "DELETE FROM login_otps WHERE id = ?",
          [record.id]
        );

        res.clearCookie("spendwise_login_challenge", cookieOptions);

        console.error("Resend email error:", emailError.message);

        return res.status(503).json({
          message: "Unable to send a new code. Please log in again."
        });
      }

      res.json({
        message: "A new verification code has been sent."
      });
    } catch (error) {
      console.error("Resend OTP error:", error.message);

      res.status(500).json({
        message: "Unable to resend the verification code."
      });
    }
  });

  router.get("/devices", authenticateToken, async (req, res) => {
    try {
      await setup;

      const [devices] = await pool.execute(
        `SELECT id, device_name, created_at, last_used_at, expires_at
         FROM trusted_devices
         WHERE user_id = ?
         AND revoked_at IS NULL
         AND expires_at > NOW()
         ORDER BY last_used_at DESC`,
        [req.user.userId]
      );

      res.json({ devices });
    } catch (error) {
      console.error("Load devices error:", error.message);

      res.status(500).json({
        message: "Unable to load trusted devices."
      });
    }
  });

  router.delete("/devices/:id", authenticateToken, async (req, res) => {
    try {
      await setup;

      const deviceId = Number(req.params.id);

      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        return res.status(400).json({
          message: "Invalid device ID."
        });
      }

      const [result] = await pool.execute(
        `UPDATE trusted_devices
         SET revoked_at = NOW()
         WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
        [deviceId, req.user.userId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Trusted device not found."
        });
      }

      res.json({
        message: "Trusted device removed successfully."
      });
    } catch (error) {
      console.error("Remove device error:", error.message);

      res.status(500).json({
        message: "Unable to remove trusted device."
      });
    }
  });

  return router;
}

module.exports = deviceAuthRoutes;
