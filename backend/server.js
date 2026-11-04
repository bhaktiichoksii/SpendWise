
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const budgetRoutes = require("./budgetRoutes");
const accountRoutes = require("./accountRoutes");
const walletRoutes = require("./walletRoutes");
const reportRoutes = require("./reportRoutes");
const shoppingRoutes = require("./shoppingRoutes");
const bankRoutes = require("./bankRoutes");
const categoryRoutes = require("./categoryRoutes");
const forgotPasswordRoutes = require("./forgotPasswordRoutes");

const deviceAuthRoutes = require("./deviceAuthRoutes");
const googleAuthRoutes = require("./googleAuthRoutes");
const { getDeviceAuthHelpers } = require("./deviceAuth");
const { sendOtpEmail, sendEmailChangeOtp } = require("./emailService");
const profileRoutes = require("./profileRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing from .env");
  process.exit(1);
}

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    minVersion: "TLSv1.2"
  },
  waitForConnections: true,
  connectionLimit: 10
});

// Forgot Password routes
const {
  router: forgotPasswordRouter,
  createResetTable
} = forgotPasswordRoutes(pool);

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/"
};

const deviceHelpers = getDeviceAuthHelpers(pool);

function authenticateToken(req, res, next) {
  const token = req.cookies.spendwise_token;

  if (!token) {
    return res.status(401).json({
      message: "Please log in to continue."
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.clearCookie("spendwise_token", cookieOptions);

    return res.status(401).json({
      message: "Your session has expired. Please log in again."
    });
  }
}

// Existing feature routes
app.use("/api/budgets", budgetRoutes(pool, authenticateToken));
app.use("/api/categories", categoryRoutes(pool, authenticateToken));
app.use("/api/accounts", accountRoutes(pool, authenticateToken));
app.use("/api/wallets", walletRoutes(pool, authenticateToken));
app.use("/api/reports", reportRoutes(pool, authenticateToken));
app.use("/api/shopping", shoppingRoutes(authenticateToken));
app.use("/api/bank", bankRoutes(authenticateToken));

// Login and trusted-device routes
app.use(
  "/api/auth",
  deviceAuthRoutes(pool, jwt, cookieOptions, authenticateToken)
);

app.use(
  "/api/auth",
  googleAuthRoutes(pool, jwt, cookieOptions)
);

// Forgot Password routes
app.use("/api/auth", forgotPasswordRouter);

// Account profile routes
app.use(
  "/api/profile",
  profileRoutes(pool, authenticateToken, sendEmailChangeOtp)
);

// Create transactions table
async function createTransactionsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type ENUM('Income', 'Expense') NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      category VARCHAR(50) NOT NULL,
      description VARCHAR(100) DEFAULT '',
      transaction_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_transactions_user_date (user_id, transaction_date)
    )
  `);
}

// Create budgets table
async function createBudgetsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      category VARCHAR(50) NOT NULL,
      monthly_limit DECIMAL(12, 2) NOT NULL,
      UNIQUE KEY unique_budget (user_id, category)
    )
  `);
}

// Home
app.get("/", (req, res) => {
  res.json({
    message: "SpendWise backend is running!"
  });
});

// Database health
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "OK",
      database: "Connected"
    });
  } catch (error) {
    console.error("Database health error:", error.message);

    res.status(500).json({
      status: "ERROR",
      database: "Disconnected"
    });
  }
});

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Please fill in all fields."
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (cleanName.length > 100) {
      return res.status(400).json({
        message: "Name must be 100 characters or fewer."
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters."
      });
    }

    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE BINARY email = ?",
      [cleanEmail]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const hash = await bcrypt.hash(password, 12);

    await pool.execute(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [cleanName, cleanEmail, hash]
    );

    res.status(201).json({
      message: "Account created successfully. You can now log in."
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    res.status(500).json({
      message: "Unable to create your account. Please try again."
    });
  }
});

// Login with trusted-device verification
app.post("/api/auth/login", async (req, res) => {
  try {
    await deviceHelpers.createDeviceTables(pool);

    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Please enter your email and password."
      });
    }

    const [users] = await pool.execute(
      `SELECT id, name, email, password_hash
       FROM users
       WHERE BINARY email = ?`,
      [email.trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const user = users[0];

    if (
      !user.password_hash ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email
    };

    const deviceToken = req.cookies.spendwise_device;

    const trusted = await deviceHelpers.isTrustedDevice(
      user.id,
      deviceToken
    );

    if (trusted) {
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.clearCookie("spendwise_login_challenge", cookieOptions);

      res.cookie("spendwise_token", token, {
        ...cookieOptions,
        maxAge: 60 * 60 * 1000
      });

      return res.json({
        message: "Login successful!",
        user: userData
      });
    }

    res.clearCookie("spendwise_token", cookieOptions);

    const challenge = deviceHelpers.generateSecureToken();
    const otp = deviceHelpers.generateOtp();

    await deviceHelpers.createOtp(
      user.id,
      challenge,
      otp,
      process.env.JWT_SECRET
    );

    res.cookie("spendwise_login_challenge", challenge, {
      ...cookieOptions,
      maxAge: 5 * 60 * 1000
    });

    try {
      await sendOtpEmail(user.email, otp);
    } catch (emailError) {
      await pool.execute(
        "DELETE FROM login_otps WHERE user_id = ?",
        [user.id]
      );

      res.clearCookie("spendwise_login_challenge", cookieOptions);

      console.error("Login OTP email error:", emailError.message);

      return res.status(503).json({
        message: "Unable to send your verification code. Please try again."
      });
    }

    res.json({
      requiresOtp: true,
      message: "A verification code has been sent to your registered email."
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      message: "Unable to log in. Please try again."
    });
  }
});

// Check login session
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      "SELECT id, name, email FROM users WHERE id = ?",
      [req.user.userId]
    );

    if (users.length === 0) {
      res.clearCookie("spendwise_token", cookieOptions);

      return res.status(401).json({
        message: "User account not found."
      });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error("Session error:", error.message);

    res.status(500).json({
      message: "Unable to check your session."
    });
  }
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("spendwise_token", cookieOptions);

  res.json({
    message: "Logged out successfully."
  });
});

// Change password
app.post(
  "/api/auth/change-password",
  authenticateToken,
  async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (
        typeof currentPassword !== "string" ||
        typeof newPassword !== "string" ||
        typeof confirmPassword !== "string" ||
        !currentPassword ||
        !newPassword ||
        !confirmPassword
      ) {
        return res.status(400).json({
          message: "Please fill in all password fields."
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          message: "New password must contain at least 8 characters."
        });
      }

      if (Buffer.byteLength(newPassword, "utf8") > 72) {
        return res.status(400).json({
          message: "New password is too long. Maximum supported length is 72 bytes."
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          message: "New password and confirmation do not match."
        });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({
          message: "New password must be different from your current password."
        });
      }

      const [users] = await pool.execute(
        "SELECT password_hash FROM users WHERE id = ?",
        [req.user.userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          message: "User account not found."
        });
      }

      const passwordMatches = await bcrypt.compare(
        currentPassword,
        users[0].password_hash
      );

      if (!passwordMatches) {
        return res.status(401).json({
          message: "Your current password is incorrect."
        });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      await pool.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        [newPasswordHash, req.user.userId]
      );

      res.json({
        message: "Your password has been changed successfully."
      });
    } catch (error) {
      console.error("Change password error:", error.message);

      res.status(500).json({
        message: "Unable to change your password. Please try again."
      });
    }
  }
);

// Get transactions
app.get("/api/transactions", authenticateToken, async (req, res) => {
  try {
    const [transactions] = await pool.execute(`
      SELECT id, type, amount, category, description,
        DATE_FORMAT(transaction_date, '%Y-%m-%d') AS date
      FROM transactions
      WHERE user_id = ?
      ORDER BY transaction_date DESC, id DESC
    `, [req.user.userId]);

    res.json({
      transactions: transactions.map(item => ({
        ...item,
        amount: Number(item.amount)
      }))
    });
  } catch (error) {
    console.error("Get transactions error:", error.message);

    res.status(500).json({
      message: "Unable to load transactions."
    });
  }
});

// Add income or expense
app.post("/api/transactions", authenticateToken, async (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;

    if (
      !["Income", "Expense"].includes(type) ||
      amount === "" ||
      amount === null ||
      amount === undefined ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0 ||
      Number(amount) > 9999999999.99 ||
      typeof category !== "string" ||
      !category.trim() ||
      category.trim().length > 50 ||
      (description !== undefined &&
        (typeof description !== "string" || description.length > 100)) ||
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return res.status(400).json({
        message: "Please enter valid transaction details."
      });
    }

    const [insertResult] = await pool.execute(`
      INSERT INTO transactions
      (user_id, type, amount, category, description, transaction_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      req.user.userId,
      type,
      Number(amount),
      category.trim(),
      (description || "").trim(),
      date
    ]);

    const [rows] = await pool.execute(`
      SELECT id, type, amount, category, description,
        DATE_FORMAT(transaction_date, '%Y-%m-%d') AS date
      FROM transactions
      WHERE id = ? AND user_id = ?
    `, [insertResult.insertId, req.user.userId]);

    res.status(201).json({
      message: "Transaction added successfully.",
      transaction: {
        ...rows[0],
        amount: Number(rows[0].amount)
      }
    });
  } catch (error) {
    console.error("Add transaction error:", error.message);

    res.status(500).json({
      message: "Unable to save the transaction."
    });
  }
});

// Delete transaction
app.delete("/api/transactions/:id", authenticateToken, async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({
        message: "Invalid transaction ID."
      });
    }

    const [result] = await pool.execute(
      "DELETE FROM transactions WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Transaction not found."
      });
    }

    res.json({
      message: "Transaction deleted successfully."
    });
  } catch (error) {
    console.error("Delete transaction error:", error.message);

    res.status(500).json({
      message: "Unable to delete the transaction."
    });
  }
});

// Start server
async function startServer() {
  try {
    await createTransactionsTable();
    await createBudgetsTable();
    await deviceHelpers.createDeviceTables(pool);

    // Create Forgot Password OTP table
    await createResetTable();

    app.listen(PORT, () => {
      console.log(`SpendWise backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start SpendWise:", error.message);
    process.exit(1);
  }
}

startServer();
