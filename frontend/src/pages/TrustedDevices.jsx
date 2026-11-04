
import { useEffect, useState } from "react";
import "./TrustedDevices.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth`;

function TrustedDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadDevices() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API}/devices`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load trusted devices.");
      }

      setDevices(data.devices || []);
    } catch (error) {
      setError(error.message || "Unable to load trusted devices.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  function formatDate(date) {
    if (!date) return "Not available";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function removeDevice(deviceId) {
    const confirmed = window.confirm(
      "Are you sure you want to remove this trusted device? It will need email OTP verification the next time it logs in."
    );

    if (!confirmed) return;

    try {
      setRemovingId(deviceId);
      setError("");
      setMessage("");

      const response = await fetch(`${API}/devices/${deviceId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not remove device.");
      }

      setDevices((previous) =>
        previous.filter((device) => device.id !== deviceId)
      );

      setMessage("Trusted device removed successfully.");
    } catch (error) {
      setError(error.message || "Unable to remove device.");
    } finally {
      setRemovingId(null);
    }
  }

  function getDeviceType(deviceName) {
    if (/mobile|android|iphone|ipad/i.test(deviceName || "")) {
      return "Mobile device";
    }

    return "Computer or browser";
  }

  return (
    <section className="trusted-devices-page">
      <div className="trusted-devices-heading">
        <div>
          <h2>Trusted Devices</h2>
          <p>
            Manage browsers and devices that can access your SpendWise
            account without repeated OTP verification.
          </p>
        </div>

        <button
          type="button"
          className="trusted-refresh-button"
          onClick={loadDevices}
          disabled={loading}
        >
          ↻ &nbsp; Refresh
        </button>
      </div>

      <div className="trusted-security-note">
        <span className="trusted-security-icon">✓</span>
        <div>
          <strong>Your account security</strong>
          <p>
            Only trusted devices can skip email OTP verification.
            Removing a device requires OTP verification on its next login.
          </p>
        </div>
      </div>

      {error && (
        <div className="trusted-message trusted-error">
          {error}
        </div>
      )}

      {message && (
        <div className="trusted-message trusted-success">
          {message}
        </div>
      )}

      {loading ? (
        <div className="trusted-empty">
          Loading trusted devices...
        </div>
      ) : devices.length === 0 ? (
        <div className="trusted-empty">
          <div className="trusted-empty-icon">⌘</div>
          <h3>No trusted devices</h3>
          <p>
            Devices will appear here after successful email verification.
          </p>
        </div>
      ) : (
        <div className="trusted-device-list">
          {devices.map((device) => (
            <article className="trusted-device-card" key={device.id}>
              <div className="trusted-device-icon">
                {getDeviceType(device.device_name) === "Mobile device"
                  ? "▯"
                  : "▣"}
              </div>

              <div className="trusted-device-details">
                <div className="trusted-device-title">
                  <h3>
                    {getDeviceType(device.device_name)}
                  </h3>

                  <span className="trusted-active-badge">
                    Active
                  </span>
                </div>

                <p className="trusted-device-name">
                  {device.device_name || "Unknown device"}
                </p>

                <div className="trusted-device-dates">
                  <span>
                    Added: {formatDate(device.created_at)}
                  </span>

                  <span>
                    Last used: {formatDate(device.last_used_at)}
                  </span>

                  <span>
                    Expires: {formatDate(device.expires_at)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="trusted-remove-button"
                onClick={() => removeDevice(device.id)}
                disabled={removingId === device.id}
              >
                {removingId === device.id
                  ? "Removing..."
                  : "Remove"}
              </button>
            </article>
          ))}
        </div>
      )}

      <p className="trusted-footer-note">
        Trusted devices automatically expire after 180 days.
      </p>
    </section>
  );
}

export default TrustedDevices;
