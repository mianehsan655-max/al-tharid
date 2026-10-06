import { getSite } from "@/lib/store";
import CartContents from "./CartContents";
import { getCheckoutSettings } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CartPage() {
  const [{ settings, items }, config] = await Promise.all([getSite(), getCheckoutSettings()]);
  return (
    <main id="main" className="cart-page">
      <div className="wrap">
        <span className="kicker">YOUR ORDER</span>
        <h1>My Lovely <em>Food Cart.</em></h1>
        <p className="cart-page__intro">Your favourites, your way. Collect from Al-Tharid or let us bring the cravings to you.</p>
        <CartContents items={items.filter((item) => item.published)} config={config} pickupAddress={settings.address} />
      </div>
    </main>
  );
}
