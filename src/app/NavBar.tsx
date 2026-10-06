"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";

const links = [
  { id: "shawarma", label: "Shawarma" },
  { id: "burgers", label: "Burgers" },
  { id: "loaded-fries", label: "Loaded Fries" },
  { id: "cold-drinks", label: "Cold Drinks" },
  { id: "deals", label: "Deals" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { count, ready } = useCart();

  useEffect(() => {
    let frame = 0;
    const update = () => {
      setScrolled(window.scrollY > 35);
      const readingLine = (headerRef.current?.offsetHeight ?? 88) + 40;
      let current = "";
      links.forEach((link) => {
        const section = document.getElementById(link.id);
        if (section && section.getBoundingClientRect().top <= readingLine) current = link.id;
      });
      setActive(current);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeOnDesktop = () => {
      if (window.innerWidth > 1100) setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOutside);
    window.addEventListener("resize", closeOnDesktop);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("resize", closeOnDesktop);
    };
  }, [menuOpen]);

  return (
    <header ref={headerRef} className={`menu-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="wrap menu-header__inner">
        <Link href="/#top" className="menu-header__brand" aria-label="Al-Tharid home" onClick={() => setMenuOpen(false)}>
          <Image src="/al-tharid-logo.png" alt="" width={72} height={72} priority />
          <span>AL-THARID<small>GOOD FOOD. HAPPY PEOPLE.</small></span>
        </Link>
        <nav id="menu-navigation" className={`menu-header__links${menuOpen ? " is-open" : ""}`} aria-label="Menu sections">
          {links.map((link) => (
            <Link
              key={link.id}
              href={`/#${link.id}`}
              className={`${link.id === "deals" ? "menu-header__deals " : ""}${active === link.id ? "is-active" : ""}`}
              aria-current={active === link.id ? "location" : undefined}
              onClick={(event) => {
                setMenuOpen(false);
                const section = document.getElementById(link.id);
                if (pathname === "/" && section) {
                  event.preventDefault();
                  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                  section.scrollIntoView({ behavior: reducedMotion ? "instant" : "smooth", block: "start" });
                }
              }}
            >
              {link.id === "deals" && <span aria-hidden="true">✦</span>}{link.label}
            </Link>
          ))}
        </nav>
        <div className="menu-header__actions">
          <Link href="/cart" className="menu-header__cart" aria-label={`My Cart${ready && count ? `, ${count} items` : ""}`} onClick={() => setMenuOpen(false)}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 7h12l1 13H5L6 7Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            <span>My Cart</span>
            {ready && count > 0 && <b>{count}</b>}
          </Link>
          <button ref={toggleRef} type="button" className={`menu-header__toggle${menuOpen ? " is-open" : ""}`} aria-controls="menu-navigation" aria-expanded={menuOpen} aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen((open) => !open)}>
            <span /><span /><span />
          </button>
        </div>
      </div>
    </header>
  );
}
