
import { useEffect, useState } from "react";
import "./Dashboard.css";

import Accounts from "./pages/Accounts";
import Wallets from "./pages/Wallets";
import Reports from "./pages/Reports";
import Shopping from "./pages/Shopping";
import Account from "./pages/Account";
import Settings from "./pages/Settings";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/transactions`;
const BUDGET_API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/budgets`;
const ACCOUNT_API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/accounts`;
const WALLET_API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/wallets`;
const CATEGORY_API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/categories`;

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatUpdateDate = (value) => {
  if (!value) return null;
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const defaultCategories = {
  Income: ["Salary", "Freelance", "Business", "Gift", "Other"],
  Expense: [
    "Food", "Shopping", "Travel", "Bills",
    "Education", "Health", "Entertainment", "Other",
  ],
};

function Dashboard({ user, onUserUpdated, onLogout, onNotify }) {
  const [displayUser, setDisplayUser] = useState(user);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [customCategories, setCustomCategories] = useState({
    Income: [],
    Expense: [],
  });
  const [customCategoryRecords, setCustomCategoryRecords] = useState([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);

  const categories = {
    Income: [
      ...defaultCategories.Income,
      ...customCategories.Income.filter(
        (item) => !defaultCategories.Income.includes(item)
      ),
    ],
    Expense: [
      ...defaultCategories.Expense,
      ...customCategories.Expense.filter(
        (item) => !defaultCategories.Expense.includes(item)
      ),
    ],
  };

  const [activePage, setActivePage] = useState("Overview");
  const [showForm, setShowForm] = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayUser(user);
  }, [user]);

  const [budgetForm, setBudgetForm] = useState({
    category: "Food",
    limit: "",
  });

  const [form, setForm] = useState({
    type: "Expense",
    amount: "",
    category: "Food",
    description: "",
    date: new Date().toLocaleDateString("en-CA"),
  });

  async function loadTransactions() {
    try {
      const response = await fetch(API, { credentials: "include" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load transactions.");
      }

      setTransactions(data.transactions || []);
    } catch (error) {
      onNotify(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const response = await fetch(CATEGORY_API, { credentials: "include" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load categories.");
      }

      const savedCategories = data.categories || [];
      setCustomCategoryRecords(savedCategories);
      setCustomCategories({
        Income: savedCategories
          .filter((item) => item.type === "Income")
          .map((item) => item.category_name),
        Expense: savedCategories
          .filter((item) => item.type === "Expense")
          .map((item) => item.category_name),
      });
    } catch (error) {
      onNotify(error.message, "error");
    }
  }

  async function loadBudgets() {
    try {
      const response = await fetch(BUDGET_API, {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load budgets.");
      }

      setBudgets(data.budgets || []);
    } catch (error) {
      onNotify(error.message, "error");
    }
  }

  async function loadAccounts() {
    try {
      const response = await fetch(ACCOUNT_API, {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load bank accounts.");
      }

      setAccounts(data.accounts || []);
    } catch (error) {
      onNotify(error.message, "error");
    }
  }

  async function loadWallets() {
    try {
      const response = await fetch(WALLET_API, {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load wallets.");
      }

      setWallets(data.wallets || []);
    } catch (error) {
      onNotify(error.message, "error");
    }
  }

  useEffect(() => {
    loadTransactions();
    loadBudgets();
    loadAccounts();
    loadWallets();
    loadCategories();
  }, []);

  const totalIncome = transactions
    .filter((item) => item.type === "Income")
    .reduce((total, item) => total + Number(item.amount), 0);

  const totalExpenses = transactions
    .filter((item) => item.type === "Expense")
    .reduce((total, item) => total + Number(item.amount), 0);

  const balance = totalIncome - totalExpenses;

  const bankTotal = accounts.reduce(
    (total, account) => total + Number(account.balance || 0),
    0
  );

  const walletTotal = wallets
    .filter((item) => item.wallet_type === "Wallet")
    .reduce((total, item) => total + Number(item.balance || 0), 0);

  const cashTotal = wallets
    .filter((item) => item.wallet_type === "Cash")
    .reduce((total, item) => total + Number(item.balance || 0), 0);

  const totalAvailableMoney = bankTotal + walletTotal + cashTotal;

  const latestBankUpdate = accounts
    .filter((account) => account.balance_updated_at)
    .map((account) => ({
      value: account.balance_updated_at,
      date: new Date(String(account.balance_updated_at).replace(" ", "T")),
    }))
    .filter((item) => !Number.isNaN(item.date.getTime()))
    .sort((a, b) => b.date - a.date)[0];

  function openForm(type = "Expense") {
    setForm({
      type,
      amount: "",
      category: categories[type][0],
      description: "",
      date: new Date().toLocaleDateString("en-CA"),
    });
    setShowForm(true);
  }

  function openBudgetForm() {
    setBudgetForm({ category: "Food", limit: "" });
    setShowBudgetForm(true);
  }

  function handleTypeChange(type) {
    setForm({ ...form, type, category: categories[type][0] });
    setShowCategoryDropdown(false);
  }

  async function handleAddCategory() {
    const categoryName = newCategoryName.trim();

    if (!categoryName) {
      onNotify("Please enter a category name.", "error");
      return;
    }

    if (categoryName.length > 50) {
      onNotify("Category name must be 50 characters or fewer.", "error");
      return;
    }

    const existingNames = categories[form.type].map((name) => name.toLowerCase());
    if (existingNames.includes(categoryName.toLowerCase())) {
      onNotify("This category already exists.", "error");
      return;
    }

    setCategorySaving(true);
    try {
      const response = await fetch(CATEGORY_API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_name: categoryName, type: form.type }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not add category.");
      }

      await loadCategories();
      setForm((previous) => ({ ...previous, category: categoryName }));
      setNewCategoryName("");
      setShowCategoryForm(false);
      setShowCategoryDropdown(false);
      onNotify("Category added successfully!", "info");
    } catch (error) {
      onNotify(error.message, "error");
    } finally {
      setCategorySaving(false);
    }
  }

  async function handleDeleteCategory(category) {
    const confirmed = window.confirm(
      `Delete the custom category "${category.category_name}"?`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`${CATEGORY_API}/${category.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not delete category.");
      }

      await loadCategories();
      setShowCategoryDropdown(false);
      if (form.category === category.category_name) {
        setForm((previous) => ({
          ...previous,
          category: defaultCategories[previous.type][0],
        }));
      }
      onNotify("Category deleted successfully.", "info");
    } catch (error) {
      onNotify(error.message, "error");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      onNotify("Please enter a valid amount.", "error");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount,
          description: form.description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save transaction.");
      }

      await loadTransactions();
      await loadBudgets();
      setShowForm(false);
      onNotify(`${form.type} added successfully!`, "info");
    } catch (error) {
      onNotify(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleBudgetSubmit(event) {
    event.preventDefault();

    const limit = Number(budgetForm.limit);

    if (!Number.isFinite(limit) || limit <= 0) {
      onNotify("Please enter a valid budget amount.", "error");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(BUDGET_API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: budgetForm.category,
          limit,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save budget.");
      }

      await loadBudgets();
      setShowBudgetForm(false);
      onNotify("Monthly budget saved successfully!", "info");
    } catch (error) {
      onNotify(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTransaction(id) {
    try {
      const response = await fetch(`${API}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not delete transaction.");
      }

      await loadTransactions();
      await loadBudgets();
      onNotify("Transaction deleted.", "info");
    } catch (error) {
      onNotify(error.message, "error");
    }
  }

  function updateUser(updatedUser) {
    setDisplayUser(updatedUser);

    if (onUserUpdated) {
        onUserUpdated(updatedUser);
    }
    }

  const visibleTransactions = transactions.filter(
    (item) => filter === "All" || item.type === filter
  );

  const navigation = [
    { name: "Overview", icon: "▦" },
    { name: "Transactions", icon: "↕" },
    { name: "Budgets", icon: "◷" },
    { name: "Bank Accounts", icon: "▣" },
    { name: "Wallets & Cash", icon: "▤" },
    { name: "Reports", icon: "▥" },
    { name: "Smart Shopping", icon: "⌕" },
  ];

  function renderPage() {
    switch (activePage) {
      case "Bank Accounts":
        return <Accounts />;

      case "Wallets & Cash":
        return <Wallets />;

      case "Reports":
        return <Reports />;

      case "Smart Shopping":
        return <Shopping />;

      case "Account":
        return (
          <Account
            user={displayUser}
            onUserUpdated={updateUser}
            onNotify={onNotify}
          />
        );

      case "Settings":
        return <Settings onNotify={onNotify} />;

      case "Transactions":
        return (
          <article className="dashboard-panel">
            <div className="dashboard-section-header">
              <div>
                <h2>All Transactions</h2>
                <p>View and manage your income and expenses.</p>
              </div>
              <button
                className="dashboard-primary"
                onClick={() => openForm()}
              >
                + Add transaction
              </button>
            </div>

            <TransactionTable
              transactions={visibleTransactions}
              filter={filter}
              setFilter={setFilter}
              loading={loading}
              onDelete={deleteTransaction}
            />
          </article>
        );

      case "Budgets":
        return (
          <article className="dashboard-panel">
            <div className="dashboard-section-header">
              <div>
                <h2>Monthly Category Budgets</h2>
                <p>Track your monthly spending limits.</p>
              </div>
              <button
                className="dashboard-primary"
                onClick={openBudgetForm}
              >
                + Set budget
              </button>
            </div>

            <BudgetCards budgets={budgets} />
          </article>
        );

      default:
        return (
          <>
            <div className="dashboard-balances">
              <article className="balance-card balance-main">
                <p>Available balance</p>
                <h2>{money(balance)}</h2>
                <small>Income minus expenses</small>
              </article>

              <article className="balance-card">
                <p>Total income</p>
                <h2>{money(totalIncome)}</h2>
                <small>
                  {transactions.filter((t) => t.type === "Income").length} income transactions
                </small>
              </article>

              <article className="balance-card">
                <p>Total expenses</p>
                <h2>{money(totalExpenses)}</h2>
                <small>
                  {transactions.filter((t) => t.type === "Expense").length} expense transactions
                </small>
              </article>
            </div>

            <article className="dashboard-panel dashboard-money-panel">
              <h2>Total Available Money</h2>
              <h2>{money(totalAvailableMoney)}</h2>
              <p>Your combined money across bank accounts, wallets and cash.</p>

              <div className="dashboard-source-balances">
                <article className="dashboard-source-card">
                  <span className="dashboard-source-icon">▣</span>
                  <p>Bank balance</p>
                  <h3>{money(bankTotal)}</h3>
                  <small>{accounts.length} bank account{accounts.length === 1 ? "" : "s"}</small>
                </article>
                <article className="dashboard-source-card">
                  <span className="dashboard-source-icon">▤</span>
                  <p>Wallet balance</p>
                  <h3>{money(walletTotal)}</h3>
                  <small>All your wallets</small>
                </article>
                <article className="dashboard-source-card">
                  <span className="dashboard-source-icon">₹</span>
                  <p>Cash balance</p>
                  <h3>{money(cashTotal)}</h3>
                  <small>Cash on hand</small>
                </article>
              </div>

              <div className="dashboard-bank-update">
                <strong>Bank balance last updated:</strong>
                <span>
                  {latestBankUpdate
                    ? formatUpdateDate(latestBankUpdate.value)
                    : "No balance update available"}
                </span>
              </div>
              <small>Bank balances are manually entered and are not verified by your bank.</small>
            </article>

            <div className="dashboard-panels">
              <article className="dashboard-panel">
                <h2>Spending overview</h2>
                <p>Your income and expenses at a glance.</p>

                <div className="dashboard-progress-area">
                  <div className="dashboard-progress-heading">
                    <span>Income</span>
                    <strong>{money(totalIncome)}</strong>
                  </div>
                  <div className="dashboard-progress-track">
                    <div
                      className="dashboard-progress-income"
                      style={{
                        width: `${totalIncome / Math.max(totalIncome, totalExpenses, 1) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="dashboard-progress-heading dashboard-progress-second">
                    <span>Expenses</span>
                    <strong>{money(totalExpenses)}</strong>
                  </div>
                  <div className="dashboard-progress-track">
                    <div
                      className="dashboard-progress-expense"
                      style={{
                        width: `${totalExpenses / Math.max(totalIncome, totalExpenses, 1) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {transactions.length === 0 && (
                  <div className="dashboard-empty">
                    Add your first transaction to see your spending.
                  </div>
                )}
              </article>

              <article className="dashboard-panel">
                <h2>Quick actions</h2>
                <p>Choose what you want to do next.</p>

                <div className="dashboard-actions">
                  <button onClick={() => openForm("Income")}>
                    ＋ &nbsp; Add income
                  </button>
                  <button onClick={() => openForm("Expense")}>
                    − &nbsp; Add expense
                  </button>
                  <button onClick={openBudgetForm}>
                    ◎ &nbsp; Set a monthly budget
                  </button>
                  <button onClick={() => setActivePage("Smart Shopping")}>
                    ⌕ &nbsp; Compare product prices
                  </button>
                </div>
              </article>
            </div>

            <article className="dashboard-panel dashboard-section-panel">
              <div className="dashboard-section-header">
                <div>
                  <h2>Monthly category budgets</h2>
                  <p>Track how much you spend in each category this month.</p>
                </div>
                <button className="dashboard-primary" onClick={openBudgetForm}>
                  + Set budget
                </button>
              </div>
              <BudgetCards budgets={budgets} />
            </article>

            <article className="dashboard-panel dashboard-section-panel">
              <div className="dashboard-section-header">
                <div>
                  <h2>Recent transactions</h2>
                  <p>View and manage your income and expenses.</p>
                </div>
                <button
                  className="dashboard-text-button"
                  onClick={() => setActivePage("Transactions")}
                >
                  View all
                </button>
              </div>

              <TransactionTable
                transactions={transactions.slice(0, 5)}
                filter="All"
                setFilter={setFilter}
                loading={loading}
                onDelete={deleteTransaction}
                showFilter={false}
              />
            </article>
          </>
        );
    }
  }

  return (
    <main className="dashboard">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-logo">₹</div>
          <div>
            <h2>Spend<span>Wise</span></h2>
            <p>SMART MONEY ASSISTANT</p>
          </div>
        </div>

        <nav className="dashboard-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.name}
              className={
                activePage === item.name ? "dashboard-nav-active" : ""
              }
              onClick={() => setActivePage(item.name)}
            >
              {item.icon} &nbsp; {item.name}
            </button>
          ))}
        </nav>

        <div className="dashboard-account">
          <p>{displayUser?.email}</p>
          <button
            className="dashboard-logout"
            onClick={onLogout}
          >
            ↗ &nbsp; Log out
          </button>
        </div>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">YOUR FINANCIAL OVERVIEW</p>
            <h1>
              {activePage === "Overview"
                ? `Welcome back, ${displayUser?.name || "User"}!`
                : activePage}
            </h1>
            <p className="dashboard-subtitle">
              {activePage === "Overview"
                ? "Here's a simple snapshot of your money."
                : `Manage your ${activePage.toLowerCase()} in SpendWise.`}
            </p>
          </div>

          <div className="dashboard-header-actions">
            {["Overview", "Transactions"].includes(activePage) && (
              <button
                className="dashboard-primary"
                onClick={() => openForm()}
              >
                + Add transaction
              </button>
            )}

            <div className="profile-menu-container">
              <button
                type="button"
                className="profile-menu-button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                aria-expanded={showProfileMenu}
                aria-label="Open profile menu"
              >
                <span className="profile-menu-avatar">
                  {(displayUser?.name?.[0] || "U").toUpperCase()}
                </span>
                <span className="profile-menu-name">
                  {displayUser?.name || "Account"}
                </span>
                <span className="profile-menu-arrow">⌄</span>
              </button>

              {showProfileMenu && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-info">
                    <strong>{displayUser?.name || "User"}</strong>
                    <span>{displayUser?.email}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActivePage("Account");
                      setShowProfileMenu(false);
                    }}
                  >
                    <span>♙</span> Account
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActivePage("Settings");
                      setShowProfileMenu(false);
                    }}
                  >
                    <span>⚙</span> Settings
                  </button>

                  <div className="profile-dropdown-divider" />

                  <button
                    type="button"
                    className="profile-dropdown-logout"
                    onClick={onLogout}
                  >
                    <span>↗</span> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {renderPage()}

        <p className="dashboard-footer">
          SpendWise · Plan thoughtfully. Spend wisely.
        </p>
      </section>

      {showForm && (
        <div
          className="dashboard-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowForm(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-title"
            className="dashboard-modal"
          >
            <div className="dashboard-modal-header">
              <div>
                <h2 id="transaction-title">Add transaction</h2>
                <p>Record money coming in or going out.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
                className="dashboard-close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="dashboard-label">
                Transaction type
                <select
                  value={form.type}
                  onChange={(event) => handleTypeChange(event.target.value)}
                  className="dashboard-input"
                >
                  <option>Income</option>
                  <option>Expense</option>
                </select>
              </label>

              <label className="dashboard-label">
                Amount (₹)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Enter amount"
                  value={form.amount}
                  onChange={(event) =>
                    setForm({ ...form, amount: event.target.value })
                  }
                  className="dashboard-input"
                  required
                />
              </label>

              <div className="dashboard-label" style={{ position: "relative" }}>
                <span>Category</span>
                <button
                  type="button"
                  className="dashboard-input"
                  onClick={() => setShowCategoryDropdown((open) => !open)}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", background: "white", cursor: "pointer" }}
                >
                  <span>{form.category}</span>
                  <span>{showCategoryDropdown ? "⌃" : "⌄"}</span>
                </button>

                {showCategoryDropdown && (
                  <div style={{ position: "absolute", zIndex: 30, top: "100%", left: 0, right: 0, maxHeight: "240px", overflowY: "auto", background: "white", border: "1px solid #d9cfe5", borderRadius: "8px", boxShadow: "0 8px 20px rgba(40, 20, 60, 0.12)" }}>
                    {categories[form.type].map((category) => {
                      const customRecord = customCategoryRecords.find(
                        (item) => item.type === form.type && item.category_name === category
                      );
                      return (
                        <div key={category} style={{ display: "flex", alignItems: "center", padding: "0 10px", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setForm((previous) => ({ ...previous, category }));
                              setShowCategoryDropdown(false);
                            }}
                            style={{ flex: 1, textAlign: "left", padding: "10px 4px", border: 0, background: "transparent", color: "#342047", cursor: "pointer" }}
                          >
                            {category}
                          </button>
                          {customRecord && (
                            <button
                              type="button"
                              title={`Delete ${category}`}
                              aria-label={`Delete ${category}`}
                              onClick={() => handleDeleteCategory(customRecord)}
                              style={{ width: "25px", height: "25px", border: 0, borderRadius: "50%", background: "#fee2e2", color: "#dc2626", fontWeight: 700, cursor: "pointer" }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryForm(true);
                        setShowCategoryDropdown(false);
                      }}
                      style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: 0, borderTop: "1px solid #eee", background: "white", color: "#6d28d9", cursor: "pointer" }}
                    >
                      + Add Category
                    </button>
                  </div>
                )}
              </div>

              {showCategoryForm && (
                <div className="dashboard-category-form">
                  <label className="dashboard-label">
                    New {form.type.toLowerCase()} category
                    <input
                      type="text"
                      maxLength="50"
                      placeholder="Enter category name"
                      value={newCategoryName}
                      onChange={(event) => setNewCategoryName(event.target.value)}
                      className="dashboard-input"
                      autoFocus
                      required
                    />
                  </label>
                  <div className="dashboard-form-buttons">
                    <button
                      type="button"
                      className="dashboard-cancel"
                      onClick={() => {
                        setShowCategoryForm(false);
                        setNewCategoryName("");
                      }}
                    >
                      Cancel
                    </button>
                    <button type="button" onClick={handleAddCategory} className="dashboard-primary" disabled={categorySaving}>
                      {categorySaving ? "Adding..." : "Add category"}
                    </button>
                  </div>
                </div>
              )}


              <label className="dashboard-label">
                Description (optional)
                <input
                  type="text"
                  maxLength="100"
                  placeholder="e.g. Monthly salary"
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  className="dashboard-input"
                />
              </label>

              <label className="dashboard-label">
                Date
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm({ ...form, date: event.target.value })
                  }
                  className="dashboard-input"
                  required
                />
              </label>

              <div className="dashboard-form-buttons">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="dashboard-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="dashboard-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save transaction"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showBudgetForm && (
        <div
          className="dashboard-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowBudgetForm(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="budget-title"
            className="dashboard-modal"
          >
            <div className="dashboard-modal-header">
              <div>
                <h2 id="budget-title">Set monthly budget</h2>
                <p>Choose a category and its monthly spending limit.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowBudgetForm(false)}
                aria-label="Close form"
                className="dashboard-close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleBudgetSubmit}>
              <label className="dashboard-label">
                Expense category
                <select
                  value={budgetForm.category}
                  onChange={(event) =>
                    setBudgetForm({
                      ...budgetForm,
                      category: event.target.value,
                    })
                  }
                  className="dashboard-input"
                >
                  {categories.Expense.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="dashboard-label">
                Monthly limit (₹)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 3000"
                  value={budgetForm.limit}
                  onChange={(event) =>
                    setBudgetForm({
                      ...budgetForm,
                      limit: event.target.value,
                    })
                  }
                  className="dashboard-input"
                  required
                />
              </label>

              <p className="dashboard-form-note">
                Setting a budget for an existing category updates its limit.
              </p>

              <div className="dashboard-form-buttons">
                <button
                  type="button"
                  onClick={() => setShowBudgetForm(false)}
                  className="dashboard-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="dashboard-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save budget"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function TransactionTable({
  transactions,
  filter,
  setFilter,
  loading,
  onDelete,
  showFilter = true,
}) {
  return (
    <>
      {showFilter && (
        <div className="dashboard-table-filter">
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter transactions"
          >
            <option>All</option>
            <option>Income</option>
            <option>Expense</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="dashboard-empty">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="dashboard-empty">No transactions available.</div>
      ) : (
        <div className="dashboard-table-scroll">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Category</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.description || item.category}</strong>
                    <div className="dashboard-muted">{item.type}</div>
                  </td>
                  <td>{item.category}</td>
                  <td>{String(item.date || "").slice(0, 10)}</td>
                  <td
                    className={
                      item.type === "Income"
                        ? "dashboard-income-text"
                        : "dashboard-expense-text"
                    }
                  >
                    {item.type === "Income" ? "+" : "−"}
                    {money(item.amount)}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      className="dashboard-delete"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function BudgetCards({ budgets }) {
  if (budgets.length === 0) {
    return (
      <div className="dashboard-empty">
        No budgets set yet. Set your first category budget to get started.
      </div>
    );
  }

  return (
    <div className="dashboard-budget-grid">
      {budgets.map((budget) => {
        const limit = Number(budget.limit || 0);
        const spent = Number(budget.spent || 0);
        const remaining = Number(
          budget.remaining ?? limit - spent
        );

        const percentage = limit > 0 ? (spent / limit) * 100 : 0;
        const exceeded = percentage >= 100;
        const warning = percentage >= 80 && !exceeded;

        return (
          <div key={budget.category} className="dashboard-budget-card">
            <div className="dashboard-budget-title">
              <strong>{budget.category}</strong>
              <span
                className={
                  exceeded
                    ? "dashboard-budget-danger"
                    : warning
                    ? "dashboard-budget-warning"
                    : "dashboard-budget-good"
                }
              >
                {exceeded ? "Over budget" : warning ? "Near limit" : "On track"}
              </span>
            </div>

            <h3>{money(spent)}</h3>
            <p className="dashboard-muted">
              of {money(limit)} budget
            </p>

            <div className="dashboard-progress-track">
              <div
                className={
                  exceeded
                    ? "dashboard-progress-expense"
                    : warning
                    ? "dashboard-progress-warning"
                    : "dashboard-progress-income"
                }
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>

            <div className="dashboard-budget-footer">
              <span>{Math.round(percentage)}% used</span>
              <strong>
                {remaining >= 0
                  ? `${money(remaining)} left`
                  : `${money(Math.abs(remaining))} over`}
              </strong>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Dashboard;
