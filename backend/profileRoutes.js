
const express = require("express");
const crypto = require("crypto");

function profileRoutes(pool, authenticateToken, sendEmailChangeOtp) {
  const router = express.Router();

  const generateOtp = () =>
    crypto.randomInt(100000, 1000000).toString();

  const hashOtp = (userId, email, otp) =>
    crypto
      .createHmac("sha256", process.env.JWT_SECRET)
      .update(`${userId}:${email}:${otp}`)
      .digest("hex");

  function safeCompare(first, second) {
    const a = Buffer.from(first, "hex");
    const b = Buffer.from(second, "hex");

    return a.length === b.length &&
      crypto.timingSafeEqual(a, b);
  }

  async function createEmailVerificationTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_change_otps (
        user_id INT PRIMARY KEY,
        new_email VARCHAR(255) NOT NULL,
        otp_hash CHAR(64) NOT NULL,
        attempts INT DEFAULT 0,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // Get account details
  router.get("/", authenticateToken, async (req, res) => {
    try {
      const [users] = await pool.execute(
        "SELECT id, name, email FROM users WHERE id = ?",
        [req.user.userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          message: "Account not found."
        });
      }

      res.json({ user: users[0] });
    } catch (error) {
      console.error("Get profile error:", error.message);
      res.status(500).json({
        message: "Unable to load account details."
      });
    }
  });

  // Update account name
  router.patch("/name", authenticateToken, async (req, res) => {
    try {
      const { name } = req.body;

      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Please enter your name."
        });
      }

      const cleanName = name.trim();

      if (cleanName.length > 100) {
        return res.status(400).json({
          message: "Name must be 100 characters or fewer."
        });
      }

      await pool.execute(
        "UPDATE users SET name = ? WHERE id = ?",
        [cleanName, req.user.userId]
      );

      res.json({
        message: "Your name has been updated.",
        name: cleanName
      });
    } catch (error) {
      console.error("Update name error:", error.message);
      res.status(500).json({
        message: "Unable to update your name."
      });
    }
  });

  // Request email change verification
  router.post("/email/request", authenticateToken, async (req, res) => {
    try {
      await createEmailVerificationTable();

      const { email } = req.body;

      if (
        typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ) {
        return res.status(400).json({
          message: "Please enter a valid email address."
        });
      }

      const newEmail = email.trim().toLowerCase();

      const [currentUsers] = await pool.execute(
        "SELECT email FROM users WHERE id = ?",
        [req.user.userId]
      );

      if (currentUsers.length === 0) {
        return res.status(404).json({
          message: "Account not found."
        });
      }

      if (currentUsers[0].email.toLowerCase() === newEmail) {
        return res.status(400).json({
          message: "This is already your current email address."
        });
      }

      const [existing] = await pool.execute(
        "SELECT id FROM users WHERE LOWER(email) = ? AND id != ?",
        [newEmail, req.user.userId]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          message: "This email address is already in use."
        });
      }

      const otp = generateOtp();
      const otpHash = hashOtp(req.user.userId, newEmail, otp);

      await pool.execute(
        `INSERT INTO email_change_otps
         (user_id, new_email, otp_hash, expires_at, attempts)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE), 0)
         ON DUPLICATE KEY UPDATE
         new_email = VALUES(new_email),
         otp_hash = VALUES(otp_hash),
         expires_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE),
         attempts = 0`,
        [req.user.userId, newEmail, otpHash]
      );

      try {
        await sendEmailChangeOtp(newEmail, otp);
      } catch (emailError) {
        await pool.execute(
          "DELETE FROM email_change_otps WHERE user_id = ?",
          [req.user.userId]
        );

        console.error("Email change delivery error:", emailError.message);

        return res.status(503).json({
          message: "Unable to send the verification code."
        });
      }

      res.json({
        message: "A verification code has been sent to your new email address."
      });
    } catch (error) {
      console.error("Email change request error:", error.message);
      res.status(500).json({
        message: "Unable to request an email change."
      });
    }
  });

  // Verify new email and update account
  router.post("/email/verify", authenticateToken, async (req, res) => {
    try {
      await createEmailVerificationTable();

      const { otp } = req.body;

      if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
        return res.status(400).json({
          message: "Please enter a valid 6-digit code."
        });
      }

      const [records] = await pool.execute(
        `SELECT new_email, otp_hash, attempts,
                expires_at, expires_at > NOW() AS is_valid
         FROM email_change_otps
         WHERE user_id = ?`,
        [req.user.userId]
      );

      if (records.length === 0 || !records[0].is_valid) {
        await pool.execute(
          "DELETE FROM email_change_otps WHERE user_id = ?",
          [req.user.userId]
        );

        return res.status(400).json({
          message: "Verification code has expired. Please request a new one."
        });
      }

      const record = records[0];

      if (record.attempts >= 5) {
        await pool.execute(
          "DELETE FROM email_change_otps WHERE user_id = ?",
          [req.user.userId]
        );

        return res.status(429).json({
          message: "Too many incorrect attempts. Please request a new code."
        });
      }

      const expectedHash = hashOtp(
        req.user.userId,
        record.new_email,
        otp
      );

      if (!safeCompare(record.otp_hash, expectedHash)) {
        await pool.execute(
          "UPDATE email_change_otps SET attempts = attempts + 1 WHERE user_id = ?",
          [req.user.userId]
        );

        return res.status(400).json({
          message: "Incorrect verification code."
        });
      }

      const [existing] = await pool.execute(
        "SELECT id FROM users WHERE LOWER(email) = ? AND id != ?",
        [record.new_email, req.user.userId]
      );

      if (existing.length > 0) {
        await pool.execute(
          "DELETE FROM email_change_otps WHERE user_id = ?",
          [req.user.userId]
        );

        return res.status(409).json({
          message: "This email address is already in use."
        });
      }

      await pool.execute(
        "UPDATE users SET email = ? WHERE id = ?",
        [record.new_email, req.user.userId]
      );

      await pool.execute(
        "DELETE FROM email_change_otps WHERE user_id = ?",
        [req.user.userId]
      );

      res.json({
        message: "Your email address has been updated.",
        email: record.new_email
      });
    } catch (error) {
      console.error("Email verification error:", error.message);
      res.status(500).json({
        message: "Unable to verify your new email."
      });
    }
  });

  return router;
}

module.exports = profileRoutes;
