
const express = require("express");

const router = express.Router();

function bankRoutes(authenticateToken) {
  router.get("/status", authenticateToken, (req, res) => {
    res.json({
      connected: false,
      provider: null,
      message: "Bank integration is not configured yet."
    });
  });

  router.post("/connect", authenticateToken, (req, res) => {
    res.status(501).json({
      message: "An authorised bank integration provider is required."
    });
  });

  router.post("/disconnect", authenticateToken, (req, res) => {
    res.json({
      message: "No active bank connection."
    });
  });

  return router;
}

module.exports = bankRoutes;
