import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./SignInPage.css";

export default function SignInPage({ dark, onToggleDark }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "" });
  const [errors, setErrors] = useState({ username: "", email: "" });
  const [touched, setTouched] = useState({ username: false, email: false });
  const [status, setStatus] = useState(null); // "success" | "error" | null
  const [loading, setLoading] = useState(false);

  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function validate(field, value) {
    if (field === "username") {
      if (!value.trim()) return "Username is required.";
      if (value.trim().length < 3) return "Username must be at least 3 characters.";
      return "";
    }
    if (field === "email") {
      if (!value.trim()) return "Email is required.";
      if (!EMAIL_RE.test(value.trim())) return "Enter a valid email address.";
      return "";
    }
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

  async function handleSubmit(e) {
    e.preventDefault();

    const newErrors = {
      username: validate("username", form.username),
      email: validate("email", form.email),
    };
    setErrors(newErrors);
    setTouched({ username: true, email: true });

    if (Object.values(newErrors).some(Boolean)) return;

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/users/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username.trim(), email: form.email.trim().toLowerCase() }),
      });

      if (res.status === 404) {
        setStatus("not_found");
        return;
      }
      if (!res.ok) throw new Error();

      const data = await res.json();
      navigate("/widget-configurator", { state: { user: data.user } });
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  const isValid = !validate("username", form.username) && !validate("email", form.email);

  return (
    <div className="signin-page">
      <div className="signin-card">
        <div className="signin-header">
          <h2 className="signin-title">Sign In</h2>
          <button className="dark-toggle" onClick={onToggleDark} aria-label="Toggle dark mode">
            {dark ? "☀️" : "🌙"}
          </button>
        </div>

        {status === "success" && (
          <div className="alert alert-success">Welcome back! You are signed in.</div>
        )}
        {status === "not_found" && (
          <div className="alert alert-error">No account found with those details.</div>
        )}
        {status === "error" && (
          <div className="alert alert-error">Something went wrong. Please try again.</div>
        )}

        <form onSubmit={handleSubmit} className="signin-form" noValidate>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Your username"
              value={form.username}
              onChange={handleChange}
              onBlur={handleBlur}
              className={errors.username ? "input-error" : ""}
            />
            {errors.username && <span className="field-error">{errors.username}</span>}
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Your email address"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              className={errors.email ? "input-error" : ""}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <button type="submit" className="submit-btn" disabled={!isValid || loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="signin-back">
          <Link to="/" className="back-link">Back to Feedback</Link>
        </p>
      </div>
    </div>
  );
}
