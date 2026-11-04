
import { useState } from "react";
import "./OtpVerification.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth`;

function OtpVerification({ onVerified, onBack }) {
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const verifyOtp = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit code.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API}/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ otp })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Verification failed.");
        return;
      }

      setMessage(data.message || "Device verified!");

      if (onVerified) {
        onVerified(data.user);
      }
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setError("");
    setMessage("");

    try {
      setResending(true);

      const response = await fetch(`${API}/resend-otp`, {
        method: "POST",
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to resend code.");
        return;
      }

      setMessage(data.message);
      setOtp("");
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="otp-page">
      <div className="otp-card">
        <div className="otp-icon">✉</div>

        <h2>Verify Your Device</h2>

        <p>
          We sent a 6-digit verification code to your registered email.
        </p>

        <form onSubmit={verifyOtp}>
          <label htmlFor="otp">Verification Code</label>

          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength="6"
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, ""))
            }
          />

          {error && <div className="otp-error">{error}</div>}
          {message && <div className="otp-message">{message}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify & Continue"}
          </button>
        </form>

        <div className="otp-resend">
          Didn't receive the code?{" "}
          <button
            type="button"
            onClick={resendOtp}
            disabled={resending}
          >
            {resending ? "Sending..." : "Resend Code"}
          </button>
        </div>

        <button
          type="button"
          className="otp-back"
          onClick={onBack}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}

export default OtpVerification;
