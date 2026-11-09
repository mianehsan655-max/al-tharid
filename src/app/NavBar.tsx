"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";

const links = [
  { id: "shawarma", label: "Shawarma" },
  { id: "burgers", label: "Burgers" },
  { id: "chicken-broast", label: "Chicken Broast" },
  { id: "loaded-fries", label: "Loaded Fries" },
  { id: "cold-drinks", label: "Drinks" },
  { id: "deals", label: "Deals" },
  { id: "loyalty", label: "Rewards" },
];

function CravingEmoji({
  count,
  justAdded,
}: {
  count: number;
  justAdded: boolean;
}) {
  // Happiness tier:
  // 0 = Craving (mouth continuously opening & closing, hungry eyes + drool drop)
  // 1 = 1 item (Happy warm smile + rosy cheeks)
  // 2 = 2 items (Yummy big grin + tongue licking lips)
  // 3 = 3-4 items (Star-struck ecstatic laugh)
  // 4 = 5+ items (Ultimate Feast Mode: pulsing heart eyes + golden crown)
  const tier =
    count <= 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;

  return (
    <span
      className={`my-food-emoji my-food-emoji--tier-${tier}${
        justAdded ? " is-celebrating" : ""
      }`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 40 40"
        width="28"
        height="28"
        className="my-food-emoji__svg"
      >
        <defs>
          <radialGradient id="emojiFaceGrad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fff3a1" />
            <stop offset="55%" stopColor="#ffd23f" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
          <linearGradient id="emojiMouthGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a1212" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
        </defs>

        {/* Mini Crown for Tier 4 (5+ items) */}
        {tier === 4 && (
          <path
            className="my-food-emoji__crown"
            d="M11 9 L14 3 L20 7 L26 3 L29 9 Z"
            fill="#ffd23f"
            stroke="#201911"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        )}

        {/* Base Face Circle */}
        <circle
          cx="20"
          cy="21"
          r="15"
          fill="url(#emojiFaceGrad)"
          stroke="#201911"
          strokeWidth="2"
        />

        {/* Rosy Cheeks (intensify with happiness) */}
        <ellipse
          cx="10.5"
          cy="23.5"
          rx={tier === 0 ? "2.2" : "3"}
          ry={tier === 0 ? "1.3" : "1.8"}
          fill="#ef4444"
          opacity={tier === 0 ? "0.28" : tier >= 3 ? "0.65" : "0.48"}
        />
        <ellipse
          cx="29.5"
          cy="23.5"
          rx={tier === 0 ? "2.2" : "3"}
          ry={tier === 0 ? "1.3" : "1.8"}
          fill="#ef4444"
          opacity={tier === 0 ? "0.28" : tier >= 3 ? "0.65" : "0.48"}
        />

        {/* EYES BY TIER */}
        {tier === 0 && (
          <g className="my-food-emoji__eyes-craving">
            {/* Hungry wide eyes witheager pupils */}
            <circle cx="14.5" cy="17" r="2.7" fill="#201911" />
            <circle cx="25.5" cy="17" r="2.7" fill="#201911" />
            <circle cx="15.3" cy="16.1" r="1" fill="#ffffff" />
            <circle cx="26.3" cy="16.1" r="1" fill="#ffffff" />
            {/* Craving eyebrows */}
            <path
              d="M11.5 13.2 Q14.5 11.8 17 13.4"
              fill="none"
              stroke="#201911"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M23 13.4 Q25.5 11.8 28.5 13.2"
              fill="none"
              stroke="#201911"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </g>
        )}

        {(tier === 1 || tier === 2) && (
          <g className="my-food-emoji__eyes-happy">
            {/* Happy curved arc eyes */}
            <path
              d="M11.5 17.8 Q14.5 13.8 17.5 17.8"
              fill="none"
              stroke="#201911"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M22.5 17.8 Q25.5 13.8 28.5 17.8"
              fill="none"
              stroke="#201911"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </g>
        )}

        {tier === 3 && (
          <g className="my-food-emoji__eyes-stars">
            {/* Sparkling Star Eyes */}
            <path
              d="M14.5 12.2 L15.6 15.1 L18.7 15.3 L16.3 17.2 L17.1 20.2 L14.5 18.5 L11.9 20.2 L12.7 17.2 L10.3 15.3 L13.4 15.1 Z"
              fill="#d92b2b"
              stroke="#201911"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
            <path
              d="M25.5 12.2 L26.6 15.1 L29.7 15.3 L27.3 17.2 L28.1 20.2 L25.5 18.5 L22.9 20.2 L23.7 17.2 L21.3 15.3 L24.4 15.1 Z"
              fill="#d92b2b"
              stroke="#201911"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
          </g>
        )}

        {tier === 4 && (
          <g className="my-food-emoji__eyes-hearts">
            {/* Pulsing Heart Eyes */}
            <path
              d="M14.5 20.2 C14.5 20.2 10.2 17.4 10.2 14.8 C10.2 13.2 11.5 12.2 12.8 12.2 C13.7 12.2 14.5 12.8 14.5 13.5 C14.5 12.8 15.3 12.2 16.2 12.2 C17.5 12.2 18.8 13.2 18.8 14.8 C18.8 17.4 14.5 20.2 14.5 20.2 Z"
              fill="#e11d48"
              stroke="#201911"
              strokeWidth="1.1"
            />
            <path
              d="M25.5 20.2 C25.5 20.2 21.2 17.4 21.2 14.8 C21.2 13.2 22.5 12.2 23.8 12.2 C24.7 12.2 25.5 12.8 25.5 13.5 C25.5 12.8 26.3 12.2 27.2 12.2 C28.5 12.2 29.8 13.2 29.8 14.8 C29.8 17.4 25.5 20.2 25.5 20.2 Z"
              fill="#e11d48"
              stroke="#201911"
              strokeWidth="1.1"
            />
          </g>
        )}

        {/* MOUTH BY TIER */}
        {tier === 0 && (
          <g className="my-food-emoji__craving-mouth-wrap">
            {/* Continuously opening and closing craving mouth */}
            <ellipse
              className="my-food-emoji__craving-mouth"
              cx="20"
              cy="27"
              rx="6.2"
              ry="5.2"
              fill="url(#emojiMouthGrad)"
              stroke="#201911"
              strokeWidth="1.8"
            />
            {/* Top teeth */}
            <path
              className="my-food-emoji__craving-teeth"
              d="M15.2 23.8 H24.8 V25.4 H15.2 Z"
              fill="#ffffff"
            />
            {/* Craving tongue */}
            <ellipse
              className="my-food-emoji__craving-tongue"
              cx="20"
              cy="29.5"
              rx="3.8"
              ry="2.2"
              fill="#fb7185"
            />
            {/* Hungry drool droplet */}
            <path
              className="my-food-emoji__drool"
              d="M25.8 28.5 C25.8 28.5 27.6 31.3 26.6 32.8 C25.8 33.9 24.4 33.3 24.6 31.8 Z"
              fill="#38bdf8"
              stroke="#0284c7"
              strokeWidth="0.8"
            />
          </g>
        )}

        {tier === 1 && (
          <g className="my-food-emoji__mouth-tier1">
            <path
              d="M13.5 24.2 Q20 31.2 26.5 24.2"
              fill="none"
              stroke="#201911"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </g>
        )}

        {tier === 2 && (
          <g className="my-food-emoji__mouth-tier2">
            {/* Delicious big smile + tongue licking side */}
            <path
              d="M12.5 23.5 Q20 32.5 27.5 23.5 Z"
              fill="url(#emojiMouthGrad)"
              stroke="#201911"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              className="my-food-emoji__lick-tongue"
              d="M18.5 26.5 C21 26.5 25.5 27.2 25.5 30.8 C25.5 33 22 33.2 20 30.5 Z"
              fill="#fb7185"
              stroke="#201911"
              strokeWidth="1.3"
            />
          </g>
        )}

        {(tier === 3 || tier === 4) && (
          <g className="my-food-emoji__mouth-feast">
            {/* Huge ecstatic laughing mouth */}
            <path
              d="M11.5 22.8 C11.5 22.8 20 24.2 28.5 22.8 C28.5 30.5 24.8 33.5 20 33.5 C15.2 33.5 11.5 30.5 11.5 22.8 Z"
              fill="url(#emojiMouthGrad)"
              stroke="#201911"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M13 23.3 H27 V25.2 H13 Z"
              fill="#ffffff"
            />
            <ellipse cx="20" cy="30.5" rx="4.6" ry="2.5" fill="#fb7185" />
          </g>
        )}
      </svg>
    </span>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [customerName, setCustomerName] = useState<string>("");
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { count, ready } = useCart();
  const prevCountRef = useRef<number>(count);

  useEffect(() => {
    const syncAuth = () => {
      try {
        const raw = localStorage.getItem("al-tharid-customer-session");
        if (raw) {
          const parsed = JSON.parse(raw) as { name?: string };
          setCustomerName((parsed.name ?? "").trim());
        } else {
          setCustomerName("");
        }
      } catch {
        setCustomerName("");
      }
    };
    syncAuth();
    window.addEventListener("al-tharid-auth-change", syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener("al-tharid-auth-change", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (count > prevCountRef.current) {
      setJustAdded(true);
      const timer = window.setTimeout(() => setJustAdded(false), 850);
      prevCountRef.current = count;
      return () => window.clearTimeout(timer);
    }
    prevCountRef.current = count;
  }, [count, ready]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      setScrolled(window.scrollY > 35);
      const readingLine = (headerRef.current?.offsetHeight ?? 88) + 45;
      let current = "";
      [...links, { id: "reviews", label: "Reviews" }].forEach((link) => {
        const section = document.getElementById(link.id);
        if (section && section.getBoundingClientRect().top <= readingLine) {
          current = link.id;
        }
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
      if (
        event.target instanceof Node &&
        !headerRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
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

  const effectiveCount = ready ? count : 0;
  const moodLabel =
    effectiveCount === 0
      ? "Craving!"
      : effectiveCount === 1
        ? "Happy!"
        : effectiveCount === 2
          ? "Yummy!"
          : effectiveCount <= 4
            ? "Loved It!"
            : "Feast Mode!";

  return (
    <header
      ref={headerRef}
      className={`menu-header${scrolled ? " is-scrolled" : ""}`}
    >
      <div className="wrap menu-header__inner">
        <Link
          href="/#top"
          className="menu-header__brand"
          aria-label="Al-Tharid home"
          onClick={() => setMenuOpen(false)}
        >
          <Image src="/al-tharid-logo.png" alt="" width={72} height={72} priority />
          <span className="menu-header__brand-copy">
            <strong className="menu-header__brand-title">
              AL<em className="menu-header__brand-hyphen">-</em>THARID
            </strong>
            <small className="menu-header__brand-sub">
              GOOD FOOD. HAPPY PEOPLE.
            </small>
          </span>
        </Link>
        <nav
          id="menu-navigation"
          className={`menu-header__links${menuOpen ? " is-open" : ""}`}
          aria-label="Menu sections"
        >
          {links.map((link) => (
            <Link
              key={link.id}
              href={`/#${link.id}`}
              className={`${
                link.id === "deals" || link.id === "loyalty"
                  ? "menu-header__deals "
                  : ""
              }${active === link.id ? "is-active" : ""}`}
              aria-current={active === link.id ? "location" : undefined}
              onClick={(event) => {
                setMenuOpen(false);
                const section = document.getElementById(link.id);
                if (pathname === "/" && section) {
                  event.preventDefault();
                  const reducedMotion = window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches;
                  section.scrollIntoView({
                    behavior: reducedMotion ? "instant" : "smooth",
                    block: "start",
                  });
                }
              }}
            >
              {link.id === "deals" && <span aria-hidden="true">✦</span>}
              {link.id === "loyalty" && <span aria-hidden="true">🎁</span>}
              {link.label}
            </Link>
          ))}
          <Link
            href="/account"
            className={`menu-header__mobile-auth-link${
              pathname === "/account" ? " is-active" : ""
            }`}
            onClick={() => setMenuOpen(false)}
          >
            <span aria-hidden="true">{customerName ? "👤" : "🔐"}</span>
            {customerName
              ? `My Account (${customerName.split(" ")[0]})`
              : "Login / Sign Up"}
          </Link>
        </nav>
        <div className="menu-header__actions">
          <Link
            href="/account"
            className={`menu-header__auth-btn${
              customerName ? " is-logged-in" : ""
            }${pathname === "/account" ? " is-active" : ""}`}
            aria-label={
              customerName
                ? `My Account: ${customerName}`
                : "Login or Sign Up"
            }
            onClick={() => setMenuOpen(false)}
          >
            <span className="menu-header__auth-dot" aria-hidden="true" />
            <span>
              {customerName ? customerName.split(" ")[0] : "Login"}
            </span>
          </Link>
          <Link
            href="/cart"
            className={`menu-header__cart menu-header__my-food${
              effectiveCount > 0 ? " has-food" : " is-craving"
            }${justAdded ? " is-munching" : ""}`}
            data-happiness={
              effectiveCount <= 0
                ? 0
                : effectiveCount === 1
                  ? 1
                  : effectiveCount === 2
                    ? 2
                    : effectiveCount <= 4
                      ? 3
                      : 4
            }
            aria-label={`My Food${
              effectiveCount
                ? `, ${effectiveCount} items (${moodLabel})`
                : " (Craving food)"
            }`}
            onClick={() => setMenuOpen(false)}
          >
            <CravingEmoji count={effectiveCount} justAdded={justAdded} />
            <span className="menu-header__my-food-text">
              <strong>My Food</strong>
            </span>
            {effectiveCount > 0 && <b>{effectiveCount}</b>}
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className={`menu-header__toggle${menuOpen ? " is-open" : ""}`}
            aria-controls="menu-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
