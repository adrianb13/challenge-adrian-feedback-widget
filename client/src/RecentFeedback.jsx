import { useEffect, useState } from "react";
import "./RecentFeedback.css";

const EMOJI = { 1: "😡", 2: "😞", 3: "😐", 4: "😊", 5: "🤩" };

export default function RecentFeedback({ latestEntry }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // initial load from API
  useEffect(() => {
    fetch("/feedback")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setFeedbacks(data.feedbacks))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // prepend new entry immediately when a submission succeeds
  useEffect(() => {
    if (!latestEntry) return;
    setFeedbacks((prev) => [latestEntry, ...prev].slice(0, 3));
  }, [latestEntry]);

  return (
    <div className="recent">
      <h3 className="recent-title">Recent Feedback</h3>

      {loading && <p className="recent-state">Loading...</p>}
      {error && <p className="recent-state recent-error">Could not load feedback.</p>}

      {!loading && !error && feedbacks.length === 0 && (
        <p className="recent-state">No feedback yet. Be the first!</p>
      )}

      <ul className="recent-list">
        {feedbacks.map((f) => (
          <li key={f.id} className="recent-card">
            <div className="recent-card-header">
              <span className="recent-emoji">{EMOJI[f.rating]}</span>
              <span className="recent-name">{f.name}</span>
              <span className="recent-date">
                {new Date(f.submitted_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <p className="recent-message">{f.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
