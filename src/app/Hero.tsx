"use client";

import Image from "next/image";
import "./hero.css";
import { useEffect, useRef, useState } from "react";

const slides = [
  {
    name: "Chicken Broast",
    tag: "NEW IN JARANWALA 🔥",
    priceTag: "From Rs 620",
    highlight: "12-Hour Masala Marinated",
    image: "/hero-broast.png",
    alt: "Crispy golden Pakistani Chicken Broast platter with garlic mayo dip and fries",
    lines: ["GOLDEN", "BROAST", "CRUNCH."],
    description:
      "Pressure-fried to bone-deep perfection with our signature Jaranwala masala crust, golden fries and creamy garlic toum dip.",
    href: "#chicken-broast",
  },
  {
    name: "Shawarma",
    tag: "BESTSELLER 🌯",
    priceTag: "From Rs 360",
    highlight: "Whipped Arabic Garlic Toum",
    image: "/hero-shawarma.png",
    alt: "Grilled Arabic chicken shawarma wrap with garlic sauce",
    lines: ["WRAPPED", "WITH", "FLAVOUR."],
    description:
      "Warm toasted flatbread loaded with charred marinated chicken strips, bold house sauces and authentic garlic toum.",
    href: "#shawarma",
  },
  {
    name: "Burgers",
    tag: "CRUNCH KING 🍔",
    priceTag: "From Rs 520",
    highlight: "Whole Crispy Chicken Fillet",
    image: "/hero-burger.png",
    alt: "Towering crispy Zinger chicken burger with melted cheese",
    lines: ["CRUNCH", "IN EVERY", "BITE."],
    description:
      "Shatteringly crisp chicken thigh fillets, melted cheddar, jalapeño heat and soft toasted sesame brioche buns.",
    href: "#burgers",
  },
  {
    name: "Loaded Fries",
    tag: "CROWD FAVOURITE 🍟",
    priceTag: "From Rs 390",
    highlight: "Smothered in Cheese & Sauce",
    image: "/hero-fries.png",
    alt: "Loaded chicken and melted cheese fries with jalapeños",
    lines: ["LOADED", "TO THE", "TOP."],
    description:
      "Golden seasoned fries piled high with crispy chicken chunks, warm cheddar sauce, smoky BBQ and spicy jalapeños.",
    href: "#loaded-fries",
  },
  {
    name: "Cold Drinks",
    tag: "ICE COLD 🥤",
    priceTag: "From Rs 80",
    highlight: "Crushed Ice & Fresh Mint",
    image: "/hero-drink.png",
    alt: "Chilled fresh mint lemonade with crushed ice",
    lines: ["SIP INTO", "SOMETHING", "FRESH."],
    description:
      "Frosty Mint Lemonade, Fresh Lime soda and chilled fizzy drinks crafted to pair with every spicy bite.",
    href: "#cold-drinks",
  },
] as const;

export default function Hero({ hours }: { hours: string }) {
  const [step, setStep] = useState(0);
  const [displayed, setDisplayed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const active = ((step % slides.length) + slides.length) % slides.length;
  const current = slides[displayed];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion || paused) return;
    const timer = window.setTimeout(() => {
      setStep((value) => value + 1);
      setDisplayed((value) => (value + 1) % slides.length);
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, paused, step]);

  function selectSlide(targetIndex: number) {
    const currentMod = ((step % slides.length) + slides.length) % slides.length;
    let diff = targetIndex - currentMod;
    if (diff < 0) diff += slides.length;
    setStep((value) => value + diff);
    setDisplayed(targetIndex);
  }

  function stepBy(delta: number) {
    const nextIndex =
      (((displayed + delta) % slides.length) + slides.length) % slides.length;
    setStep((value) => value + delta);
    setDisplayed(nextIndex);
  }

  return (
    <section
      className="orbital-hero"
      aria-label="Explore Al-Tharid food in Jaranwala"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="orbital-hero__ambient" aria-hidden="true">
        <span className="orbital-hero__glow orbital-hero__glow--one" />
        <span className="orbital-hero__glow orbital-hero__glow--two" />
      </div>

      <div className="wrap orbital-hero__layout">
        {/* 1. Main Heading Block (Top & Centered on Mobile, Left Top on Desktop) */}
        <div className="orbital-hero__header" key={`head-${displayed}`}>
          <div className="orbital-hero__top-badges">
            <span className="orbital-hero__eyebrow">
              <i className="orbital-hero__pulse" aria-hidden="true" />
              AL-THARID <span aria-hidden="true">/</span> JARANWALA
            </span>
            <span className="orbital-hero__Spotlight-tag">{current.tag}</span>
          </div>

          <h1>
            {current.lines.map((line, index) => (
              <span className="orbital-hero__line" key={line}>
                <span
                  style={{ animationDelay: `${index * 70}ms` }}
                  className={index === 2 ? "orbital-hero__accent" : ""}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>
        </div>

        {/* 2. Food Image Scroller (Directly Below Main Heading on Mobile, Right Column on Desktop) */}
        <div
          className="orbital-hero__showcase"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
            const deltaX = endX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(deltaX) > 36) {
              stepBy(deltaX < 0 ? 1 : -1);
            }
          }}
        >
          <div className="orbital-hero__ring" aria-hidden="true" />

          <div
            className="orbital-hero__float-badge orbital-hero__float-badge--top"
            key={`price-${displayed}`}
          >
            <small>{current.name}</small>
            <strong>{current.priceTag}</strong>
          </div>

          <div
            className="orbital-hero__float-badge orbital-hero__float-badge--bottom"
            key={`hl-${displayed}`}
          >
            <span aria-hidden="true">✦</span>
            <strong>{current.highlight}</strong>
          </div>

          {slides.map((slide, index) => {
            const angle = (index - step) * (360 / slides.length);
            const isActive = index === active;
            return (
              <div
                key={slide.name}
                className={`orbital-hero__food${isActive ? " is-active" : ""}`}
                style={{
                  left: isActive ? "50%" : "calc(50% + var(--preview-offset))",
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(calc(0px - var(--orbit-radius))) rotate(${-angle}deg) scale(${isActive ? "var(--front-scale)" : "0.34"})`,
                  zIndex: isActive ? 4 : 2,
                }}
                aria-hidden={!isActive}
              >
                <Image
                  src={slide.image}
                  alt={isActive ? slide.alt : ""}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 720px) 290px, 400px"
                />
              </div>
            );
          })}

          <div className="orbital-hero__progress" aria-hidden="true">
            {slides.map((slide, index) => (
              <button
                type="button"
                tabIndex={-1}
                key={slide.name}
                className={index === active ? "is-active" : ""}
                onClick={() => selectSlide(index)}
              >
                <i key={index === active ? `${step}-${paused}` : -1} />
              </button>
            ))}
          </div>
        </div>

        {/* 3. Content Block (Below Image Scroller on Mobile, Left Bottom on Desktop) */}
        <div className="orbital-hero__body" key={`body-${displayed}`}>
          <p className="orbital-hero__description">{current.description}</p>

          <div className="orbital-hero__actions">
            <a className="primary-button orbital-hero__cta-main" href={current.href}>
              Explore {current.name} <span aria-hidden="true">↗</span>
            </a>
            <a className="orbital-hero__cta-secondary" href="#loyalty">
              <span aria-hidden="true">🎁</span> Craving Club Rewards
            </a>
          </div>

          <div className="orbital-hero__meta">
            <div>
              <small>OPENING HOURS</small>
              <strong>{hours}</strong>
            </div>
            <div>
              <small>JARANWALA DELIVERY</small>
              <strong>Free over Rs 500</strong>
            </div>
            <div>
              <small>LOYALTY GAME</small>
              <strong>10 Stamps = Free Combo</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
