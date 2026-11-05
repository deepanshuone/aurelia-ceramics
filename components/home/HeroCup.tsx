"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HeroCupScene } from "./heroCupScene";

type Status = "loading" | "ready" | "off";

/** Glazes the hero cup shows off, poured on in turn or picked from the swatches. */
const GLAZES = [
  { name: "Ivory", color: "#efe6d8" },
  { name: "Celadon", color: "#9fbf9d" },
  { name: "Cobalt", color: "#2c4f86" },
  { name: "Terracotta", color: "#b8613d" },
  { name: "Blush", color: "#e2b2a8" },
  { name: "Ochre", color: "#d3a046" },
  { name: "Charcoal", color: "#3b3936" },
] as const;

const CYCLE_MS = 5000;
// After a shopper picks a glaze, leave it alone for a while before cycling on.
const PICK_HOLD_MS = 15000;

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
  const [glaze, setGlaze] = useState(0);
  const sceneRef = useRef<HeroCupScene | null>(null);
  const holdUntil = useRef(0);
  const visible = useRef(true);
  const [autoCycle, setAutoCycle] = useState(false);

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
          glaze: GLAZES[0].color,
          onFirstInteraction: () => setHintHidden(true),
        });
        sceneRef.current = cup;
        setAutoCycle(!reducedMotion);

        let onScreen = true;
        const update = () => {
          visible.current = onScreen && document.visibilityState === "visible";
          cup.setActive(visible.current);
        };
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
          sceneRef.current = null;
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

  const showGlaze = useCallback((index: number) => {
    setGlaze(index);
    sceneRef.current?.setGlaze(GLAZES[index].color);
  }, []);

  // Pour the next glaze every few seconds while the cup is on screen.
  useEffect(() => {
    if (!autoCycle) return;
    const id = window.setInterval(() => {
      if (!visible.current || Date.now() < holdUntil.current) return;
      setGlaze((current) => {
        const next = (current + 1) % GLAZES.length;
        sceneRef.current?.setGlaze(GLAZES[next].color);
        return next;
      });
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [autoCycle]);

  const pick = (index: number) => {
    holdUntil.current = Date.now() + PICK_HOLD_MS;
    setHintHidden(true);
    if (index !== glaze) showGlaze(index);
  };

  if (status === "off") return null;

  return (
    <div className={`hero-cup is-${status}`}>
      <div className="hero-cup-glow" aria-hidden="true" />
      <div className="hero-cup-stage" ref={ref} aria-hidden="true" />
      <p className={`hero-cup-hint${hintHidden ? " is-hidden" : ""}`} aria-hidden="true">
        Drag to spin · Tap to toss
      </p>
      <div className="hero-cup-glazes" role="radiogroup" aria-label="Glaze colour">
        <div className="hero-cup-swatches">
          {GLAZES.map((g, i) => (
            <button
              key={g.name}
              type="button"
              role="radio"
              aria-checked={i === glaze}
              aria-label={g.name}
              title={g.name}
              className={`hero-cup-swatch${i === glaze ? " is-active" : ""}`}
              style={{ "--swatch": g.color } as React.CSSProperties}
              onClick={() => pick(i)}
            />
          ))}
        </div>
        <span className="hero-cup-glaze-name" aria-live="polite">
          {GLAZES[glaze].name} glaze
        </span>
      </div>
    </div>
  );
}
