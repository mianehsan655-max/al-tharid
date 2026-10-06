"use client";

import Image from "next/image";
import "./hero.css";
import { useEffect, useState } from "react";

const slides = [
  {
    name: "Shawarma",
    image: "/hero-shawarma.png",
    alt: "Concept image of a chicken shawarma wrap",
    lines: ["WRAPPED", "WITH", "FLAVOUR."],
    description: "Warm, satisfying wraps with bold sauces and the flavour you keep coming back for.",
    href: "#shawarma",
  },
  {
    name: "Burgers",
    image: "/hero-burger.png",
    alt: "Concept image of a crispy chicken burger",
    lines: ["CRUNCH", "IN EVERY", "BITE."],
    description: "Crispy chicken, soft buns and sauces that make every bite count.",
    href: "#burgers",
  },
  {
    name: "Loaded Fries",
    image: "/hero-fries.png",
    alt: "Concept image of loaded chicken and cheese fries",
    lines: ["LOADED", "TO THE", "TOP."],
    description: "Golden fries, creamy cheese and generous toppings made to share.",
    href: "#loaded-fries",
  },
  {
    name: "Cold Drinks",
    image: "/hero-drink.png",
    alt: "Concept image of a chilled lemon and mint drink",
    lines: ["SIP INTO", "SOMETHING", "FRESH."],
    description: "Something cool and refreshing to go with every craving.",
    href: "#cold-drinks",
  },
] as const;

export default function Hero({ hours }: { hours: string }) {
  const [step, setStep] = useState(0);
  const [displayed, setDisplayed] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
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
    if (reducedMotion) return;
    let nextImageTimer: number;

    const advance = () => {
      setStep((value) => value + 1);
      setDisplayed((value) => (value + 1) % slides.length);
      // One second to rotate in, then three seconds in front.
      nextImageTimer = window.setTimeout(advance, 4000);
    };

    nextImageTimer = window.setTimeout(advance, 3000);
    return () => {
      window.clearTimeout(nextImageTimer);
    };
  }, [reducedMotion]);

  return (
    <section className="orbital-hero" aria-label="Explore Al-Tharid food">
      <div className="wrap orbital-hero__layout">
        <div className="orbital-hero__copy" key={displayed}>
          <span className="orbital-hero__eyebrow">
            AL-THARID <span aria-hidden="true">/</span> JARANWALA
          </span>
          <h1>
            {current.lines.map((line, index) => (
              <span className="orbital-hero__line" key={line}>
                <span className={index === 2 ? "orbital-hero__accent" : ""}>{line}</span>
              </span>
            ))}
          </h1>
          <p className="orbital-hero__description">{current.description}</p>
          <div className="orbital-hero__actions">
            <a className="primary-button" href={current.href}>
              Explore {current.name} <span aria-hidden="true">↗</span>
            </a>
            <span className="orbital-hero__hours">{hours}</span>
          </div>
          <span className="orbital-hero__footnote">GOOD FOOD FOR HAPPY PEOPLE.</span>
        </div>

        <div className="orbital-hero__showcase">
          {slides.map((slide, index) => {
            const angle = (index - step) * 90;
            const isActive = index === active;
            return (
              <div
                key={slide.name}
                className={`orbital-hero__food${isActive ? " is-active" : ""}`}
                style={{
                  left: isActive ? "50%" : "calc(50% + var(--preview-offset))",
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(calc(0px - var(--orbit-radius))) rotate(${-angle}deg) scale(${isActive ? "var(--front-scale)" : "0.36"})`,
                  zIndex: isActive ? 4 : 2,
                }}
                aria-hidden={!isActive}
              >
                <Image
                  src={slide.image}
                  alt={isActive ? slide.alt : ""}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 720px) 280px, 380px"
                />
              </div>
            );
          })}

          <div className="orbital-hero__progress" aria-hidden="true">
            {slides.map((slide, index) => (
              <span key={slide.name} className={index === active ? "is-active" : ""}>
                <i key={index === active ? step : -1} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
