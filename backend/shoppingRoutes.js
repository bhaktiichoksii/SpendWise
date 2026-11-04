
const express = require("express");
const axios = require("axios");

const router = express.Router();

function extractProductName(input) {
  try {
    const url = new URL(input);

    if (!["http:", "https:"].includes(url.protocol)) {
      return input;
    }

    const hostname = url.hostname.toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);

    // Flipkart product URL
    if (hostname.includes("flipkart.com")) {
      const productIndex = parts.indexOf("p");

      if (productIndex > 0) {
        return decodeURIComponent(parts[productIndex - 1])
          .replace(/-/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }
    }

    // Amazon product URL
    if (hostname.includes("amazon.")) {
      const dpIndex = parts.indexOf("dp");

      if (dpIndex > 0) {
        return decodeURIComponent(parts[dpIndex - 1])
          .replace(/-/g, " ")
          .replace(/_/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }
    }

    return input;
  } catch {
    return input;
  }
}

function shoppingRoutes(authenticateToken) {
  router.get("/search", authenticateToken, async (req, res) => {
    try {
      const product = String(req.query.product || "").trim();

      if (!product) {
        return res.status(400).json({
          message: "Please enter a product name or product link."
        });
      }

      const apiKey = process.env.SERPAPI_KEY;

      if (!apiKey) {
        return res.status(500).json({
          message: "SerpApi key is missing from the backend .env file."
        });
      }

      const searchQuery = extractProductName(product);

      console.log("\n========== SMART SHOPPING ==========");
      console.log("Original input:", product);
      console.log("Extracted search:", searchQuery);

      const response = await axios.get(
        "https://serpapi.com/search.json",
        {
          params: {
            engine: "google_shopping",
            q: searchQuery,
            gl: "in",
            hl: "en",
            api_key: apiKey
          },
          timeout: 60000
        }
      );

      const shoppingResults = response.data.shopping_results || [];

      console.log("SerpApi HTTP status:", response.status);
      console.log("Shopping results count:", shoppingResults.length);

      const products = shoppingResults
        .map(item => ({
          title: item.title || "",
          price: item.extracted_price ?? null,
          priceText: item.price || "Price unavailable",
          store: item.source || "Unknown store",

          // SerpApi Google Shopping uses product_link.
          link: item.product_link || item.link || "",

          image: item.thumbnail || "",
          productId: item.product_id || null,
          rating: item.rating ?? null,
          reviews: item.reviews ?? null
        }))
        .filter(item => item.title && item.link);

      // Sort products with available prices first.
      products.sort((a, b) => {
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return a.price - b.price;
      });

      console.log("Valid products returned:", products.length);
      console.log("====================================\n");

      return res.json({
        product: searchQuery,
        results: products,
        lowestPrice: products.find(item => item.price !== null) || null,
        message: products.length
          ? "Shopping results found. Check product variants before purchasing."
          : "No usable product links were returned by Google Shopping."
      });

    } catch (error) {
      console.error("Smart Shopping error:", error.message);

      if (error.response) {
        console.error("API response:", error.response.data);
      }

      return res.status(502).json({
        message:
          "Unable to retrieve shopping results. Please try again."
      });
    }
  });

  return router;
}

module.exports = shoppingRoutes;
