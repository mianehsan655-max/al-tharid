'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { cancelExpense, enterManualOrder, recordExpense, setProductCost } from '../business-actions';
import {
  adminAdjustLoyaltyStamps,
  adminDeleteBlogPost,
  adminModerateReview,
  adminSaveBlogPost,
} from '../actions';
import {
  channelLabels,
  collectionChannel,
  collectionDate,
  expenseCategories,
  financialSummary,
  pakistanDay,
  sourceLabels,
  type BusinessSnapshot,
  type CollectionChannel,
  type ExpenseCategory,
  type OrderSource,
  type StaffOrderInput,
} from '@/lib/businessTypes';
import { deliveryCharge, formatPKR, statusLabels, type CheckoutSettings } from '@/lib/orderTypes';
import type {
  BlogPost,
  CustomerReview,
  Item,
  LoyaltyMember,
  LoyaltyMilestone,
  SeoKeyword,
} from '@/lib/store';
import OrdersPanel from './OrdersPanel';

type Tab =
  | 'overview'
  | 'orders'
  | 'counter'
  | 'finances'
  | 'expenses'
  | 'costing'
  | 'customers'
  | 'loyalty'
  | 'reviews'
  | 'blog'
  | 'website';

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '◈' },
  { id: 'orders', label: 'Orders & kitchen', icon: '▤' },
  { id: 'counter', label: 'Counter / phone sale', icon: '＋' },
  { id: 'finances', label: 'Sales & payments', icon: '↗' },
  { id: 'expenses', label: 'Expenses', icon: '−' },
  { id: 'costing', label: 'Product costing', icon: '◷' },
  { id: 'customers', label: 'Customers', icon: '◎' },
  { id: 'loyalty', label: 'Loyalty & rewards', icon: '🎁' },
  { id: 'reviews', label: 'Customer reviews', icon: '★' },
  { id: 'blog', label: 'Blog & Local SEO', icon: '✎' },
  { id: 'website', label: 'Website & menu', icon: '◇' },
];

function Metric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <article className="suite-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

function timestamp(value: string) {
  return new Date(value).toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function exportCSV(name: string, rows: (string | number)[][]) {
  const cell = (value: string | number) => {
    const text =
      typeof value === 'string' && /^[=+\-@\t\r\n]/.test(value)
        ? `'${value}`
        : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  };
  const url = URL.createObjectURL(
    new Blob(['\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function BusinessDashboard({
  initialSnapshot,
  items: initialItems,
  checkoutSettings: initialCheckoutSettings,
  initialLoyaltyMilestones = [],
  initialLoyaltyMembers = [],
  initialReviews = [],
  initialBlogs = [],
  initialSeoKeywords = [],
  children,
}: {
  initialSnapshot: BusinessSnapshot;
  items: Item[];
  checkoutSettings: CheckoutSettings;
  initialLoyaltyMilestones?: LoyaltyMilestone[];
  initialLoyaltyMembers?: LoyaltyMember[];
  initialReviews?: CustomerReview[];
  initialBlogs?: BlogPost[];
  initialSeoKeywords?: SeoKeyword[];
  children: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const items = snapshot.items ?? initialItems;
  const checkoutSettings = snapshot.checkoutSettings ?? initialCheckoutSettings;
  const [tab, setTab] = useState<Tab>('overview');
  const today = pakistanDay(new Date());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [updated, setUpdated] = useState('');
  const fetching = useRef(false);
  const refreshVersion = useRef(0);
  const saving = useRef(false);
  const known = useRef(new Set(initialSnapshot.orders.map((order) => order.id)));
  const [basket, setBasket] = useState<{ id: string; quantity: number }[]>([]);
  const [source, setSource] = useState<Exclude<OrderSource, 'website'>>('walk-in');
  const [fulfillment, setFulfillment] = useState<StaffOrderInput['fulfillment']>('dine-in');
  const [paid, setPaid] = useState(false);
  const [bank, setBank] = useState(false);
  const pendingOrder = useRef<{ fingerprint: string; id: string } | null>(null);
  const pendingExpense = useRef<{ fingerprint: string; id: string } | null>(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Loyalty, Reviews & Blog state
  const [loyaltyMembers, setLoyaltyMembers] = useState(initialLoyaltyMembers);
  const [reviews, setReviews] = useState(initialReviews);
  const [blogs, setBlogs] = useState(initialBlogs);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);

  const summary = financialSummary(snapshot.orders, snapshot.business, from, to);
  const queue = snapshot.orders.filter(
    (order) => !['completed', 'cancelled'].includes(order.status),
  );
  const newCount = queue.filter((order) => order.status === 'new').length;
  const subtotal = basket.reduce(
    (sum, line) =>
      sum + (items.find((item) => item.id === line.id)?.price ?? 0) * line.quantity,
    0,
  );
  const fee = deliveryCharge(subtotal, fulfillment, checkoutSettings);

  const refresh = useCallback(async () => {
    if (fetching.current || saving.current) return;
    fetching.current = true;
    const version = refreshVersion.current;
    try {
      const response = await fetch('/api/admin/business', { cache: 'no-store' });
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? 'Session expired. Sign in again.'
            : 'Could not refresh business records.',
        );
      const data: BusinessSnapshot = await response.json();
      if (version !== refreshVersion.current) return;
      if (!Array.isArray(data.orders) || !data.business)
        throw new Error('Invalid business update.');
      const incoming = data.orders.filter((order) => !known.current.has(order.id));
      if (incoming.length)
        setNotice(
          `${incoming.length} new order${incoming.length === 1 ? '' : 's'} received.`,
        );
      data.orders.forEach((order) => known.current.add(order.id));
      setSnapshot(data);
      setUpdated(new Date().toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi' }));
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Could not refresh records.',
      );
    } finally {
      fetching.current = false;
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 10000);
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    const previous = document.title;
    document.title = `${newCount ? `(${newCount}) ` : ''}Al-Tharid Business Suite`;
    return () => {
      document.title = previous;
    };
  }, [newCount]);

  async function run(operation: () => Promise<void>) {
    if (saving.current) return;
    saving.current = true;
    refreshVersion.current += 1;
    setBusy(true);
    setError('');
    try {
      await operation();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not save. Refresh before retrying.',
      );
    } finally {
      saving.current = false;
      refreshVersion.current += 1;
      setBusy(false);
    }
  }

  function setLine(id: string, quantity: number) {
    setBasket((current) =>
      quantity <= 0
        ? current.filter((line) => line.id !== id)
        : current.some((line) => line.id === id)
          ? current.map((line) =>
              line.id === id ? { id, quantity: Math.min(99, quantity) } : line,
            )
          : [...current, { id, quantity: Math.min(99, quantity) }],
    );
  }

  async function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    await run(async () => {
      if (!basket.length) throw new Error('Add at least one item.');
      const channel: CollectionChannel = bank
        ? 'bank-transfer'
        : fulfillment === 'delivery'
          ? 'cash-delivery'
          : fulfillment === 'dine-in'
            ? 'cash-counter'
            : 'cash-pickup';
      const details = {
        lines: basket,
        source,
        fulfillment,
        paid,
        channel,
        customerName: String(fields.get('name') ?? ''),
        phone: String(fields.get('phone') ?? ''),
        address: String(fields.get('address') ?? ''),
        notes: String(fields.get('notes') ?? ''),
        reference: String(fields.get('reference') ?? ''),
      };
      const fingerprint = JSON.stringify(details);
      if (pendingOrder.current?.fingerprint !== fingerprint)
        pendingOrder.current = { fingerprint, id: crypto.randomUUID() };
      const result = await enterManualOrder({
        ...details,
        requestId: pendingOrder.current.id,
      });
      if (!result.ok) throw new Error(result.error);
      known.current.add(result.order.id);
      setSnapshot((current) => ({
        ...current,
        orders: [
          result.order,
          ...current.orders.filter((order) => order.id !== result.order.id),
        ],
      }));
      setNotice(`${result.order.number} entered into the kitchen queue.`);
      setBasket([]);
      pendingOrder.current = null;
      form.reset();
      setPaid(false);
      setBank(false);
      setTab('orders');
    });
  }

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    await run(async () => {
      const details = {
        date: String(fields.get('date')),
        category: String(fields.get('category')) as ExpenseCategory,
        amount: Number(fields.get('amount')),
        method: String(fields.get('method')) as 'cash' | 'bank-transfer',
        payee: String(fields.get('payee')),
        note: String(fields.get('note')),
      };
      const fingerprint = JSON.stringify(details);
      if (pendingExpense.current?.fingerprint !== fingerprint)
        pendingExpense.current = { fingerprint, id: crypto.randomUUID() };
      const result = await recordExpense({
        ...details,
        requestId: pendingExpense.current.id,
      });
      if (!result.ok) throw new Error(result.error);
      setSnapshot((current) => ({ ...current, business: result.business }));
      pendingExpense.current = null;
      form.reset();
      setNotice('Expense payment recorded.');
    });
  }

  async function submitCost(event: FormEvent<HTMLFormElement>, itemId: string) {
    event.preventDefault();
    const amount = Number(new FormData(event.currentTarget).get('cost'));
    await run(async () => {
      const result = await setProductCost(
        itemId,
        amount,
        snapshot.business.version,
      );
      if (!result.ok) throw new Error(result.error);
      setSnapshot((current) => ({ ...current, business: result.business }));
      setNotice('Cost saved. It applies to new orders only.');
    });
  }

  function exportLedger() {
    exportCSV(`al-tharid-orders-${from}-${to}.csv`, [
      [
        'Order',
        'Placed (Pakistan)',
        'Source',
        'Customer',
        'Phone',
        'Fulfillment',
        'Status',
        'Payment',
        'Food PKR',
        'Delivery PKR',
        'Total PKR',
        'Collection method',
        'Collected at',
        'Transfer reference',
      ],
      ...summary.bookings.map((order) => [
        order.number,
        timestamp(order.createdAt),
        sourceLabels[order.source ?? 'website'],
        order.customerName,
        order.phone,
        order.fulfillment,
        statusLabels[order.status],
        order.paymentStatus,
        order.subtotal,
        order.deliveryFee,
        order.total,
        order.paymentStatus === 'paid'
          ? channelLabels[collectionChannel(order)]
          : '',
        order.paymentStatus === 'paid' ? timestamp(collectionDate(order)) : '',
        order.collection?.reference ?? '',
      ]),
    ]);
  }

  const customers = new Map<
    string,
    {
      name: string;
      phone: string;
      count: number;
      completed: number;
      value: number;
      last: string;
    }
  >();
  for (const order of snapshot.orders) {
    if (!order.phone || order.status === 'cancelled') continue;
    const customer = customers.get(order.phone) ?? {
      name: order.customerName,
      phone: order.phone,
      count: 0,
      completed: 0,
      value: 0,
      last: order.createdAt,
    };
    customer.count += 1;
    if (order.status === 'completed') {
      customer.completed += 1;
      customer.value += order.subtotal;
    }
    customers.set(order.phone, customer);
  }

  return (
    <div className="business-suite">
      <nav className="suite-nav" aria-label="Business modules">
        <div className="suite-nav__brand">
          <span>AL-THARID</span>
          <small>BUSINESS SUITE</small>
        </div>
        {tabs.map((entry) => (
          <button
            type="button"
            key={entry.id}
            aria-pressed={tab === entry.id}
            onClick={() => setTab(entry.id)}
          >
            <span aria-hidden="true">{entry.icon}</span>
            {entry.label}
            {entry.id === 'orders' && newCount > 0 && <b>{newCount}</b>}
          </button>
        ))}
        <a href="/" target="_blank" rel="noopener noreferrer">
          Open website ↗
        </a>
        <p>
          Jaranwala · PKR
          <br />
          Pakistan time
        </p>
      </nav>
      <div className="suite-content">
        <header className="suite-topbar">
          <div>
            <span className="suite-kicker">YOUR RESTAURANT, IN VIEW</span>
            <h2>{tabs.find((entry) => entry.id === tab)?.label}</h2>
            <small>
              {updated ? `Last refreshed ${updated}` : 'Live updates every 10 seconds'}
            </small>
          </div>
          <button type="button" onClick={() => void refresh()}>
            Refresh ↻
          </button>
        </header>
        {error && (
          <p className="suite-alert is-error" role="alert">
            {error}
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </p>
        )}
        {notice && (
          <p className="suite-alert" role="status">
            {notice}
            <button
              type="button"
              onClick={() => setNotice('')}
              aria-label="Dismiss notice"
            >
              ×
            </button>
          </p>
        )}
        {['overview', 'finances', 'expenses'].includes(tab) && (
          <div className="suite-period">
            <label>
              From
              <input
                type="date"
                value={from}
                max={to}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={to}
                min={from}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setFrom(today);
                setTo(today);
              }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                setFrom(`${today.slice(0, 7)}-01`);
                setTo(today);
              }}
            >
              This month
            </button>
            <span>Dates use Asia/Karachi</span>
          </div>
        )}

        {tab === 'overview' && (
          <>
            <div className="suite-metrics">
              <Metric
                label="Kitchen queue now"
                value={queue.length}
                detail={`${newCount} awaiting confirmation`}
              />
              <Metric
                label="Payments collected"
                value={formatPKR(summary.collected)}
                detail="Actual receipts during selected dates"
              />
              <Metric
                label="Food sales completed"
                value={formatPKR(summary.foodSales)}
                detail="Excludes delivery fees"
              />
              <Metric
                label="Unpaid order value"
                value={formatPKR(summary.outstanding)}
                detail="Orders placed during selected dates"
              />
            </div>
            <div className="suite-two">
              <section className="suite-card">
                <h3>Kitchen pulse</h3>
                {(
                  [
                    'new',
                    'confirmed',
                    'preparing',
                    'ready',
                    'out-for-delivery',
                  ] as const
                ).map((status) => (
                  <div className="suite-statline" key={status}>
                    <span>{statusLabels[status]}</span>
                    <strong>
                      {queue.filter((order) => order.status === status).length}
                    </strong>
                  </div>
                ))}
                <button type="button" onClick={() => setTab('orders')}>
                  Open kitchen queue ↗
                </button>
              </section>
              <section className="suite-card">
                <h3>Money &amp; Engagement at a glance</h3>
                <div className="suite-statline">
                  <span>Cash collected</span>
                  <strong>{formatPKR(summary.cashCollected)}</strong>
                </div>
                <div className="suite-statline">
                  <span>Bank transfers collected</span>
                  <strong>{formatPKR(summary.bankCollected)}</strong>
                </div>
                <div className="suite-statline">
                  <span>Craving Club loyalty members</span>
                  <strong>{loyaltyMembers.length}</strong>
                </div>
                <div className="suite-statline">
                  <span>Published customer reviews</span>
                  <strong>{reviews.filter((r) => r.approved).length}</strong>
                </div>
                <p className="suite-help">
                  Sales, collections and expenses are separate measures. A paid
                  order can still be waiting in the kitchen.
                </p>
              </section>
            </div>
            <section className="suite-card">
              <h3>Next in the queue</h3>
              <div className="suite-table">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer / source</th>
                      <th>Stage</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...queue]
                      .reverse()
                      .slice(0, 8)
                      .map((order) => (
                        <tr key={order.id}>
                          <td>
                            {order.number}
                            <small>{timestamp(order.createdAt)}</small>
                          </td>
                          <td>
                            {order.customerName}
                            <small>
                              {sourceLabels[order.source ?? 'website']} ·{' '}
                              {order.fulfillment}
                            </small>
                          </td>
                          <td>{statusLabels[order.status]}</td>
                          <td>
                            {formatPKR(order.total)}
                            <small>{order.paymentStatus}</small>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!queue.length && (
                  <p className="suite-empty">The kitchen queue is clear.</p>
                )}
              </div>
            </section>
          </>
        )}

        {tab === 'orders' && (
          <OrdersPanel
            initialOrders={snapshot.orders}
            initialSettings={checkoutSettings}
          />
        )}

        {tab === 'counter' && (
          <div className="suite-pos">
            <section className="suite-card">
              <h3>Build the order</h3>
              <input
                aria-label="Search products"
                type="search"
                placeholder="Search food or category (e.g. Broast)"
                value={menuSearch}
                onChange={(event) => setMenuSearch(event.target.value)}
              />
              <div className="suite-pos__menu">
                {items
                  .filter(
                    (item) =>
                      item.available &&
                      item.price !== null &&
                      `${item.name} ${item.category}`
                        .toLowerCase()
                        .includes(menuSearch.toLowerCase()),
                  )
                  .map((item) => (
                    <button
                      type="button"
                      disabled={busy}
                      key={item.id}
                      onClick={() =>
                        setLine(
                          item.id,
                          (basket.find((line) => line.id === item.id)?.quantity ??
                            0) + 1,
                        )
                      }
                    >
                      <small>
                        {item.category}
                        {!item.published ? ' · Counter only' : ''}
                      </small>
                      <strong>{item.name}</strong>
                      <span>{formatPKR(item.price!)} ＋</span>
                    </button>
                  ))}
              </div>
            </section>
            <form className="suite-card" onSubmit={(event) => void submitManual(event)}>
              <h3>Counter / phone ticket</h3>
              <fieldset disabled={busy}>
                <div className="suite-form-grid">
                  <label>
                    Order source
                    <select
                      value={source}
                      onChange={(event) =>
                        setSource(event.target.value as typeof source)
                      }
                    >
                      <option value="walk-in">Walk-in</option>
                      <option value="phone">Phone</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </label>
                  <label>
                    Service
                    <select
                      value={fulfillment}
                      onChange={(event) =>
                        setFulfillment(event.target.value as typeof fulfillment)
                      }
                    >
                      <option value="dine-in">Dine-in</option>
                      <option value="pickup">Self pickup</option>
                      <option value="delivery">Home delivery</option>
                    </select>
                  </label>
                  <label>
                    Customer name
                    <input
                      name="name"
                      maxLength={80}
                      placeholder="Walk-in customer"
                    />
                  </label>
                  <label>
                    Phone (optional)
                    <input
                      name="phone"
                      type="tel"
                      maxLength={30}
                      placeholder="03001234567"
                    />
                  </label>
                  {fulfillment === 'delivery' && (
                    <label className="suite-wide">
                      Delivery address
                      <textarea
                        name="address"
                        required
                        minLength={8}
                        maxLength={300}
                        rows={2}
                      />
                      <small>
                        Jaranwala + 5 km surrounding area; check coverage before
                        confirmation.
                      </small>
                    </label>
                  )}
                  <label className="suite-wide">
                    Kitchen notes
                    <textarea
                      name="notes"
                      maxLength={300}
                      rows={2}
                      placeholder="Table number, spice preference, reward voucher…"
                    />
                  </label>
                </div>
                <div className="suite-pos__basket">
                  {basket.map((line) => (
                    <div key={line.id}>
                      <span>{items.find((item) => item.id === line.id)?.name}</span>
                      <div>
                        <button
                          type="button"
                          onClick={() => setLine(line.id, line.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <strong>{line.quantity}</strong>
                        <button
                          type="button"
                          onClick={() => setLine(line.id, line.quantity + 1)}
                          disabled={line.quantity >= 99}
                          aria-label="Increase quantity"
                        >
                          ＋
                        </button>
                      </div>
                    </div>
                  ))}
                  {!basket.length && (
                    <p className="suite-help">Select items from the menu.</p>
                  )}
                </div>
                <div className="suite-statline">
                  <span>Food</span>
                  <strong>{formatPKR(subtotal)}</strong>
                </div>
                <div className="suite-statline">
                  <span>Delivery</span>
                  <strong>{formatPKR(fee)}</strong>
                </div>
                <div className="suite-statline">
                  <span>Total</span>
                  <strong>{formatPKR(subtotal + fee)}</strong>
                </div>
                <label className="suite-check">
                  <input
                    type="checkbox"
                    checked={paid}
                    onChange={(event) => {
                      setPaid(event.target.checked);
                      if (!event.target.checked) setBank(false);
                    }}
                  />
                  Full payment already received
                </label>
                {paid && (
                  <label className="suite-check">
                    <input
                      type="checkbox"
                      checked={bank}
                      onChange={(event) => setBank(event.target.checked)}
                    />
                    Verified bank / wallet transfer
                  </label>
                )}
                {paid && bank && (
                  <label>
                    Verified transaction reference
                    <input
                      name="reference"
                      required
                      minLength={3}
                      maxLength={100}
                    />
                  </label>
                )}
                <button
                  className="suite-primary"
                  type="submit"
                  disabled={!basket.length}
                >
                  {busy ? 'Saving order…' : 'Save order & send to kitchen'}
                </button>
                <p className="suite-help">
                  All prices and delivery charges are verified on the server.
                </p>
              </fieldset>
            </form>
          </div>
        )}

        {tab === 'finances' && (
          <>
            <div className="suite-metrics">
              <Metric
                label="Food payments collected"
                value={formatPKR(summary.foodCollected)}
              />
              <Metric
                label="Delivery fees collected"
                value={formatPKR(summary.deliveryCollected)}
              />
              <Metric
                label="Website collections"
                value={formatPKR(summary.websiteCollected)}
              />
              <Metric
                label="Estimated operating result"
                value={
                  summary.estimatedProfit === null
                    ? 'Costs missing'
                    : formatPKR(summary.estimatedProfit)
                }
                detail="Completed sales less saved unit costs and operating expenses"
              />
            </div>
            <section className="suite-card">
              <h3>Sales and cash reconciliation</h3>
              <div className="suite-financial-grid">
                <Metric
                  label="Completed food revenue"
                  value={formatPKR(summary.foodSales)}
                />
                <Metric
                  label="Completed delivery revenue"
                  value={formatPKR(summary.deliverySales)}
                />
                <Metric
                  label="Known product costs"
                  value={formatPKR(summary.cost)}
                  detail={`${summary.missingCost} sold units lack a saved cost`}
                />
                <Metric
                  label="Operating expense payments"
                  value={formatPKR(summary.operatingExpenses)}
                />
                <Metric
                  label="Cash collected"
                  value={formatPKR(summary.cashCollected)}
                />
                <Metric
                  label="Verified bank collections"
                  value={formatPKR(summary.bankCollected)}
                />
                <Metric
                  label="Net recorded cash movement"
                  value={formatPKR(summary.cashCollected - summary.cashExpenses)}
                  detail="Excludes opening float, withdrawals and unrecorded transactions"
                />
                <Metric
                  label="Net receipts less expense payments"
                  value={formatPKR(summary.collected - summary.expensePayments)}
                  detail="Cash movement measure; not profit"
                />
              </div>
              <p className="suite-help">
                Revenue uses completion dates; collections use payment dates; the
                order ledger uses placement dates.
              </p>
            </section>
            <section className="suite-card">
              <div className="suite-section-head">
                <h3>Food performance</h3>
                <button
                  type="button"
                  onClick={() =>
                    exportCSV(`al-tharid-food-${from}-${to}.csv`, [
                      [
                        'Product',
                        'Quantity',
                        'Food sales PKR',
                        'Known cost PKR',
                        'Missing-cost quantity',
                      ],
                      ...summary.products.map((row) => [
                        row.name,
                        row.quantity,
                        row.sales,
                        row.cost,
                        row.missingCost,
                      ]),
                    ])
                  }
                >
                  Export food CSV ↓
                </button>
              </div>
              <div className="suite-table">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Sold</th>
                      <th>Food revenue</th>
                      <th>Saved cost</th>
                      <th>Gross margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.products.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{row.quantity}</td>
                        <td>{formatPKR(row.sales)}</td>
                        <td>
                          {formatPKR(row.cost)}
                          {row.missingCost > 0 && (
                            <small>{row.missingCost} units uncosted</small>
                          )}
                        </td>
                        <td>
                          {row.missingCost
                            ? 'Incomplete'
                            : formatPKR(row.sales - row.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!summary.products.length && (
                  <p className="suite-empty">
                    No completed food sales in this period.
                  </p>
                )}
              </div>
            </section>
            <section className="suite-card">
              <div className="suite-section-head">
                <h3>Order ledger</h3>
                <button type="button" onClick={exportLedger}>
                  Export orders CSV ↓
                </button>
              </div>
              <div className="suite-table">
                <table>
                  <thead>
                    <tr>
                      <th>Order / source</th>
                      <th>Food</th>
                      <th>Delivery</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.bookings.map((order) => (
                      <tr key={order.id}>
                        <td>
                          {order.number}
                          <small>
                            {sourceLabels[order.source ?? 'website']} ·{' '}
                            {timestamp(order.createdAt)}
                          </small>
                        </td>
                        <td>{formatPKR(order.subtotal)}</td>
                        <td>{formatPKR(order.deliveryFee)}</td>
                        <td>{formatPKR(order.total)}</td>
                        <td>{statusLabels[order.status]}</td>
                        <td>
                          {order.paymentStatus === 'paid'
                            ? channelLabels[collectionChannel(order)]
                            : 'Unpaid'}
                          {order.collection?.reference && (
                            <small>{order.collection.reference}</small>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {tab === 'expenses' && (
          <>
            <form
              className="suite-card"
              onSubmit={(event) => void submitExpense(event)}
            >
              <h3>Record an expense payment</h3>
              <fieldset disabled={busy}>
                <div className="suite-form-grid">
                  <label>
                    Date
                    <input
                      name="date"
                      type="date"
                      required
                      defaultValue={today}
                      max={today}
                    />
                  </label>
                  <label>
                    Category
                    <select name="category">
                      {expenseCategories.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Amount (PKR)
                    <input
                      name="amount"
                      type="number"
                      min={1}
                      max={10000000}
                      step={1}
                      required
                    />
                  </label>
                  <label>
                    Paid through
                    <select name="method">
                      <option value="cash">Cash</option>
                      <option value="bank-transfer">Bank / wallet transfer</option>
                    </select>
                  </label>
                  <label>
                    Supplier / payee
                    <input
                      name="payee"
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  </label>
                  <label>
                    Note / receipt reference
                    <input name="note" maxLength={300} />
                  </label>
                </div>
                <button className="suite-primary" type="submit">
                  Record expense
                </button>
              </fieldset>
            </form>
            <section className="suite-card">
              <div className="suite-section-head">
                <h3>Expense register</h3>
                <button
                  type="button"
                  onClick={() =>
                    exportCSV(`al-tharid-expenses-${from}-${to}.csv`, [
                      ['Date', 'Category', 'Amount PKR', 'Method', 'Payee', 'Note'],
                      ...summary.expenses.map((expense) => [
                        expense.date,
                        expense.category,
                        expense.amount,
                        expense.method,
                        expense.payee,
                        expense.note,
                      ]),
                    ])
                  }
                >
                  Export expense CSV ↓
                </button>
              </div>
              <div className="suite-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Payee / note</th>
                      <th>Category</th>
                      <th>Paid</th>
                      <th>Audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.business.expenses
                      .filter(
                        (expense) => expense.date >= from && expense.date <= to,
                      )
                      .slice()
                      .reverse()
                      .map((expense) => (
                        <tr key={expense.id}>
                          <td>{expense.date}</td>
                          <td>
                            {expense.payee}
                            <small>{expense.note}</small>
                          </td>
                          <td>{expense.category}</td>
                          <td>
                            {formatPKR(expense.amount)}
                            <small>{expense.method}</small>
                          </td>
                          <td>
                            {expense.voidedAt ? (
                              <span>
                                Voided<small>{expense.voidReason}</small>
                              </span>
                            ) : (
                              <form
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  const reason = String(
                                    new FormData(event.currentTarget).get('reason'),
                                  );
                                  void run(async () => {
                                    const result = await cancelExpense(
                                      expense.id,
                                      reason,
                                      snapshot.business.version,
                                    );
                                    if (!result.ok) throw new Error(result.error);
                                    setSnapshot((current) => ({
                                      ...current,
                                      business: result.business,
                                    }));
                                    setNotice(
                                      'Expense voided; original record retained.',
                                    );
                                  });
                                }}
                              >
                                <input
                                  name="reason"
                                  required
                                  minLength={5}
                                  maxLength={300}
                                  placeholder="Correction reason"
                                  aria-label="Reason to void expense"
                                />
                                <button type="submit" disabled={busy}>
                                  Void expense
                                </button>
                              </form>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!snapshot.business.expenses.length && (
                  <p className="suite-empty">No expenses recorded yet.</p>
                )}
              </div>
            </section>
          </>
        )}

        {tab === 'costing' && (
          <section className="suite-card">
            <h3>Cost each product</h3>
            <p className="suite-help">
              Enter the total unit cost: ingredients, sauces and packaging.
              Include all components of a deal.
            </p>
            <div className="suite-table">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Unit cost (PKR)</th>
                    <th>Expected gross margin</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.name}
                        <small>{item.category}</small>
                      </td>
                      <td>
                        {item.price === null ? 'Unset' : formatPKR(item.price)}
                      </td>
                      <td>
                        <form
                          key={`${item.id}-${snapshot.business.costs[item.id]}`}
                          className="suite-cost-form"
                          onSubmit={(event) => void submitCost(event, item.id)}
                        >
                          <input
                            name="cost"
                            aria-label={`Unit cost for ${item.name}`}
                            type="number"
                            min={0}
                            max={100000}
                            step={1}
                            required
                            defaultValue={snapshot.business.costs[item.id] ?? ''}
                            placeholder="Not set"
                          />
                          <button type="submit" disabled={busy}>
                            Save
                          </button>
                        </form>
                      </td>
                      <td>
                        {item.price === null ||
                        snapshot.business.costs[item.id] === undefined
                          ? 'Cost needed'
                          : formatPKR(
                              item.price - snapshot.business.costs[item.id],
                            )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'customers' && (
          <section className="suite-card">
            <h3>Customer history</h3>
            <p className="suite-help">
              Customers are grouped by phone. Walk-in orders without a phone stay
              in the ledger.
            </p>
            <input
              type="search"
              aria-label="Find customer"
              placeholder="Customer name or phone"
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
            />
            <div className="suite-table">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Orders</th>
                    <th>Completed</th>
                    <th>Completed food spend</th>
                    <th>Last visit / order</th>
                  </tr>
                </thead>
                <tbody>
                  {[...customers.values()]
                    .filter((customer) =>
                      `${customer.name} ${customer.phone}`
                        .toLowerCase()
                        .includes(customerSearch.toLowerCase()),
                    )
                    .map((customer) => (
                      <tr key={customer.phone}>
                        <td>
                          {customer.name}
                          <small>{customer.phone}</small>
                        </td>
                        <td>{customer.count}</td>
                        <td>{customer.completed}</td>
                        <td>{formatPKR(customer.value)}</td>
                        <td>{timestamp(customer.last)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'loyalty' && (
          <>
            <section className="suite-card">
              <h3>Craving Club Milestone Structure</h3>
              <p className="suite-help">
                Customers earn 1 Free Welcome Stamp upon signing up, plus 1 stamp
                for every order placed with their mobile number.
              </p>
              <div className="suite-table">
                <table>
                  <thead>
                    <tr>
                      <th>Target</th>
                      <th>Tier Name</th>
                      <th>Prize / Bonus</th>
                      <th>Value</th>
                      <th>Code Prefix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initialLoyaltyMilestones.map((m) => (
                      <tr key={m.targetOrders}>
                        <td>
                          <strong>
                            {m.icon} {m.targetOrders}{' '}
                            {m.targetOrders === 1 ? 'Stamp' : 'Orders'}
                          </strong>
                        </td>
                        <td>{m.title}</td>
                        <td>{m.reward}</td>
                        <td>{formatPKR(m.worthPKR)}</td>
                        <td>
                          <code>{m.codePrefix}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="suite-card">
              <h3>Registered Loyalty Card Members ({loyaltyMembers.length})</h3>
              <p className="suite-help">
                Award bonus stamps for promotions or mark claimed reward codes as
                redeemed when used in an order.
              </p>
              <div className="suite-table">
                <table>
                  <thead>
                    <tr>
                      <th>Member / ID</th>
                      <th>Phone</th>
                      <th>Orders + Bonus</th>
                      <th>Reward Vouchers</th>
                      <th>Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loyaltyMembers.map((member) => {
                      const orderCount =
                        customers.get(member.phone)?.count ?? 0;
                      const totalStamps = orderCount + member.bonusStamps;
                      return (
                        <tr key={member.id}>
                          <td>
                            <strong>{member.name}</strong>
                            <small>
                              {member.id} · Fav: {member.favoriteCategory}
                            </small>
                          </td>
                          <td>+{member.phone}</td>
                          <td>
                            <strong>{totalStamps} Stamps</strong>
                            <small>
                              {orderCount} orders + {member.bonusStamps} bonus
                            </small>
                          </td>
                          <td>
                            {member.rewardCodes.map((rc) => (
                              <div key={rc.code} style={{ marginBottom: 6 }}>
                                <code>{rc.code}</code>{' '}
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void run(async () => {
                                      const res = await adminAdjustLoyaltyStamps({
                                        phone: member.phone,
                                        delta: 0,
                                        redeemCode: rc.code,
                                      });
                                      if (!res.ok) throw new Error(res.error);
                                      setLoyaltyMembers((prev) =>
                                        prev.map((m) =>
                                          m.phone === member.phone
                                            ? {
                                                ...m,
                                                rewardCodes: m.rewardCodes.map(
                                                  (c) =>
                                                    c.code === rc.code
                                                      ? {
                                                          ...c,
                                                          redeemed: !c.redeemed,
                                                        }
                                                      : c,
                                                ),
                                              }
                                            : m,
                                        ),
                                      );
                                      setNotice(`Updated voucher ${rc.code}`);
                                    })
                                  }
                                >
                                  {rc.redeemed ? 'Redeemed ✓' : 'Mark redeemed'}
                                </button>
                              </div>
                            ))}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void run(async () => {
                                    const res = await adminAdjustLoyaltyStamps({
                                      phone: member.phone,
                                      delta: 1,
                                    });
                                    if (!res.ok) throw new Error(res.error);
                                    setLoyaltyMembers((prev) =>
                                      prev.map((m) =>
                                        m.phone === member.phone
                                          ? {
                                              ...m,
                                              bonusStamps: m.bonusStamps + 1,
                                            }
                                          : m,
                                      ),
                                    );
                                    setNotice(
                                      `Added +1 bonus stamp for ${member.name}.`,
                                    );
                                  })
                                }
                              >
                                +1 Stamp
                              </button>
                              <button
                                type="button"
                                disabled={busy || member.bonusStamps <= 0}
                                onClick={() =>
                                  void run(async () => {
                                    const res = await adminAdjustLoyaltyStamps({
                                      phone: member.phone,
                                      delta: -1,
                                    });
                                    if (!res.ok) throw new Error(res.error);
                                    setLoyaltyMembers((prev) =>
                                      prev.map((m) =>
                                        m.phone === member.phone
                                          ? {
                                              ...m,
                                              bonusStamps: Math.max(
                                                0,
                                                m.bonusStamps - 1,
                                              ),
                                            }
                                          : m,
                                      ),
                                    );
                                    setNotice(
                                      `Removed 1 bonus stamp for ${member.name}.`,
                                    );
                                  })
                                }
                              >
                                −1 Stamp
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!loyaltyMembers.length && (
                  <p className="suite-empty">
                    No customers have signed up for the Craving Club yet.
                  </p>
                )}
              </div>
            </section>
          </>
        )}

        {tab === 'reviews' && (
          <section className="suite-card">
            <h3>Customer Reviews Moderation ({reviews.length})</h3>
            <p className="suite-help">
              Approve or hide reviews, feature top 5-star reviews on the homepage,
              or write an official Al-Tharid Jaranwala owner reply.
            </p>
            <div className="suite-table">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Rating &amp; Dish</th>
                    <th>Review &amp; Reply</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((rev) => (
                    <tr key={rev.id}>
                      <td>
                        <strong>{rev.customerName}</strong>
                        <small>
                          {rev.verifiedOrder ? '✓ Verified Order' : 'Visitor'} ·{' '}
                          {timestamp(rev.createdAt)}
                        </small>
                      </td>
                      <td>
                        <strong>{'★'.repeat(rev.rating)}</strong>
                        <small>
                          {rev.category}
                          {rev.favoriteDish ? ` · ${rev.favoriteDish}` : ''}
                        </small>
                      </td>
                      <td style={{ whiteSpace: 'normal', minWidth: 280 }}>
                        <p style={{ margin: '0 0 8px' }}>“{rev.comment}”</p>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            type="text"
                            placeholder="Write official reply…"
                            value={replyTexts[rev.id] ?? rev.adminReply ?? ''}
                            onChange={(e) =>
                              setReplyTexts((prev) => ({
                                ...prev,
                                [rev.id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                const reply =
                                  replyTexts[rev.id] ?? rev.adminReply ?? '';
                                const res = await adminModerateReview({
                                  id: rev.id,
                                  action: 'reply',
                                  reply,
                                });
                                if (!res.ok) throw new Error(res.error);
                                setReviews((prev) =>
                                  prev.map((r) =>
                                    r.id === rev.id
                                      ? { ...r, adminReply: reply || undefined }
                                      : r,
                                  ),
                                );
                                setNotice('Owner reply saved.');
                              })
                            }
                          >
                            Save Reply
                          </button>
                        </div>
                      </td>
                      <td>
                        <strong>{rev.approved ? 'Published' : 'Hidden'}</strong>
                        <small>{rev.featured ? '★ Featured' : 'Standard'}</small>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                const res = await adminModerateReview({
                                  id: rev.id,
                                  action: 'toggle-approve',
                                });
                                if (!res.ok) throw new Error(res.error);
                                setReviews((prev) =>
                                  prev.map((r) =>
                                    r.id === rev.id
                                      ? { ...r, approved: !r.approved }
                                      : r,
                                  ),
                                );
                              })
                            }
                          >
                            {rev.approved ? 'Hide' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                const res = await adminModerateReview({
                                  id: rev.id,
                                  action: 'toggle-feature',
                                });
                                if (!res.ok) throw new Error(res.error);
                                setReviews((prev) =>
                                  prev.map((r) =>
                                    r.id === rev.id
                                      ? { ...r, featured: !r.featured }
                                      : r,
                                  ),
                                );
                              })
                            }
                          >
                            {rev.featured ? 'Unfeature' : 'Feature ★'}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                const res = await adminModerateReview({
                                  id: rev.id,
                                  action: 'delete',
                                });
                                if (!res.ok) throw new Error(res.error);
                                setReviews((prev) =>
                                  prev.filter((r) => r.id !== rev.id),
                                );
                                setNotice('Review deleted.');
                              })
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'blog' && (
          <>
            <section className="suite-card">
              <h3>Jaranwala Local SEO Keyword Research Matrix</h3>
              <p className="suite-help">
                Target these high-intent Jaranwala keywords in blog headlines,
                product descriptions, and social posts to rank #1 locally.
              </p>
              <div className="suite-table">
                <table>
                  <thead>
                    <tr>
                      <th>Primary Keyword</th>
                      <th>Local / Urdu Query</th>
                      <th>Intent &amp; Volume</th>
                      <th>Competition</th>
                      <th>Target Page</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initialSeoKeywords.map((kw) => (
                      <tr key={kw.keyword}>
                        <td>
                          <strong>{kw.keyword}</strong>
                        </td>
                        <td>{kw.urduTransliteration ?? '—'}</td>
                        <td>
                          {kw.intent}
                          <small>{kw.monthlySearchPotential}</small>
                        </td>
                        <td>{kw.competition}</td>
                        <td>
                          <code>{kw.targetPage}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <form
              className="suite-card"
              key={editingBlog?.id ?? 'new-blog'}
              onSubmit={(event) => {
                event.preventDefault();
                const fd = new FormData(event.currentTarget);
                const formEl = event.currentTarget;
                void run(async () => {
                  const res = await adminSaveBlogPost({
                    id: editingBlog?.id,
                    title: String(fd.get('title') ?? ''),
                    slug: String(fd.get('slug') ?? ''),
                    excerpt: String(fd.get('excerpt') ?? ''),
                    contentText: String(fd.get('contentText') ?? ''),
                    coverImage: String(fd.get('coverImage') ?? ''),
                    category: String(fd.get('category') ?? ''),
                    primaryKeyword: String(fd.get('primaryKeyword') ?? ''),
                    secondaryKeywordsText: String(
                      fd.get('secondaryKeywordsText') ?? '',
                    ),
                    published: fd.get('published') === 'on',
                  });
                  if (!res.ok) throw new Error(res.error);
                  setNotice(
                    editingBlog
                      ? 'Blog article updated! Refresh page to see updated list.'
                      : 'New SEO blog article published!',
                  );
                  setEditingBlog(null);
                  formEl.reset();
                });
              }}
            >
              <h3>
                {editingBlog
                  ? `Editing: ${editingBlog.title}`
                  : 'Publish New Local SEO Blog Article'}
              </h3>
              <fieldset disabled={busy}>
                <div className="suite-form-grid">
                  <label className="suite-wide">
                    Article Title (Include Jaranwala / Keyword)
                    <input
                      name="title"
                      required
                      maxLength={140}
                      defaultValue={editingBlog?.title ?? ''}
                      placeholder="e.g. Best Crispy Chicken Broast Deals in Jaranwala"
                    />
                  </label>
                  <label>
                    Category
                    <input
                      name="category"
                      defaultValue={editingBlog?.category ?? 'Local Food Guide'}
                      placeholder="Local Food Guide"
                    />
                  </label>
                  <label>
                    Cover Image Path
                    <input
                      name="coverImage"
                      defaultValue={
                        editingBlog?.coverImage ?? '/menu/broast-quarter.jpg'
                      }
                      placeholder="/menu/broast-quarter.jpg"
                    />
                  </label>
                  <label>
                    Primary SEO Keyword
                    <input
                      name="primaryKeyword"
                      required
                      defaultValue={
                        editingBlog?.primaryKeyword ??
                        'crispy chicken broast in Jaranwala'
                      }
                    />
                  </label>
                  <label>
                    Secondary Keywords (comma-separated)
                    <input
                      name="secondaryKeywordsText"
                      defaultValue={
                        editingBlog?.secondaryKeywords.join(', ') ??
                        'best fast food in Jaranwala, zinger burger Jaranwala'
                      }
                    />
                  </label>
                  <label className="suite-wide">
                    Short SEO Excerpt / Meta Description
                    <textarea
                      name="excerpt"
                      required
                      rows={2}
                      maxLength={260}
                      defaultValue={editingBlog?.excerpt ?? ''}
                    />
                  </label>
                  <label className="suite-wide">
                    Article Paragraphs (separate paragraphs with a new line)
                    <textarea
                      name="contentText"
                      required
                      rows={6}
                      defaultValue={editingBlog?.content.join('\n\n') ?? ''}
                    />
                  </label>
                </div>
                <label className="suite-check">
                  <input
                    name="published"
                    type="checkbox"
                    defaultChecked={editingBlog ? editingBlog.published : true}
                  />
                  Published on website &amp; sitemap
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="suite-primary" type="submit">
                    {editingBlog ? 'Save Blog Changes' : 'Publish Blog Article'}
                  </button>
                  {editingBlog && (
                    <button
                      type="button"
                      onClick={() => setEditingBlog(null)}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </fieldset>
            </form>

            <section className="suite-card">
              <h3>Published &amp; Draft Blog Posts ({blogs.length})</h3>
              <div className="suite-table">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Primary Keyword</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blogs.map((post) => (
                      <tr key={post.id}>
                        <td style={{ whiteSpace: 'normal', maxWidth: 340 }}>
                          <strong>{post.title}</strong>
                          <small>
                            /blog/{post.slug} · {post.readTimeMinutes} min read
                          </small>
                        </td>
                        <td>{post.primaryKeyword}</td>
                        <td>{post.published ? 'Published' : 'Draft'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => setEditingBlog(post)}
                            >
                              Edit
                            </button>
                            <a
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View ↗
                            </a>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void run(async () => {
                                  const res = await adminDeleteBlogPost(post.id);
                                  if (!res.ok) throw new Error(res.error);
                                  setBlogs((prev) =>
                                    prev.filter((b) => b.id !== post.id),
                                  );
                                  setNotice('Blog article removed.');
                                })
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {tab === 'website' && <div className="suite-website">{children}</div>}
      </div>
    </div>
  );
}
