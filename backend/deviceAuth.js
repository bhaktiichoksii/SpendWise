
const crypto = require("crypto");

const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const DEVICE_VALIDITY_DAYS = 180;

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function generateSecureToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashOtp(userId, challenge, otp, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${userId}:${challenge}:${otp}`)
    .digest("hex");
}

function safeCompare(first, second) {
  const a = Buffer.from(first, "hex");
  const b = Buffer.from(second, "hex");

  return a.length === b.length &&
    crypto.timingSafeEqual(a, b);
}

async function createDeviceTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS trusted_devices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token_hash CHAR(64) NOT NULL UNIQUE,
      device_name VARCHAR(255) DEFAULT 'Unknown device',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME DEFAULT NULL,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME DEFAULT NULL,
      INDEX idx_trusted_user (user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS login_otps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      challenge_hash CHAR(64) NOT NULL UNIQUE,
      otp_hash CHAR(64) NOT NULL,
      attempts INT DEFAULT 0,
      expires_at DATETIME NOT NULL,
      last_sent_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_login_otp_user (user_id)
    )
  `);
}

function getDeviceAuthHelpers(pool) {
  return {
    createDeviceTables,

    generateOtp,
    generateSecureToken,
    hashToken,
    hashOtp,
    safeCompare,

    async isTrustedDevice(userId, deviceToken) {
      if (!deviceToken) return false;

      const tokenHash = hashToken(deviceToken);

      const [devices] = await pool.execute(
        `SELECT id FROM trusted_devices
         WHERE user_id = ?
         AND token_hash = ?
         AND revoked_at IS NULL
         AND expires_at > NOW()`,
        [userId, tokenHash]
      );

      if (devices.length === 0) return false;

      await pool.execute(
        `UPDATE trusted_devices
         SET last_used_at = NOW()
         WHERE id = ?`,
        [devices[0].id]
      );

      return true;
    },

    async saveTrustedDevice(userId, deviceToken, deviceName) {
      const tokenHash = hashToken(deviceToken);

      await pool.execute(
        `INSERT INTO trusted_devices
         (user_id, token_hash, device_name, expires_at)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
        [
          userId,
          tokenHash,
          deviceName || "Unknown device",
          DEVICE_VALIDITY_DAYS
        ]
      );
    },

    async createOtp(userId, challenge, otp, secret) {
      const challengeHash = hashToken(challenge);
      const otpHash = hashOtp(userId, challenge, otp, secret);

      await pool.execute(
        `DELETE FROM login_otps WHERE user_id = ?`,
        [userId]
      );

      await pool.execute(
        `INSERT INTO login_otps
         (user_id, challenge_hash, otp_hash, expires_at, last_sent_at)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), NOW())`,
        [
          userId,
          challengeHash,
          otpHash,
          OTP_EXPIRY_MINUTES
        ]
      );
    }
  };
}

module.exports = {
  getDeviceAuthHelpers,
  OTP_EXPIRY_MINUTES,
  MAX_OTP_ATTEMPTS,
  RESEND_COOLDOWN_SECONDS,
  DEVICE_VALIDITY_DAYS
};
