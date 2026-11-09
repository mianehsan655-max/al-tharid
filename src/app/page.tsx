import Hero from "./Hero";
import DealsSection from "./DealsSection";
import LoyaltySection from "./LoyaltySection";
import ReviewsSection from "./ReviewsSection";
import { ClosingSection } from "./Footer";
import ProductCard from "./ProductCard";
import { getSite, type Category } from "@/lib/store";

export const dynamic = "force-dynamic";

const sections: {
  id: string;
  number: string;
  label: string;
  category: Category;
  intro: string;
}[] = [
  {
    id: "shawarma",
    number: "01",
    label: "Shawarma",
    category: "Shawarma",
    intro:
      "Wrapped up with big flavour. Find your favourite from classic whipped garlic toum to our spicy Arabic and house special wraps.",
  },
  {
    id: "burgers",
    number: "02",
    label: "Burgers",
    category: "Burger",
    intro:
      "Shatteringly crispy chicken fillets, soft sesame brioche buns, bold sauces. A burger for every kind of craving in Jaranwala.",
  },
  {
    id: "chicken-broast",
    number: "03",
    label: "Chicken Broast",
    category: "Chicken Broast",
    intro:
      "12-hour marinated & pressure-fried to golden, bone-deep crunch. Served with seasoned fries, soft buns and signature garlic mayo dip.",
  },
  {
    id: "loaded-fries",
    number: "04",
    label: "Loaded Fries",
    category: "Loaded Fries",
    intro:
      "Golden, saucy, smothered in cheese and crispy chicken chunks. Made to share — or keep all to yourself.",
  },
  {
    id: "cold-drinks",
    number: "05",
    label: "Cold Drinks",
    category: "Cold Drinks",
    intro:
      "Frosty Mint Lemonade, Fresh Lime and chilled fizzy drinks to pair with every spicy bite.",
  },
];

export default async function Home() {
  const {
    settings,
    items,
    loyaltyMilestones,
    reviews,
  } = await getSite();

  const restaurantSchema = {
    "@context": "https://schema.org",
    "@type": "FastFoodRestaurant",
    name: "Al-Tharid Jaranwala",
    description:
      "Fast food restaurant in Jaranwala, Punjab, Pakistan serving Crispy Chicken Broast, Zinger Burgers, Arabic Shawarma, Loaded Fries, and Cold Drinks.",
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.address,
      addressLocality: "Jaranwala",
      addressRegion: "Punjab",
      addressCountry: "PK",
    },
    telephone: settings.phone,
    servesCuisine: [
      "Fast Food",
      "Chicken Broast",
      "Burgers",
      "Middle Eastern Shawarma",
      "Pakistani Halal Fast Food",
    ],
    priceRange: "PKR 80 - PKR 2890",
  };

  return (
    <main id="main">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantSchema) }}
      />
      <div id="top" className="top-anchor" />
      <Hero hours={settings.hours} />
      <div
        className="ticker"
        aria-label="Al-Tharid Jaranwala serving Shawarma, Burgers, Crispy Chicken Broast, Loaded Fries, Cold Drinks and Loyalty Rewards"
      >
        <div className="ticker-track" aria-hidden="true">
          <span className="ticker-brand">AL-THARID JARANWALA</span>
          <span className="ticker-message">
            NOW SERVING CRISPY CHICKEN BROAST &amp; LOYALTY STAMP REWARDS
          </span>
          <span className="ticker-star">✹</span>
          <span className="ticker-menu">
            SHAWARMA · BURGERS · CHICKEN BROAST · LOADED FRIES · COLD DRINKS ·
            FREE DELIVERY FROM RS 500
          </span>
        </div>
      </div>

      {sections.map((section) => {
        const group = items.filter(
          (item) => item.category === section.category && item.published,
        );
        return (
          <section
            className={`food-section food-${section.id}`}
            id={section.id}
            key={section.id}
            aria-labelledby={`${section.id}-heading`}
          >
            <div className="wrap">
              <div className="food-section__heading">
                <div className="food-section__title">
                  <span className="food-section__number" aria-hidden="true">
                    {section.number}
                  </span>
                  <div>
                    <span className="kicker">THE AL-THARID MENU</span>
                    <h2 id={`${section.id}-heading`}>
                      {section.label}
                      <span className="red-dot">.</span>
                    </h2>
                  </div>
                </div>
                <div className="food-section__details">
                  <p>{section.intro}</p>
                  <span className="food-section__count">
                    <strong>{String(group.length).padStart(2, "0")}</strong>
                    <span>
                      {section.category === "Cold Drinks"
                        ? "drinks"
                        : "flavours"}{" "}
                      to explore
                    </span>
                  </span>
                </div>
              </div>
              <div className="menu-grid">
                {group.length ? (
                  group.map((item) => <ProductCard item={item} key={item.id} />)
                ) : (
                  <p>New flavours are coming soon.</p>
                )}
              </div>
              <p className="menu-note">
                Prices in whole PKR. Freshly prepared to order in our Jaranwala
                kitchen.
              </p>
            </div>
          </section>
        );
      })}

      <DealsSection items={items} />

      <section className="intro wrap" id="about" aria-labelledby="about-heading">
        <span className="kicker">ABOUT AL-THARID · JARANWALA, PUNJAB</span>
        <h2 id="about-heading">
          Pick your <em>craving.</em>
        </h2>
        <p className="intro-tagline">
          Made for the cravings worth coming back for.
        </p>
        <p className="intro-description">
          Al-Tharid is Jaranwala’s home for bold, freshly prepared fast food.
          We bring together sizzling Arabic Shawarmas, towering Crispy Zinger
          Burgers, pressure-fried Golden Chicken Broast, Cheesy Loaded Fries,
          and Frosty Mint Lemonade — backed by fast doorstep delivery and our
          rewarding Craving Club Loyalty Card.
        </p>
        <div className="intro-details">
          <div>
            <span>FIND US</span>
            <strong>{settings.address}</strong>
          </div>
          <div>
            <span>OPENING HOURS</span>
            <strong>{settings.hours}</strong>
          </div>
          <div>
            <span>HOME DELIVERY</span>
            <strong>Free in Jaranwala from Rs 500</strong>
          </div>
        </div>
      </section>

      <LoyaltySection initialMilestones={loyaltyMilestones} />
      <ReviewsSection initialReviews={reviews} />
      <ClosingSection settings={settings} />
    </main>
  );
}
