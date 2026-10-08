"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  clearRecentSearches,
  forgetSearch,
  readRecentSearches,
  rememberSearch,
  subscribeRecentSearches,
} from "../lib/recent-searches";

type Suggestion = {
  name: string;
  slug: string;
  price: number;
  image: string;
};

type CategorySuggestion = { name: string; count: number; whole: boolean };

type NavCategory = { name: string; count: number };

const EMPTY: string[] = [];
const searchHref = (q: string) => `/products?search=${encodeURIComponent(q)}`;
const categoryHref = (name: string, search?: string) =>
  `/products?category=${encodeURIComponent(name)}${search ? `&search=${encodeURIComponent(search)}` : ""}`;

// The recent-search list as a snapshot React can subscribe to. The snapshot is
// cached by its JSON so React sees the same array until the list changes.
let snapshotKey = "";
let snapshot: string[] = EMPTY;
function getRecentSnapshot() {
  const list = readRecentSearches();
  const key = JSON.stringify(list);
  if (key !== snapshotKey) {
    snapshotKey = key;
    snapshot = list;
  }
  return snapshot;
}

function SearchIcon({ dark }: { dark?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={dark ? "currentColor" : "white"}
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export { SearchIcon };

/**
 * Header search with autocomplete: matching categories ("mug" → Cups & Mugs)
 * and products as you type, recent searches and popular categories when the
 * box is empty, and category suggestions when nothing matches.
 */
export default function SearchBox({
  value,
  onChange,
  onSubmit,
  placeholder,
  autoFocus,
  formClassName,
  wrapperClassName,
  dark,
  popular = [],
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder: string;
  autoFocus?: boolean;
  formClassName: string;
  wrapperClassName?: string;
  dark?: boolean;
  /** Categories to offer when the box is empty or nothing matches. */
  popular?: NavCategory[];
}) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [categories, setCategories] = useState<CategorySuggestion[]>([]);
  const [meta, setMeta] = useState<{ total: number; corrected: string | null; query: string }>({
    total: 0,
    corrected: null,
    query: "",
  });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useRef(`search-list-${Math.random().toString(36).slice(2, 8)}`).current;
  const recent = useSyncExternalStore(subscribeRecentSearches, getRecentSnapshot, () => EMPTY);

  const trimmed = value.trim();
  const typing = trimmed.length >= 2;

  useEffect(() => {
    setActive(-1);
    if (!typing) {
      setSuggestions([]);
      setCategories([]);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(() => {
      fetch(`/api/products/suggest?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          setSuggestions(data.suggestions ?? []);
          setCategories(data.categories ?? []);
          setMeta({ total: data.total ?? 0, corrected: data.corrected ?? null, query: trimmed });
          setOpen(true);
        })
        .catch(() => {});
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, typing]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const topCategories = [...popular].sort((a, b) => b.count - a.count).slice(0, 6);
  const fetched = typing && meta.query === trimmed;
  const noResults = fetched && suggestions.length === 0 && categories.length === 0;

  // Every row the arrow keys can move through, in on-screen order.
  type Option = { key: string; href: string; remember?: string };
  const options: Option[] = [];
  if (!typing) {
    for (const q of recent) options.push({ key: `r:${q}`, href: searchHref(q), remember: q });
    for (const c of topCategories) options.push({ key: `p:${c.name}`, href: categoryHref(c.name) });
  } else if (fetched) {
    for (const c of categories)
      options.push({ key: `c:${c.name}`, href: c.whole ? categoryHref(c.name) : categoryHref(c.name, trimmed), remember: trimmed });
    for (const s of suggestions) options.push({ key: `s:${s.slug}`, href: `/products/${s.slug}`, remember: trimmed });
    if (meta.total > suggestions.length) options.push({ key: "all", href: searchHref(trimmed), remember: trimmed });
    if (noResults) for (const c of topCategories) options.push({ key: `p:${c.name}`, href: categoryHref(c.name) });
  }
  const indexOf = (key: string) => options.findIndex((o) => o.key === key);
  const showPanel = open && options.length + (noResults ? 1 : 0) > 0;

  function go(option: Option) {
    if (option.remember) rememberSearch(option.remember);
    setOpen(false);
    router.push(option.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter") return;
    if (e.key === "Enter") {
      if (showPanel && active >= 0 && options[active]) {
        e.preventDefault();
        go(options[active]);
      }
      return;
    }
    if (options.length === 0) return;
    e.preventDefault();
    setOpen(true);
    const step = e.key === "ArrowDown" ? 1 : -1;
    // Positions run -1 (back in the input) to options.length - 1, wrapping round.
    const slots = options.length + 1;
    setActive((i) => ((((i + 1 + step) % slots) + slots) % slots) - 1);
  }

  // -1 means "no row highlighted" (the input itself).
  const highlighted = active >= 0 && active < options.length ? options[active].key : null;
  const rowProps = (key: string, className: string) => ({
    id: `${listId}-${indexOf(key)}`,
    role: "option" as const,
    "aria-selected": highlighted === key,
    className: `${className}${highlighted === key ? " is-active" : ""}`,
    onMouseEnter: () => setActive(indexOf(key)),
  });

  return (
    <div className={`search-box${wrapperClassName ? ` ${wrapperClassName}` : ""}`} ref={containerRef}>
      <form
        className={formClassName}
        role="search"
        onSubmit={(e) => {
          setOpen(false);
          if (trimmed) rememberSearch(trimmed);
          onSubmit(e);
        }}
      >
        <input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          aria-label="Search products"
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={highlighted ? `${listId}-${active}` : undefined}
        />
        <button type="submit" aria-label="Search">
          <SearchIcon dark={dark} />
        </button>
      </form>

      {showPanel && (
        <div className="search-suggestions" id={listId} role="listbox" aria-label="Search suggestions">
          {!typing && recent.length > 0 && (
            <div className="search-section">
              <div className="search-section-head">
                <span>Recent searches</span>
                <button type="button" onClick={() => clearRecentSearches()}>
                  Clear
                </button>
              </div>
              {recent.map((q) => (
                <div key={q} {...rowProps(`r:${q}`, "search-recent")}>
                  <Link href={searchHref(q)} onClick={() => (rememberSearch(q), setOpen(false))}>
                    <span aria-hidden="true">↺</span> {q}
                  </Link>
                  <button type="button" aria-label={`Remove ${q} from recent searches`} onClick={() => forgetSearch(q)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {typing && meta.corrected && !noResults && (
            <p className="search-suggestions-note">Showing results for &ldquo;{meta.corrected}&rdquo;</p>
          )}

          {noResults && (
            <p className="search-suggestions-empty">
              No products match &ldquo;{trimmed}&rdquo;. Try a shorter word, or browse a category:
            </p>
          )}

          {typing && categories.length > 0 && (
            <div className="search-section">
              <div className="search-section-head">
                <span>Categories</span>
              </div>
              {categories.map((c) => {
                const href = c.whole ? categoryHref(c.name) : categoryHref(c.name, trimmed);
                return (
                  <Link
                    key={c.name}
                    href={href}
                    {...rowProps(`c:${c.name}`, "search-category")}
                    onClick={() => (rememberSearch(trimmed), setOpen(false))}
                  >
                    <span>
                      {c.whole ? c.name : <>&ldquo;{trimmed}&rdquo; in {c.name}</>}
                    </span>
                    <small>{c.count}</small>
                  </Link>
                );
              })}
            </div>
          )}

          {typing && suggestions.length > 0 && (
            <div className="search-section">
              {categories.length > 0 && (
                <div className="search-section-head">
                  <span>Products</span>
                </div>
              )}
              {suggestions.map((s) => (
                <Link
                  key={s.slug}
                  href={`/products/${s.slug}`}
                  {...rowProps(`s:${s.slug}`, "search-suggestion")}
                  onClick={() => (rememberSearch(trimmed), setOpen(false))}
                >
                  <img src={s.image} alt="" />
                  <span>{s.name}</span>
                  <strong>₹{s.price.toLocaleString("en-IN")}</strong>
                </Link>
              ))}
            </div>
          )}

          {fetched && meta.total > suggestions.length && (
            <Link
              href={searchHref(trimmed)}
              {...rowProps("all", "search-suggestions-footer")}
              onClick={() => (rememberSearch(trimmed), setOpen(false))}
            >
              View all {meta.total} results →
            </Link>
          )}

          {(!typing || noResults) && topCategories.length > 0 && (
            <div className="search-section">
              <div className="search-section-head">
                <span>Popular categories</span>
              </div>
              <div className="search-chips">
                {topCategories.map((c) => (
                  <Link
                    key={c.name}
                    href={categoryHref(c.name)}
                    {...rowProps(`p:${c.name}`, "search-chip")}
                    onClick={() => setOpen(false)}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
