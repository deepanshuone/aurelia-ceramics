"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function RegisterForm({ verifyPhone }: { verifyPhone: boolean }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSentTo, setOtpSentTo] = useState("");
  const [otpNotice, setOtpNotice] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const otpSent = verifyPhone && otpSentTo !== "" && otpSentTo === phone;

  async function sendOtp() {
    setError("");
    setOtpNotice("");
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setSendingOtp(true);
    const res = await fetch("/api/auth/phone-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json().catch(() => ({}));
    setSendingOtp(false);
    if (!res.ok) {
      setError(data.error ?? "We couldn't send the OTP. Please try again.");
      return;
    }
    setOtpSentTo(phone);
    setOtp("");
    setResendIn(60);
    setOtpNotice(`OTP sent to +91 ${phone}.`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (verifyPhone && !otpSent) {
      setError("Please verify your mobile number: tap Send OTP.");
      return;
    }

    if (verifyPhone && !/^\d{6}$/.test(otp)) {
      setError("Please enter the 6-digit OTP sent to your mobile.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password, otp: verifyPhone ? otp : undefined }),
    });

    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (!result || result.error) {
      router.push("/login");
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <form className="form auth-form" onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}
      {otpNotice && !error && <p className="form-notice">{otpNotice}</p>}

      <label>
        Full Name
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </label>

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
        Mobile Number
        <span className={verifyPhone ? "otp-row" : undefined}>
          <input
            type="tel"
            placeholder="10-digit mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            autoComplete="tel"
          />
          {verifyPhone && (
            <button
              type="button"
              className="button otp-send"
              onClick={sendOtp}
              disabled={sendingOtp || (otpSent && resendIn > 0)}
            >
              {sendingOtp ? "Sending..." : otpSent ? (resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP") : "Send OTP"}
            </button>
          )}
        </span>
      </label>

      {otpSent && (
        <label>
          OTP
          <input
            inputMode="numeric"
            placeholder="6-digit code from SMS"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            autoComplete="one-time-code"
          />
        </label>
      )}

      <label>
        Password
        <input
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </label>

      <label>
        Confirm Password
        <input
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
      </label>

      <button className="button dark" type="submit" disabled={loading}>
        {loading ? "Creating account..." : "Create Account →"}
      </button>

      <p className="auth-switch">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
