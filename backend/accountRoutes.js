
const express = require("express");

const banks = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Bank of Baroda",
  "Punjab National Bank",
  "Canara Bank",
  "Union Bank of India",
  "Kotak Mahindra Bank",
  "Bank of India",
  "Indian Bank",
  "IndusInd Bank",
  "IDFC FIRST Bank",
  "Yes Bank",
  "Federal Bank",
  "Other"
];

function accountRoutes(pool, authenticateToken) {
  const router = express.Router();

  const setup = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        account_holder_name VARCHAR(100) NOT NULL,
        account_last4 VARCHAR(4) NOT NULL,
        balance DECIMAL(12, 2) DEFAULT NULL,
        balance_source VARCHAR(20) DEFAULT 'Manual',
        balance_updated_at DATETIME DEFAULT NULL,
        verification_status VARCHAR(30) DEFAULT 'Not Verified',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const columns = [
      {
        name: "account_holder_name",
        sql: "ADD COLUMN account_holder_name VARCHAR(100) NOT NULL DEFAULT ''"
      },
      {
        name: "balance",
        sql: "ADD COLUMN balance DECIMAL(12, 2) DEFAULT NULL"
      },
      {
        name: "balance_source",
        sql: "ADD COLUMN balance_source VARCHAR(20) DEFAULT 'Manual'"
      },
      {
        name: "balance_updated_at",
        sql: "ADD COLUMN balance_updated_at DATETIME DEFAULT NULL"
      },
      {
        name: "verification_status",
        sql: "ADD COLUMN verification_status VARCHAR(30) DEFAULT 'Not Verified'"
      }
    ];

    for (const column of columns) {
      const [existing] = await pool.execute(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'bank_accounts'
         AND COLUMN_NAME = ?`,
        [column.name]
      );

      if (existing.length === 0) {
        await pool.query(
          `ALTER TABLE bank_accounts ${column.sql}`
        );
      }
    }
  })();

  function validBalance(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return false;
    }

    const amount = Number(value);

    return (
      Number.isFinite(amount) &&
      amount >= 0 &&
      amount <= 9999999999.99 &&
      /^\d+(\.\d{1,2})?$/.test(String(value).trim())
    );
  }

  // Get all bank accounts for the logged-in user.
  router.get("/", authenticateToken, async (req, res) => {
    try {
      await setup;

      const [accounts] = await pool.execute(
        `SELECT id, bank_name, account_holder_name,
         account_last4, balance, balance_source,
         balance_updated_at, verification_status
         FROM bank_accounts
         WHERE user_id = ?
         ORDER BY id DESC`,
        [req.user.userId]
      );

      res.json({ accounts });
    } catch (error) {
      console.error("Load accounts error:", error);
      res.status(500).json({
        message: "Unable to load accounts."
      });
    }
  });

  // Add a bank account with an optional manual balance.
  router.post("/", authenticateToken, async (req, res) => {
    try {
      await setup;

      const {
        bank_name,
        account_holder_name,
        account_last4,
        balance
      } = req.body;

      if (
        typeof bank_name !== "string" ||
        !banks.includes(bank_name)
      ) {
        return res.status(400).json({
          message: "Please select a supported bank."
        });
      }

      if (
        typeof account_holder_name !== "string" ||
        account_holder_name.trim().length < 2 ||
        account_holder_name.trim().length > 100
      ) {
        return res.status(400).json({
          message: "Enter a valid account holder name."
        });
      }

      if (
        typeof account_last4 !== "string" ||
        !/^\d{4}$/.test(account_last4)
      ) {
        return res.status(400).json({
          message: "Enter exactly four account digits."
        });
      }

      if (
        balance !== undefined &&
        balance !== null &&
        balance !== "" &&
        !validBalance(balance)
      ) {
        return res.status(400).json({
          message: "Enter a valid balance with up to two decimal places."
        });
      }

      const hasBalance =
        balance !== undefined &&
        balance !== null &&
        balance !== "";

      await pool.execute(
        `INSERT INTO bank_accounts
         (user_id, bank_name, account_holder_name,
          account_last4, balance, balance_source,
          balance_updated_at, verification_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.userId,
          bank_name,
          account_holder_name.trim(),
          account_last4,
          hasBalance ? Number(balance) : null,
          hasBalance ? "Manual" : null,
          hasBalance ? new Date() : null,
          "Not Verified"
        ]
      );

      res.status(201).json({
        message: "Bank account added successfully.",
        balance_source: hasBalance ? "Manual" : null,
        verification_status: "Not Verified"
      });
    } catch (error) {
      console.error("Add account error:", error);
      res.status(500).json({
        message: "Unable to add bank account."
      });
    }
  });

  // Connect a demo bank account with a simulated balance.
  router.post("/demo-connect", authenticateToken, async (req, res) => {
    try {
      await setup;

      const {
        bank_name,
        account_holder_name,
        account_last4
      } = req.body;

      if (
        typeof bank_name !== "string" ||
        !banks.includes(bank_name)
      ) {
        return res.status(400).json({
          message: "Please select a supported bank."
        });
      }

      if (
        typeof account_holder_name !== "string" ||
        account_holder_name.trim().length < 2 ||
        account_holder_name.trim().length > 100
      ) {
        return res.status(400).json({
          message: "Enter a valid account holder name."
        });
      }

      if (
        typeof account_last4 !== "string" ||
        !/^\d{4}$/.test(account_last4)
      ) {
        return res.status(400).json({
          message: "Enter exactly four account digits."
        });
      }

      // This is a randomly generated demo balance.
      const demoBalance =
        Math.floor(Math.random() * 95001) + 5000;

      const [result] = await pool.execute(
        `INSERT INTO bank_accounts
         (user_id, bank_name, account_holder_name,
          account_last4, balance, balance_source,
          balance_updated_at, verification_status)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        [
          req.user.userId,
          bank_name,
          account_holder_name.trim(),
          account_last4,
          demoBalance,
          "Demo",
          "Demo Connected"
        ]
      );

      res.status(201).json({
        message: "Demo bank connected successfully.",
        account: {
          id: result.insertId,
          bank_name,
          account_holder_name: account_holder_name.trim(),
          account_last4,
          balance: demoBalance,
          balance_source: "Demo",
          verification_status: "Demo Connected"
        }
      });
    } catch (error) {
      console.error("Demo bank connection error:", error);
      res.status(500).json({
        message: "Unable to connect demo bank."
      });
    }
  });

  // Update the manual balance of an existing account.
  router.patch("/:id/balance", authenticateToken, async (req, res) => {
    try {
      await setup;

      const accountId = Number(req.params.id);
      const { balance } = req.body;

      if (!Number.isInteger(accountId) || accountId <= 0) {
        return res.status(400).json({
          message: "Invalid account ID."
        });
      }

      if (!validBalance(balance)) {
        return res.status(400).json({
          message: "Enter a valid balance with up to two decimal places."
        });
      }

      const [result] = await pool.execute(
        `UPDATE bank_accounts
         SET balance = ?,
             balance_source = 'Manual',
             balance_updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [
          Number(balance),
          accountId,
          req.user.userId
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Bank account not found."
        });
      }

      res.json({
        message: "Manual balance updated successfully.",
        balance: Number(balance),
        balance_source: "Manual"
      });
    } catch (error) {
      console.error("Update balance error:", error);
      res.status(500).json({
        message: "Unable to update balance."
      });
    }
  });

  // Delete a bank account.
  router.delete("/:id", authenticateToken, async (req, res) => {
    try {
      await setup;

      const accountId = Number(req.params.id);

      if (!Number.isInteger(accountId) || accountId <= 0) {
        return res.status(400).json({
          message: "Invalid account ID."
        });
      }

      const [result] = await pool.execute(
        `DELETE FROM bank_accounts
         WHERE id = ? AND user_id = ?`,
        [accountId, req.user.userId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Account not found."
        });
      }

      res.json({
        message: "Bank account removed."
      });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({
        message: "Unable to remove account."
      });
    }
  });

  return router;
}

module.exports = accountRoutes;
