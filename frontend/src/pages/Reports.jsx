
import { useEffect, useState } from "react";
import "./Reports.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/reports/monthly`;

function Reports() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  async function loadReport() {
    try {
      const response = await fetch(API, {
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message);

      setReport(data);
    } catch (err) {
      setError(err.message || "Unable to load reports.");
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  const money = value =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

  if (error) {
    return (
      <div className="reports-page">
        <p className="reports-error">{error}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="reports-page">
        <p className="reports-loading">Loading reports...</p>
      </div>
    );
  }

  const categories = report.categories || [];

  const totalExpenses = Number(report.expenses || 0);

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h2>Monthly Reports</h2>
        <p>Your financial summary for this month.</p>
      </div>

      {/* Financial Summary */}
      <div className="report-summary-grid">
        <div className="report-summary-card income-card">
          <div className="report-card-top">
            <span className="report-card-label">Income</span>
            <span className="report-card-icon">↗</span>
          </div>
          <strong>{money(report.income)}</strong>
          <small>Total income this month</small>
        </div>

        <div className="report-summary-card expense-card">
          <div className="report-card-top">
            <span className="report-card-label">Expenses</span>
            <span className="report-card-icon">↘</span>
          </div>
          <strong>{money(report.expenses)}</strong>
          <small>Total expenses this month</small>
        </div>

        <div className="report-summary-card savings-card">
          <div className="report-card-top">
            <span className="report-card-label">Savings</span>
            <span className="report-card-icon">₹</span>
          </div>
          <strong>{money(report.savings)}</strong>
          <small>Remaining amount this month</small>
        </div>
      </div>

      {/* Category-wise Expenses */}
      <div className="category-report-section">
        <div className="category-report-header">
          <div>
            <h3>Category-wise Expenses</h3>
            <p>See where your money is being spent.</p>
          </div>
          <span className="category-count">
            {categories.length} Categories
          </span>
        </div>

        {categories.length === 0 ? (
          <div className="reports-empty">
            <div className="reports-empty-icon">₹</div>
            <h4>No expenses recorded this month</h4>
            <p>Your expense categories will appear here when you add expenses.</p>
          </div>
        ) : (
          <div className="category-report-list">
            {categories.map(item => {
              const percentage =
                totalExpenses > 0
                  ? Math.min((Number(item.total) / totalExpenses) * 100, 100)
                  : 0;

              return (
                <div className="category-report-item" key={item.category}>
                  <div className="category-report-info">
                    <strong>{item.category}</strong>
                    <span>{money(item.total)}</span>
                  </div>

                  <div className="category-progress-track">
                    <div
                      className="category-progress-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <small>{percentage.toFixed(1)}% of total expenses</small>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;
