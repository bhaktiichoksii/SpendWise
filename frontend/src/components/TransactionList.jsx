
function TransactionList({ transactions = [], onDelete }) {
  const money = value =>
    `₹${Number(value).toLocaleString("en-IN")}`;

  return (
    <section>
      <h2>Recent Transactions</h2>

      {transactions.length === 0 && (
        <p>No transactions available.</p>
      )}

      {transactions.map(transaction => (
        <div
          key={transaction.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            padding: "12px",
            marginBottom: "10px",
            border: "1px solid #ddd",
            borderRadius: "10px"
          }}
        >
          <div>
            <strong>
              {transaction.description || transaction.category}
            </strong>
            <p>{transaction.type} · {transaction.category}</p>
            <small>
              {String(transaction.date || "").slice(0, 10)}
            </small>
          </div>

          <div>
            <strong>
              {transaction.type === "Income" ? "+" : "-"}
              {money(transaction.amount)}
            </strong>

            <br />

            {onDelete && (
              <button onClick={() => onDelete(transaction.id)}>
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

export default TransactionList;
