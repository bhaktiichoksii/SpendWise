
function AccountList({ accounts = [] }) {
  return (
    <section>
      <h2>Connected Bank Accounts</h2>

      {accounts.length === 0 && (
        <p>No bank accounts added yet.</p>
      )}

      {accounts.map(account => (
        <div
          key={account.id}
          style={{
            padding: "14px",
            marginBottom: "10px",
            border: "1px solid #ddd",
            borderRadius: "10px"
          }}
        >
          <strong>{account.bank_name}</strong>

          <p>
            Account ending in {account.account_last4 || "Not provided"}
          </p>

          <h3>
            {account.balance === null
              ? "Balance not available"
              : `₹${Number(account.balance).toLocaleString("en-IN")}`}
          </h3>

          <small>
            {account.balance_updated_at
              ? `Last updated: ${new Date(account.balance_updated_at).toLocaleString()}`
              : "Bank connection pending"}
          </small>
        </div>
      ))}
    </section>
  );
}

export default AccountList;
