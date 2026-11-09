"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import type { Item } from "@/lib/store";
import { deliveryCharge, formatPKR, googleMapsLocationUrl, statusLabels, type CheckoutInput, type CheckoutSettings, type Fulfillment, type LocationPin, type OrderReceipt } from "@/lib/orderTypes";
import { getProductPhoto } from "@/lib/productPhotos";
import { placeOrder } from "../order-actions";
import { lookupOrJoinLoyalty, setupCustomerPasswordAfterOrder, type LoyaltyCardState } from "../actions";
import { useCart } from "../CartProvider";

const pendingKey = "al-tharid-checkout-request";
const receiptKey = "al-tharid-last-receipt";

function Receipt({
  receipt,
  address,
   fallbackPhone,
  fallbackEmail,
}: {
  receipt: OrderReceipt;
  address: string;
  fallbackPhone: string;
  fallbackEmail: string;
}) {
  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSaved, setPwdSaved] = useState(false);
  const [card, setCard] = useState<LoyaltyCardState | null>(null);
  const [refreshingTrack, setRefreshingTrack] = useState(false);

  const effectivePhone = receipt.phone || fallbackPhone;

  useEffect(() => {
    try {
      const sessionRaw = localStorage.getItem("al-tharid-customer-session");
      if (sessionRaw && effectivePhone) {
        void lookupOrJoinLoyalty({ phone: effectivePhone, name: receipt.customerName }).then((res) => {
          if (res.ok) {
            setCard(res.card);
            if (!receipt.needsPasswordSetup) setPwdSaved(true);
          }
        });
      }
    } catch {
      /* Ignore storage errors */
    }
  }, [effectivePhone, receipt.customerName, receipt.needsPasswordSetup]);

  async function handleSavePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (savingPassword) return;
    setSavingPassword(true);
    setPwdError("");
    try {
      const res = await setupCustomerPasswordAfterOrder({
        phone: effectivePhone,
        name: receipt.customerName,
        email: receipt.email || fallbackEmail,
        password,
      });
      if (!res.ok) {
        setPwdError(res.error);
        return;
      }
      setCard(res.card);
      setPwdSaved(true);
      try {
        localStorage.setItem("al-tharid-loyalty-phone", res.card.member.phone);
        localStorage.setItem(
          "al-tharid-customer-session",
          JSON.stringify({
            id: res.card.member.id,
            name: res.card.member.name,
            username: res.card.member.username,
            phone: res.card.member.phone,
            email: res.card.member.email,
            address: res.card.member.address,
          }),
        );
        window.dispatchEvent(new Event("al-tharid-auth-change"));
      } catch {
        /* Ignore */
      }
    } catch {
      setPwdError("Could not save password right now. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function refreshOrderStatus() {
    if (!effectivePhone || refreshingTrack) return;
    setRefreshingTrack(true);
    try {
      const res = await lookupOrJoinLoyalty({ phone: effectivePhone });
      if (res.ok) setCard(res.card);
    } finally {
      setRefreshingTrack(false);
    }
  }

  const latestTracked =
    card?.recentOrders.find((o) => o.number === receipt.number) ??
    card?.recentOrders[0];
  const liveStatus = latestTracked?.status ?? receipt.status;

  return (
    <section className="order-receipt" aria-labelledby="receipt-heading" tabIndex={-1}>
      <div className="order-food-party" aria-hidden="true">
        {["🍔", "🍟", "🌯", "🥤", "🍔", "🍟", "🌯", "🥤"].map((food, index) => (
          <span key={index} style={{ "--food-index": index } as CSSProperties}>{food}</span>
        ))}
      </div>
      <div className="order-receipt__celebration" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => <span key={index} style={{ "--i": index } as CSSProperties} />)}
        <svg className="order-receipt__check" width="94" height="94" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="45" /><path d="m28 51 15 15 29-31" /></svg>
      </div>
      <span className="checkout-eyebrow">HOORAY! LET THE GOOD FOOD BEGIN</span>
      <h2 id="receipt-heading">YOUR ORDER<br /><em>IS IN.</em></h2>
      <p>Thanks, {receipt.customerName}! Your order has reached Al-Tharid. Our team will confirm it and contact you if needed.</p>
      <div className="order-receipt__reference"><span>YOUR ORDER NUMBER</span><strong>{receipt.number}</strong></div>
      <div className="order-receipt__facts">
        <div><span>How you’ll get it</span><strong>{receipt.fulfillment === "pickup" ? "Self pickup" : "Home delivery"}</strong></div>
        <div><span>Payment</span><strong>{receipt.fulfillment === "pickup" ? "Cash at pickup" : "Cash on delivery"}</strong></div>
      </div>
      {receipt.fulfillment === "pickup" && <p className="order-receipt__pickup">Pickup location: {address}. Please wait for the team to confirm your order before coming to collect it.</p>}
      <div className="order-receipt__items">
        {receipt.lines.map((line) => <div key={line.id}><span>{line.quantity} × {line.name}</span><strong>{formatPKR(line.lineTotal)}</strong></div>)}
        {receipt.fulfillment === "delivery" && <div><span>Delivery</span><strong>{receipt.deliveryFee ? formatPKR(receipt.deliveryFee) : "Free"}</strong></div>}
        <div className="order-receipt__total"><span>Cash due</span><strong>{formatPKR(receipt.total)}</strong></div>
      </div>

      {/* Cute Animated Soft Request to Setup Password & Login */}
      {!pwdSaved ? (
        <div className="cute-password-prompt">
          <div className="cute-password-prompt__mascot" aria-hidden="true">
            <span className="cute-mascot-face">🥰</span>
            <span className="cute-mascot-sparkle cute-mascot-sparkle--1">✨</span>
            <span className="cute-mascot-sparkle cute-mascot-sparkle--2">💖</span>
          </div>
          <div className="cute-password-prompt__body">
            <span className="cute-password-prompt__badge">
              ✨ YOUR ACCOUNT IS READY!
            </span>
            <h3>
              One tiny, sweet request, {receipt.customerName.split(" ")[0]}! 🥺💖
            </h3>
            <p>
              We’ve already saved your mobile number from this order and created your
              personal Al-Tharid account automatically! To{" "}
              <strong>track your live order right now</strong> and unlock your{" "}
              <strong>10-Order Free Food Bonus Card</strong>, could you please kindly set a
              quick password and log in to your account? Pretty please? 🥰✨
            </p>
            {pwdError && (
              <p className="cute-password-prompt__error" role="alert">
                {pwdError}
              </p>
            )}
            <form onSubmit={(e) => void handleSavePassword(e)} className="cute-password-prompt__form">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a simple password (4+ chars)…"
                minLength={4}
                maxLength={80}
                required
              />
              <button type="submit" disabled={savingPassword}>
                {savingPassword
                  ? "Logging you in… 💖"
                  : "Save Password & Track My Order 🥰"}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Live Order Tracker + Total Orders + Bonus Card Preview after setting password */
        <div className="post-order-dashboard">
          <div className="post-order-dashboard__header">
            <div>
              <span className="cute-password-prompt__badge">
                🎉 LOGGED IN · LIVE ORDER &amp; BONUS TRACKER
              </span>
              <h3>
                Yay, {card?.member.name ?? receipt.customerName}! Here is your live order &amp; reward card 💖
              </h3>
            </div>
            <button
              type="button"
              className="post-order-dashboard__refresh"
              onClick={() => void refreshOrderStatus()}
              disabled={refreshingTrack}
            >
              {refreshingTrack ? "Refreshing…" : "↻ Refresh Live Status"}
            </button>
          </div>

          <div className="post-order-stats">
            <div>
              <small>TOTAL ORDERS</small>
              <strong>{card?.orderCount ?? 1}</strong>
            </div>
            <div>
              <small>COMPLETED STAMPS</small>
              <strong>{card?.totalStamps ?? 0} / 10</strong>
            </div>
            <div>
              <small>IN KITCHEN NOW</small>
              <strong>{card?.activeOrderCount ?? 1}</strong>
            </div>
          </div>

          <div className="post-order-live-track">
            <div className="post-order-live-track__top">
              <strong>Live Order #{receipt.number}</strong>
              <span className={`order-status-pill is-${liveStatus}`}>
                {statusLabels[liveStatus]}
              </span>
            </div>
            <div className="post-order-steps" aria-label="Order progress">
              {[
                { key: "new", label: "Placed" },
                { key: "confirmed", label: "Confirmed" },
                { key: "preparing", label: "Preparing" },
                {
                  key: receipt.fulfillment === "delivery" ? "out-for-delivery" : "ready",
                  label: receipt.fulfillment === "delivery" ? "On the Way" : "Ready",
                },
                { key: "completed", label: "Completed (+1 ★)" },
              ].map((s, idx) => {
                const orderRank: Record<string, number> = {
                  new: 0,
                  confirmed: 1,
                  preparing: 2,
                  ready: 3,
                  "out-for-delivery": 3,
                  completed: 4,
                };
                const currentRank = orderRank[liveStatus] ?? 0;
                const isDone = currentRank >= idx;
                return (
                  <div
                    key={s.key}
                    className={`post-order-step${isDone ? " is-done" : ""}`}
                  >
                    <span>{isDone ? "✓" : idx + 1}</span>
                    <small>{s.label}</small>
                  </div>
                );
              })}
            </div>
            <small className="post-order-live-note">
              ✨ As soon as your order is marked <b>Completed</b>, you automatically earn{" "}
              <b>+1 Stamp</b> on your 10-Order Bonus Card!
            </small>
          </div>

          {card && (
            <div className="post-order-bonus-preview">
              <div>
                <strong>
                  {card.rewardEvaluation.icon} Your 10-Order Bonus Target:{" "}
                  {card.rewardEvaluation.rewardTitle}
                </strong>
                <p>{card.rewardEvaluation.rewardDescription}</p>
              </div>
              <Link href="/account" className="primary-button">
                Open My Account &amp; Order History ↗
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="order-receipt__actions"><Link href="/#shawarma">Back to menu ↗</Link><button type="button" onClick={() => window.print()}>Print receipt</button></div>
    </section>
  );
}

export default function CartContents({ items, config, pickupAddress }: { items: Item[]; config: CheckoutSettings; pickupAddress: string }) {
  const { lines, ready, setQuantity, clearCart } = useCart();
  const [fulfillment, setFulfillment] = useState<Fulfillment>(config.pickupEnabled ? "pickup" : "delivery");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState<LocationPin | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const submitLock = useRef(false);
  const pendingRequest = useRef<{ requestId: string; fingerprint: string } | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const locationRequest = useRef(0);

  useEffect(() => () => { locationRequest.current += 1; }, []);

  function captureLocation() {
    if (locating || submitting) return;
    setLocationError("");
    if (!window.isSecureContext || !navigator.geolocation) {
      setLocationError("Location sharing is unavailable here. Enter your complete delivery address below.");
      return;
    }
    const request = ++locationRequest.current;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (request !== locationRequest.current) return;
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
        setLocating(false);
      },
      (failure) => {
        if (request !== locationRequest.current) return;
        setLocating(false);
        setLocationError(failure.code === 1
          ? "Location permission was not granted. You can enable it in your browser or enter your address manually."
          : "We couldn’t get your location. Try again or enter your complete address manually.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(receiptKey) ?? "null");
        if (saved?.receipt && Date.now() - saved.savedAt < 3600000 && localStorage.getItem("al-tharid-cart") === "[]") setReceipt(saved.receipt);
      } catch { /* The current checkout still works when session storage is unavailable. */ }
      try {
        const sessionRaw = localStorage.getItem("al-tharid-customer-session");
        if (sessionRaw) {
          const parsed = JSON.parse(sessionRaw) as {
            name?: string;
            phone?: string;
            email?: string;
            address?: string;
          };
          if (parsed.name) setName((prev) => prev || parsed.name || "");
          if (parsed.phone) setPhone((prev) => prev || parsed.phone || "");
          if (parsed.email) setEmail((prev) => prev || parsed.email || "");
          if (parsed.address) setAddress((prev) => prev || parsed.address || "");
        }
      } catch { /* Ignore storage errors */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (receipt) successRef.current?.focus();
  }, [receipt]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const products = lines.flatMap((line) => {
    const item = items.find((candidate) => candidate.id === line.id);
    return item ? [{ item, quantity: line.quantity }] : [];
  });
  const missing = lines.filter((line) => !items.some((item) => item.id === line.id));
  const subtotal = products.reduce((sum, { item, quantity }) => sum + (item.price ?? 0) * quantity, 0);
  const deliveryFee = deliveryCharge(subtotal, fulfillment, config);
  const total = subtotal + deliveryFee;
  const validItems = !missing.length && products.length > 0 && products.every(({ item }) => item.available && item.price !== null);
  const fulfillmentAvailable = fulfillment === "pickup" ? config.pickupEnabled : config.deliveryEnabled;
  const deliveryMinimumMet = fulfillment === "pickup" || subtotal >= config.minimumDeliverySubtotal;
  const canOrder = config.orderingEnabled && validItems && fulfillmentAvailable && deliveryMinimumMet && !locating;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || !canOrder) return;
    submitLock.current = true;
    setSubmitting(true);
    setError("");
    const details = {
      lines: lines.map((line) => ({ ...line })),
      customerName: name,
      phone,
      email,
      fulfillment,
      address,
      city: fulfillment === "delivery" ? config.deliveryCity : "",
      deliveryLocation: fulfillment === "delivery" ? location : null,
      notes,
      paymentMethod: "cash" as const,
      expectedTotal: total,
    };
    const fingerprint = JSON.stringify(details);
    let requestId: string = pendingRequest.current?.fingerprint === fingerprint
      ? pendingRequest.current.requestId
      : crypto.randomUUID();
    try {
      const pending = JSON.parse(sessionStorage.getItem(pendingKey) ?? "null");
      if (pending?.fingerprint === fingerprint && typeof pending.requestId === "string") requestId = pending.requestId;
      sessionStorage.setItem(pendingKey, JSON.stringify({ requestId, fingerprint }));
    } catch { /* Duplicate clicks are still blocked when browser storage is unavailable. */ }
    pendingRequest.current = { requestId, fingerprint };
    try {
      const result = await placeOrder({ ...details, requestId } satisfies CheckoutInput);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      try {
        sessionStorage.setItem(receiptKey, JSON.stringify({ receipt: result.receipt, savedAt: Date.now() }));
        sessionStorage.removeItem(pendingKey);
      } catch { /* Do not turn a saved order into a failure because browser storage is full. */ }
      clearCart();
      pendingRequest.current = null;
      setReceipt(result.receipt);
    } catch {
      setError("We could not confirm the connection. Please try again with the same details; a retry will not create a duplicate order.");
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  if (!ready) return <div className="checkout-loading" role="status"><span />Getting your cravings ready…</div>;
  if (receipt) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        className="checkout-success checkout-success--kitchen"
      >
        <Receipt
          receipt={receipt}
          address={pickupAddress}
          fallbackPhone={phone}
          fallbackEmail={email}
        />

        <aside className="kitchen-hustle kitchen-hustle--table">
          <span className="kitchen-hustle__label">
            THE AL-THARID KITCHEN
          </span>

          <div className="kitchen-hustle__scene" aria-hidden="true">
            <span className="kitchen-hustle__chef">🧑‍🍳</span>
            <span className="kitchen-hustle__hand">🥄</span>

            <div className="kitchen-hustle__stove">
              <div className="kitchen-hustle__steam">
                <span />
                <span />
                <span />
              </div>

              <span className="kitchen-hustle__pan">🍳</span>
              <span className="kitchen-hustle__flame">🔥</span>
              <div className="kitchen-hustle__counter" />
            </div>

            <div className="kitchen-hustle__food">
              <span className="kitchen-hustle__burger">🍔</span>
              <span className="kitchen-hustle__fries">🍟</span>
              <span className="kitchen-hustle__drink">🥤</span>
            </div>

            <div className="kitchen-hustle__table">
              <span />
              <span />
            </div>
          </div>

          <p>A little hustle. A lot of flavour.</p>
          <small>A glimpse of our kitchen spirit.</small>
        </aside>
      </div>
    );
  }
  if (!lines.length) return (
    <div className="checkout-empty"><span aria-hidden="true">＋</span><h2>ROOM FOR<br /><em>A CRAVING.</em></h2><p>Your cart is empty. Add your favourites and we’ll take it from there.</p><Link href="/#shawarma">Explore the menu ↗</Link></div>
  );

  return (
    <form className="checkout-layout" onSubmit={submit}>
      <div className="checkout-main">
        <section className="checkout-panel" aria-labelledby="basket-heading">
          <div className="checkout-panel__heading"><span>01</span><div><small>YOUR PICKS</small><h2 id="basket-heading">The good stuff.</h2></div><b>{lines.reduce((sum, line) => sum + line.quantity, 0)} items</b></div>
          <div className="checkout-products" role="region" aria-label="Your cart items — scroll to view all" tabIndex={0}>
            {products.map(({ item, quantity }) => (
              <article className="checkout-product" key={item.id}>
                <div className="checkout-product__image"><Image unoptimized src={getProductPhoto(item).src} alt="" fill sizes="90px" /></div>
                <div className="checkout-product__details"><small>{item.category}</small><h3>{item.name}</h3><p>{item.price === null ? "Price unavailable" : `${formatPKR(item.price)} each`}</p>{!item.available && <strong className="checkout-product__unavailable">Currently unavailable</strong>}<button type="button" disabled={submitting} onClick={() => setQuantity(item.id, 0)}>Remove</button></div>
                <div className="checkout-product__controls"><strong>{item.price === null ? "TBC" : formatPKR(item.price * quantity)}</strong><div className="quantity-control" aria-label={`Quantity for ${item.name}`}><button type="button" disabled={submitting} aria-label={`Decrease ${item.name} quantity`} onClick={() => setQuantity(item.id, quantity - 1)}>−</button><output aria-live="polite">{quantity}</output><button type="button" disabled={submitting || quantity === 99} aria-label={`Increase ${item.name} quantity`} onClick={() => setQuantity(item.id, quantity + 1)}>+</button></div></div>
              </article>
            ))}
            {missing.map((line) => <div className="checkout-missing" key={line.id}><p>An item in your cart is no longer on the menu.</p><button type="button" disabled={submitting} onClick={() => setQuantity(line.id, 0)}>Remove unavailable item</button></div>)}
          </div>
          <Link className="checkout-more" href="/#shawarma">+ Add more cravings</Link>
        </section>
        <section className="checkout-panel" aria-labelledby="fulfillment-heading">
          <div className="checkout-panel__heading"><span>02</span><div><small>YOUR WAY</small><h2 id="fulfillment-heading">Pick up or sit back.</h2></div></div>
          <fieldset className="checkout-options" disabled={submitting}><legend className="checkout-sr-only">Choose pickup or delivery</legend>
            <label className={`checkout-option${fulfillment === "pickup" ? " is-selected" : ""}${config.pickupEnabled ? "" : " is-disabled"}`}><input type="radio" name="fulfillment" value="pickup" checked={fulfillment === "pickup"} disabled={!config.pickupEnabled} onChange={() => setFulfillment("pickup")} /><span><strong>Self pickup</strong><small>Collect from Al-Tharid · No delivery fee</small></span></label>
            <label className={`checkout-option${fulfillment === "delivery" ? " is-selected" : ""}${config.deliveryEnabled ? "" : " is-disabled"}`}><input type="radio" name="fulfillment" value="delivery" checked={fulfillment === "delivery"} disabled={!config.deliveryEnabled} onChange={() => setFulfillment("delivery")} /><span><strong>Home delivery</strong><small>{config.deliveryEnabled ? `${config.deliveryCity} · Free from ${formatPKR(config.freeDeliveryThreshold)}` : "Currently unavailable"}</small></span></label>
          </fieldset>
          {fulfillment === "pickup" ? <div className="checkout-location"><strong>YOUR PICKUP SPOT</strong><p>{pickupAddress}</p>{config.pickupEstimateMinutes > 0 && <small>Estimated preparation: {config.pickupEstimateMinutes} minutes after confirmation. The team will confirm your pickup time.</small>}</div> : <div className="checkout-location"><strong>OUR DELIVERY AREA</strong><p>{config.deliveryCity} city and up to 5 km into the surrounding area. Please enter your complete address, including house number and a nearby landmark.</p><small>The team will check your location and confirm delivery coverage before preparing your order.</small></div>}
          {fulfillment === "delivery" && (
            <div className="checkout-map-pin">
              <div className="checkout-map-pin__heading">
                <div><strong>SHARE YOUR DELIVERY LOCATION</strong><p>Use your current location if you’re at the delivery address. Check the pin before placing your order.</p></div>
                <button type="button" disabled={submitting || locating} onClick={captureLocation}>{locating ? "Finding location…" : location ? "Update location" : "Use current location"}</button>
              </div>
              {locating && <p role="status">Waiting for your browser to share your location…</p>}
              {location && (
                <div className="checkout-map-pin__saved" role="status">
                  <span>Location attached · approximate accuracy {Math.round(location.accuracy)} m</span>
                  <a href={googleMapsLocationUrl(location)} target="_blank" rel="noopener noreferrer">Check on Google Maps ↗</a>
                  <button type="button" disabled={submitting || locating} onClick={() => { setLocation(null); setLocationError(""); }}>Remove pin</button>
                </div>
              )}
              {locationError && <p className="checkout-map-pin__error" role="alert">{locationError}</p>}
              <small>Your address is still required so the driver can find your door.</small>
            </div>
          )}
          <fieldset className="checkout-fields" disabled={submitting}><legend className="checkout-sr-only">Customer details</legend>
            <label>Your name<input name="customerName" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required placeholder="Your full name" /></label>
            <label>Mobile number<input name="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} required placeholder="0300 1234567" /></label>
            <label className="checkout-fields__wide">Email address <span>(optional — for account &amp; order updates)</span><input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={120} placeholder="you@example.com (optional)" /></label>
            {fulfillment === "delivery" && <><label className="checkout-fields__wide">Delivery address<textarea name="address" autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} minLength={8} maxLength={300} rows={3} required placeholder="House / street, area, and nearby landmark" /></label><label className="checkout-fields__wide">Delivery hub<input name="city" value={config.deliveryCity} readOnly autoComplete="address-level2" /></label></>}
            <label className="checkout-fields__wide">Order notes <span>(optional)</span><textarea name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={300} rows={2} placeholder="Anything the team should know?" /></label>
          </fieldset>
        </section>
        <section className="checkout-panel" aria-labelledby="payment-heading">
          <div className="checkout-panel__heading"><span>03</span><div><small>KEEP IT EASY</small><h2 id="payment-heading">How you’ll pay.</h2></div></div>
          <fieldset className="checkout-options checkout-options--payment" disabled={submitting}><legend className="checkout-sr-only">Payment method</legend>
            <label className="checkout-option is-selected"><input type="radio" name="payment" value="cash" defaultChecked /><span><strong>{fulfillment === "pickup" ? "Cash at pickup" : "Cash on delivery"}</strong><small>Pay when you receive your food.</small></span><b>CASH</b></label>
            <label className="checkout-option is-disabled"><input type="radio" name="payment" value="online" disabled /><span><strong>Online payment</strong><small>We’re getting this ready. Coming soon.</small></span><b>SOON</b></label>
          </fieldset>
        </section>
      </div>
      <aside className="checkout-summary" aria-labelledby="summary-heading">
        <span className="checkout-eyebrow">THE FINAL BITE</span><h2 id="summary-heading">Your order.</h2>
        <div className="checkout-summary__lines"><div><span>Subtotal</span><strong>{formatPKR(subtotal)}</strong></div><div><span>{fulfillment === "pickup" ? "Pickup" : "Delivery"}</span><strong>{deliveryFee ? formatPKR(deliveryFee) : "Free"}</strong></div><div className="checkout-summary__total"><span>Total</span><strong>{formatPKR(total)}</strong></div></div>
        {fulfillment === "delivery" && config.deliveryEnabled && (
          <p className="checkout-summary__delivery-offer">
            {subtotal >= config.freeDeliveryThreshold
              ? "Free delivery unlocked!"
              : `Add ${formatPKR(config.freeDeliveryThreshold - subtotal)} more for free delivery. Delivery is ${formatPKR(config.deliveryFee)} below ${formatPKR(config.freeDeliveryThreshold)}.`}
          </p>
        )}
        <div className="checkout-summary__method"><span>{fulfillment === "pickup" ? "SELF PICKUP" : "HOME DELIVERY"}</span><strong>{fulfillment === "pickup" ? "Pay cash at pickup" : "Pay cash on delivery"}</strong></div>
        {!config.orderingEnabled && <p className="checkout-warning">Ordering is currently paused.</p>}
        {!validItems && <p className="checkout-warning">Remove unavailable items before placing your order.</p>}
        {!fulfillmentAvailable && <p className="checkout-warning">Choose an available collection method.</p>}
        {!deliveryMinimumMet && <p className="checkout-warning">Delivery requires a subtotal of at least {formatPKR(config.minimumDeliverySubtotal)}.</p>}
        {error && <p ref={errorRef} tabIndex={-1} className="checkout-error" role="alert">{error}</p>}
        <button className="checkout-submit" type="submit" disabled={!canOrder || submitting}>{submitting ? <><span className="checkout-spinner" />Placing your order…</> : <>Place order <span aria-hidden="true">↗</span></>}</button>
        <p className="checkout-summary__help">Your order goes straight to our team. No payment is taken online.</p>
        <Link href="/#shawarma">Continue browsing menu</Link>
      </aside>
    </form>
  );
}
