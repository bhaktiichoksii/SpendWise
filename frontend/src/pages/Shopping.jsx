
import { useState } from "react";
import "./Shopping.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/shopping/search`;

function Shopping() {
  const [product, setProduct] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function searchProduct(e) {
    e.preventDefault();

    setError("");
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch(
        `${API}?product=${encodeURIComponent(product.trim())}`,
        { credentials: "include" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to search products.");
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shopping-page">
      <div className="shopping-header">
        <div>
          <span className="shopping-eyebrow">SMART SHOPPING</span>
          <h2>Find the same product for less.</h2>
          <p>
            Compare product prices across shopping websites
            before you buy.
          </p>
        </div>

        <div className="shopping-header-icon">₹</div>
      </div>

      <section className="shopping-search-card">
        <div className="shopping-search-heading">
          <div>
            <h3>Compare product prices</h3>
            <p>Paste a product link or enter a product name.</p>
          </div>
          <span className="shopping-search-icon">⌕</span>
        </div>

        <form onSubmit={searchProduct} className="shopping-search-form">
        <div className="shopping-input-wrapper">
          <span>⌕</span>
          <input
            type="text"
            placeholder="Paste product link or search a product..."
            value={product}
            onChange={e => {
              const value = e.target.value;
              setProduct(value);

              if (!value.trim()) {
                setResult(null);
                setError("");
              }
            }}
            required
          />
        </div>

          <button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Compare Prices"}
          </button>
        </form>

        <div className="shopping-search-note">
          <span>ⓘ</span>
          We compare available shopping results. Exact product matches
          must be checked before choosing the lowest price.
        </div>
      </section>

      {error && (
        <div className="shopping-error">
          {error}
        </div>
      )}

      {loading && (
        <div className="shopping-loading">
          <div className="shopping-spinner"></div>
          <p>Searching for available product prices...</p>
        </div>
      )}

      {result && (
        <section className="shopping-results">
          <div className="shopping-results-heading">
            <div>
              <span className="shopping-eyebrow">SEARCH RESULTS</span>
              <h3>Available products</h3>
              <p>{result.message}</p>
            </div>

            <span className="shopping-result-count">
              {result.results?.length || 0} results
            </span>
          </div>

          {result.results?.length > 0 ? (
            <div className="shopping-product-grid">
              {result.results.map((item, index) => (
                <article
                  className="shopping-product-card"
                  key={item.productId || item.link || index}
                >
                  <div className="shopping-product-image">
                    {item.image ? (
                      <img src={item.image} alt={item.title} />
                    ) : (
                      <span>Product image unavailable</span>
                    )}
                  </div>

                  <div className="shopping-product-details">
                    <span className="shopping-store">
                      {item.store}
                    </span>

                    <h4>{item.title}</h4>

                    <div className="shopping-product-price">
                      {item.price !== null && item.price !== undefined
                        ? `₹${Number(item.price).toLocaleString("en-IN")}`
                        : item.priceText}
                    </div>

                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shopping-visit-link"
                    >
                      Visit Store ↗
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="shopping-empty">
              <span>⌕</span>
              <h3>No products found</h3>
              <p>
                Try another product name or a different product link.
              </p>
            </div>
          )}

          <p className="shopping-disclaimer">
            Prices and availability may change on shopping websites.
            Similar search results are not necessarily identical products.
            No lowest-price recommendation is made until an exact match
            is verified.
          </p>
        </section>
      )}

      {!result && !loading && !error && (
        <section className="shopping-empty-start">
          <div className="shopping-empty-icon">₹</div>
          <h3>Shop smarter, save more.</h3>
          <p>
            Search for a product to explore available prices
            from shopping websites.
          </p>
          <div className="shopping-platforms">
            <span>Amazon</span>
            <span>Flipkart</span>
            <span>Meesho</span>
            <span>More stores</span>
          </div>
        </section>
      )}

      <footer className="shopping-footer">
        <span>SpendWise</span>
        <span>Plan thoughtfully. Spend wisely.</span>
      </footer>
    </div>
  );
}

export default Shopping;
