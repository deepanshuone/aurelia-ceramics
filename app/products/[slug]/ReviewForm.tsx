"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type ExistingReview = {
  rating: number;
  title: string;
  comment: string;
  photos: { id: string; url: string }[];
};

// Keep in sync with lib/reviews.ts (that file imports the database, so it can't be used here).
const MAX_PHOTOS = 4;
const MAX_SIDE = 1600;

type NewPhoto = { file: Blob; preview: string };

/**
 * Shrinks a photo in the browser before upload, so phone pictures (often
 * 5–10 MB) become a few hundred KB of JPEG. Also drops location metadata.
 */
async function resizePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("resize failed"))), "image/jpeg", 0.82)
  );
}

/** Star-rating form for signed-in customers (also edits their existing review). */
export default function ReviewForm({ slug, existing }: { slug: string; existing: ExistingReview | null }) {
  const router = useRouter();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [keptPhotos, setKeptPhotos] = useState(existing?.photos ?? []);
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  // Free the preview URLs when the form goes away.
  const previews = useRef<string[]>([]);
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const photoCount = keptPhotos.length + newPhotos.length;

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    setError(null);
    const room = MAX_PHOTOS - photoCount;
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) setError(`You can add up to ${MAX_PHOTOS} photos.`);
    const added: NewPhoto[] = [];
    for (const file of picked) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const blob = await resizePhoto(file);
        const preview = URL.createObjectURL(blob);
        previews.current.push(preview);
        added.push({ file: blob, preview });
      } catch {
        setError("One of the photos couldn't be read. Please try a JPEG or PNG.");
      }
    }
    setNewPhotos((current) => [...current, ...added]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (rating === 0) {
      setError("Please choose a star rating.");
      return;
    }
    setStatus("saving");
    setError(null);

    const body = new FormData();
    body.set("slug", slug);
    body.set("rating", String(rating));
    body.set("title", title);
    body.set("comment", comment);
    keptPhotos.forEach((photo) => body.append("keepPhoto", photo.id));
    newPhotos.forEach((photo, i) => body.append("photo", photo.file, `photo-${i + 1}.jpg`));

    const response = await fetch("/api/reviews", { method: "POST", body }).catch(() => null);
    const data = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setStatus("idle");
      setError(data.error ?? "Could not save your review. Please try again.");
      return;
    }
    setStatus("saved");
    router.refresh();
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <h3>{existing ? "Update your review" : "Write a review"}</h3>

      <div className="star-input" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            className={(hover || rating) >= star ? "on" : undefined}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(star)}
          >
            ★
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Headline (optional)"
        maxLength={100}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Review headline"
      />
      <textarea
        rows={4}
        placeholder="How is the quality, finish and size? (optional)"
        maxLength={2000}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        aria-label="Review"
      />

      <div className="review-photo-field">
        <span>Photos (optional, up to {MAX_PHOTOS})</span>
        <div className="review-photo-picks">
          {keptPhotos.map((photo) => (
            <div key={photo.id} className="review-photo-pick">
              {/* eslint-disable-next-line @next/next/no-img-element -- small preview of an uploaded photo */}
              <img src={photo.url} alt="Your photo" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => setKeptPhotos((current) => current.filter((p) => p.id !== photo.id))}
              >
                ×
              </button>
            </div>
          ))}
          {newPhotos.map((photo) => (
            <div key={photo.preview} className="review-photo-pick">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview before upload */}
              <img src={photo.preview} alt="New photo" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => setNewPhotos((current) => current.filter((p) => p !== photo))}
              >
                ×
              </button>
            </div>
          ))}
          {photoCount < MAX_PHOTOS && (
            <label className="review-photo-add">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                multiple
                onChange={(e) => {
                  addPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
              + Add photo
            </label>
          )}
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {status === "saved" && (
        <p className="review-saved" role="status">
          Thank you — your review is live.
        </p>
      )}

      <button type="submit" className="review-submit" disabled={status === "saving"}>
        {status === "saving" ? "Saving…" : existing ? "Update review" : "Submit review"}
      </button>
    </form>
  );
}
