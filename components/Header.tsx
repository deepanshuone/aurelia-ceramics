"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "./CartProvider";
import SearchBox, { SearchIcon } from "./SearchBox";

const NAV_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

type NavCategory = { name: string; count: number };

const categoryHref = (name: string) => `/products?category=${encodeURIComponent(name)}`;

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

export default function Header({ categories = [] }: { categories?: NavCategory[] }) {
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

        <nav className="site-nav" aria-label="Main">
          <Link href="/">Home</Link>

          {/* Shop menu: opens on hover and on keyboard focus */}
          <div className="nav-shop">
            <Link href="/products" className="nav-shop-trigger" aria-haspopup="true">
              Shop <span aria-hidden="true">▾</span>
            </Link>
            <div className="nav-shop-panel">
              <p>SHOP BY CATEGORY</p>
              <ul>
                {categories.map((category) => (
                  <li key={category.name}>
                    <Link href={categoryHref(category.name)}>
                      {category.name}
                      <small>{category.count}</small>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/products" className="nav-shop-all">
                View all products →
              </Link>
            </div>
          </div>

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
          popular={categories}
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
            popular={categories}
            autoFocus
            dark
          />
        </div>
      )}

      {menuOpen && (
        <div className="mobile-menu">
          <Link href="/" onClick={() => setMenuOpen(false)}>
            Home
          </Link>
          <Link href="/products" onClick={() => setMenuOpen(false)}>
            All Products
          </Link>
          {categories.length > 0 && (
            <div className="mobile-menu-categories">
              <p>SHOP BY CATEGORY</p>
              {categories.map((category) => (
                <Link key={category.name} href={categoryHref(category.name)} onClick={() => setMenuOpen(false)}>
                  {category.name}
                </Link>
              ))}
            </div>
          )}
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
          {["ADMIN", "EDITOR", "VIEWER"].includes(session?.user?.role ?? "") && (
            <Link href="/admin" onClick={() => setMenuOpen(false)}>
              Admin
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
