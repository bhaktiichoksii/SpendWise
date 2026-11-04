
import { useEffect, useState } from "react";
import "./App.css";
import Dashboard from "./Dashboard";
import OtpVerification from "./pages/OtpVerification";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth`;

function EyeIcon({ hidden }) {
  return hidden ? (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a15.7 15.7 0 0 1-4 4.8" />
      <path d="M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1.2 0 2.3-.3 3.3-.7" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function App() {
  const [mode, setMode] = useState("login");
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [toast, setToast] = useState(null);
  const [successPopup, setSuccessPopup] = useState(null);

  // Check whether the user is already logged in.
  // Check login session and handle Google Sign-In result.
  useEffect(() => {
    async function checkSession() {
      const params = new URLSearchParams(window.location.search);
      const googleResult = params.get("google");

      // Remove Google result from the browser URL.
      if (googleResult) {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }

      try {
        const response = await fetch(`${API_URL}/me`, {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else if (googleResult === "success") {
          showToast(
            "Google login completed, but your SpendWise session could not be verified. Please try again."
          );
        }
      } catch {
        if (googleResult === "success") {
          showToast(
            "Cannot connect to the server. Please try again."
          );
        }
      } finally {
        setCheckingSession(false);
      }

      // Display Google Sign-In errors.
      const googleErrors = {
        cancelled: "Google Sign-In was cancelled.",
        invalid: "Google Sign-In verification failed. Please try again.",
        unverified: "Your Google email could not be verified.",
        "account-conflict":
          "This Google account is already linked to another SpendWise account.",
        error: "Google Sign-In failed. Please try again.",
      };

      if (googleResult && googleErrors[googleResult]) {
        showToast(googleErrors[googleResult]);
      }
    }

    checkSession();
  }, []);

  // Show a notification.
  function showToast(message, type = "error") {
    setToast({ message, type });
  }

  // Handle login and signup input changes.
  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setToast(null);
  }

  // Handle login and signup.
  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setToast(null);

    try {
      const endpoint =
        mode === "signup" ? "/register" : "/login";

      const payload =
        mode === "signup"
          ? {
              name: formData.name.trim(),
              email: formData.email.trim(),
              password: formData.password,
            }
          : {
              email: formData.email.trim(),
              password: formData.password,
            };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      // New device: ask the user to verify their email OTP.
      if (mode === "login" && data.requiresOtp === true) {
        setOtpRequired(true);
        return;
      }

      if (mode === "signup") {
        setFormData((previous) => ({
          ...previous,
          password: "",
        }));

        setMode("login");
        setShowPassword(false);

        setSuccessPopup({
          title: "Account Created!",
          description:
            "Your SpendWise account is ready. Log in to start managing your money smarter.",
          buttonText: "Continue to Login",
          action: () => setSuccessPopup(null),
        });
      } else {
        // Recognised device: login without OTP.
        setSuccessPopup({
          title: "Login Successful!",
          description: `Welcome back, ${data.user.name}! You're all set to manage your money smarter.`,
          buttonText: "Continue to SpendWise",
          action: () => {
            setUser(data.user);
            setSuccessPopup(null);
          },
        });
      }
    } catch (error) {
      showToast(
        error.message === "Failed to fetch"
          ? "Cannot connect to the server. Please check that the backend is running."
          : error.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // Google login is not connected yet.
  function handleGoogleSignIn() {
    window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/google`;
  }

  // Password reset will be connected later.
  function handleForgotPassword() {
    showToast("We'll connect password reset in the next step.", "info");
  }

  // Switch between login and signup.
  function switchMode(nextMode) {
    setMode(nextMode);
    setShowPassword(false);
    setToast(null);
    setOtpRequired(false);

    setFormData((previous) => ({
      ...previous,
      password: "",
    }));
  }

  // Log out the current user.
  async function handleLogout() {
    try {
      const response = await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Unable to log out. Please try again.");
      }

      setUser(null);
      setMode("login");
      setOtpRequired(false);
      setFormData({
        name: "",
        email: "",
        password: "",
      });

      showToast("Logged out successfully.", "info");
    } catch (error) {
      showToast(
        error.message === "Failed to fetch"
          ? "Cannot connect to the server. Please check that the backend is running."
          : error.message
      );
    }
  }

  // Display a loading screen while checking the login session.
  if (checkingSession) {
    return (
      <main
        className="auth-page"
        style={{
          display: "grid",
          placeItems: "center",
        }}
      >
        <p style={{ color: "#FFFFFF" }}>
          Checking your session...
        </p>
      </main>
    );
  }

  // Show OTP verification for a new device.
  if (otpRequired) {
    return (
      <OtpVerification
        onVerified={(verifiedUser) => {
          setUser(verifiedUser);
          setOtpRequired(false);
          setToast(null);
        }}
        onBack={() => {
          setOtpRequired(false);
          setToast(null);
        }}
      />
    );
  }

  // Show the dashboard after login.
  if (user) {
    return (
      <Dashboard
        user={user}
        onUserUpdated={setUser}
        onLogout={handleLogout}
        onNotify={showToast}
      />
    );
  }

  // Login and signup screens.
  return (
    <main className="auth-page">
      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      <header className="brand">
        <div className="brand-icon">₹</div>

        <div>
          <h2>
            Spend<span>Wise</span>
          </h2>
          <p>SMART MONEY ASSISTANT</p>
        </div>
      </header>

      <section className="auth-layout">
        <div className="welcome-section">
          <span className="eyebrow">
            YOUR MONEY, YOUR FUTURE
          </span>

          <h1>
            Make smarter
            <br />
            choices. <span>Every day.</span>
          </h1>

          <p className="welcome-description">
            Take control of your spending, build better habits, and make
            every rupee count.
          </p>

          <div className="benefits">
            <div className="benefit">
              <span className="benefit-icon">↗</span>
              <div>
                <h3>Track your money</h3>
                <p>Keep income and expenses organized.</p>
              </div>
            </div>

            <div className="benefit">
              <span className="benefit-icon">◎</span>
              <div>
                <h3>Stay within budget</h3>
                <p>Make spending decisions with confidence.</p>
              </div>
            </div>

            <div className="benefit">
              <span className="benefit-icon">%</span>
              <div>
                <h3>Shop smarter</h3>
                <p>Compare prices before you buy.</p>
              </div>
            </div>
          </div>

          <p className="quote">
            “Small steps today. Bigger possibilities tomorrow.”
          </p>
        </div>

        <section
          key={mode}
          className="auth-card auth-card-animated"
        >
          <div className="mobile-brand">
            <div className="brand-icon">₹</div>
            <h2>
              Spend<span>Wise</span>
            </h2>
          </div>

          <div
            className="tabs"
            role="tablist"
            aria-label="Account options"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={mode === "login" ? "tab active" : "tab"}
              onClick={() => switchMode("login")}
            >
              Login
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className={mode === "signup" ? "tab active" : "tab"}
              onClick={() => switchMode("signup")}
            >
              Sign Up
            </button>
          </div>

          <div className="form-heading">
            <h2>
              {mode === "login"
                ? "Welcome back!"
                : "Create your account"}
            </h2>

            <p>
              {mode === "login"
                ? "Log in to continue your financial journey."
                : "Start building smarter money habits today."}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <label className="field">
                <span>Full name</span>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  maxLength={100}
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </label>
            )}

            <label className="field">
              <span>Email address</span>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </label>

            <label className="field">
              <span>Password</span>

              <div className="password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder={
                    mode === "login"
                      ? "Enter your password"
                      : "Create a password"
                  }
                  autoComplete={
                    mode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                  minLength={mode === "signup" ? 8 : undefined}
                  value={formData.password}
                  onChange={handleChange}
                  required
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  aria-pressed={showPassword}
                  title={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  <EyeIcon hidden={!showPassword} />
                </button>
              </div>

              {mode === "signup" && (
                <small className="field-hint">
                  Use at least 8 characters.
                </small>
              )}
            </label>

            {mode === "login" ? (
              <div className="form-options">
                <label className="remember-option">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(event.target.checked)
                    }
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  className="link-button"
                  onClick={handleForgotPassword}
                >
                  Forgot password?
                </button>
              </div>
            ) : (
              <p className="terms-note">
                By creating an account, you agree to use SpendWise
                responsibly.
              </p>
            )}

            <button
              className="primary-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Login to SpendWise"
                  : "Create Account"}

              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="separator">
            <span />
            <p>or continue with</p>
            <span />
          </div>

          <button
            type="button"
            className="google-button"
            onClick={handleGoogleSignIn}
          >
            <span className="google-mark" aria-hidden="true">
              G
            </span>
            Continue with Google
          </button>

          <p className="switch-prompt">
            {mode === "login"
              ? "New to SpendWise?"
              : "Already have an account?"}{" "}

            <button
              type="button"
              className="link-button"
              onClick={() =>
                switchMode(mode === "login" ? "signup" : "login")
              }
            >
              {mode === "login"
                ? "Create an account"
                : "Login"}
            </button>
          </p>
        </section>
      </section>

      <footer className="page-footer">
        <span>SpendWise © 2026</span>
        <span>Plan thoughtfully. Spend wisely.</span>
      </footer>

      {/* Toast notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 1001,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            maxWidth: "min(400px, calc(100vw - 32px))",
            padding: "16px 18px",
            border: "1px solid rgba(232,237,242,0.2)",
            borderLeft: `4px solid ${
              toast.type === "info" ? "#F5B82E" : "#FF8585"
            }`,
            borderRadius: "14px",
            background: "#32174D",
            color: "#FFFFFF",
            boxShadow: "0 14px 40px rgba(0,0,0,0.3)",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          <span style={{ flex: 1 }}>{toast.message}</span>

          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            style={{
              border: 0,
              background: "transparent",
              color: "#F5B82E",
              cursor: "pointer",
              fontSize: "20px",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Success popup */}
      {successPopup && (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSuccessPopup(null);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "rgba(13, 6, 20, 0.78)",
            backdropFilter: "blur(8px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-title"
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: "36px 28px 28px",
              border: "1px solid rgba(232,237,242,0.18)",
              borderRadius: "24px",
              background:
                "linear-gradient(145deg, #43245B 0%, #32174D 75%)",
              color: "#FFFFFF",
              textAlign: "center",
              boxShadow: "0 25px 90px rgba(0,0,0,0.45)",
            }}
          >
            <div
              style={{
                display: "grid",
                placeItems: "center",
                width: "70px",
                height: "70px",
                margin: "0 auto 22px",
                borderRadius: "50%",
                background: "#F5B82E",
                color: "#32174D",
                boxShadow: "0 0 0 9px rgba(245,184,46,0.10)",
              }}
            >
              <SuccessIcon />
            </div>

            <h2
              id="success-title"
              style={{
                margin: "0 0 12px",
                fontSize: "25px",
                letterSpacing: "-0.5px",
              }}
            >
              {successPopup.title}
            </h2>

            <p
              style={{
                margin: "0 0 26px",
                color: "#D1C6DC",
                fontSize: "14px",
                lineHeight: 1.8,
              }}
            >
              {successPopup.description}
            </p>

            <button
              type="button"
              className="primary-button"
              onClick={successPopup.action}
              style={{
                minHeight: "48px",
                cursor: "pointer",
              }}
            >
              {successPopup.buttonText}
              <span aria-hidden="true">→</span>
            </button>

            <p
              style={{
                margin: "18px 0 0",
                color: "#BDB2C9",
                fontSize: "11px",
              }}
            >
              SpendWise · Plan thoughtfully. Spend wisely.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
