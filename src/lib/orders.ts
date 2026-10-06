import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { getSite } from "./store";
import { getBusiness } from "./business";
import type { CollectionChannel, StaffOrderInput } from "./businessTypes";
import { deliveryCharge, nextStatuses } from "./orderTypes";
import type {
  CheckoutInput,
  CheckoutSettings,
  LocationPin,
  Order,
  OrderReceipt,
  OrderStatus,
} from "./orderTypes";

import {
  database,
  jsonParameter,
  readState,
  withDatabaseTransaction,
  writeState,
} from "./db";
const defaults: CheckoutSettings = {
  orderingEnabled: true,
  pickupEnabled: true,
  deliveryEnabled: true,
  deliveryCity: "Jaranwala",
  deliveryFee: 100,
  freeDeliveryThreshold: 500,
  minimumDeliverySubtotal: 0,
  pickupEstimateMinutes: 25,
};

function serialized<T>(operation: () => Promise<T>): Promise<T> {
  return withDatabaseTransaction(operation);
}

function validateRequestId(requestId: string): string {
  if (
    typeof requestId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      requestId,
    )
  ) {
    throw new Error("Invalid checkout request. Please refresh and try again.");
  }
  return requestId.toLowerCase();
}

function text(input: unknown, label: string, max: number, min = 0) {
  if (typeof input !== "string") throw new Error(`Please enter ${label}.`);
  const value = input.trim();
  if (value.length < min || value.length > max)
    throw new Error(`Please check ${label}.`);
  return value;
}

function normalizeInput(raw: CheckoutInput, staff = false): CheckoutInput {
  if (!raw || typeof raw !== "object")
    throw new Error("Invalid checkout request.");
  validateRequestId(raw.requestId);
  if (!Array.isArray(raw.lines) || !raw.lines.length || raw.lines.length > 50)
    throw new Error("Please add between 1 and 50 items to your cart.");
  const ids = new Set<string>();
  const lines = raw.lines
    .map((line) => {
      if (
        !line ||
        typeof line.id !== "string" ||
        line.id.length > 80 ||
        ids.has(line.id) ||
        !Number.isInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > 99
      )
        throw new Error("Please check your cart quantities.");
      ids.add(line.id);
      return { id: line.id, quantity: line.quantity };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  if (
    raw.fulfillment !== "pickup" &&
    raw.fulfillment !== "delivery" &&
    !(staff && raw.fulfillment === "dine-in")
  )
    throw new Error("Choose pickup or home delivery.");
  if (raw.paymentMethod !== "cash" && raw.paymentMethod !== "online")
    throw new Error("Choose a payment method.");
  const digits = text(raw.phone, "your phone number", 30).replace(/\D/g, "");
  const phone = digits.startsWith("0092")
    ? digits.slice(2)
    : digits.startsWith("03")
      ? `92${digits.slice(1)}`
      : digits;
  if (!(staff && !phone) && !/^923\d{9}$/.test(phone))
    throw new Error(
      "Enter a Pakistani mobile number, for example 03001234567.",
    );
  if (!Number.isSafeInteger(raw.expectedTotal) || raw.expectedTotal < 0)
    throw new Error("Please refresh your order total.");
  const deliveryLocation =
    raw.fulfillment === "delivery"
      ? validateLocation(raw.deliveryLocation)
      : null;
  return {
    requestId: raw.requestId.toLowerCase(),
    lines,
    customerName: text(raw.customerName, "your name", 80, 2),
    phone,
    fulfillment: raw.fulfillment,
    address:
      raw.fulfillment === "delivery"
        ? text(raw.address, "your delivery address", 300, 8)
        : "",
    city:
      raw.fulfillment === "delivery"
        ? text(raw.city, "your delivery city", 80, 2)
        : "",
    notes: text(raw.notes, "your order notes", 300),
    paymentMethod: raw.paymentMethod,
    expectedTotal: raw.expectedTotal,
    ...(deliveryLocation ? { deliveryLocation } : {}),
  };
}

function validateLocation(
  raw: LocationPin | null | undefined,
): LocationPin | null {
  if (raw == null) return null;
  if (
    typeof raw !== "object" ||
    !Number.isFinite(raw.latitude) ||
    raw.latitude < -90 ||
    raw.latitude > 90 ||
    !Number.isFinite(raw.longitude) ||
    raw.longitude < -180 ||
    raw.longitude > 180 ||
    !Number.isFinite(raw.accuracy) ||
    raw.accuracy < 0 ||
    raw.accuracy > 20000000
  ) {
    throw new Error(
      "The location pin is invalid. Capture your current location again or remove the pin and enter your address.",
    );
  }
  return {
    latitude: raw.latitude,
    longitude: raw.longitude,
    accuracy: raw.accuracy,
  };
}

export function validateCheckoutSettings(
  raw: CheckoutSettings,
): CheckoutSettings {
  if (
    typeof raw?.orderingEnabled !== "boolean" ||
    typeof raw.pickupEnabled !== "boolean" ||
    typeof raw.deliveryEnabled !== "boolean"
  )
    throw new Error("Please check the checkout switches.");
  if (raw.orderingEnabled && !raw.pickupEnabled && !raw.deliveryEnabled)
    throw new Error("Enable pickup or delivery before opening ordering.");
  const deliveryCity = text(raw.deliveryCity, "the delivery city", 80, 2);
  for (const [label, amount, max] of [
    ["delivery fee", raw.deliveryFee, 10000],
    ["free delivery threshold", raw.freeDeliveryThreshold, 100000],
    ["minimum delivery order", raw.minimumDeliverySubtotal, 100000],
    ["pickup estimate", raw.pickupEstimateMinutes, 180],
  ] as const) {
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > max)
      throw new Error(`Please check the ${label}.`);
  }
  return { ...raw, deliveryCity };
}

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  return validateCheckoutSettings({
    ...defaults,
    ...(await readState<CheckoutSettings>("checkout")),
  });
}

export async function saveCheckoutSettings(settings: CheckoutSettings) {
  const checked = validateCheckoutSettings(settings);
  return serialized(async () => {
    await writeState("checkout", checked);
    return checked;
  });
}

async function readOrder(requestId: string): Promise<Order | null> {
  const key = validateRequestId(requestId);
  const rows =
    await database()`select data from al_tharid.orders where request_id = ${key}::uuid`;
  return rows.length ? (rows[0].data as Order) : null;
}

export function receiptFor(order: Order): OrderReceipt {
  const {
    number,
    createdAt,
    customerName,
    fulfillment,
    paymentMethod,
    paymentStatus,
    status,
    lines,
    subtotal,
    deliveryFee,
    total,
  } = order;
  return {
    number,
    createdAt,
    customerName,
    fulfillment,
    paymentMethod,
    paymentStatus,
    status,
    lines: lines.map(({ unitCost, ...line }) => {
      void unitCost;
      return line;
    }),
    subtotal,
    deliveryFee,
    total,
  };
}

export function orderDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join("");
}

async function nextOrderNumber(date: Date): Promise<string> {
  const day = orderDate(date);
  const rows = await database()`
    insert into al_tharid.order_sequences (day, last) values (${day}, 1)
    on conflict (day) do update set last = al_tharid.order_sequences.last + 1
    returning last
  `;
  const next = Number(rows[0].last);
  if (!Number.isSafeInteger(next))
    throw new Error("Daily order counter needs attention.");
  return `AT-${day}${next}`;
}

export async function createOrder(raw: CheckoutInput): Promise<OrderReceipt> {
  return saveNewOrder(raw);
}

async function saveNewOrder(
  raw: CheckoutInput,
  staff?: StaffOrderInput,
): Promise<OrderReceipt> {
  const input = normalizeInput(raw, !!staff);
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify(
        staff
          ? {
              input,
              source: staff.source,
              paid: staff.paid,
              channel: staff.channel,
              reference: staff.reference,
            }
          : input,
      ),
    )
    .digest("hex");
  return serialized(async () => {
    const existing = await readOrder(input.requestId);
    if (existing) {
      if (existing.requestFingerprint !== fingerprint)
        throw new Error(
          "This checkout request has already been used. Start a new order.",
        );
      return receiptFor(existing);
    }
    const config = await getCheckoutSettings();
    if (!staff && !config.orderingEnabled)
      throw new Error("Ordering is currently paused. Please try again later.");
    if (!staff && input.fulfillment === "pickup" && !config.pickupEnabled)
      throw new Error("Pickup is currently unavailable.");
    if (!staff && input.fulfillment === "delivery" && !config.deliveryEnabled)
      throw new Error("Home delivery is currently unavailable.");
    if (!staff && input.paymentMethod === "online")
      throw new Error(
        "Online payments are not connected yet. Please choose cash payment.",
      );
    if (
      input.fulfillment === "delivery" &&
      input.city.toLowerCase() !== config.deliveryCity.toLowerCase()
    )
      throw new Error(`We currently deliver in ${config.deliveryCity} only.`);
    const [{ items }, business] = await Promise.all([getSite(), getBusiness()]);
    const lines = input.lines.map((line) => {
      const item = items.find((entry) => entry.id === line.id);
      if (
        !item ||
        (!staff && !item.published) ||
        !item.available ||
        item.price === null
      )
        throw new Error(
          "One of your items is unavailable. Review your cart before ordering.",
        );
      if (!Number.isSafeInteger(item.price) || item.price < 0)
        throw new Error(
          "An item price needs updating. Please contact the restaurant.",
        );
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: line.quantity,
        unitPrice: item.price,
        lineTotal: item.price * line.quantity,
        unitCost: business.costs[item.id] ?? null,
      };
    });
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    if (
      input.fulfillment === "delivery" &&
      subtotal < config.minimumDeliverySubtotal
    )
      throw new Error(
        `The minimum delivery subtotal is Rs ${config.minimumDeliverySubtotal.toLocaleString("en-PK")}.`,
      );
    const deliveryFee = deliveryCharge(subtotal, input.fulfillment, config);
    const total = subtotal + deliveryFee;
    if (input.expectedTotal !== total)
      throw new Error(
        "Prices or delivery charges have changed. Refresh this page and review your total before ordering.",
      );
    // Persist the limit across restarts and serverless instances.
    const now = Date.now();
    if (!staff) {
      const recent = await database()`
        select count(*)::integer as count from al_tharid.orders
        where phone = ${input.phone} and source = 'website'
          and created_at > ${new Date(now - 600000).toISOString()}::timestamptz
      `;
      if (recent[0].count >= 10)
        throw new Error(
          "Too many orders from this number. Please contact the restaurant or try again in 10 minutes.",
        );
    }

    const at = new Date(now).toISOString();
    const id = randomUUID();
    const order: Order = {
      id,
      number: await nextOrderNumber(new Date(now)),
      requestId: input.requestId,
      requestFingerprint: fingerprint,
      createdAt: at,
      updatedAt: at,
      version: 1,
      source: staff?.source ?? "website",
      ...(staff
        ? {
            manualFingerprint: createHash("sha256")
              .update(JSON.stringify(staff))
              .digest("hex"),
          }
        : {}),
      ...(staff?.paid
        ? {
            collection: {
              channel: staff.channel,
              at,
              reference: staff.reference,
            },
          }
        : {}),
      customerName: input.customerName,
      phone: input.phone,
      fulfillment: input.fulfillment,
      address: input.address,
      city: input.city,
      deliveryLocation: input.deliveryLocation ?? null,
      notes: input.notes,
      paymentMethod: input.paymentMethod,
      paymentStatus: staff?.paid ? "paid" : "unpaid",
      status: "new",
      lines,
      subtotal,
      deliveryFee,
      total,
      history: [
        {
          at,
          message: staff
            ? `Order entered by admin (${staff.source}).${staff.paid ? " Payment verified and recorded." : " Payment pending."}`
            : "Order received from website checkout.",
        },
      ],
    };
    await database()`
      insert into al_tharid.orders (request_id, number, created_at, phone, source, data)
      values (${order.requestId}::uuid, ${order.number}, ${order.createdAt}::timestamptz,
              ${order.phone}, ${order.source ?? "website"}, ${jsonParameter(order)}::jsonb)
    `;
    return receiptFor(order);
  });
}

export async function listOrders(): Promise<Order[]> {
  return (await listAllOrders()).slice(0, 200);
}

export async function listAllOrders(): Promise<Order[]> {
  const rows =
    await database()`select data from al_tharid.orders order by created_at desc, number desc`;
  return rows.map((row) => row.data as Order);
}

export async function updateOrder(
  requestId: string,
  expectedVersion: number,
  action: "status" | "cash-paid" | "payment",
  status?: OrderStatus,
  payment?: { channel: CollectionChannel; reference: string },
): Promise<Order> {
  return serialized(async () => {
    const order = await readOrder(requestId);
    if (!order) throw new Error("Order not found.");
    if (order.version !== expectedVersion)
      throw new Error(
        "This order changed in another window. Refresh and try again.",
      );
    let message: string;
    if (action === "cash-paid" || action === "payment") {
      if (order.status === "cancelled")
        throw new Error("Cash cannot be recorded for this order.");
      if (order.paymentStatus === "paid") return order;
      const channel =
        action === "cash-paid"
          ? order.fulfillment === "delivery"
            ? "cash-delivery"
            : order.fulfillment === "dine-in"
              ? "cash-counter"
              : "cash-pickup"
          : payment?.channel;
      const reference = payment?.reference?.trim() ?? "";
      validateCollection(channel, order.fulfillment, reference);
      order.collection = {
        channel: channel!,
        reference,
        at: new Date().toISOString(),
      };
      order.paymentMethod = channel === "bank-transfer" ? "online" : "cash";
      order.paymentStatus = "paid";
      message =
        action === "cash-paid"
          ? "Admin recorded cash collected."
          : `Admin verified and recorded ${channel}${reference ? ` (${reference})` : ""}.`;
    } else if (action === "status") {
      if (!status || !nextStatuses(order).includes(status))
        throw new Error("This status change is not allowed.");
      if (status === "completed" && order.paymentStatus !== "paid")
        throw new Error("Record cash collected before completing this order.");
      if (status === "cancelled" && order.paymentStatus === "paid")
        throw new Error(
          "Payment has been collected. Resolve the payment with the customer before cancelling.",
        );
      order.status = status;
      if (status === "completed") order.completedAt = new Date().toISOString();
      message = `Admin changed status to ${status}.`;
    } else {
      throw new Error("Unknown order action.");
    }
    order.updatedAt = new Date().toISOString();
    order.version += 1;
    order.history.push({ at: order.updatedAt, message });
    await database()`
      update al_tharid.orders set data = ${jsonParameter(order)}::jsonb
      where request_id = ${order.requestId}::uuid
    `;
    return order;
  });
}

function validateCollection(
  channel: CollectionChannel | undefined,
  fulfillment: CheckoutInput["fulfillment"],
  reference: string,
) {
  const cash =
    fulfillment === "delivery"
      ? "cash-delivery"
      : fulfillment === "dine-in"
        ? "cash-counter"
        : "cash-pickup";
  if (channel !== cash && channel !== "bank-transfer")
    throw new Error(
      "Choose the cash method matching this order or a verified bank transfer.",
    );
  if (
    typeof reference !== "string" ||
    reference.length > 100 ||
    (channel === "bank-transfer" && reference.trim().length < 3)
  )
    throw new Error(
      "A verified transfer reference is required for bank payments.",
    );
}

export async function createManualOrder(raw: StaffOrderInput): Promise<Order> {
  return serialized(() => saveManualOrder(raw));
}

async function saveManualOrder(raw: StaffOrderInput): Promise<Order> {
  if (
    !raw ||
    !["walk-in", "phone", "whatsapp"].includes(raw.source) ||
    typeof raw.paid !== "boolean"
  )
    throw new Error("Check the order source and payment status.");
  validateCollection(raw.channel, raw.fulfillment, raw.reference);
  const existing = await readOrder(raw.requestId);
  if (existing) {
    if (
      existing.manualFingerprint !==
      createHash("sha256").update(JSON.stringify(raw)).digest("hex")
    )
      throw new Error("This order request has already been used.");
    return existing;
  }
  const [{ items }, config] = await Promise.all([
    getSite(),
    getCheckoutSettings(),
  ]);
  if (!Array.isArray(raw.lines)) throw new Error("Add items to the order.");
  const subtotal = raw.lines.reduce((sum, line) => {
    const item = items.find((entry) => entry.id === line.id);
    if (
      !item ||
      item.price === null ||
      !item.available ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 99
    )
      throw new Error("Check item availability and quantities.");
    return sum + item.price * line.quantity;
  }, 0);
  const input: CheckoutInput = {
    requestId: raw.requestId,
    lines: raw.lines,
    customerName: raw.customerName.trim() || "Walk-in customer",
    phone: raw.phone,
    fulfillment: raw.fulfillment,
    address: raw.address,
    city: raw.fulfillment === "delivery" ? config.deliveryCity : "",
    notes: raw.notes,
    paymentMethod:
      raw.channel === "bank-transfer" && raw.paid ? "online" : "cash",
    expectedTotal: subtotal + deliveryCharge(subtotal, raw.fulfillment, config),
  };
  await saveNewOrder(input, raw);
  const order = await readOrder(raw.requestId);
  if (!order) throw new Error("Could not load the saved order.");
  return order;
}
