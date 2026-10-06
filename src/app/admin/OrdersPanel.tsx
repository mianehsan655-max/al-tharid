"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { collectPayment } from "../business-actions";
import { channelLabels, collectionChannel, sourceLabels } from "@/lib/businessTypes";
import { changeCheckoutSettings, changeOrder } from "../order-actions";
import { formatPKR, googleMapsLocationUrl, nextStatuses, statusLabels, type CheckoutSettings, type Order, type OrderStatus } from "@/lib/orderTypes";

type Filter = "active" | "all" | "new" | "completed" | "cancelled" | "paid" | "unpaid" | "bank" | "cash-delivery" | "cash-pickup" | "delivered";

function date(value: string) {
  return new Date(value).toLocaleString("en-PK", { timeZone: "Asia/Karachi", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function OrdersPanel({ initialOrders, initialSettings }: { initialOrders: Order[]; initialSettings: CheckoutSettings }) {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<Filter>("active");
  const [transferOrder, setTransferOrder] = useState<string | null>(null);
  const [transferReference, setTransferReference] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [settings, setSettings] = useState(initialSettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const knownIds = useRef(new Set(initialOrders.map((order) => order.id)));
  const inFlight = useRef(false);
  const newCount = orders.filter((order) => order.status === "new").length;
  const activeCount = orders.filter((order) => !["completed", "cancelled"].includes(order.status)).length;

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "Your session expired. Sign in again to see new orders." : "Could not refresh orders. Your last loaded orders are still shown.");
      const result = await response.json();
      if (!Array.isArray(result.orders)) throw new Error("Could not read the order update.");
      const incoming = result.orders as Order[];
      const fresh = incoming.filter((order) => !knownIds.current.has(order.id));
      if (fresh.length) setNotice(`${fresh.length} new ${fresh.length === 1 ? "order has" : "orders have"} arrived. Check the New orders tab.`);
      incoming.forEach((order) => knownIds.current.add(order.id));
      setOrders(incoming);
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not refresh orders.");
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 10000);
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    const previous = document.title;
    document.title = `${newCount ? `(${newCount} new) ` : ""}Orders | Al-Tharid Admin`;
    return () => { document.title = previous; };
  }, [newCount]);

  async function update(order: Order, action: "status" | "cash-paid", status?: OrderStatus) {
    if (busy) return;
    setBusy(order.id);
    setError("");
    try {
      const result = await changeOrder(order.requestId, order.version, action, status);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.order) setOrders((current) => current.map((entry) => entry.id === order.id ? result.order! : entry));
      setNotice(action === "cash-paid" ? `Cash recorded for ${order.number}.` : `${order.number}: ${statusLabels[status!]}.`);
    } catch {
      setError("Could not save the change. Refresh orders to check their latest status.");
    } finally {
      setBusy(null);
    }
  }

  async function recordTransfer(order: Order, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(order.id);
    try {
      const result = await collectPayment(order.requestId, order.version, "bank-transfer", transferReference);
      if (!result.ok) setError(result.error);
      else {
        if (result.order) setOrders(current => current.map(entry => entry.id === order.id ? result.order! : entry));
        setTransferOrder(null); setTransferReference(""); setNotice(`Verified transfer recorded for ${order.number}.`);
      }
    } catch { setError("Could not record the payment. Refresh before retrying."); }
    finally { setBusy(null); }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingSettings(true);
    setError("");
    try {
      const result = await changeCheckoutSettings(settings);
      if (!result.ok) setError(result.error);
      else {
        if (result.settings) setSettings(result.settings);
        setNotice("Checkout settings saved. Customers will see them when they load the cart.");
      }
    } catch {
      setError("Could not save checkout settings. Please try again.");
    } finally {
      setSavingSettings(false);
    }
  }

  const term = search.trim().toLowerCase();
  const visible = orders.filter((order) => {
    const matchesFilter = filter === "all" || (filter === "active" ? !["completed", "cancelled"].includes(order.status)
      : filter === "delivered" ? order.status === "completed" && order.fulfillment === "delivery"
      : filter === "paid" ? order.paymentStatus === "paid"
      : filter === "unpaid" ? order.paymentStatus === "unpaid" && order.status !== "cancelled"
      : filter === "bank" ? order.paymentStatus === "paid" && collectionChannel(order) === "bank-transfer"
      : filter === "cash-delivery" || filter === "cash-pickup" ? order.paymentStatus === "paid" && collectionChannel(order) === filter
      : order.status === filter);
    const searchable = `${order.number} ${order.customerName} ${order.phone} ${order.fulfillment} ${order.source ?? "website"}`.toLowerCase();
    return matchesFilter && (!term || searchable.includes(term));
  });

  return (
    <section className="order-management" id="order-management" aria-labelledby="order-management-heading">
      <div className="order-management__heading"><div><span>AL-THARID / LIVE ORDERS</span><h2 id="order-management-heading">Order management<span>.</span></h2><p>New orders appear here automatically. Updates every 10 seconds while this tab is open.</p></div><button type="button" onClick={() => void refresh()}>Refresh orders ↻</button></div>
      <div className="order-management__stats"><div><span>New orders</span><strong>{newCount}</strong></div><div><span>In progress</span><strong>{activeCount}</strong></div><div><span>Completed</span><strong>{orders.filter((order) => order.status === "completed").length}</strong></div></div>
      {notice && <div className="order-management__notice" role="status"><span>{notice}</span><button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button></div>}
      {error && <p className="order-management__error" role="alert">{error}</p>}
      <div className="order-management__toolbar"><div role="group" aria-label="Filter orders">{([ ["active", "In progress"], ["new", "New orders"], ["all", "All"], ["completed", "Completed"], ["delivered", "Delivered"], ["cancelled", "Cancelled"], ["paid", "Paid"], ["unpaid", "Unpaid"], ["bank", "Bank transfer"], ["cash-delivery", "COD collected"], ["cash-pickup", "Pickup cash"] ] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}{value === "new" && newCount > 0 ? ` (${newCount})` : ""}</button>)}</div><label><span className="checkout-sr-only">Search orders</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order number, name or phone" /></label></div>
      <p className="order-management__limit">{orders.length} stored orders. Completed delivery orders appear under Completed.</p>
      <div className="order-management__list">
        {visible.length === 0 ? <div className="order-management__empty"><h3>All quiet for now.</h3><p>No orders match this view. New website orders will appear here.</p></div> : visible.map((order) => (
          <article className={`admin-order${order.status === "new" ? " is-new" : ""}`} key={order.id}>
            <div className="admin-order__heading"><div><span>{date(order.createdAt)}</span><h3>{order.number}</h3></div><div className="admin-order__badges"><span className={`order-status order-status--${order.status}`}>{statusLabels[order.status]}</span><span>{order.fulfillment === "pickup" ? "Self pickup" : order.fulfillment === "dine-in" ? "Dine-in" : "Home delivery"}<span>{sourceLabels[order.source ?? "website"]}</span></span></div><strong>{formatPKR(order.total)}</strong></div>
            <details open={order.status === "new"}><summary>Customer, items &amp; order history</summary><div className="admin-order__details"><div className="admin-order__customer"><h4>{order.customerName}</h4>{order.fulfillment === "delivery" && <p className="admin-order__notes"><strong>Check delivery coverage</strong>Jaranwala city and up to 5 km into the surrounding area. Review the address and location pin before confirming.</p>}{order.phone && <a href={`tel:+${order.phone}`}>+{order.phone}</a>}{order.fulfillment === "delivery" && <p>{order.address}<br />{order.city}</p>}{order.fulfillment === "delivery" && order.deliveryLocation && <a className="admin-order__map" href={googleMapsLocationUrl(order.deliveryLocation)} target="_blank" rel="noopener noreferrer">Open customer location in Google Maps ↗<small>Approximate accuracy: {Math.round(order.deliveryLocation.accuracy)} m</small></a>}{order.notes && <p className="admin-order__notes"><strong>Customer notes</strong>{order.notes}</p>}<span className={`admin-order__payment${order.paymentStatus === "paid" ? " is-paid" : ""}`}>{order.paymentStatus === "paid" ? channelLabels[collectionChannel(order)] : "Payment pending"}{order.collection?.reference && <small> · Ref: {order.collection.reference}</small>}</span></div><div className="admin-order__items">{order.lines.map((line) => <div key={line.id}><span>{line.quantity} × {line.name}</span><strong>{formatPKR(line.lineTotal)}</strong></div>)}<div><span>Delivery</span><strong>{formatPKR(order.deliveryFee)}</strong></div><div><span>Saved food cost</span><strong>{order.lines.some(line => line.unitCost == null) ? "Cost data incomplete" : formatPKR(order.lines.reduce((sum,line) => sum + line.unitCost! * line.quantity,0))}</strong></div><div className="admin-order__total"><span>Total</span><strong>{formatPKR(order.total)}</strong></div></div></div><ol className="admin-order__history">{order.history.map((entry, index) => <li key={`${entry.at}-${index}`}><time dateTime={entry.at}>{date(entry.at)}</time><span>{entry.message}</span></li>)}</ol></details>
            <div className="admin-order__actions">
              {order.paymentStatus === "unpaid" && order.status !== "cancelled" && <button type="button" className="admin-order__cash" disabled={busy !== null} onClick={() => void update(order, "cash-paid")}>Mark cash collected</button>}
              {order.paymentStatus === "unpaid" && order.status !== "cancelled" && <button type="button" disabled={busy !== null} onClick={() => { setTransferOrder(order.id); setTransferReference(""); }}>Record verified transfer</button>}
              {nextStatuses(order).map((status) => <button type="button" key={status} className={status === "cancelled" ? "admin-order__cancel" : "admin-order__advance"} disabled={busy !== null || (status === "completed" && order.paymentStatus !== "paid") || (status === "cancelled" && order.paymentStatus === "paid")} onClick={() => void update(order, "status", status)}>{status === "cancelled" ? "Cancel order" : `Mark ${statusLabels[status].toLowerCase()}`}</button>)}
              {busy === order.id && <span role="status">Saving…</span>}
            </div>
            {transferOrder === order.id && <form className="suite-transfer" onSubmit={event => void recordTransfer(order,event)}><p>Confirm the full amount of {formatPKR(order.total)} has arrived in your account. This records a verified payment; it does not initiate a transfer.</p><label>Bank / wallet transaction reference<input required minLength={3} maxLength={100} value={transferReference} onChange={event => setTransferReference(event.target.value)} /></label><button disabled={busy !== null} type="submit">Confirm payment received</button><button type="button" onClick={() => setTransferOrder(null)}>Close</button></form>}
          </article>
        ))}
      </div>
      <details className="order-settings"><summary>Checkout &amp; delivery settings <span>Manage pickup, fees and ordering availability</span></summary><form onSubmit={saveSettings}>
        <fieldset disabled={savingSettings}><legend className="checkout-sr-only">Checkout settings</legend><div className="order-settings__switches"><label><input type="checkbox" checked={settings.orderingEnabled} onChange={(event) => setSettings({ ...settings, orderingEnabled: event.target.checked })} />Accept website orders</label><label><input type="checkbox" checked={settings.pickupEnabled} onChange={(event) => setSettings({ ...settings, pickupEnabled: event.target.checked })} />Enable self pickup</label><label><input type="checkbox" checked={settings.deliveryEnabled} onChange={(event) => setSettings({ ...settings, deliveryEnabled: event.target.checked })} />Enable home delivery</label></div><div className="order-settings__fields"><label>Delivery city<input value={settings.deliveryCity} maxLength={80} required onChange={(event) => setSettings({ ...settings, deliveryCity: event.target.value })} /></label><label>Delivery fee (PKR)<input type="number" min={0} max={10000} step={1} required value={settings.deliveryFee} onChange={(event) => setSettings({ ...settings, deliveryFee: Number(event.target.value) })} /></label><label>Free delivery from (PKR)<input type="number" min={0} max={100000} step={1} required value={settings.freeDeliveryThreshold} onChange={(event) => setSettings({ ...settings, freeDeliveryThreshold: Number(event.target.value) })} /></label><label>Minimum delivery subtotal (PKR)<input type="number" min={0} max={100000} step={1} required value={settings.minimumDeliverySubtotal} onChange={(event) => setSettings({ ...settings, minimumDeliverySubtotal: Number(event.target.value) })} /></label><label>Pickup estimate (minutes)<input type="number" min={0} max={180} step={1} required value={settings.pickupEstimateMinutes} onChange={(event) => setSettings({ ...settings, pickupEstimateMinutes: Number(event.target.value) })} /></label></div><button type="submit">{savingSettings ? "Saving…" : "Save checkout settings ↗"}</button></fieldset>
        <p>Online payment is unavailable until a payment provider is connected. Cash payments are recorded separately from order status.</p>
      </form></details>
    </section>
  );
}
