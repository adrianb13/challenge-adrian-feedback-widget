import { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import FeedbackWidget from "./FeedbackWidget";
import RecentFeedback from "./RecentFeedback";
import SignInPage from "./SignInPage";
import WidgetConfigurator from "./WidgetConfigurator";
import "./App.css";

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

export default function App() {
  const [latestEntry, setLatestEntry] = useState(null);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [config, setConfig] = useState(loadConfig);

  useEffect(() => {
    document.body.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // re-read config when returning to home (storage may have changed)
  function refreshConfig() {
    setConfig(loadConfig());
  }

  const dashboard = (
    <div
      style={{
        "--bg-card":        config.dashboardBg,
        "--text-primary":   config.dashboardText,
        "--text-secondary": config.dashboardText,
        width: "100%",
      }}
    >
      <RecentFeedback latestEntry={latestEntry} />
    </div>
  );
  const widget = (
    <div
      className={`widget-wrapper widget-wrapper--${config.widgetAlign}`}
      style={{
        "--bg-card":        config.widgetBg,
        "--text-primary":   config.widgetText,
        "--text-secondary": config.widgetText,
        "--input-text":     config.widgetText,
        "--accent":         config.widgetBtnColor,
        "--accent-hover":   config.widgetBtnColor,
      }}
    >
      <FeedbackWidget
        onSubmitSuccess={setLatestEntry}
        dark={dark}
        onToggleDark={() => setDark((d) => !d)}
      />
    </div>
  );

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="app" onFocus={refreshConfig}>
            <nav className="app-nav">
              <Link to="/signin" className="nav-link">Sign In</Link>
            </nav>
            {config.dashboardPosition === "above" ? (
              <>{dashboard}{widget}</>
            ) : (
              <>{widget}{dashboard}</>
            )}
          </div>
        }
      />
      <Route path="/signin" element={<SignInPage dark={dark} onToggleDark={() => setDark((d) => !d)} />} />
      <Route path="/widget-configurator" element={<WidgetConfigurator dark={dark} onToggleDark={() => setDark((d) => !d)} />} />
    </Routes>
  );
}
