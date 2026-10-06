import type { Item } from "./store";
import type { CheckoutSettings, Order } from './orderTypes';

export type OrderSource = 'website' | 'walk-in' | 'phone' | 'whatsapp';
export type CollectionChannel = 'cash-delivery' | 'cash-pickup' | 'cash-counter' | 'bank-transfer';
export type ExpenseCategory = 'ingredients' | 'packaging' | 'rent' | 'utilities' | 'wages' | 'delivery' | 'marketing' | 'maintenance' | 'other';
export type Expense = { id: string; requestId: string; date: string; category: ExpenseCategory; amount: number; method: 'cash' | 'bank-transfer'; payee: string; note: string; createdAt: string; voidedAt?: string; voidReason?: string };
export type CostRecord = { itemId: string; unitCost: number; at: string };
export type BusinessData = { version: number; costs: Record<string, number>; costHistory: CostRecord[]; expenses: Expense[] };
export type StaffOrderInput = { requestId: string; lines: { id: string; quantity: number }[]; customerName: string; phone: string; source: Exclude<OrderSource, 'website'>; fulfillment: 'pickup' | 'delivery' | 'dine-in'; address: string; notes: string; paid: boolean; channel: CollectionChannel; reference: string };
export type BusinessSnapshot = { orders: Order[]; business: BusinessData; items?: Item[]; checkoutSettings?: CheckoutSettings };
export const channelLabels: Record<CollectionChannel, string> = { 'cash-delivery': 'Cash on delivery', 'cash-pickup': 'Cash at pickup', 'cash-counter': 'Counter cash', 'bank-transfer': 'Verified bank transfer' };
export const sourceLabels: Record<OrderSource, string> = { website: 'Website', 'walk-in': 'Walk-in', phone: 'Phone', whatsapp: 'WhatsApp' };
export const expenseCategories: ExpenseCategory[] = ['ingredients', 'packaging', 'rent', 'utilities', 'wages', 'delivery', 'marketing', 'maintenance', 'other'];
export function pakistanDay(value: string | Date) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}
export function collectionChannel(order: Order): CollectionChannel {
  return order.collection?.channel ?? (order.paymentMethod === 'online' ? 'bank-transfer' : order.fulfillment === 'delivery' ? 'cash-delivery' : order.fulfillment === 'dine-in' ? 'cash-counter' : 'cash-pickup');
}
export function collectionDate(order: Order) {
  return order.collection?.at ?? order.history.find(entry => entry.message === 'Admin recorded cash collected.')?.at ?? order.updatedAt;
}
export function completedDate(order: Order) {
  return order.completedAt ?? order.history.find(entry => entry.message === 'Admin changed status to completed.')?.at ?? order.updatedAt;
}
export function financialSummary(orders: Order[], business: BusinessData, from: string, to: string) {
  const within = (date: string) => { const day = pakistanDay(date); return day >= from && day <= to; };
  const bookings = orders.filter(order => within(order.createdAt));
  const fulfilled = orders.filter(order => order.status === 'completed' && within(completedDate(order)));
  const collections = orders.filter(order => order.paymentStatus === 'paid' && order.status !== 'cancelled' && within(collectionDate(order)));
  const expenses = business.expenses.filter(expense => !expense.voidedAt && expense.date >= from && expense.date <= to);
  const products = new Map<string, { id: string; name: string; quantity: number; sales: number; cost: number; missingCost: number }>();
  for (const order of fulfilled) for (const line of order.lines) {
    const row = products.get(line.id) ?? { id: line.id, name: line.name, quantity: 0, sales: 0, cost: 0, missingCost: 0 };
    row.quantity += line.quantity;
    row.sales += line.lineTotal;
    if (line.unitCost == null) row.missingCost += line.quantity;
    else row.cost += line.unitCost * line.quantity;
    products.set(line.id, row);
  }
  const rows = [...products.values()].sort((a,b) => b.sales-a.sales);
  const total = (values: number[]) => values.reduce((sum,value) => sum+value,0);
  const foodSales = total(fulfilled.map(order => order.subtotal));
  const deliverySales = total(fulfilled.map(order => order.deliveryFee));
  const cost = total(rows.map(row => row.cost));
  const operatingExpenses = total(expenses.filter(expense => expense.category !== 'ingredients' && expense.category !== 'packaging').map(expense => expense.amount));
  const missingCost = total(rows.map(row => row.missingCost));
  return {
    bookings, fulfilled, collections, expenses, products: rows, foodSales, deliverySales, cost, missingCost, operatingExpenses,
    estimatedProfit: missingCost ? null : foodSales + deliverySales - cost - operatingExpenses,
    collected: total(collections.map(order => order.total)),
    foodCollected: total(collections.map(order => order.subtotal)),
    deliveryCollected: total(collections.map(order => order.deliveryFee)),
    cashCollected: total(collections.filter(order => collectionChannel(order) !== 'bank-transfer').map(order => order.total)),
    bankCollected: total(collections.filter(order => collectionChannel(order) === 'bank-transfer').map(order => order.total)),
    expensePayments: total(expenses.map(expense => expense.amount)),
    outstanding: total(bookings.filter(order => order.status !== 'cancelled' && order.paymentStatus !== 'paid').map(order => order.total)),
    websiteCollected: total(collections.filter(order => (order.source ?? 'website') === 'website').map(order => order.total)),
    cashExpenses: total(expenses.filter(expense => expense.method === 'cash').map(expense => expense.amount)),
  };
}
