import { useState } from "react";
import "./FeedbackWidget.css";

const RATINGS = [
  { value: 1, emoji: "😡", label: "Very Bad" },
  { value: 2, emoji: "😞", label: "Bad" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "😊", label: "Good" },
  { value: 5, emoji: "🤩", label: "Excellent" },
];

const EMPTY_ERRORS = { name: "", message: "", rating: "" };

export default function FeedbackWidget({ onSubmitSuccess, dark, onToggleDark }) {
  const [form, setForm] = useState({ name: "", message: "", rating: 0 });
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [touched, setTouched] = useState({ name: false, message: false, rating: false });
  const [status, setStatus] = useState(null); // "success" | "error" | null
  const [loading, setLoading] = useState(false);

  function validate(field, value) {
    if (field === "name") return value.trim() ? "" : "Name is required.";
    if (field === "message") return value.trim() ? "" : "Message is required.";
    if (field === "rating") return value > 0 ? "" : "Please select a rating.";
    return "";
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) setErrors((prev) => ({ ...prev, [name]: validate(name, value) }));
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validate(name, value) }));
  }

  function handleRating(rating) {
    setForm((prev) => ({ ...prev, rating }));
    setTouched((prev) => ({ ...prev, rating: true }));
    setErrors((prev) => ({ ...prev, rating: validate("rating", rating) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const newErrors = {
      name: validate("name", form.name),
      message: validate("message", form.message),
      rating: validate("rating", form.rating),
    };
    setErrors(newErrors);
    setTouched({ name: true, message: true, rating: true });

    if (Object.values(newErrors).some(Boolean)) return;

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rating: Number(form.rating) }),
      });

      if (!res.ok) throw new Error("Submission Failed!");

      const data = await res.json();
      setStatus("success");
      setForm({ name: "", message: "", rating: 0 });
      setErrors(EMPTY_ERRORS);
      setTouched({ name: false, message: false, rating: false });
      onSubmitSuccess?.(data.feedback);
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  const isValid = !validate("name", form.name) && !validate("message", form.message) && !validate("rating", form.rating);

  return (
    <div className="widget">
      <div className="widget-header">
        <h2 className="widget-title">Share Your Feedback</h2>
        <button className="dark-toggle" onClick={onToggleDark} aria-label="Toggle dark mode">
          {dark ? "☀️" : "🌙"}
        </button>
      </div>

      {status === "success" && (
        <div className="alert alert-success">
          Feedback Submitted — Thank You!
        </div>
      )}
      {status === "error" && (
        <div className="alert alert-error">
          Something went wrong. Please try again.
        </div>
      )}

      <form onSubmit={handleSubmit} className="widget-form" noValidate>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Your name"
            value={form.name}
            onChange={handleChange}
            onBlur={handleBlur}
            className={errors.name ? "input-error" : ""}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        <div className="field">
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            name="message"
            placeholder="Write your feedback..."
            rows={4}
            value={form.message}
            onChange={handleChange}
            onBlur={handleBlur}
            className={errors.message ? "input-error" : ""}
          />
          {errors.message && <span className="field-error">{errors.message}</span>}
        </div>

        <div className="field">
          <label>Rating {form.rating > 0 && <span className="rating-label">— {RATINGS[form.rating - 1].label}</span>}</label>
          <div className={`stars ${errors.rating ? "stars-error" : ""}`}>
            {RATINGS.map(({ value, emoji, label }) => (
              <button
                key={value}
                type="button"
                className={`star ${form.rating === value ? "selected" : ""}`}
                onClick={() => handleRating(value)}
                aria-label={label}
              >
                {emoji}
              </button>
            ))}
          </div>
          {errors.rating && <span className="field-error">{errors.rating}</span>}
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={!isValid || loading}
        >
          {loading ? "Submitting..." : "Submit Feedback"}
        </button>
      </form>
    </div>
  );
}
