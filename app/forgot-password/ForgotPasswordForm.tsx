"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setMessage(data.message);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (message) {
    return (
      <div className="form auth-form form-success">
        <h3>Check your email</h3>
        <p>{message}</p>
        <p className="auth-switch">
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <form className="form auth-form" onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}

      <p className="auth-switch" style={{ textAlign: "left" }}>
        Enter the email you registered with and we&apos;ll send you a link to choose a new password.
      </p>

      <label>
        Email Address
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>

      <button className="button dark" type="submit" disabled={loading}>
        {loading ? "Sending..." : "Send Reset Link →"}
      </button>

      <p className="auth-switch">
        Remembered it? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
