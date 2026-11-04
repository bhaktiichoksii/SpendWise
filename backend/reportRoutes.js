
const express = require("express");

const router = express.Router();

function reportRoutes(pool, authenticateToken) {
  router.get("/monthly", authenticateToken, async (req, res) => {
    try {
      const [summary] = await pool.execute(`
        SELECT
          COALESCE(SUM(CASE WHEN type = 'Income'
            THEN amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN type = 'Expense'
            THEN amount ELSE 0 END), 0) AS expenses
        FROM transactions
        WHERE user_id = ?
          AND MONTH(transaction_date) = MONTH(CURRENT_DATE())
          AND YEAR(transaction_date) = YEAR(CURRENT_DATE())
      `, [req.user.userId]);

      const [categories] = await pool.execute(`
        SELECT category, SUM(amount) AS total
        FROM transactions
        WHERE user_id = ?
          AND type = 'Expense'
          AND MONTH(transaction_date) = MONTH(CURRENT_DATE())
          AND YEAR(transaction_date) = YEAR(CURRENT_DATE())
        GROUP BY category
        ORDER BY total DESC
      `, [req.user.userId]);

      const income = Number(summary[0].income);
      const expenses = Number(summary[0].expenses);

      res.json({
        income,
        expenses,
        savings: income - expenses,
        categories: categories.map(item => ({
          category: item.category,
          total: Number(item.total)
        }))
      });
    } catch (error) {
      console.error("Report error:", error.message);
      res.status(500).json({
        message: "Unable to generate report."
      });
    }
  });

  return router;
}

module.exports = reportRoutes;
