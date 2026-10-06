import Hero from "./Hero";
import DealsSection from "./DealsSection";
import { ClosingSection } from "./Footer";
import ProductCard from "./ProductCard";
import { getSite, type Category } from "@/lib/store";

export const dynamic = "force-dynamic";
const sections: { id: string; number: string; label: string; category: Category; intro: string }[] = [
  { id: "shawarma", number: "01", label: "Shawarma", category: "Shawarma", intro: "Wrapped up with big flavour. Find your favourite from classic garlic to our house special." },
  { id: "burgers", number: "02", label: "Burgers", category: "Burger", intro: "Crispy chicken, soft buns, bold sauces. A burger for every kind of craving." },
  { id: "loaded-fries", number: "03", label: "Loaded Fries", category: "Loaded Fries", intro: "Golden, saucy, cheesy and made to share. Or keep all to yourself." },
  { id: "cold-drinks", number: "04", label: "Cold Drinks", category: "Cold Drinks", intro: "Something chilled to go with every bite. Drinks and sizes are still being finalized." },
];

export default async function Home() {
  const { settings, items } = await getSite();
  return <main id="main"><div id="top" className="top-anchor" />
    <Hero hours={settings.hours} />
    <div className="ticker" aria-label="Al-Tharid is coming soon to Jaranwala with shawarma, burgers, loaded fries, and cold drinks">
      <div className="ticker-track" aria-hidden="true">
        <span className="ticker-brand">AL-THARID</span>
        <span className="ticker-message">FRESH CRAVINGS ARE COMING TO JARANWALA</span>
        <span className="ticker-star">✹</span>
        <span className="ticker-menu">SHAWARMA · BURGERS · LOADED FRIES · COLD DRINKS</span>
      </div>
    </div>
    <section className="intro wrap" id="about" aria-labelledby="about-heading">
      <span className="kicker">ABOUT AL-THARID</span>
      <h2 id="about-heading">Pick your <em>craving.</em></h2>
      <p className="intro-tagline">Made for the cravings worth coming back for.</p>
      <p className="intro-description">
        Al-Tharid is a new food spot coming to Jaranwala. We&apos;re bringing together
        shawarma, burgers, loaded fries, and cold drinks for the moments when only
        a satisfying bite will do.
      </p>
      <div className="intro-details">
        <div><span>FIND US</span><strong>{settings.address}</strong></div>
        <div><span>OPENING</span><strong>{settings.hours}</strong></div>
      </div>
    </section>
    {sections.map((section) => {
      const group = items.filter((item) => item.category === section.category && item.published);
      return (
        <section className={`food-section food-${section.id}`} id={section.id} key={section.id} aria-labelledby={`${section.id}-heading`}>
          <div className="wrap">
            <div className="food-section__heading">
              <div className="food-section__title">
                <span className="food-section__number" aria-hidden="true">{section.number}</span>
                <div>
                  <span className="kicker">THE AL-THARID MENU</span>
                  <h2 id={`${section.id}-heading`}>{section.label}<span className="red-dot">.</span></h2>
                </div>
              </div>
              <div className="food-section__details">
                <p>{section.intro}</p>
                <span className="food-section__count">
                  <strong>{String(group.length).padStart(2, "0")}</strong>
                  <span>{section.category === "Cold Drinks" ? "drinks" : "flavours"} to explore</span>
                </span>
              </div>
            </div>
            <div className="menu-grid">
              {group.length ? group.map((item) => <ProductCard item={item} key={item.id} />) : <p>New flavours are coming soon.</p>}
            </div>
            <p className="menu-note">Preview prices in PKR. Stock photos show representative food and may differ from the final Al-Tharid products.</p>
          </div>
        </section>
      );
    })}
    <DealsSection items={items} />
    <ClosingSection settings={settings} />
  </main>;
}
