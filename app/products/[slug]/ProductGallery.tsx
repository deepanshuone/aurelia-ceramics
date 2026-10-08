"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import SmartImage from "../../../components/SmartImage";

type GalleryImage = { url: string; alt: string };

/**
 * Product photos: a main image that zooms under the pointer on desktop,
 * thumbnails, swipe on touch screens, and a full-screen viewer.
 */
export default function ProductGallery({ images, badge }: { images: GalleryImage[]; badge?: string | null }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerZoom, setViewerZoom] = useState(false);
  const touchStart = useRef<number | null>(null);

  const count = images.length;
  const current = images[index] ?? images[0];

  const go = useCallback(
    (step: number) => {
      setIndex((i) => (i + step + count) % count);
      setViewerZoom(false);
    },
    [count],
  );

  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewerOpen(false);
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [viewerOpen, go]);

  function onMove(event: React.MouseEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    setZoom({
      x: ((event.clientX - box.left) / box.width) * 100,
      y: ((event.clientY - box.top) / box.height) * 100,
    });
  }

  function onTouchEnd(event: React.TouchEvent) {
    if (touchStart.current === null || count < 2) return;
    const dx = event.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  }

  return (
    <div className="pdp-gallery">
      <div
        className={`pdp-main${zoom ? " zooming" : ""}`}
        onMouseMove={onMove}
        onMouseLeave={() => setZoom(null)}
        onTouchStart={(event) => (touchStart.current = event.touches[0].clientX)}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          className="pdp-main-open"
          onClick={() => setViewerOpen(true)}
          aria-label={`View photo ${index + 1} of ${count} full screen`}
        >
          <SmartImage
            key={current.url}
            src={current.url}
            alt={current.alt}
            fill
            priority={index === 0}
            sizes="(max-width: 900px) 100vw, 50vw"
            style={zoom ? { transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        </button>

        {badge && <span className="product-discount">{badge}</span>}
        <span className="pdp-zoom-hint" aria-hidden="true">
          <span className="pointer">Hover to zoom · Click to enlarge</span>
          <span className="touch">Tap to enlarge</span>
        </span>

        {count > 1 && (
          <>
            <button type="button" className="pdp-arrow prev" onClick={() => go(-1)} aria-label="Previous photo">
              ‹
            </button>
            <button type="button" className="pdp-arrow next" onClick={() => go(1)} aria-label="Next photo">
              ›
            </button>
            <span className="pdp-counter" aria-hidden="true">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="pdp-thumbs" role="list">
          {images.map((image, i) => (
            <button
              key={image.url + i}
              type="button"
              role="listitem"
              className={i === index ? "active" : undefined}
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
            >
              <SmartImage src={image.url} alt="" fill sizes="96px" />
            </button>
          ))}
        </div>
      )}

      {viewerOpen &&
        createPortal(
          <div className="pdp-viewer" role="dialog" aria-modal="true" aria-label="Product photos">
            <button type="button" className="pdp-viewer-close" onClick={() => setViewerOpen(false)} aria-label="Close">
              ×
            </button>
            <div
              className={`pdp-viewer-stage${viewerZoom ? " zoomed" : ""}`}
              onClick={() => setViewerZoom((z) => !z)}
              onTouchStart={(event) => (touchStart.current = event.touches[0].clientX)}
              onTouchEnd={onTouchEnd}
            >
              <SmartImage key={current.url} src={current.url} alt={current.alt} fill sizes="100vw" />
            </div>
            {count > 1 && (
              <>
                <button type="button" className="pdp-arrow prev" onClick={() => go(-1)} aria-label="Previous photo">
                  ‹
                </button>
                <button type="button" className="pdp-arrow next" onClick={() => go(1)} aria-label="Next photo">
                  ›
                </button>
                <span className="pdp-counter">
                  {index + 1} / {count}
                </span>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
