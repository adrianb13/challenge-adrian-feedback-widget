import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./WidgetConfigurator.css";

const DEFAULT_CONFIG = {
  widgetAlign:       "center",
  dashboardPosition: "below",
  widgetBg:          "#ffffff",
  widgetText:        "#1a1a2e",
  widgetBtnColor:    "#6366f1",
  dashboardBg:       "#ffffff",
  dashboardText:     "#1a1a2e",
};

function loadConfig() {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem("widgetConfig")) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

const WIDGET_COLOR_FIELDS = [
  { key: "widgetBg",       label: "Background color" },
  { key: "widgetText",     label: "Text color" },
  { key: "widgetBtnColor", label: "Submission button color" },
];

const DASHBOARD_COLOR_FIELDS = [
  { key: "dashboardBg",   label: "Background color" },
  { key: "dashboardText", label: "Text color" },
];

export default function WidgetConfigurator({ dark, onToggleDark }) {
  const { state } = useLocation();
  const user = state?.user;
  const [config, setConfig] = useState(loadConfig);

  function update(key, value) {
    const next = { ...config, [key]: value };
    setConfig(next);
    localStorage.setItem("widgetConfig", JSON.stringify(next));
  }

  function reset() {
    setConfig(DEFAULT_CONFIG);
    localStorage.setItem("widgetConfig", JSON.stringify(DEFAULT_CONFIG));
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

          {/* ── Widget Colors ─────────────────────────────────────── */}
          <section className="config-section">
            <h3 className="config-section-title">Widget Colors</h3>
            <div className="color-grid">
              {WIDGET_COLOR_FIELDS.map(({ key, label }) => (
                <div key={key} className="color-row">
                  <label className="color-label" htmlFor={key}>{label}</label>
                  <div className="color-input-wrap">
                    <input
                      id={key}
                      type="color"
                      value={config[key]}
                      onChange={(e) => update(key, e.target.value)}
                      className="color-input"
                    />
                    <span className="color-hex">{config[key]}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Dashboard Colors ──────────────────────────────────── */}
          <section className="config-section">
            <h3 className="config-section-title">Dashboard Colors</h3>
            <div className="color-grid">
              {DASHBOARD_COLOR_FIELDS.map(({ key, label }) => (
                <div key={key} className="color-row">
                  <label className="color-label" htmlFor={key}>{label}</label>
                  <div className="color-input-wrap">
                    <input
                      id={key}
                      type="color"
                      value={config[key]}
                      onChange={(e) => update(key, e.target.value)}
                      className="color-input"
                    />
                    <span className="color-hex">{config[key]}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Live preview ─────────────────────────────────────── */}
          <section className="config-section">
            <h3 className="config-section-title">Preview</h3>
            <div className="preview-canvas">
              <div className={`preview-layout preview-layout--${config.dashboardPosition}`}>
                {config.dashboardPosition === "above" && (
                  <div
                    className="preview-block preview-dashboard"
                    style={{ background: config.dashboardBg, color: config.dashboardText, border: `1px solid ${config.dashboardText}22` }}
                  >
                    Dashboard
                  </div>
                )}
                <div
                  className={`preview-block preview-widget preview-widget--${config.widgetAlign}`}
                  style={{ background: config.widgetBg, color: config.widgetText, border: `1px solid ${config.widgetText}22` }}
                >
                  <span>Widget</span>
                  <span
                    className="preview-btn"
                    style={{ background: config.widgetBtnColor }}
                  >
                    Submit
                  </span>
                </div>
                {config.dashboardPosition === "below" && (
                  <div
                    className="preview-block preview-dashboard"
                    style={{ background: config.dashboardBg, color: config.dashboardText, border: `1px solid ${config.dashboardText}22` }}
                  >
                    Dashboard
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>

        <div className="configurator-footer">
          <Link to="/" className="back-link">Back To Feedback With Changes</Link>
          <button className="reset-btn" onClick={reset}>Reset To Default</button>
        </div>
      </div>
    </div>
  );
}
