
import { useEffect, useState } from "react";
import "./Account.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/profile`;

function Account({ user, onUserUpdated, onNotify }) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [emailVerification, setEmailVerification] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
  }, [user]);

  async function saveName(event) {
    event.preventDefault();

    if (!name.trim()) {
      onNotify("Please enter your name.", "error");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API}/name`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update your name.");
      }

      onUserUpdated?.({ ...user, name: data.name });
      onNotify(data.message, "info");
    } catch (error) {
      onNotify(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function requestEmailCode(event) {
    event.preventDefault();

    if (!email.trim()) {
      onNotify("Please enter your new email address.", "error");
      return;
    }

    if (email.trim().toLowerCase() === user?.email?.toLowerCase()) {
      onNotify("This is already your current email address.", "error");
      return;
    }

    try {
      setSendingOtp(true);

      const response = await fetch(`${API}/email/request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send verification code.");
      }

      setEmailVerification(true);
      setOtp("");
      onNotify(data.message, "info");
    } catch (error) {
      onNotify(error.message, "error");
    } finally {
      setSendingOtp(false);
    }
  }

  async function verifyEmail(event) {
    event.preventDefault();

    if (!/^\d{6}$/.test(otp)) {
      onNotify("Enter the 6-digit verification code.", "error");
      return;
    }

    try {
      setVerifying(true);

      const response = await fetch(`${API}/email/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Email verification failed.");
      }

      const updatedUser = {
        ...user,
        name,
        email: data.email
      };

      setEmail(data.email);
      setEmailVerification(false);
      setOtp("");
      onUserUpdated?.(updatedUser);
      onNotify(data.message, "info");
    } catch (error) {
      onNotify(error.message, "error");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="account-page">
      <section className="profile-account-card">
        <div className="account-heading">
          <div className="account-avatar">
            {(name.trim()[0] || "U").toUpperCase()}
          </div>

          <div>
            <h2>Personal information</h2>
            <p>Manage your SpendWise account details.</p>
          </div>
        </div>

        <form onSubmit={saveName} className="profile-account-form">
          <label>
            Full name
            <input
              type="text"
              value={name}
              maxLength={100}
              onChange={event => setName(event.target.value)}
              placeholder="Enter your name"
              required
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save name"}
          </button>
        </form>

        <div className="account-divider" />

        <form onSubmit={requestEmailCode} className="profile-account-form">
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="Enter your email"
              required
            />
          </label>

          <p className="account-help">
            A verification code will be sent to your new email address.
          </p>

          <button type="submit" disabled={sendingOtp}>
            {sendingOtp ? "Sending code..." : "Verify new email"}
          </button>
        </form>

        {emailVerification && (
          <form onSubmit={verifyEmail} className="account-verification">
            <h3>Verify your new email</h3>
            <p>Enter the 6-digit code sent to {email.trim()}.</p>

            <label>
              Verification code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={event =>
                  setOtp(event.target.value.replace(/\D/g, ""))
                }
                placeholder="000000"
                required
              />
            </label>

            <div className="account-actions">
              <button type="submit" disabled={verifying}>
                {verifying ? "Verifying..." : "Confirm email"}
              </button>

              <button
                type="button"
                className="account-secondary"
                onClick={() => {
                  setEmailVerification(false);
                  setOtp("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export default Account;
