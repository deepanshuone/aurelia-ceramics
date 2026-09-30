"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "./CartProvider";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

type Suggestion = {
  name: string;
  slug: string;
  price: number;
  image: string;
};

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

function CartIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="4" y1="4" x2="20" y2="20" />
      <line x1="20" y1="4" x2="4" y2="20" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

function SearchBox({
  value,
  onChange,
  onSubmit,
  placeholder,
  autoFocus,
  formClassName,
  wrapperClassName,
  dark,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder: string;
  autoFocus?: boolean;
  formClassName: string;
  wrapperClassName?: string;
  dark?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = value.trim();

    if (trimmed.length < 2) {
      setSuggestions([]);
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
          setOpen(true);
        })
        .catch(() => {});
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`search-box${wrapperClassName ? ` ${wrapperClassName}` : ""}`} ref={containerRef}>
      <form
        className={formClassName}
        onSubmit={(e) => {
          setOpen(false);
          onSubmit(e);
        }}
      >
        <input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoFocus={autoFocus}
          aria-label="Search products"
          autoComplete="off"
        />
        <button type="submit" aria-label="Search">
          <SearchIcon dark={dark} />
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <div className="search-suggestions">
          {suggestions.map((s) => (
            <Link
              key={s.slug}
              href={`/products/${s.slug}`}
              className="search-suggestion"
              onClick={() => setOpen(false)}
            >
              <img src={s.image} alt={s.name} />
              <span>{s.name}</span>
              <strong>₹{s.price.toLocaleString("en-IN")}</strong>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { count: cartCount } = useCart();

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = query.trim();

    router.push(
      trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : "/products"
    );

    setMenuOpen(false);
    setMobileSearchOpen(false);
  }

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link href="/" className="logo" onClick={() => setMenuOpen(false)}>
          <span className="logo-mark">A</span>
          <span>
            <strong>AURELIA</strong>
            <small>CERAMICS</small>
          </span>
        </Link>

        <nav className="site-nav">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <SearchBox
          value={query}
          onChange={setQuery}
          onSubmit={submitSearch}
          placeholder="Search ceramic mugs, plates, bowls..."
          formClassName="site-search"
        />

        <div className="site-header-actions">
          <button
            type="button"
            className="icon-btn search-toggle"
            aria-label="Toggle search"
            onClick={() => setMobileSearchOpen((open) => !open)}
          >
            <SearchIcon dark />
          </button>

          <Link href="/cart" className="icon-btn cart-link" aria-label="Cart">
            <CartIcon />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          {status !== "loading" && (
            <Link
              href={session ? "/account" : "/login"}
              className="icon-btn account-link"
              aria-label={session ? "My Account" : "Sign In"}
            >
              <UserIcon />
            </Link>
          )}

          <button
            type="button"
            className="icon-btn menu-toggle"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="mobile-search">
          <SearchBox
            value={query}
            onChange={setQuery}
            onSubmit={submitSearch}
            placeholder="Search products..."
            formClassName=""
            wrapperClassName="search-box-mobile"
            autoFocus
            dark
          />
        </div>
      )}

      {menuOpen && (
        <div className="mobile-menu">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/cart" onClick={() => setMenuOpen(false)}>
            Cart {cartCount > 0 ? `(${cartCount})` : ""}
          </Link>
          <Link href={session ? "/account" : "/login"} onClick={() => setMenuOpen(false)}>
            {session ? "My Account" : "Sign In"}
          </Link>
          {session?.user?.role === "ADMIN" && (
            <Link href="/admin" onClick={() => setMenuOpen(false)}>
              Admin
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
