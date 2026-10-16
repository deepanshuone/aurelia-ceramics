"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function signOutEverywhere() {
    if (!confirm("Sign out on every phone and computer where this account is logged in?")) return;
    setBusy(true);
    try {
      await fetch("/api/account/sign-out-everywhere", { method: "POST" });
    } finally {
      await signOut({ callbackUrl: "/" });
    }
  }

  return (
    <div className="account-signout">
      <button
        type="button"
        className="secondary-btn dark-border"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        Sign Out
      </button>
      <button type="button" className="text-link-btn" onClick={signOutEverywhere} disabled={busy}>
        Sign out of all devices
      </button>
    </div>
  );
}
