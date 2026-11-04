
import { useEffect, useState } from "react";
import "./Wallets.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/wallets`;

function Wallets() {
  const [wallets, setWallets] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("Wallet");
  const [balance, setBalance] = useState("");
  const [message, setMessage] = useState("");

  async function loadWallets() {
    try {
      const response = await fetch(API, {
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message);

      setWallets(data.wallets || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function addWallet(e) {
    e.preventDefault();
    setMessage("");

    try {
      const response = await fetch(API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_name: name,
          wallet_type: type,
          balance
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message);

      setName("");
      setBalance("");
      setMessage(data.message || "Wallet added successfully.");

      await loadWallets();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateBalance(id, currentBalance) {
    const value = prompt("Enter updated balance:", currentBalance);

    if (value === null || value.trim() === "") return;

    try {
      const response = await fetch(`${API}/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance: value })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message);

      setMessage(data.message || "Balance updated successfully.");

      await loadWallets();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteWallet(id) {
    if (!window.confirm("Are you sure you want to remove this wallet?")) {
      return;
    }

    try {
      const response = await fetch(`${API}/${id}`, {
        method: "DELETE",
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message);

      setMessage(data.message || "Wallet removed successfully.");

      await loadWallets();
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadWallets();
  }, []);

  return (
    <div className="wallets-page">
      <div className="wallets-header">
        <h2>Wallets & Cash</h2>
        <p>Manage your digital wallet and cash balances.</p>
      </div>

      <div className="wallet-form-card">
        <h3>Add Wallet or Cash</h3>
        <p>Add your digital wallet or available cash balance.</p>

        <form className="wallet-form" onSubmit={addWallet}>
          <div className="wallet-form-group">
            <label htmlFor="walletName">Wallet Name</label>
            <input
              id="walletName"
              type="text"
              placeholder="e.g. Paytm, PhonePe, Google Pay"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              required
            />
          </div>

          <div className="wallet-form-group">
            <label htmlFor="walletType">Account Type</label>
            <select
              id="walletType"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              <option value="Wallet">Digital Wallet</option>
              <option value="Cash">Cash</option>
            </select>
          </div>

          <div className="wallet-form-group">
            <label htmlFor="walletBalance">Current Balance (₹)</label>
            <input
              id="walletBalance"
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter current balance"
              value={balance}
              onChange={e => setBalance(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="wallet-submit-button">
            Add Wallet
          </button>
        </form>
      </div>

      {message && <p className="wallet-message">{message}</p>}

      <div className="wallets-list-section">
        <div className="wallets-list-header">
          <div>
            <h3>Your Wallets</h3>
            <p>Your saved digital wallets and cash balances.</p>
          </div>
          <span className="wallet-count">{wallets.length} Accounts</span>
        </div>

        {wallets.length === 0 ? (
          <div className="wallets-empty">
            <div className="wallet-empty-icon">₹</div>
            <h4>No wallets added yet</h4>
            <p>Add your first digital wallet or cash balance to get started.</p>
          </div>
        ) : (
          <div className="wallets-grid">
            {wallets.map(wallet => (
              <div key={wallet.id} className="wallet-card">
                <div className="wallet-card-top">
                  <div className="wallet-icon">
                    {wallet.wallet_type === "Cash" ? "₹" : "▣"}
                  </div>
                  <span className="wallet-type">
                    {wallet.wallet_type === "Cash" ? "Cash" : "Digital Wallet"}
                  </span>
                </div>

                <h4>{wallet.wallet_name}</h4>

                <div className="wallet-card-balance">
                  <span>Available Balance</span>
                  <strong>
                    ₹{Number(wallet.balance).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </strong>
                </div>

                <div className="wallet-card-actions">
                  <button
                    type="button"
                    className="wallet-update-button"
                    onClick={() => updateBalance(wallet.id, wallet.balance)}
                  >
                    Update Balance
                  </button>

                  <button
                    type="button"
                    className="wallet-remove-button"
                    onClick={() => deleteWallet(wallet.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Wallets;
