import { useState } from "react";
import FeedbackWidget from "./FeedbackWidget";
import RecentFeedback from "./RecentFeedback";

export default function App() {
  const [latestEntry, setLatestEntry] = useState(null);

  return (
    <div className="app">
      <FeedbackWidget onSubmitSuccess={setLatestEntry} />
      <RecentFeedback latestEntry={latestEntry} />
    </div>
  );
}
