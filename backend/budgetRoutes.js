
const express = require("express");

const router = express.Router();

function budgetRoutes(pool, authenticateToken) {
  // Get budgets with current month's expenses
  router.get("/", authenticateToken, async (req, res) => {
    try {
      const [budgets] = await pool.execute(`
        SELECT b.category, b.monthly_limit,
          COALESCE(SUM(t.amount), 0) AS spent
        FROM budgets b
        LEFT JOIN transactions t
          ON t.user_id = b.user_id
          AND t.category = b.category
          AND t.type = 'Expense'
          AND MONTH(t.transaction_date) = MONTH(CURRENT_DATE())
          AND YEAR(t.transaction_date) = YEAR(CURRENT_DATE())
        WHERE b.user_id = ?
        GROUP BY b.id, b.category, b.monthly_limit
        ORDER BY b.category
      `, [req.user.userId]);

      res.json({
        budgets: budgets.map((item) => ({
          category: item.category,
          limit: Number(item.monthly_limit),
          spent: Number(item.spent),
          remaining: Number(item.monthly_limit) - Number(item.spent)
        }))
      });
    } catch (error) {
      console.error("Get budgets error:", error.message);
      res.status(500).json({ message: "Unable to load budgets." });
    }
  });

  // Add or update a category budget
  router.post("/", authenticateToken, async (req, res) => {
    try {
      const { category, limit } = req.body;

      if (
        typeof category !== "string" ||
        !category.trim() ||
        category.trim().length > 50 ||
        limit === "" ||
        limit === null ||
        limit === undefined ||
        !Number.isFinite(Number(limit)) ||
        Number(limit) <= 0 ||
        Number(limit) > 9999999999.99
      ) {
        return res.status(400).json({
          message: "Please enter a valid category and budget."
        });
      }

      await pool.execute(`
        INSERT INTO budgets (user_id, category, monthly_limit)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE monthly_limit = VALUES(monthly_limit)
      `, [req.user.userId, category.trim(), Number(limit)]);

      res.json({ message: "Budget saved successfully." });
    } catch (error) {
      console.error("Save budget error:", error.message);
      res.status(500).json({ message: "Unable to save budget." });
    }
  });

  return router;
}

module.exports = budgetRoutes;
