"use client";

import { useEffect, useRef, useState } from "react";

type Status = "loading" | "ready" | "off";

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Interactive 3D cup for the homepage hero. three.js is only downloaded once
 * the page is idle, so it never delays the first paint; without WebGL (or on
 * Save-Data) the hero simply shows its photo as before.
 */
export default function HeroCup() {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [hintHidden, setHintHidden] = useState(false);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData || !webglAvailable()) {
      setStatus("off");
      return;
    }

    let cancelled = false;
    let cleanup = () => {};

    const start = async () => {
      try {
        const { createHeroCupScene } = await import("./heroCupScene");
        if (cancelled) return;
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const cup = createHeroCupScene(container, {
          reducedMotion,
          onFirstInteraction: () => setHintHidden(true),
        });

        let onScreen = true;
        const update = () => cup.setActive(onScreen && document.visibilityState === "visible");
        const observer = new IntersectionObserver(([entry]) => {
          onScreen = entry.isIntersecting;
          update();
        });
        observer.observe(container);
        document.addEventListener("visibilitychange", update);
        update();
        setStatus("ready");

        cleanup = () => {
          observer.disconnect();
          document.removeEventListener("visibilitychange", update);
          cup.dispose();
        };
      } catch (error) {
        console.error("Hero cup failed to load", error);
        if (!cancelled) setStatus("off");
      }
    };

    // Wait for the browser to be idle so the hero text and photo come first.
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => void start(), { timeout: 2000 })
      : window.setTimeout(() => void start(), 600);

    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      cleanup();
    };
  }, []);

  if (status === "off") return null;

  return (
    <div className={`hero-cup is-${status}`} aria-hidden="true">
      <div className="hero-cup-glow" />
      <div className="hero-cup-stage" ref={ref} />
      <p className={`hero-cup-hint${hintHidden ? " is-hidden" : ""}`}>Drag to spin · Tap to toss</p>
    </div>
  );
}
