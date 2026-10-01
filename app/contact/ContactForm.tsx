"use client";

import { useState } from "react";
import { ENQUIRY_REQUIREMENTS } from "../../lib/enquiries";

export default function ContactForm({
  initialRequirement,
  initialMessage,
}: {
  initialRequirement?: string;
  initialMessage?: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // Only accept known options (the value comes from the URL).
  const [requirement, setRequirement] = useState(
    ENQUIRY_REQUIREMENTS.find((option) => option === initialRequirement) ?? ""
  );
  const [message, setMessage] = useState(initialMessage ?? "");
  // Honeypot field, hidden from people; bots tend to fill every input.
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;

    if (!name.trim() || !email.trim() || !requirement || !message.trim()) {
      setError("Please fill in all required fields before sending your enquiry.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setSending(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, requirement, message, website }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "We couldn't send your enquiry. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("We couldn't reach our server. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="form form-success" role="status">
        <h3>Thank you, {name.trim().split(" ")[0]}.</h3>
        <p>
          Your enquiry has been received. Our team will get back to you at{" "}
          {email.trim()} shortly.
        </p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <label>
        Name *
        <input
          autoComplete="name"
          placeholder="Your name"
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label>
        Email *
        <input
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          maxLength={200}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label>
        Phone (optional)
        <input
          type="tel"
          autoComplete="tel"
          placeholder="+91 XXXXX XXXXX"
          value={phone}
          maxLength={20}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>

      <label>
        Requirement *
        <select value={requirement} onChange={(e) => setRequirement(e.target.value)}>
          <option value="" disabled>
            Select requirement
          </option>
          {ENQUIRY_REQUIREMENTS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>

      <label>
        Message *
        <textarea
          placeholder="Tell us about your requirement — products, quantities, timelines"
          rows={5}
          value={message}
          maxLength={3000}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>

      <label className="form-honeypot" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </label>

      <button className="button dark" type="submit" disabled={sending}>
        {sending ? "Sending…" : "Send enquiry →"}
      </button>
    </form>
  );
}
