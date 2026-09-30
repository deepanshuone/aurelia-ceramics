"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children,
  pendingLabel = "Saving…",
  className = "admin-btn",
  confirmMessage,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  /** Requires a second click to submit, for destructive actions. */
  confirmMessage?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (!confirmMessage) return;
        const button = event.currentTarget;
        if (button.dataset.armed !== "true") {
          event.preventDefault();
          button.dataset.armed = "true";
          button.dataset.label = button.textContent ?? "";
          button.textContent = confirmMessage;
          setTimeout(() => {
            if (button.isConnected && button.dataset.armed === "true") {
              button.dataset.armed = "false";
              button.textContent = button.dataset.label ?? "";
            }
          }, 4000);
        }
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
