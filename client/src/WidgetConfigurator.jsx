import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./WidgetConfigurator.css";

const DEFAULT_CONFIG = { widgetAlign: "center", dashboardPosition: "below" };

function loadConfig() {
  try {
    return JSON.parse(localStorage.getItem("widgetConfig")) || DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export default function WidgetConfigurator({ dark, onToggleDark }) {
  const { state } = useLocation();
  const user = state?.user;
  const [config, setConfig] = useState(loadConfig);

  function update(key, value) {
    const next = { ...config, [key]: value };
    setConfig(next);
    localStorage.setItem("widgetConfig", JSON.stringify(next));
  }

  return (
    <div className="configurator-page">
      <div className="configurator-card">

        <div className="configurator-header">
          <div className="configurator-header-left">
            <h2 className="configurator-title">Widget Configurator</h2>
            {user && <p className="configurator-user">Signed in as <strong>{user.username}</strong></p>}
          </div>
          <button className="dark-toggle" onClick={onToggleDark} aria-label="Toggle dark mode">
            {dark ? "☀️" : "🌙"}
          </button>
        </div>

        <div className="configurator-body">

          {/* ── Feedback Widget position ─────────────────────────── */}
          <section className="config-section">
            <h3 className="config-section-title">Feedback Widget</h3>
            <p className="config-section-label">Horizontal position</p>
            <div className="position-group">
              {["left", "center", "right"].map((pos) => (
                <button
                  key={pos}
                  className={`position-btn ${config.widgetAlign === pos ? "active" : ""}`}
                  onClick={() => update("widgetAlign", pos)}
                >
                  {pos.charAt(0).toUpperCase() + pos.slice(1)}
                </button>
              ))}
            </div>
          </section>

          {/* ── Feedback Dashboard position ──────────────────────── */}
          <section className="config-section">
            <h3 className="config-section-title">Feedback Dashboard</h3>
            <p className="config-section-label">Position relative to widget</p>
            <div className="position-group">
              {["above", "below"].map((pos) => (
                <button
                  key={pos}
                  className={`position-btn ${config.dashboardPosition === pos ? "active" : ""}`}
                  onClick={() => update("dashboardPosition", pos)}
                >
                  {pos.charAt(0).toUpperCase() + pos.slice(1)} widget
                </button>
              ))}
            </div>
          </section>

          {/* ── Live preview ─────────────────────────────────────── */}
          <section className="config-section">
            <h3 className="config-section-title">Preview</h3>
            <div className="preview-canvas">
              <div className={`preview-layout preview-layout--${config.dashboardPosition}`}>
                {config.dashboardPosition === "above" && (
                  <div className="preview-block preview-dashboard">Dashboard</div>
                )}
                <div className={`preview-block preview-widget preview-widget--${config.widgetAlign}`}>
                  Widget
                </div>
                {config.dashboardPosition === "below" && (
                  <div className="preview-block preview-dashboard">Dashboard</div>
                )}
              </div>
            </div>
          </section>

        </div>

        <p className="configurator-back">
          <Link to="/" className="back-link">Back to Feedback</Link>
        </p>
      </div>
    </div>
  );
}
