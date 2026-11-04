
function MoneyOverview({ accounts = [], wallets = [] }) {
  const bankTotal = accounts.reduce(
    (sum, account) => sum + Number(account.balance || 0),
    0
  );

  const walletTotal = wallets
    .filter(item => item.wallet_type === "Wallet")
    .reduce((sum, item) => sum + Number(item.balance), 0);

  const cashTotal = wallets
    .filter(item => item.wallet_type === "Cash")
    .reduce((sum, item) => sum + Number(item.balance), 0);

  const total = bankTotal + walletTotal + cashTotal;

  const money = value =>
    `₹${value.toLocaleString("en-IN")}`;

  return (
    <section>
      <h2>Total Available Money</h2>
      <h1>{money(total)}</h1>

      <div>
        <p>Bank Balance: {money(bankTotal)}</p>
        <p>Wallet Balance: {money(walletTotal)}</p>
        <p>Cash Balance: {money(cashTotal)}</p>
      </div>
    </section>
  );
}

export default MoneyOverview;
