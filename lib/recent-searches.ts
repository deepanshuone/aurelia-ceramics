// The shopper's last few searches, kept in this browser only (localStorage).
// Storage can be missing or blocked (private mode), so every access is guarded.

const KEY = "aurelia:recent-searches";
const MAX = 6;
const EVENT = "aurelia:recent-searches";

export function readRecentSearches(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((q): q is string => typeof q === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable: recent searches just aren't remembered.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function rememberSearch(query: string) {
  const clean = query.replace(/\s+/g, " ").trim().slice(0, 60);
  if (clean.length < 2) return;
  const rest = readRecentSearches().filter((q) => q.toLowerCase() !== clean.toLowerCase());
  write([clean, ...rest].slice(0, MAX));
}

export function forgetSearch(query: string) {
  write(readRecentSearches().filter((q) => q !== query));
}

export function clearRecentSearches() {
  write([]);
}

/** Calls `listener` whenever the list changes, in this tab or another. */
export function subscribeRecentSearches(listener: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
