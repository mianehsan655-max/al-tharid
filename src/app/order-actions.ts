"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createOrder, normalizePakistanPhone, saveCheckoutSettings, updateOrder } from "@/lib/orders";
import { ALL_CATEGORIES, updateSite, type Category, type LoyaltyMember } from "@/lib/store";
import type { AdminResult, CheckoutInput, CheckoutResult, CheckoutSettings, OrderStatus } from "@/lib/orderTypes";

function message(error: unknown) {
  // Return input/validation errors, not filesystem paths or internal storage details.
  const code = (error as NodeJS.ErrnoException)?.code;
  if (code || !(error instanceof Error)) return "We could not save this request. Please try again.";
  return error.message;
}

function makeUsername(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .slice(0, 32);
}

export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  try {
    const receipt = await createOrder(input);
    const normalizedPhone = normalizePakistanPhone(input.phone || "");
    const cleanEmail = (input.email ?? "").trim().toLowerCase().slice(0, 120) || undefined;
    const cleanName = (input.customerName ?? "").trim().slice(0, 60) || "Al-Tharid Friend";
    const cleanAddress = (input.address ?? "").trim().slice(0, 220) || undefined;

    // Determine primary category from this order
    const firstCat = receipt.lines[0]?.category as Category | undefined;
    const favCategory: Category =
      firstCat && ALL_CATEGORIES.includes(firstCat) ? firstCat : "Shawarma";

    let memberId = "";
    let accountCreated = false;
    let needsPasswordSetup = true;

    if (/^923\d{9}$/.test(normalizedPhone)) {
      await updateSite((site) => {
        const existing = site.loyaltyMembers.find((m) => m.phone === normalizedPhone);
        if (existing) {
          existing.name = cleanName || existing.name;
          if (!existing.username) {
            existing.username = makeUsername(cleanName) || `user${normalizedPhone.slice(-4)}`;
          }
          if (cleanEmail) existing.email = cleanEmail;
          if (cleanAddress) existing.address = cleanAddress;
          memberId = existing.id;
          needsPasswordSetup = !existing.passwordHash;
        } else {
          accountCreated = true;
          needsPasswordSetup = true;
          const created: LoyaltyMember = {
            id: `ATC-${normalizedPhone.slice(-4)}-${String(site.loyaltyMembers.length + 101)}`,
            name: cleanName,
            username: makeUsername(cleanName) || `user${normalizedPhone.slice(-4)}`,
            phone: normalizedPhone,
            email: cleanEmail,
            address: cleanAddress,
            verifiedBy: "mobile",
            verifiedAt: new Date().toISOString(),
            favoriteCategory: favCategory,
            joinedAt: new Date().toISOString(),
            bonusStamps: 0,
            claimedTargets: [],
            rewardCodes: [],
          };
          site.loyaltyMembers.unshift(created);
          memberId = created.id;
        }
      });
    }

    revalidatePath("/");
    revalidatePath("/admin");

    return {
      ok: true,
      receipt: {
        ...receipt,
        phone: normalizedPhone,
        email: cleanEmail,
        memberId,
        accountCreated,
        needsPasswordSetup,
      },
    };
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
