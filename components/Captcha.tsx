"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { CAPTCHA_UNAVAILABLE } from "../lib/captcha-shared";

// Cloudflare Turnstile widget. Renders nothing until
// NEXT_PUBLIC_TURNSTILE_SITE_KEY is set (see lib/captcha.ts).

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Turnstile = {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Could not load the security check"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// Turnstile error codes that mean the widget itself is misconfigured (wrong
// site key, or this domain missing from the widget's hostnames), not that the
// visitor failed the check. Retrying won't help, so don't block customers.
function isSetupError(code: string) {
  return /^(1101|1102|4000)/.test(code);
}

/** Whether forms need a captcha token before submitting. */
export const captchaEnabled = Boolean(SITE_KEY);

export type CaptchaHandle = {
  /** Tokens work once: call after each request that used one to get a fresh token. */
  reset(): void;
};

const Captcha = forwardRef<CaptchaHandle, { onToken: (token: string) => void }>(function Captcha(
  { onToken },
  ref
) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const [unavailable, setUnavailable] = useState(false);

  useImperativeHandle(ref, () => ({
    reset() {
      if (unavailable) return;
      onTokenRef.current("");
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    },
  }), [unavailable]);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    const giveUp = () => {
      if (cancelled) return;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
      setUnavailable(true);
      onTokenRef.current(CAPTCHA_UNAVAILABLE);
    };

    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(container.current, {
          sitekey: SITE_KEY,
          size: "flexible",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(""),
          "error-callback": (code: string) => {
            if (isSetupError(String(code))) {
              console.error(`Turnstile setup error ${code}: check the site key and allowed hostnames`);
              giveUp();
              return true;
            }
            onTokenRef.current("");
          },
        });
      })
      .catch(giveUp);

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  if (!SITE_KEY) return null;
  if (unavailable) {
    return <p className="captcha-note">Security check is unavailable right now. You can continue.</p>;
  }
  return <div ref={container} className="captcha" />;
});

export default Captcha;
