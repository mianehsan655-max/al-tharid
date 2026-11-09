import type { Metadata } from "next";
import { isAdmin } from "@/lib/auth";
import { ALL_CATEGORIES, getSite } from "@/lib/store";
import { getCheckoutSettings, listAllOrders } from "@/lib/orders";
import BusinessDashboard from "./BusinessDashboard";
import { getBusiness } from "@/lib/business";
import { addItem, login, logout, saveItem, saveSettings } from "../actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = {
  title: "Admin | Al-Tharid Jaranwala",
  robots: { index: false, follow: false },
};

export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await isAdmin())) {
    const { error } = await searchParams;
    return (
      <main id="main" className="admin-login">
        <div className="admin-login-box">
          <span className="kicker">AL-THARID / STAFF ONLY</span>
          <h1>
            Welcome
            <br />
            <em>back.</em>
          </h1>
          <p>Sign in to manage the restaurant and website.</p>
          <form action={login}>
            <label htmlFor="password">Admin password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              minLength={16}
            />
            {error && (
              <p className="form-error" role="alert">
                Incorrect password or admin settings missing.
              </p>
            )}
            <button className="button button-dark" type="submit">
              Sign in ↗
            </button>
          </form>
        </div>
      </main>
    );
  }

  const [site, orders, checkoutSettings, business] = await Promise.all([
    getSite(),
    listAllOrders(),
    getCheckoutSettings(),
    getBusiness(),
  ]);
  const {
    settings,
    items,
    loyaltyMilestones,
    loyaltyMembers,
    reviews,
    blogs,
    seoKeywords,
  } = site;

  return (
    <main id="main" className="admin-page">
      <div className="wrap">
        <div className="admin-heading">
          <div>
            <span className="kicker">AL-THARID JARANWALA / CONTROL ROOM</span>
            <h1>
              Business <em>suite.</em>
            </h1>
            <p>
              Orders, kitchen operations, POS, finances, loyalty rewards,
              customer reviews &amp; local SEO blog.
            </p>
          </div>
          <form action={logout}>
            <button className="outline-button" type="submit">
              Sign out
            </button>
          </form>
        </div>

        <BusinessDashboard
          initialSnapshot={{ orders, business, items, checkoutSettings }}
          items={items}
          checkoutSettings={checkoutSettings}
          initialLoyaltyMilestones={loyaltyMilestones}
          initialLoyaltyMembers={loyaltyMembers}
          initialReviews={reviews}
          initialBlogs={blogs}
          initialSeoKeywords={seoKeywords}
        >
          <section className="admin-panel" id="settings">
            <h2>Store details</h2>
            <form action={saveSettings} className="settings-grid">
              {(
                [
                  "phone",
                  "whatsapp",
                  "address",
                  "hours",
                  "announcement",
                  "instagram",
                  "facebook",
                  "mapsUrl",
                ] as const
              ).map((field) => (
                <label key={field}>
                  {field === "mapsUrl"
                    ? "Google Maps URL"
                    : field.charAt(0).toUpperCase() + field.slice(1)}
                  <input
                    name={field}
                    defaultValue={settings[field]}
                    maxLength={300}
                    placeholder={
                      field === "whatsapp" ? "e.g. 923001234567" : undefined
                    }
                  />
                </label>
              ))}
              <button className="button button-dark" type="submit">
                Save store details ↗
              </button>
            </form>
          </section>

          <section className="admin-panel" id="menu-items">
            <div className="admin-section-heading">
              <h2>Menu &amp; prices</h2>
              <span>{items.length} items across 6 categories</span>
            </div>
            <p className="admin-help">
              Price is in whole PKR. Leave it blank to show “Price coming soon”.
              Uncheck Published to hide an item from the public menu.
            </p>
            <form action={addItem} className="add-item">
              <label>
                New item name
                <input
                  name="name"
                  placeholder="e.g. Peri Peri Broast"
                  maxLength={70}
                  required
                />
              </label>
              <label>
                Category
                <select name="category" defaultValue="Chicken Broast">
                  {ALL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>
              <button className="outline-button" type="submit">
                Add draft item +
              </button>
            </form>

            <div className="admin-items">
              {items.map((item) => (
                <form action={saveItem} className="admin-item" key={item.id}>
                  <div className="admin-item-heading">
                    <strong>{item.id}</strong>
                    <span>{item.category}</span>
                  </div>
                  <input type="hidden" name="id" value={item.id} />
                  <div className="admin-item-fields">
                    <label>
                      Name
                      <input
                        name="name"
                        defaultValue={item.name}
                        required
                        maxLength={70}
                      />
                    </label>
                    <label>
                      Category
                      <select name="category" defaultValue={item.category}>
                        {ALL_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="description-field">
                      Short description
                      <input
                        name="description"
                        defaultValue={item.description}
                        maxLength={180}
                      />
                    </label>
                    <label>
                      Highlight Badge (optional)
                      <input
                        name="badge"
                        defaultValue={item.badge ?? ""}
                        maxLength={30}
                        placeholder="e.g. BESTSELLER or SPICY 🔥"
                      />
                    </label>
                    <label>
                      Price (PKR)
                      <input
                        name="price"
                        type="number"
                        min="0"
                        max="100000"
                        step="1"
                        defaultValue={item.price ?? ""}
                        placeholder="Coming soon"
                      />
                    </label>
                    <label className="description-field">
                      Image paths / HTTPS URLs (one per line)
                      <textarea
                        name="images"
                        defaultValue={item.images?.join("\n") ?? ""}
                        rows={2}
                        maxLength={20000}
                        placeholder="/menu/broast-quarter.jpg"
                      />
                    </label>
                  </div>
                  <div className="admin-item-bottom">
                    <label className="check">
                      <input
                        name="published"
                        type="checkbox"
                        defaultChecked={item.published}
                      />{" "}
                      Published
                    </label>
                    <label className="check">
                      <input
                        name="available"
                        type="checkbox"
                        defaultChecked={item.available}
                      />{" "}
                      Available
                    </label>
                    <button type="submit" className="outline-button">
                      Save item ↗
                    </button>
                  </div>
                </form>
              ))}
            </div>
          </section>
        </BusinessDashboard>
      </div>
    </main>
  );
}
