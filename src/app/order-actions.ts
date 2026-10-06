"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createOrder, saveCheckoutSettings, updateOrder } from "@/lib/orders";
import type { AdminResult, CheckoutInput, CheckoutResult, CheckoutSettings, OrderStatus } from "@/lib/orderTypes";

function message(error: unknown) {
  // Return input/validation errors, not filesystem paths or internal storage details.
  const code = (error as NodeJS.ErrnoException)?.code;
  if (code || !(error instanceof Error)) return "We could not save this request. Please try again.";
  return error.message;
}

export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  try {
    const receipt = await createOrder(input);
    revalidatePath("/admin");
    return { ok: true, receipt };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export async function changeOrder(requestId: string, version: number, action: "status" | "cash-paid", status?: OrderStatus): Promise<AdminResult> {
  try {
    await requireAdmin();
    const order = await updateOrder(requestId, version, action, status);
    revalidatePath("/admin");
    return { ok: true, order };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export async function changeCheckoutSettings(settings: CheckoutSettings): Promise<AdminResult> {
  try {
    await requireAdmin();
    const checked = await saveCheckoutSettings(settings);
    revalidatePath("/cart");
    revalidatePath("/admin");
    return { ok: true, settings: checked };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}
