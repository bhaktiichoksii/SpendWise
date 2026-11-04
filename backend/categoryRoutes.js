
const express = require("express");

function categoryRoutes(pool, authenticateToken) {
  const router = express.Router();

  // Get categories for the logged-in user
  router.get("/", authenticateToken, async (req, res) => {
    try {
      const [categories] = await pool.execute(
        `SELECT id, category_name, type
         FROM categories
         WHERE user_id = ?
         ORDER BY category_name ASC`,
        [req.user.userId]
      );

      res.json({ categories });
    } catch (error) {
      console.error("Get categories error:", error.message);
      res.status(500).json({
        message: "Unable to load categories."
      });
    }
  });

  // Add a new category
  router.post("/", authenticateToken, async (req, res) => {
    try {
      const { category_name, type } = req.body;

      if (
        typeof category_name !== "string" ||
        !category_name.trim() ||
        category_name.trim().length > 50 ||
        !["Income", "Expense"].includes(type)
      ) {
        return res.status(400).json({
          message: "Please enter a valid category name and type."
        });
      }

      const cleanName = category_name.trim();

      const [existing] = await pool.execute(
        `SELECT id FROM categories
         WHERE user_id = ?
         AND category_name = ?
         AND type = ?`,
        [req.user.userId, cleanName, type]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          message: "This category already exists."
        });
      }

      const [result] = await pool.execute(
        `INSERT INTO categories
         (user_id, category_name, type)
         VALUES (?, ?, ?)`,
        [req.user.userId, cleanName, type]
      );

      res.status(201).json({
        message: "Category added successfully.",
        category: {
          id: result.insertId,
          category_name: cleanName,
          type
        }
      });
    } catch (error) {
      console.error("Add category error:", error.message);

      res.status(500).json({
        message: "Unable to add category."
      });
    }
  });

  // Edit a category
  router.put("/:id", authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();

    try {
      const { category_name } = req.body;
      const categoryId = req.params.id;

      if (
        !/^\d+$/.test(categoryId) ||
        typeof category_name !== "string" ||
        !category_name.trim() ||
        category_name.trim().length > 50
      ) {
        return res.status(400).json({
          message: "Please enter a valid category name."
        });
      }

      const cleanName = category_name.trim();

      await connection.beginTransaction();

      const [categories] = await connection.execute(
        `SELECT id, category_name, type
         FROM categories
         WHERE id = ? AND user_id = ?
         FOR UPDATE`,
        [categoryId, req.user.userId]
      );

      if (categories.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          message: "Category not found."
        });
      }

      const oldCategory = categories[0];

      const [duplicate] = await connection.execute(
        `SELECT id FROM categories
         WHERE user_id = ?
         AND category_name = ?
         AND type = ?
         AND id != ?`,
        [
          req.user.userId,
          cleanName,
          oldCategory.type,
          categoryId
        ]
      );

      if (duplicate.length > 0) {
        await connection.rollback();

        return res.status(409).json({
          message: "This category already exists."
        });
      }

      // Prevent a duplicate budget category during renaming.
      const [budgetConflict] = await connection.execute(
        `SELECT id FROM budgets
         WHERE user_id = ? AND category = ?`,
        [req.user.userId, cleanName]
      );

      if (
        budgetConflict.length > 0 &&
        oldCategory.category_name !== cleanName
      ) {
        await connection.rollback();

        return res.status(409).json({
          message: "A budget already exists with the new category name. Update that budget first."
        });
      }

      await connection.execute(
        `UPDATE transactions
         SET category = ?
         WHERE user_id = ? AND type = ? AND category = ?`,
        [
          cleanName,
          req.user.userId,
          oldCategory.type,
          oldCategory.category_name
        ]
      );

      await connection.execute(
        `UPDATE budgets
         SET category = ?
         WHERE user_id = ? AND category = ?`,
        [
          cleanName,
          req.user.userId,
          oldCategory.category_name
        ]
      );

      await connection.execute(
        `UPDATE categories
         SET category_name = ?
         WHERE id = ? AND user_id = ?`,
        [cleanName, categoryId, req.user.userId]
      );

      await connection.commit();

      res.json({
        message: "Category updated successfully.",
        category: {
          id: Number(categoryId),
          category_name: cleanName,
          type: oldCategory.type
        }
      });
    } catch (error) {
      await connection.rollback();

      console.error("Update category error:", error.message);

      res.status(500).json({
        message: "Unable to update category."
      });
    } finally {
      connection.release();
    }
  });

  // Delete a category only when it is not in use
  router.delete("/:id", authenticateToken, async (req, res) => {
    try {
      const categoryId = req.params.id;

      if (!/^\d+$/.test(categoryId)) {
        return res.status(400).json({
          message: "Invalid category ID."
        });
      }

      const [categories] = await pool.execute(
        `SELECT category_name, type
         FROM categories
         WHERE id = ? AND user_id = ?`,
        [categoryId, req.user.userId]
      );

      if (categories.length === 0) {
        return res.status(404).json({
          message: "Category not found."
        });
      }

      const category = categories[0];

      const [transactions] = await pool.execute(
        `SELECT id FROM transactions
         WHERE user_id = ? AND type = ? AND category = ?
         LIMIT 1`,
        [
          req.user.userId,
          category.type,
          category.category_name
        ]
      );

      const [budgets] = await pool.execute(
        `SELECT id FROM budgets
         WHERE user_id = ? AND category = ?
         LIMIT 1`,
        [req.user.userId, category.category_name]
      );

      if (transactions.length > 0 || budgets.length > 0) {
        return res.status(409).json({
          message: "This category is being used by transactions or budgets. You cannot delete it yet."
        });
      }

      await pool.execute(
        `DELETE FROM categories
         WHERE id = ? AND user_id = ?`,
        [categoryId, req.user.userId]
      );

      res.json({
        message: "Category deleted successfully."
      });
    } catch (error) {
      console.error("Delete category error:", error.message);

      res.status(500).json({
        message: "Unable to delete category."
      });
    }
  });

  return router;
}

module.exports = categoryRoutes;
