import { useEffect, useState } from "react";
import FeedbackWidget from "./FeedbackWidget";
import RecentFeedback from "./RecentFeedback";

export default function App() {
  const [latestEntry, setLatestEntry] = useState(null);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    document.body.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <div className="app">
      <FeedbackWidget
        onSubmitSuccess={setLatestEntry}
        dark={dark}
        onToggleDark={() => setDark((d) => !d)}
      />
      <RecentFeedback latestEntry={latestEntry} />
    </div>
  );
}
