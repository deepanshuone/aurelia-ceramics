"use client";

import { useState } from "react";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [requirement, setRequirement] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !requirement || !message.trim()) {
      setError("Please fill in all fields before sending your enquiry.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="form form-success">
        <h3>Thank you, {name}.</h3>
        <p>
          Your enquiry has been received. Our team will get back to you at{" "}
          {email} shortly.
        </p>
      </div>
    );
  }

  
  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}

      <label>
        Name
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label>
        Work email
        <input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label>
        Requirement
        <select
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
        >
          <option value="" disabled>
            Select requirement
          </option>
          <option>Wholesale / Bulk order</option>
          <option>Hotel / Restaurant project</option>
          <option>Custom / OEM</option>
          <option>Product enquiry</option>
        </select>
      </label>

      <label>
        Message
        <textarea
          placeholder="Tell us about your requirement"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>

      <button className="button dark" type="submit">
        Send enquiry →
      </button>
    </form>
  );
}
