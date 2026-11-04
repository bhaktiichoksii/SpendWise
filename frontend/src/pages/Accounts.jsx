
import { useEffect, useState } from "react";
import "./Accounts.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/accounts`;

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

function Accounts() {
  const [accounts, setAccounts] = useState([]);

  const [bankName, setBankName] = useState("");
  const [holderName, setHolderName] = useState("");
  const [last4, setLast4] = useState("");
  const [balance, setBalance] = useState("");

  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [newBalance, setNewBalance] = useState("");

  async function loadAccounts() {
    try {
      const response = await fetch(API, {
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load accounts.");
      }

      setAccounts(data.accounts || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  // Add a bank account manually.
  async function addAccount(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch(API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_name: bankName,
          account_holder_name: holderName.trim(),
          account_last4: last4,
          balance: balance === "" ? null : balance
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to add bank account.");
      }

      setBankName("");
      setHolderName("");
      setLast4("");
      setBalance("");

      setMessage(data.message || "Bank account added successfully.");

      await loadAccounts();
    } catch (error) {
      setMessage(error.message);
    }
  }

  // Update an existing account balance.
  async function updateBalance(id) {
    setMessage("");

    try {
      const response = await fetch(`${API}/${id}/balance`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance: newBalance })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update balance.");
      }

      setEditingId(null);
      setNewBalance("");
      setMessage(data.message || "Balance updated successfully.");

      await loadAccounts();
    } catch (error) {
      setMessage(error.message);
    }
  }

  // Remove a bank account.
  async function deleteAccount(id) {
    if (!window.confirm("Are you sure you want to remove this account?")) {
      return;
    }

    try {
      const response = await fetch(`${API}/${id}`, {
        method: "DELETE",
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to remove account.");
      }

      setMessage(data.message || "Account removed successfully.");

      await loadAccounts();
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  return (
    <div className="accounts-page">
      <div className="accounts-header">
        <h2>Bank Accounts</h2>
        <p>Manage your bank accounts and view their balances.</p>
      </div>

      {/* Add Bank Account Form */}
      <div className="account-form-card">
        <h3>Add a Bank Account</h3>
        <p>
          Enter your bank details and current account balance.
        </p>

        <form className="account-form" onSubmit={addAccount}>
          <div className="account-form-group">
            <label htmlFor="bankName">Select Bank</label>
            <select
              id="bankName"
              value={bankName}
              onChange={event => setBankName(event.target.value)}
              required
            >
              <option value="">Choose your bank</option>
              {banks.map(bank => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>

          <div className="account-form-group">
            <label htmlFor="holderName">Account Holder Name</label>
            <input
              id="holderName"
              type="text"
              placeholder="Enter account holder name"
              value={holderName}
              onChange={event => setHolderName(event.target.value)}
              maxLength={100}
              required
            />
          </div>

          <div className="account-form-group">
            <label htmlFor="last4">
              Last 4 Digits of Account Number
            </label>
            <input
              id="last4"
              type="text"
              inputMode="numeric"
              placeholder="Enter last 4 digits"
              value={last4}
              onChange={event =>
                setLast4(event.target.value.replace(/\D/g, "").slice(0, 4))
              }
              maxLength={4}
              pattern="[0-9]{4}"
              required
            />
          </div>

          <div className="account-form-group">
            <label htmlFor="balance">Current Balance (₹)</label>
            <input
              id="balance"
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter current balance"
              value={balance}
              onChange={event => setBalance(event.target.value)}
            />
          </div>

          <button type="submit">Add Bank Account</button>
        </form>
      </div>

      {message && <p className="account-message">{message}</p>}

      {/* Saved Accounts */}
      <div className="saved-accounts-section">
        <h3>Saved Accounts</h3>

        {accounts.length === 0 && (
          <div className="accounts-empty">
            No accounts added yet.
          </div>
        )}

        <div className="accounts-grid">
          {accounts.map(account => {
            const isDemo = account.balance_source === "Demo";

            return (
              <div key={account.id} className="account-card">
                <div className="account-card-top">
                  <div className="account-icon">₹</div>
                  <span className="account-status">
                    {isDemo ? "Demo Connected" : "Manual record"}
                  </span>
                </div>

                <h4>{account.bank_name}</h4>

                {account.account_holder_name && (
                  <p>Holder: {account.account_holder_name}</p>
                )}

                <p className="account-number">
                  Account ending in {account.account_last4 || "Not provided"}
                </p>

                <div className="account-balance">
                  <span>
                    {isDemo ? "Demo Balance" : "Manual Balance"}
                  </span>

                  <strong>
                    {account.balance !== null && account.balance !== undefined
                      ? `₹${Number(account.balance).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}`
                      : "Not entered"}
                  </strong>
                </div>

                {editingId === account.id ? (
                  <div className="account-balance-edit">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter new balance"
                      value={newBalance}
                      onChange={event => setNewBalance(event.target.value)}
                    />

                    <button
                      type="button"
                      onClick={() => updateBalance(account.id)}
                    >
                      Save Balance
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setNewBalance("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="account-update-button"
                    onClick={() => {
                      setEditingId(account.id);
                      setNewBalance(
                        account.balance !== null && account.balance !== undefined
                          ? String(account.balance)
                          : ""
                      );
                    }}
                  >
                    Update Balance
                  </button>
                )}

                <button
                  type="button"
                  className="account-remove-button"
                  onClick={() => deleteAccount(account.id)}
                >
                  Remove Account
                </button>

                <small className="account-balance-note">
                  {isDemo
                    ? "Simulated balance. Not connected to your actual bank."
                    : "Manually entered balance. Not verified by your bank."}
                </small>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Accounts;
