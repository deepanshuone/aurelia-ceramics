'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function Header() {
  const [open, setOpen] = useState(false);
  return <header className="header">
    <div className="container nav">
      <Link href="/" className="brand"><span className="brand-mark">A</span><span>AURELIA<span className="brand-sub">CERAMICS</span></span></Link>
      <button className="menu" onClick={() => setOpen(!open)} aria-label="Toggle menu">☰</button>
      <nav className={open ? 'nav-links open' : 'nav-links'}>
        <Link href="/">Home</Link><Link href="/products">Collection</Link><Link href="/about">Our Story</Link><Link href="/contact">Contact</Link>
        <Link href="/contact" className="nav-cta">Request Catalogue ↗</Link>
      </nav>
    </div>
  </header>
}
