import "server-only";
import { randomUUID } from "node:crypto";
import { getSite } from "./store";
import {
  expenseCategories,
  type BusinessData,
  type Expense,
} from "./businessTypes";
import { readState, withDatabaseTransaction, writeState } from "./db";

function serialized<T>(operation: () => Promise<T>): Promise<T> {
  return withDatabaseTransaction(operation);
}

export async function getBusiness(): Promise<BusinessData> {
  return readState<BusinessData>("business");
}

async function writeBusiness(data: BusinessData): Promise<void> {
  await writeState("business", data);
}

export async function saveCost(
  itemId: string,
  unitCost: number,
  version: number,
) {
  if (!Number.isSafeInteger(unitCost) || unitCost < 0 || unitCost > 100000)
    throw new Error("Enter a whole PKR unit cost between 0 and 100000.");
  return serialized(async () => {
    const data = await getBusiness();
    if (data.version !== version)
      throw new Error("Business data changed. Refresh before saving.");
    if (!(await getSite()).items.some((item) => item.id === itemId))
      throw new Error("Unknown menu item.");
    data.costs[itemId] = unitCost;
    data.costHistory.push({ itemId, unitCost, at: new Date().toISOString() });
    data.version += 1;
    await writeBusiness(data);
    return data;
  });
}
export async function addExpense(
  input: Omit<Expense, "id" | "createdAt" | "voidedAt" | "voidReason">,
) {
  if (
    !input ||
    !/^[0-9a-f-]{36}$/i.test(input.requestId) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    new Date(`${input.date}T12:00:00Z`).toISOString().slice(0, 10) !==
      input.date
  )
    throw new Error("Check the expense date and request.");
  if (
    !expenseCategories.includes(input.category) ||
    !["cash", "bank-transfer"].includes(input.method) ||
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0 ||
    input.amount > 10000000
  )
    throw new Error("Check the expense category, method and amount.");
  if (
    typeof input.payee !== "string" ||
    input.payee.trim().length < 2 ||
    input.payee.length > 100 ||
    typeof input.note !== "string" ||
    input.note.length > 300
  )
    throw new Error("Enter a payee and a short expense note.");
  const clean = {
    ...input,
    payee: input.payee.trim(),
    note: input.note.trim(),
  };
  return serialized(async () => {
    const data = await getBusiness();
    const existing = data.expenses.find(
      (expense) => expense.requestId === input.requestId,
    );
    if (existing) {
      const { id, createdAt, voidedAt, voidReason, ...saved } = existing;
      void id;
      void createdAt;
      void voidedAt;
      void voidReason;
      if (
        saved.date !== clean.date ||
        saved.category !== clean.category ||
        saved.amount !== clean.amount ||
        saved.method !== clean.method ||
        saved.payee !== clean.payee ||
        saved.note !== clean.note
      )
        throw new Error("This expense request has already been used.");
      return data;
    }
    data.expenses.push({
      ...clean,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    });
    data.version += 1;
    await writeBusiness(data);
    return data;
  });
}
export async function voidExpense(id: string, reason: string, version: number) {
  if (
    typeof reason !== "string" ||
    reason.trim().length < 5 ||
    reason.length > 300
  )
    throw new Error("Enter a reason of at least 5 characters.");
  return serialized(async () => {
    const data = await getBusiness();
    if (data.version !== version)
      throw new Error("Business data changed. Refresh before saving.");
    const expense = data.expenses.find((entry) => entry.id === id);
    if (!expense || expense.voidedAt)
      throw new Error("Expense is missing or already voided.");
    expense.voidedAt = new Date().toISOString();
    expense.voidReason = reason.trim();
    data.version += 1;
    await writeBusiness(data);
    return data;
  });
}
