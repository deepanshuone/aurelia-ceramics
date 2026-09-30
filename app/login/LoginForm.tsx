"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeRedirectPath } from "../../lib/site";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only same-site paths: an attacker-supplied absolute URL here would be an open redirect.
  const callbackUrl = safeRedirectPath(searchParams.get("callbackUrl"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (!result || result.error) {
      setError(
        result?.code === "rate_limited"
          ? "Too many login attempts. Please wait 15 minutes and try again."
          : "Invalid email or password."
      );
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form className="form auth-form" onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}

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

      <label>
        Password
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>

      <button className="button dark" type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign In →"}
      </button>

      <p className="auth-switch">
        Don&apos;t have an account? <Link href="/register">Create one</Link>
      </p>
    </form>
  );
}
