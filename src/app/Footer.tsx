"use client";

import Image from "next/image";
import Link from "next/link";
import type { getSite } from "@/lib/store";

type Settings = Awaited<ReturnType<typeof getSite>>["settings"];

const menuLinks = [
  { label: "Shawarma", href: "/#shawarma" },
  { label: "Burgers", href: "/#burgers" },
  { label: "Chicken Broast", href: "/#chicken-broast" },
  { label: "Loaded Fries", href: "/#loaded-fries" },
  { label: "Cold Drinks", href: "/#cold-drinks" },
  { label: "Combo Deals", href: "/#deals" },
  { label: "Loyalty Rewards Card", href: "/#loyalty" },
  { label: "Customer Reviews", href: "/#reviews" },
  { label: "Jaranwala Food Blogs", href: "/blogs" },
];

function Arrow({ up = false }: { up?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {up ? (
        <path d="M12 19V5M5 12l7-7 7 7" />
      ) : (
        <path d="M5 19 19 5M5 5h14v14" />
      )}
    </svg>
  );
}

export function ClosingSection({ settings }: { settings: Settings }) {
  const whatsapp = settings.whatsapp.replace(/\D/g, "");
  const hasWhatsApp = whatsapp.length >= 10 && whatsapp.length <= 15;

  return (
    <section className="visit-banner" aria-labelledby="visit-heading">
      <div className="wrap visit-banner__layout">
        <div className="visit-banner__copy">
          <span className="visit-banner__eyebrow">
            YOUR NEXT CRAVING STARTS HERE
          </span>
          <h2 id="visit-heading">
            GOOD FOOD.
            <br />
            <em>HAPPY PEOPLE.</em>
          </h2>
          <p>{settings.announcement}</p>
          <Link className="visit-banner__menu" href="/#chicken-broast">
            Explore Menu &amp; Broast <Arrow />
          </Link>
        </div>
        <div className="visit-banner__card">
          <span className="visit-banner__badge">MADE FOR JARANWALA</span>
          <h3>
            A LITTLE CLOSER
            <br />
            TO YOUR NEXT BITE.
          </h3>
          <dl>
            <div>
              <dt>Find us</dt>
              <dd>{settings.address}</dd>
            </div>
            <div>
              <dt>Opening &amp; hours</dt>
              <dd>{settings.hours}</dd>
            </div>
          </dl>
          {hasWhatsApp ? (
            <a
              className="visit-banner__action"
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Talk to us on WhatsApp <Arrow />
            </a>
          ) : (
            <Link className="visit-banner__action" href="/cart">
              View your cart <Arrow />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Footer({ settings }: { settings: Settings }) {
  const phone = settings.phone.replace(/[^\d+]/g, "");
  const socials = [
    { label: "Instagram", href: settings.instagram },
    { label: "Facebook", href: settings.facebook },
  ].filter((social) => /^https?:\/\//i.test(social.href));

  return (
    <footer className="brand-footer">
      <div className="wrap">
        <div className="brand-footer__heading">
          <span>GOOD FOOD FOR HAPPY PEOPLE.</span>
          <span>JARANWALA · PUNJAB · PAKISTAN</span>
        </div>
        <div className="brand-footer__layout">
          <div className="brand-footer__brand">
            <Link
              href="/#top"
              className="brand-footer__logo"
              aria-label="Al-Tharid, back to top"
            >
              <Image
                src="/al-tharid-logo.png"
                alt=""
                width={560}
                height={400}
                sizes="(max-width: 700px) 100vw, 50vw"
              />
            </Link>
            <p>
              Big cravings. Bold flavours.
              <br />
              Jaranwala’s home for Shawarma, Burgers, Chicken Broast &amp; Loaded
              Fries.
            </p>
          </div>
          <div className="brand-footer__details">
            <nav className="brand-footer__menu" aria-label="Footer menu">
              <h2>
                EXPLORE<span>.</span>
              </h2>
              {menuLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                  <span aria-hidden="true">↗</span>
                </Link>
              ))}
            </nav>
            <div className="brand-footer__contact">
              <h2>
                FIND US<span>.</span>
              </h2>
              <p>{settings.address}</p>
              <span className="brand-footer__hours">{settings.hours}</span>
              {phone.replace(/\D/g, "").length >= 10 && (
                <a href={`tel:${phone}`}>{settings.phone}</a>
              )}
              {/^https?:\/\//i.test(settings.mapsUrl) && (
                <a
                  href={settings.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get directions ↗
                </a>
              )}
              { socials.length > 0 && (
                <div className="brand-footer__socials">
                  {socials.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {social.label} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="brand-footer__cta-stack">
              <Link className="brand-footer__blog-btn" href="/blogs">
                <span>📖 JARANWALA FOOD BLOGS &amp; GUIDES</span>
                <Arrow />
              </Link>
              <Link className="brand-footer__cart" href="/cart">
                <span>😋 MY FOOD</span>
                <Arrow />
              </Link>
            </div>
          </div>
        </div>
        <div className="brand-footer__bottom">
          <span>
            © {new Date().getFullYear()} Al-Tharid Jaranwala. All rights reserved.
          </span>
          <button
            className="brand-footer__back"
            type="button"
            onClick={() => {
              const reducedMotion = window.matchMedia(
                "(prefers-reduced-motion: reduce)",
              ).matches;
              window.scrollTo({
                top: 0,
                left: 0,
                behavior: reducedMotion ? "instant" : "smooth",
              });
            }}
          >
            Back to top
            <span>
              <Arrow up />
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
