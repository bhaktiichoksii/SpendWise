
import { useState } from "react";
import TrustedDevices from "./TrustedDevices";
import "./Settings.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/change-password`;

function Settings({ onNotify }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  async function changePassword(event) {
    event.preventDefault();

    if (newPassword.length < 8) {
      onNotify("New password must contain at least 8 characters.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      onNotify("New password and confirmation do not match.", "error");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to change password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      onNotify(data.message || "Password changed successfully.", "info");
    } catch (error) {
      onNotify(error.message || "Something went wrong.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="settings-page">
      <section className="settings-card">
        <div className="settings-heading">
          <div className="settings-icon">🔒</div>
          <div>
            <h2>Change password</h2>
            <p>Keep your SpendWise account secure.</p>
          </div>
        </div>

        <form className="settings-form" onSubmit={changePassword}>
          <label>
            Current password
            <input
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
              required
            />
          </label>

          <label>
            New password
            <input
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <label>
            Confirm new password
            <input
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter new password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <label className="settings-show-password">
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(event) => setShowPasswords(event.target.checked)}
            />
            Show passwords
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Changing password..." : "Update password"}
          </button>
        </form>
      </section>

      <section className="settings-card settings-devices-card">
        <div className="settings-heading">
          <div className="settings-icon">💻</div>
          <div>
            <h2>Trusted devices</h2>
            <p>View and manage devices trusted by your account.</p>
          </div>
        </div>

        <TrustedDevices />
      </section>
    </div>
  );
}

export default Settings;
