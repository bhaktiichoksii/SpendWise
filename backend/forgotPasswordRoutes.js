
const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { sendPasswordResetOtp } = require("./emailService");

module.exports = function (pool) {
  const router = express.Router();

  function hashOtp(otp) {
    return crypto
      .createHmac("sha256", process.env.JWT_SECRET)
      .update(otp)
      .digest("hex");
  }

  // Create password reset OTP table
  async function createResetTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_otps (
        email VARCHAR(255) PRIMARY KEY,
        otp_hash VARCHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        attempts INT DEFAULT 0
      )
    `);
  }

  // Send password reset OTP
  router.post("/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
          message: "Please enter your email address."
        });
      }

      const cleanEmail = email.trim();

      const [users] = await pool.execute(
        "SELECT id FROM users WHERE BINARY email = ?",
        [cleanEmail]
      );

      if (users.length === 0) {
        return res.json({
          message: "If this email is registered, a reset code will be sent."
        });
      }

      const otp = crypto.randomInt(100000, 1000000).toString();

      await pool.execute(
        `INSERT INTO password_reset_otps
         (email, otp_hash, expires_at, attempts)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE), 0)
         ON DUPLICATE KEY UPDATE
         otp_hash = VALUES(otp_hash),
         expires_at = VALUES(expires_at),
         attempts = 0`,
        [cleanEmail, hashOtp(otp)]
      );

      await sendPasswordResetOtp(cleanEmail, otp);

      res.json({
        message: "Password reset code sent to your email."
      });

    } catch (error) {
      console.error("Forgot password error:", error.message);

      res.status(500).json({
        message: "Unable to send reset code. Please try again."
      });
    }
  });

  // Verify OTP and update password
  router.post("/reset-password", async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;

      if (
        typeof email !== "string" ||
        typeof otp !== "string" ||
        typeof newPassword !== "string" ||
        !email.trim() ||
        !/^\d{6}$/.test(otp) ||
        newPassword.length < 8 ||
        Buffer.byteLength(newPassword, "utf8") > 72
      ) {
        return res.status(400).json({
          message: "Please enter valid reset details. Password must be 8–72 bytes."
        });
      }

      const cleanEmail = email.trim();

      // Check OTP and expiry using TiDB time
      const [records] = await pool.execute(
        `SELECT otp_hash, expires_at, attempts,
                (expires_at > NOW()) AS is_valid
         FROM password_reset_otps
         WHERE email = ?`,
        [cleanEmail]
      );

      if (
        records.length === 0 ||
        Number(records[0].is_valid) !== 1 ||
        records[0].attempts >= 5
      ) {
        return res.status(400).json({
          message: "Reset code is invalid or expired. Request a new code."
        });
      }

      const expected = Buffer.from(records[0].otp_hash, "hex");
      const received = Buffer.from(hashOtp(otp), "hex");

      if (
        expected.length !== received.length ||
        !crypto.timingSafeEqual(expected, received)
      ) {
        await pool.execute(
          "UPDATE password_reset_otps SET attempts = attempts + 1 WHERE email = ?",
          [cleanEmail]
        );

        return res.status(400).json({
          message: "Incorrect verification code."
        });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      const [result] = await pool.execute(
        "UPDATE users SET password_hash = ? WHERE BINARY email = ?",
        [passwordHash, cleanEmail]
      );

      if (result.affectedRows === 0) {
        return res.status(400).json({
          message: "Unable to reset password. Please try again."
        });
      }

      await pool.execute(
        "DELETE FROM password_reset_otps WHERE email = ?",
        [cleanEmail]
      );

      res.json({
        message: "Password reset successfully. You can now log in."
      });

    } catch (error) {
      console.error("Reset password error:", error.message);

      res.status(500).json({
        message: "Unable to reset password. Please try again."
      });
    }
  });

  return {
    router,
    createResetTable
  };
};
