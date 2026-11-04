
import { useState } from "react";

const API_URL = `${
  import.meta.env.VITE_API_URL || "http://localhost:5000"
}/api/auth`;

function ForgotPassword({ onBack }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputStyle = {
    width: "100%",
    padding: "13px",
    marginTop: "8px",
    marginBottom: "18px",
    border: "1px solid #d8d0df",
    borderRadius: "9px",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none"
  };

  const buttonStyle = {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "9px",
    background: "#F5B82E",
    color: "#32174D",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer"
  };

  const eyeButtonStyle = {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    border: "none",
    background: "transparent",
    color: "#71677A",
    cursor: "pointer",
    padding: "5px",
    display: "flex",
    alignItems: "center"
  };

  function EyeIcon({ visible }) {
    return visible ? (
      <svg width="20" height="20" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ) : (
      <svg width="20" height="20" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 3 18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a15.5 15.5 0 0 1-3 3.8" />
        <path d="M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7a10.8 10.8 0 0 0 5.1-1.3" />
      </svg>
    );
  }

  async function sendOtp(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send reset code.");
      }

      setMessage(data.message);
      setStep(2);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to reset password.");
      }

      setMessage(data.message);
      setStep(3);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      background: "linear-gradient(135deg, #32174D, #21102F)"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "430px",
        padding: "35px",
        borderRadius: "18px",
        background: "#F4F1F7",
        boxShadow: "0 15px 45px rgba(0,0,0,0.25)",
        boxSizing: "border-box"
      }}>
        <h1 style={{
          color: "#32174D",
          marginBottom: "8px",
          fontSize: "27px"
        }}>
          {step === 1
            ? "Forgot Password?"
            : step === 2
            ? "Reset Your Password"
            : "Password Updated!"}
        </h1>

        <p style={{ color: "#71677A", marginBottom: "25px" }}>
          {step === 1
            ? "Enter your registered email to receive a reset code."
            : step === 2
            ? "Enter the six-digit code sent to your email and choose a new password."
            : "Your password has been changed successfully. You can now log in."}
        </p>

        {error && (
          <p style={{
            color: "#B42318",
            background: "#FEECEB",
            padding: "11px",
            borderRadius: "8px",
            fontSize: "13px"
          }}>
            {error}
          </p>
        )}

        {message && (
          <p style={{
            color: "#276749",
            background: "#E7F5EC",
            padding: "11px",
            borderRadius: "8px",
            fontSize: "13px"
          }}>
            {message}
          </p>
        )}

        {step === 1 && (
          <form onSubmit={sendOtp}>
            <label style={{ color: "#32174D", fontWeight: "600" }}>
              Email Address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
              required
              style={inputStyle}
            />

            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={resetPassword}>
            <label style={{ color: "#32174D", fontWeight: "600" }}>
              Verification Code
            </label>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 6-digit code"
              required
              style={inputStyle}
            />

            <label style={{ color: "#32174D", fontWeight: "600" }}>
              New Password
            </label>

            <div style={{ position: "relative" }}>
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                style={{ ...inputStyle, paddingRight: "45px" }}
              />

              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={eyeButtonStyle}
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
              >
                <EyeIcon visible={showNewPassword} />
              </button>
            </div>

            <label style={{ color: "#32174D", fontWeight: "600" }}>
              Confirm New Password
            </label>

            <div style={{ position: "relative" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                style={{ ...inputStyle, paddingRight: "45px" }}
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={eyeButtonStyle}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                <EyeIcon visible={showConfirmPassword} />
              </button>
            </div>

            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </form>
        )}

        {step === 3 && (
          <button onClick={onBack} style={buttonStyle}>
            Back to Login
          </button>
        )}

        {step !== 3 && (
          <button
            type="button"
            onClick={onBack}
            style={{
              width: "100%",
              marginTop: "18px",
              padding: "10px",
              border: "none",
              background: "transparent",
              color: "#32174D",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            Back to Login
          </button>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
