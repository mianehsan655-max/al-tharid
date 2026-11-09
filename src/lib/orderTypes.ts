import type { CollectionChannel, OrderSource } from "./businessTypes";

export type Fulfillment = "pickup" | "delivery" | "dine-in";
export type PaymentMethod = "cash" | "online";
export type OrderStatus = "new" | "confirmed" | "preparing" | "ready" | "out-for-delivery" | "completed" | "cancelled";

export type CheckoutSettings = {
  orderingEnabled: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryCity: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  minimumDeliverySubtotal: number;
  pickupEstimateMinutes: number;
};

export type CheckoutInput = {
  requestId: string;
  lines: { id: string; quantity: number }[];
  customerName: string;
  phone: string;
  email?: string;
  fulfillment: Fulfillment;
  address: string;
  city: string;
  deliveryLocation?: LocationPin | null;
  notes: string;
  paymentMethod: PaymentMethod;
  expectedTotal: number;
};

export type LocationPin = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export type OrderLine = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  unitCost?: number | null;
};

export type Order = {
  id: string;
  number: string;
  requestId: string;
  requestFingerprint: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  customerName: string;
  phone: string;
  source?: OrderSource;
  manualFingerprint?: string;
  completedAt?: string;
  collection?: { channel: CollectionChannel; at: string; reference: string };
  fulfillment: Fulfillment;
  address: string;
  city: string;
  deliveryLocation?: LocationPin | null;
  notes: string;
  paymentMethod: PaymentMethod;
  paymentStatus: "unpaid" | "paid";
  status: OrderStatus;
  lines: OrderLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  history: { at: string; message: string }[];
};

export type OrderReceipt = Pick<Order, "number" | "createdAt" | "customerName" | "fulfillment" | "paymentMethod" | "paymentStatus" | "status" | "lines" | "subtotal" | "deliveryFee" | "total"> & {
  phone?: string;
  email?: string;
  memberId?: string;
  accountCreated?: boolean;
  needsPasswordSetup?: boolean;
};
export type CheckoutResult = { ok: true; receipt: OrderReceipt } | { ok: false; error: string };
export type AdminResult = { ok: true; order?: Order; settings?: CheckoutSettings } | { ok: false; error: string };

export const statusLabels: Record<OrderStatus, string> = {
  new: "New order",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready for pickup",
  "out-for-delivery": "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function nextStatuses(order: Pick<Order, "status" | "fulfillment">): OrderStatus[] {
  switch (order.status) {
    case "new": return ["confirmed", "cancelled"];
    case "confirmed": return ["preparing", "cancelled"];
    case "preparing": return [order.fulfillment === "delivery" ? "out-for-delivery" : "ready", "cancelled"];
    case "ready":
    case "out-for-delivery": return ["completed", "cancelled"];
    default: return [];
  }
}

export function formatPKR(value: number) {
  return `Rs ${value.toLocaleString("en-PK")}`;
}

export function deliveryCharge(subtotal: number, fulfillment: Fulfillment, settings: Pick<CheckoutSettings, "deliveryFee" | "freeDeliveryThreshold">) {
  if (fulfillment !== "delivery" || subtotal >= settings.freeDeliveryThreshold) return 0;
  return settings.deliveryFee;
}

export function googleMapsLocationUrl(location: LocationPin) {
  const parameters = new URLSearchParams({ api: "1", query: `${location.latitude},${location.longitude}` });
  return `https://www.google.com/maps/search/?${parameters.toString()}`;
}
