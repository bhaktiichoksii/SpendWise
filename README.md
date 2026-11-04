# SpendWise – Smart Personal Finance

SpendWise is a personal finance management application that helps users track their money, manage expenses, monitor budgets, and compare product prices to make smarter purchasing decisions.

## ✨ Features

- **Authentication:** Email/password login, Google Sign-In, OTP verification, and trusted device management.
- **Dashboard:** View financial balances and spending information.
- **Balance Management:** Manually add and manage account balances.
- **Transactions:** Track income and expenses.
- **Budget Management:** Set budgets and monitor spending.
- **Reports:** View financial summaries and reports.
- **Smart Shopping:** Search for products and compare prices to find lower-cost options.
- **Account & Wallet Management:** Manage financial accounts and wallets.

## 🛠️ Tech Stack

| Frontend | Backend | Database |
|---|---|---|
| React.js | Node.js | MySQL |
| Vite | Express.js | |
| CSS | REST APIs | |

**Other Tools:** Git, GitHub, Google OAuth, Nodemailer, SerpAPI.

## 📁 Project Structure

```text
SpendWise/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── routes/
│
└── frontend/
    ├── src/
    ├── public/
    ├── package.json
    └── index.html
```

## 🚀 Run Locally

**1. Clone the repository**

```bash
git clone https://github.com/bhaktiichoksii/SpendWise.git
cd SpendWise
```

**2. Start the backend**

```bash
cd backend
npm install
```

Create a `.env` file in the backend folder and configure your MySQL, JWT, email, Google OAuth, and API credentials.

```bash
npm start
```

**3. Start the frontend**

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000
```

Run:

```bash
npm run dev
```

Open the local URL displayed by Vite (usually `http://localhost:5173`).

## 🔐 Environment Variables

Configure the required backend variables in `backend/.env`:

- `PORT`
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`
- `FRONTEND_URL`
- `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `EMAIL_FROM`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `SERPAPI_KEY`

Never upload your `.env` files or expose secret credentials.

## 👩‍💻 Developer

**Bhakti Choksi**

- GitHub: [@bhaktiichoksii](https://github.com/bhaktiichoksii)
- Project: [SpendWise](https://github.com/bhaktiichoksii/SpendWise)

---

*SpendWise – Track Better. Spend Smarter.*