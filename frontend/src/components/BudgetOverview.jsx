
import "./BudgetOverview.css";

function BudgetOverview({ budgets = [] }) {
  const money = value =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

  if (budgets.length === 0) {
    return (
      <section className="budget-overview">
        <h2>Monthly Budgets</h2>
        <p>No budgets set yet.</p>
      </section>
    );
  }

  return (
    <section className="budget-overview">
      <h2>Monthly Budgets</h2>

      <div className="budget-overview-grid">
        {budgets.map(budget => {
          const limit = Number(budget.limit || 0);
          const spent = Number(budget.spent || 0);
          const remaining = limit - spent;
          const percentage = limit > 0
            ? (spent / limit) * 100
            : 0;

          return (
            <div
              className="budget-overview-card"
              key={budget.category}
            >
              <h3>{budget.category}</h3>

              <p>
                Spent: {money(spent)} / {money(limit)}
              </p>

              <progress
                value={Math.min(percentage, 100)}
                max="100"
              />

              <p className="budget-overview-remaining">
                {remaining >= 0
                  ? `${money(remaining)} remaining`
                  : `${money(Math.abs(remaining))} over budget`}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default BudgetOverview;
