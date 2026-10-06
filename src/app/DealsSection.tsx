import type { Item } from "@/lib/store";
import ProductCard from "./ProductCard";

const labels: Record<string, string> = {
  DL01: "FOR YOUR SOLO CRAVING",
  DL02: "BETTER WITH A FRIEND",
  DL03: "BRING THE WHOLE CREW",
};

export default function DealsSection({ items }: { items: Item[] }) {
  const deals = items.filter((item) => item.category === "Deals" && item.published);

  return (
    <section id="deals" className="food-section deals-section" aria-labelledby="deals-heading">
      <div className="wrap">
        <div className="deals-section__heading">
          <div>
            <span className="deals-section__eyebrow">05 / THE AL-THARID MENU</span>
            <h2 id="deals-heading">DEALS<span>.</span></h2>
            <p className="deals-section__tagline">MORE BITES. BETTER TOGETHER.</p>
          </div>
          <div className="deals-section__intro">
            <span>YOUR FAVOURITES, ALL IN ONE.</span>
            <p>Pick a combo for yourself, share with a friend, or feed the whole crew. Big flavours brought together in one easy order.</p>
          </div>
        </div>
        {deals.length > 0 ? (
          <div className="deals-section__grid">
            {deals.map((deal, index) => (
              <div className="deal-offer" key={deal.id}>
                <div className="deal-offer__label"><span>{labels[deal.id] ?? "YOUR NEXT FAVOURITE COMBO"}</span><b>{String(index + 1).padStart(2, "0")}</b></div>
                <ProductCard item={deal} />
              </div>
            ))}
          </div>
        ) : (
          <p className="deals-section__empty">Fresh deals are coming soon. Check back for your next favourite combo.</p>
        )}
        <p className="deals-section__note">Preview deals and temporary prices in PKR. Photos represent individual foods; final combo photos and offers will be updated before launch.</p>
      </div>
    </section>
  );
}
