
const express = require("express");

const router = express.Router();

function walletRoutes(pool, authenticateToken) {
  const createTable = pool.query(`
    CREATE TABLE IF NOT EXISTS wallets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      wallet_name VARCHAR(100) NOT NULL,
      wallet_type ENUM('Wallet', 'Cash') NOT NULL,
      balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  router.get("/", authenticateToken, async (req, res) => {
    try {
      await createTable;

      const [wallets] = await pool.execute(
        `SELECT id, wallet_name, wallet_type, balance
         FROM wallets WHERE user_id = ?`,
        [req.user.userId]
      );

      res.json({ wallets });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Unable to load wallets." });
    }
  });

  router.post("/", authenticateToken, async (req, res) => {
    try {
      await createTable;

      const { wallet_name, wallet_type, balance } = req.body;

      if (
        !wallet_name?.trim() ||
        !["Wallet", "Cash"].includes(wallet_type) ||
        !Number.isFinite(Number(balance)) ||
        Number(balance) < 0
      ) {
        return res.status(400).json({
          message: "Please enter valid wallet details."
        });
      }

      await pool.execute(
        `INSERT INTO wallets
         (user_id, wallet_name, wallet_type, balance)
         VALUES (?, ?, ?, ?)`,
        [
          req.user.userId,
          wallet_name.trim(),
          wallet_type,
          Number(balance)
        ]
      );

      res.status(201).json({
        message: "Wallet added successfully."
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Unable to add wallet."
      });
    }
  });

  router.put("/:id", authenticateToken, async (req, res) => {
    try {
      const { balance } = req.body;

      if (!Number.isFinite(Number(balance)) || Number(balance) < 0) {
        return res.status(400).json({
          message: "Please enter a valid balance."
        });
      }

      const [result] = await pool.execute(
        `UPDATE wallets SET balance = ?
         WHERE id = ? AND user_id = ?`,
        [Number(balance), req.params.id, req.user.userId]
      );

      if (!result.affectedRows) {
        return res.status(404).json({
          message: "Wallet not found."
        });
      }

      res.json({ message: "Balance updated successfully." });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Unable to update balance."
      });
    }
  });

  router.delete("/:id", authenticateToken, async (req, res) => {
    try {
      const [result] = await pool.execute(
        "DELETE FROM wallets WHERE id = ? AND user_id = ?",
        [req.params.id, req.user.userId]
      );

      if (!result.affectedRows) {
        return res.status(404).json({
          message: "Wallet not found."
        });
      }

      res.json({ message: "Wallet removed successfully." });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Unable to remove wallet."
      });
    }
  });

  return router;
}

module.exports = walletRoutes;
