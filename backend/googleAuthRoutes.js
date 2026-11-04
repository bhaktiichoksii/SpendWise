
const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

function googleAuthRoutes(pool, jwt, cookieOptions) {
  const router = express.Router();

  const frontendUrl =
    process.env.FRONTEND_URL || "http://localhost:5173";

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:5000/api/auth/google/callback";
    
  // Start Google Sign-In
  router.get("/google", (req, res) => {
    try {
      if (
        !process.env.GOOGLE_CLIENT_ID ||
        !process.env.GOOGLE_CLIENT_SECRET
      ) {
        return res.status(500).send("Google Sign-In is not configured.");
      }

      const state = crypto.randomBytes(32).toString("hex");

      res.cookie("google_oauth_state", state, {
        ...cookieOptions,
        path: "/api/auth/google",
        maxAge: 5 * 60 * 1000
      });

      const googleUrl = new URL(
        "https://accounts.google.com/o/oauth2/v2/auth"
      );

      googleUrl.searchParams.set(
        "client_id",
        process.env.GOOGLE_CLIENT_ID
      );

      googleUrl.searchParams.set("redirect_uri", redirectUri);
      googleUrl.searchParams.set("response_type", "code");
      googleUrl.searchParams.set("scope", "openid email profile");
      googleUrl.searchParams.set("state", state);
      googleUrl.searchParams.set("prompt", "select_account");

      return res.redirect(googleUrl.toString());
    } catch (error) {
      console.error("Google sign-in start error:", error.message);
      return res.redirect(`${frontendUrl}/?google=error`);
    }
  });

  // Google callback
  router.get("/google/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;
      const savedState = req.cookies.google_oauth_state;

      res.clearCookie("google_oauth_state", {
        ...cookieOptions,
        path: "/api/auth/google"
      });

      if (error) {
        return res.redirect(`${frontendUrl}/?google=cancelled`);
      }

      if (
        !code ||
        !state ||
        !savedState ||
        state !== savedState
      ) {
        return res.redirect(`${frontendUrl}/?google=invalid`);
      }

      // Exchange authorization code for Google tokens
      const tokenResponse = await axios.post(
        "https://oauth2.googleapis.com/token",
        new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        }
      );

      const accessToken = tokenResponse.data.access_token;

      if (!accessToken) {
        throw new Error("Google access token was not received.");
      }

      // Get verified Google account details
      const profileResponse = await axios.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const googleUser = profileResponse.data;

      if (
        !googleUser.id ||
        !googleUser.email ||
        googleUser.verified_email !== true
      ) {
        return res.redirect(`${frontendUrl}/?google=unverified`);
      }

      const googleId = String(googleUser.id);
      const email = googleUser.email.trim().toLowerCase();
      const name = (googleUser.name || "SpendWise User").trim();

      // Check whether this Google account is already connected
      const [googleAccounts] = await pool.execute(
        "SELECT id, name, email FROM users WHERE google_id = ?",
        [googleId]
      );

      let user;

      if (googleAccounts.length > 0) {
        user = googleAccounts[0];
      } else {
        // Check whether an account with this email already exists
        const [existingAccounts] = await pool.execute(
          "SELECT id, name, email, google_id FROM users WHERE email = ?",
          [email]
        );

        if (existingAccounts.length > 0) {
          const existingUser = existingAccounts[0];

          if (
            existingUser.google_id &&
            existingUser.google_id !== googleId
          ) {
            return res.redirect(`${frontendUrl}/?google=account-conflict`);
          }

          // Connect Google to the existing account
          await pool.execute(
            "UPDATE users SET google_id = ? WHERE id = ?",
            [googleId, existingUser.id]
          );

          user = existingUser;
        } else {
          // Create a new Google account
          const [result] = await pool.execute(
            `INSERT INTO users
             (name, email, password_hash, google_id)
             VALUES (?, ?, NULL, ?)`,
            [name, email, googleId]
          );

          user = {
            id: result.insertId,
            name,
            email
          };
        }
      }

      // Create SpendWise session
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.cookie("spendwise_token", token, {
        ...cookieOptions,
        maxAge: 60 * 60 * 1000
      });

      return res.redirect(`${frontendUrl}/?google=success`);
    } catch (error) {
      console.error(
        "Google callback error:",
        error.response?.data || error.message
      );

      return res.redirect(`${frontendUrl}/?google=error`);
    }
  });

  return router;
}

module.exports = googleAuthRoutes;
