"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash, randomUUID } from "node:crypto";
import { endSession, requireAdmin, startSession, validPassword } from "@/lib/auth";
import {
  ALL_CATEGORIES,
  getSite,
  updateSite,
  type BlogPost,
  type Category,
  type CustomerReview,
  type LoyaltyMember,
  type LoyaltyMilestone,
  type PendingCustomerOtp,
} from "@/lib/store";
import { listAllOrders, normalizePakistanPhone } from "@/lib/orders";
import type { Fulfillment, OrderStatus } from "@/lib/orderTypes";

const value = (form: FormData, key: string, max = 300) =>
  String(form.get(key) ?? "")
    .trim()
    .slice(0, max);

export async function login(form: FormData) {
  if (!validPassword(value(form, "password", 200))) redirect("/admin?error=1");
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin");
}

export async function saveItem(form: FormData) {
  await requireAdmin();
  await updateSite((site) => {
    const id = value(form, "id", 80);
    const item = site.items.find((entry) => entry.id === id);
    if (!item) throw new Error("Unknown item");
    const name = value(form, "name", 70);
    if (!name) throw new Error("Item name is required");
    const category = value(form, "category", 30) as Category;
    if (!ALL_CATEGORIES.includes(category)) throw new Error("Invalid category");
    const rawPrice = value(form, "price", 12);
    const price = rawPrice === "" ? null : Number(rawPrice);
    if (
      price !== null &&
      (!Number.isSafeInteger(price) || price < 0 || price > 100000)
    )
      throw new Error("Enter a whole PKR price between 0 and 100000");
    const imageText = String(form.get("images") ?? "");
    if (imageText.length > 20000) throw new Error("Image list is too long.");
    const images = imageText
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (images.length > 50)
      throw new Error("Use at most 50 photos per product.");
    for (const src of images) {
      if (src.startsWith("/") && !src.startsWith("//") && !/[\\<>\s]/.test(src))
        continue;
      try {
        const url = new URL(src);
        if (url.protocol === "https:" && !url.username && !url.password)
          continue;
      } catch {
        /* Report below. */
      }
      throw new Error(
        "Use a local /menu/photo.jpg path or a valid HTTPS image URL.",
      );
    }
    if (form.has("images")) item.images = images;
    item.name = name;
    item.category = category;
    item.description = value(form, "description", 180);
    item.badge = value(form, "badge", 30) || undefined;
    item.price = price;
    item.published = form.get("published") === "on";
    item.available = form.get("available") === "on";
  });
  revalidatePath("/");
  revalidatePath("/menu");
  revalidatePath("/admin");
  redirect("/admin#menu-items");
}

export async function addItem(form: FormData) {
  await requireAdmin();
  const name = value(form, "name", 70);
  const category = value(form, "category", 30) as Category;
  if (!name || !ALL_CATEGORIES.includes(category))
    throw new Error("Enter a name and category");
  await updateSite((site) => {
    site.items.push({
      id: randomUUID().slice(0, 8).toUpperCase(),
      category,
      name,
      description: "",
      price: null,
      published: false,
      available: true,
    });
  });
  revalidatePath("/");
  revalidatePath("/menu");
  revalidatePath("/admin");
  redirect("/admin#menu-items");
}

export async function saveSettings(form: FormData) {
  await requireAdmin();
  await updateSite((site) => {
    for (const field of [
      "phone",
      "whatsapp",
      "address",
      "hours",
      "announcement",
      "instagram",
      "facebook",
      "mapsUrl",
    ] as const) {
      site.settings[field] = value(form, field, 300);
    }
  });
  revalidatePath("/");
  revalidatePath("/menu");
  revalidatePath("/admin");
  redirect("/admin#settings");
}

export type CustomerTrackedOrder = {
  number: string;
  createdAt: string;
  status: OrderStatus;
  fulfillment: Fulfillment;
  total: number;
  itemsSummary: string;
  primaryCategory: Category;
  address?: string;
};

export type TenOrderRewardEvaluation = {
  mode: "same-category" | "mystery-box";
  matchedCategory: Category | null;
  rewardTitle: string;
  rewardDescription: string;
  unboxedPrize: string;
  worthPKR: number;
  codePrefix: string;
  icon: string;
  slotCategories: Category[];
};

export type LoyaltyCardState = {
  member: LoyaltyMember;
  orderCount: number;
  completedOrderCount: number;
  activeOrderCount: number;
  totalStamps: number;
  milestones: LoyaltyMilestone[];
  nextMilestone: LoyaltyMilestone | null;
  ordersNeededForNext: number;
  isNewSignup: boolean;
  recentOrders: CustomerTrackedOrder[];
  rewardEvaluation: TenOrderRewardEvaluation;
};

const CATEGORY_REWARD_DETAILS: Record<
  Category,
  {
    title: string;
    description: string;
    unboxedPrize: string;
    worthPKR: number;
    codePrefix: string;
    icon: string;
  }
> = {
  Shawarma: {
    title: "1 Free Classic Shawarma + Surprise! 🌯",
    description:
      "10 Shawarma orders completed! You earned a Free Classic Arabic Shawarma + Chef’s Surprise Dip!",
    unboxedPrize: "1 Free Classic Arabic Garlic Shawarma + Surprise Dip 🌯✨",
    worthPKR: 360,
    codePrefix: "AT-SHAWARMA10",
    icon: "🌯",
  },
  Burger: {
    title: "1 Free Crispy Zinger Burger + Surprise! 🍔",
    description:
      "10 Burger orders completed! You earned a Free Crispy Zinger Burger + Chef’s Surprise!",
    unboxedPrize: "1 Free Crispy Chicken Zinger Burger + Surprise Dip 🍔✨",
    worthPKR: 520,
    codePrefix: "AT-BURGER10",
    icon: "🍔",
  },
  "Chicken Broast": {
    title: "1 Free Quarter Chicken Broast + Surprise! 🍗",
    description:
      "10 Chicken Broast orders completed! You earned a Free Quarter Crispy Broast + Surprise!",
    unboxedPrize: "1 Free Quarter Crispy Chicken Broast Platter + Garlic Mayo 🍗✨",
    worthPKR: 620,
    codePrefix: "AT-BROAST10",
    icon: "🍗",
  },
  "Loaded Fries": {
    title: "1 Free Cheesy Loaded Fries + Surprise! 🍟",
    description:
      "10 Loaded Fries orders completed! You earned a Free Classic Cheesy Loaded Fries + Surprise!",
    unboxedPrize: "1 Free Classic Cheesy Loaded Fries + Surprise Sauce 🍟✨",
    worthPKR: 390,
    codePrefix: "AT-FRIES10",
    icon: "🍟",
  },
  "Cold Drinks": {
    title: "1 Free Frosty Mint Lemonade + Surprise! 🥤",
    description:
      "10 Cold Drink orders completed! You earned a Free Frosty Mint Lemonade + Surprise!",
    unboxedPrize: "1 Free Frosty Mint Lemonade + Surprise Treat 🥤✨",
    worthPKR: 250,
    codePrefix: "AT-DRINK10",
    icon: "🥤",
  },
  Deals: {
    title: "1 Free Classic Shawarma + Surprise! 🌯",
    description:
      "10 Combo Orders completed! You earned a Free Classic Shawarma + Chef’s Surprise!",
    unboxedPrize: "1 Free Classic Arabic Shawarma + Surprise Treat 🌯✨",
    worthPKR: 450,
    codePrefix: "AT-DEAL10",
    icon: "🌯",
  },
};

async function buildLoyaltyCardState(
  member: LoyaltyMember,
  milestonesList: LoyaltyMilestone[],
  isNewSignup: boolean,
): Promise<LoyaltyCardState> {
  const sanitized = sanitizeMemberForClient(member);
  const orders = await listAllOrders();
  const customerOrders = orders
    .filter((o) => o.phone === sanitized.phone && o.status !== "cancelled")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const completedOrders = customerOrders
    .filter((o) => o.status === "completed")
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  const activeOrders = customerOrders.filter((o) => o.status !== "completed");

  const recentOrders: CustomerTrackedOrder[] = customerOrders
    .slice(0, 30)
    .map((o) => {
      const firstCat = o.lines[0]?.category as Category | undefined;
      const primaryCategory: Category =
        firstCat && ALL_CATEGORIES.includes(firstCat) ? firstCat : "Shawarma";
      const itemsSummary = o.lines
        .map((l) => `${l.quantity}× ${l.name}`)
        .join(", ");
      return {
        number: o.number,
        createdAt: o.createdAt,
        status: o.status,
        fulfillment: o.fulfillment,
        total: o.total,
        itemsSummary,
        primaryCategory,
        address: o.address || undefined,
      };
    });

  // Extract category for each completed order (or active orders if none completed yet so user sees preview)
  const sourceOrders =
    completedOrders.length > 0 ? completedOrders : [...customerOrders].reverse();
  const slotCategories: Category[] = sourceOrders.slice(-10).map((o) => {
    const cats = Array.from(
      new Set(
        o.lines
          .map((l) => l.category as Category)
          .filter((c) => ALL_CATEGORIES.includes(c)),
      ),
    );
    return cats[0] ?? sanitized.favoriteCategory ?? "Shawarma";
  });

  // Check if all orders in the streak are of the SAME category or MIXED
  const uniqueCategories = Array.from(new Set(slotCategories));
  const isSameCategory =
    slotCategories.length > 0 && uniqueCategories.length === 1;
  const matchedCategory: Category | null = isSameCategory
    ? uniqueCategories[0]
    : null;

  const rewardEvaluation: TenOrderRewardEvaluation = matchedCategory
    ? {
        mode: "same-category",
        matchedCategory,
        rewardTitle: CATEGORY_REWARD_DETAILS[matchedCategory].title,
        rewardDescription: CATEGORY_REWARD_DETAILS[matchedCategory].description,
        unboxedPrize: CATEGORY_REWARD_DETAILS[matchedCategory].unboxedPrize,
        worthPKR: CATEGORY_REWARD_DETAILS[matchedCategory].worthPKR,
        codePrefix: CATEGORY_REWARD_DETAILS[matchedCategory].codePrefix,
        icon: CATEGORY_REWARD_DETAILS[matchedCategory].icon,
        slotCategories,
      }
    : {
        mode: "mystery-box",
        matchedCategory: null,
        rewardTitle: "🎁 Mystery Unbox at Order #10!",
        rewardDescription:
          "You ordered a delicious mix of items! Complete 10 orders to open the Mystery Unbox for a Free Classic Shawarma or Surprise Treat!",
        unboxedPrize:
          "🎁 Mystery Box Prize: 1 Free Classic Shawarma + Surprise Loaded Dip Upgrade! 🌯✨",
        worthPKR: 450,
        codePrefix: "AT-MYSTERY10",
        icon: "🎁",
        slotCategories,
      };

  // Stamps come from completed orders (+ any manual admin bonusStamps)
  const totalStamps = completedOrders.length + sanitized.bonusStamps;
  const dynamicMilestone: LoyaltyMilestone = {
    targetOrders: 10,
    title:
      rewardEvaluation.mode === "same-category"
        ? `10× ${matchedCategory} Master Reward`
        : "10-Order Mystery Unbox Reward",
    reward: rewardEvaluation.rewardTitle,
    worthPKR: rewardEvaluation.worthPKR,
    codePrefix: rewardEvaluation.codePrefix,
    icon: rewardEvaluation.icon,
    badgeColor: "#e93822",
  };

  const effectiveMilestones = [dynamicMilestone];
  const nextMilestone = totalStamps < 10 ? dynamicMilestone : null;
  const ordersNeededForNext = Math.max(0, 10 - totalStamps);

  return {
    member: sanitized,
    orderCount: customerOrders.length,
    completedOrderCount: completedOrders.length,
    activeOrderCount: activeOrders.length,
    totalStamps,
    milestones:
       effectiveMilestones.length > 0 ? effectiveMilestones : milestonesList,
    nextMilestone,
    ordersNeededForNext,
    isNewSignup,
    recentOrders,
    rewardEvaluation,
  };
}

function hashCustomerPassword(rawPassword: string): string {
  return createHash("sha256")
    .update(`al-tharid-customer-salt-v1:${rawPassword.trim()}`)
    .digest("hex");
}

function sanitizeMemberForClient(member: LoyaltyMember): LoyaltyMember {
  const clone = structuredClone(member);
  delete clone.passwordHash;
  return clone;
}

function makeUsername(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .slice(0, 32);
}

export async function requestCustomerSignupOtp(input: {
  name: string;
  phone?: string;
  email?: string;
  channel: "mobile" | "email";
  password: string;
  address?: string;
  favoriteCategory?: Category;
}): Promise<
  | {
      ok: true;
      otpId: string;
      channel: "mobile" | "email";
      targetDisplay: string;
      demoOtpCode: string;
    }
  | { ok: false; error: string }
> {
  try {
    const cleanName = (input.name ?? "").trim().slice(0, 60);
    if (cleanName.length < 2) {
      return { ok: false, error: "Please enter your name (at least 2 characters)." };
    }

    const rawPassword = (input.password ?? "").trim();
    if (rawPassword.length < 4) {
      return {
        ok: false,
        error: "Please set a password of at least 4 characters for login.",
      };
    }

    const channel: "mobile" | "email" =
      input.channel === "email" ? "email" : "mobile";
    const normalizedPhone = input.phone
      ? normalizePakistanPhone(input.phone)
      : "";
    const hasValidPhone = /^923\d{9}$/.test(normalizedPhone);
    const cleanEmail = (input.email ?? "").trim().toLowerCase().slice(0, 120);
    const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

    if (channel === "mobile" && !hasValidPhone) {
      return {
        ok: false,
        error:
          "Enter a valid Pakistani mobile number (e.g. 0300 1234567) to receive your mobile OTP.",
      };
    }

    if (channel === "email" && !hasValidEmail) {
      return {
        ok: false,
        error:
          "Enter a valid email address (e.g. name@example.com) to receive your email OTP.",
      };
    }

    if (!hasValidPhone && !hasValidEmail) {
      return {
        ok: false,
        error: "Please provide a valid Pakistani mobile number or email address.",
      };
    }

    // Generate a fallback synthetic phone identifier if signing up strictly by email without phone
    const effectivePhone = hasValidPhone
      ? normalizedPhone
      : `92300${String(
          Math.abs(
            Array.from(cleanEmail).reduce(
              (acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0,
              7,
            ),
          ) % 10000000,
        ).padStart(7, "0")}`;

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const otpId = `OTP-${randomUUID().slice(0, 8).toUpperCase()}`;
    const now = Date.now();
    const expiresAt = new Date(now + 10 * 60 * 1000).toISOString();
    const fav: Category =
      input.favoriteCategory && ALL_CATEGORIES.includes(input.favoriteCategory)
        ? input.favoriteCategory
        : "Chicken Broast";
    const cleanAddress = (input.address ?? "").trim().slice(0, 220) || undefined;
    const username = makeUsername(cleanName) || `user${effectivePhone.slice(-4)}`;

    const pending: PendingCustomerOtp = {
      id: otpId,
      channel,
      target: channel === "email" ? cleanEmail : effectivePhone,
      name: cleanName,
      username,
      phone: effectivePhone,
      email: hasValidEmail ? cleanEmail : undefined,
      address: cleanAddress,
      passwordHash: hashCustomerPassword(rawPassword),
      favoriteCategory: fav,
      code,
      expiresAt,
      createdAt: new Date(now).toISOString(),
    };

    await updateSite((site) => {
      const list = Array.isArray(site.pendingOtps) ? site.pendingOtps : [];
      // Remove expired or same-target OTPs
      site.pendingOtps = [
        pending,
        ...list.filter(
          (item) =>
            new Date(item.expiresAt).getTime() > now &&
            item.target !== pending.target,
        ),
      ].slice(0, 50);
    });

    const targetDisplay =
      channel === "email"
        ? cleanEmail
        : `+${effectivePhone.slice(0, 2)} ${effectivePhone.slice(2, 5)} ${effectivePhone.slice(5)}`;

    return {
      ok: true,
      otpId,
      channel,
      targetDisplay,
      demoOtpCode: code,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not send verification OTP.",
    };
  }
}

export async function verifyCustomerSignupOtp(input: {
  otpId: string;
  code: string;
}): Promise<{ ok: true; card: LoyaltyCardState } | { ok: false; error: string }> {
  try {
    const cleanCode = (input.code ?? "").replace(/\D/g, "").trim();
    if (cleanCode.length !== 6) {
      return { ok: false, error: "Please enter the 6-digit OTP verification code." };
    }

    let verifiedPending: PendingCustomerOtp | null = null;
    let isNewSignup = false;
    let memberRecord!: LoyaltyMember;
    let milestonesList: LoyaltyMilestone[] = [];

    await updateSite((site) => {
      milestonesList = site.loyaltyMilestones;
      const list = Array.isArray(site.pendingOtps) ? site.pendingOtps : [];
      const found = list.find((item) => item.id === input.otpId);
      if (!found) {
        throw new Error("Verification session expired. Please request a new OTP.");
      }
      if (new Date(found.expiresAt).getTime() < Date.now()) {
        throw new Error("This OTP has expired. Please request a new 6-digit OTP.");
      }
      if (found.code !== cleanCode) {
        throw new Error("Invalid OTP code. Please check the 6-digit code and try again.");
      }
      verifiedPending = found;
      site.pendingOtps = list.filter((item) => item.id !== found.id);

      const existing = site.loyaltyMembers.find(
        (m) =>
          m.phone === found.phone ||
          (found.email && m.email && m.email.toLowerCase() === found.email.toLowerCase()),
      );

      if (existing) {
        existing.name = found.name;
        existing.username = found.username;
        existing.phone = found.phone;
        if (found.email) existing.email = found.email;
        if (found.address) existing.address = found.address;
        existing.passwordHash = found.passwordHash;
        existing.verifiedBy = found.channel;
        existing.verifiedAt = new Date().toISOString();
        existing.favoriteCategory = found.favoriteCategory;
        memberRecord = sanitizeMemberForClient(existing);
      } else {
        isNewSignup = true;
        const created: LoyaltyMember = {
          id: `ATC-${found.phone.slice(-4)}-${String(site.loyaltyMembers.length + 101)}`,
          name: found.name,
          username: found.username,
          phone: found.phone,
          email: found.email,
          address: found.address,
          passwordHash: found.passwordHash,
          verifiedBy: found.channel,
          verifiedAt: new Date().toISOString(),
          favoriteCategory: found.favoriteCategory,
          joinedAt: new Date().toISOString(),
          bonusStamps: 0,
          claimedTargets: [],
          rewardCodes: [],
        };
        site.loyaltyMembers.unshift(created);
        memberRecord = sanitizeMemberForClient(created);
      }
    });

    if (!verifiedPending) {
      return { ok: false, error: "Could not verify OTP." };
    }

    const card = await buildLoyaltyCardState(
      memberRecord,
      milestonesList,
      isNewSignup,
    );

    revalidatePath("/");
    revalidatePath("/admin");

    return {
      ok: true,
      card,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not verify OTP code.",
    };
  }
}

export async function loginCustomerWithPassword(input: {
  identifier: string;
  password: string;
}): Promise<{ ok: true; card: LoyaltyCardState } | { ok: false; error: string }> {
  try {
    const rawId = (input.identifier ?? "").trim();
    const rawPassword = (input.password ?? "").trim();
    if (!rawId || !rawPassword) {
      return {
        ok: false,
        error: "Please enter your username (or mobile/email) and password.",
      };
    }

    const lowerId = rawId.toLowerCase();
    const compactId = makeUsername(rawId);
    const normalizedPhone = normalizePakistanPhone(rawId);
    const isPhoneCandidate = /^923\d{9}$/.test(normalizedPhone);
    const expectedHash = hashCustomerPassword(rawPassword);

    const site = await getSite();
    const found = site.loyaltyMembers.find((m) => {
      if (isPhoneCandidate && m.phone === normalizedPhone) return true;
      if (m.email && m.email.toLowerCase() === lowerId) return true;
      if (m.username && m.username.toLowerCase() === compactId) return true;
      if (m.name.trim().toLowerCase() === lowerId) return true;
      if (makeUsername(m.name) === compactId && compactId.length >= 2) return true;
      return false;
    });

    if (!found) {
      return {
        ok: false,
        error:
          "No account found with that username, mobile number, or email. Please sign up first!",
      };
    }

    if (!found.passwordHash) {
      return {
        ok: false,
        error:
          "This account has not set a password yet. Use Sign Up with OTP once to verify and set your password!",
      };
    }

    if (found.passwordHash !== expectedHash) {
      return {
        ok: false,
        error: "Incorrect password. Please try again.",
      };
    }

    const card = await buildLoyaltyCardState(
      found,
      site.loyaltyMilestones,
      false,
    );

    return {
      ok: true,
      card,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not log in right now.",
    };
  }
}

export async function setupCustomerPasswordAfterOrder(input: {
  phone: string;
  name?: string;
  email?: string;
  address?: string;
  password: string;
}): Promise<{ ok: true; card: LoyaltyCardState } | { ok: false; error: string }> {
  try {
    const phone = normalizePakistanPhone(input.phone || "");
    if (!/^923\d{9}$/.test(phone)) {
      return { ok: false, error: "Invalid mobile number." };
    }
    const rawPassword = (input.password ?? "").trim();
    if (rawPassword.length < 4) {
      return {
        ok: false,
        error: "Please choose a password of at least 4 characters.",
      };
    }

    let memberRecord!: LoyaltyMember;
    let milestonesList: LoyaltyMilestone[] = [];
    const passwordHash = hashCustomerPassword(rawPassword);
    const cleanName = (input.name ?? "").trim().slice(0, 60) || "Al-Tharid Friend";
    const cleanEmail = (input.email ?? "").trim().toLowerCase().slice(0, 120) || undefined;
    const cleanAddress = (input.address ?? "").trim().slice(0, 220) || undefined;

    await updateSite((site) => {
      milestonesList = site.loyaltyMilestones;
      const existing = site.loyaltyMembers.find((m) => m.phone === phone);
      if (existing) {
        if (cleanName) existing.name = cleanName;
        if (!existing.username) {
          existing.username = makeUsername(cleanName) || `user${phone.slice(-4)}`;
        }
        if (cleanEmail) existing.email = cleanEmail;
        if (cleanAddress) existing.address = cleanAddress;
        existing.passwordHash = passwordHash;
        existing.verifiedBy = existing.verifiedBy || "mobile";
        existing.verifiedAt = existing.verifiedAt || new Date().toISOString();
        memberRecord = sanitizeMemberForClient(existing);
      } else {
        const created: LoyaltyMember = {
          id: `ATC-${phone.slice(-4)}-${String(site.loyaltyMembers.length + 101)}`,
          name: cleanName,
          username: makeUsername(cleanName) || `user${phone.slice(-4)}`,
          phone,
          email: cleanEmail,
          address: cleanAddress,
          passwordHash,
          verifiedBy: "mobile",
          verifiedAt: new Date().toISOString(),
          favoriteCategory: "Shawarma",
          joinedAt: new Date().toISOString(),
          bonusStamps: 0,
          claimedTargets: [],
          rewardCodes: [],
        };
        site.loyaltyMembers.unshift(created);
        memberRecord = sanitizeMemberForClient(created);
      }
    });

    const card = await buildLoyaltyCardState(memberRecord, milestonesList, false);
    revalidatePath("/");
    revalidatePath("/admin");
    return { ok: true, card };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not save your password right now.",
    };
  }
}

export async function updateCustomerProfileAddress(input: {
  memberId: string;
  address?: string;
  favoriteCategory?: Category;
}): Promise<{ ok: true; member: LoyaltyMember } | { ok: false; error: string }> {
  try {
    let updatedMember: LoyaltyMember | null = null;
    await updateSite((site) => {
      const member = site.loyaltyMembers.find((m) => m.id === input.memberId);
      if (!member) throw new Error("Account not found.");
      member.address = (input.address ?? "").trim().slice(0, 220) || undefined;
      if (
        input.favoriteCategory &&
        ALL_CATEGORIES.includes(input.favoriteCategory)
      ) {
        member.favoriteCategory = input.favoriteCategory;
      }
      updatedMember = sanitizeMemberForClient(member);
    });
    if (!updatedMember) return { ok: false, error: "Account not found." };
    revalidatePath("/");
    return { ok: true, member: updatedMember };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not update profile.",
    };
  }
}

export async function lookupOrJoinLoyalty(input: {
  name?: string;
  phone: string;
  favoriteCategory?: Category;
}): Promise<{ ok: true; card: LoyaltyCardState } | { ok: false; error: string }> {
  try {
    const phone = normalizePakistanPhone(input.phone || "");
    if (!/^923\d{9}$/.test(phone)) {
      return {
        ok: false,
        error: "Enter a valid Pakistani mobile number (e.g. 0300 1234567).",
      };
    }

    const orders = await listAllOrders();
    const customerOrders = orders.filter(
      (o) => o.phone === phone && o.status !== "cancelled",
    );

    let isNewSignup = false;
    let memberRecord!: LoyaltyMember;
    let milestonesList: LoyaltyMilestone[] = [];

    await updateSite((site) => {
      milestonesList = site.loyaltyMilestones;
      const existing = site.loyaltyMembers.find((m) => m.phone === phone);
      if (existing) {
        if (input.name && input.name.trim().length >= 2) {
          existing.name = input.name.trim().slice(0, 60);
        }
        if (
          input.favoriteCategory &&
          ALL_CATEGORIES.includes(input.favoriteCategory)
        ) {
          existing.favoriteCategory = input.favoriteCategory;
        }
        memberRecord = sanitizeMemberForClient(existing);
      } else {
        const cleanName =
          (input.name ?? "").trim().slice(0, 60) ||
          customerOrders[0]?.customerName ||
          "Al-Tharid Craver";
        const fav: Category =
          input.favoriteCategory &&
          ALL_CATEGORIES.includes(input.favoriteCategory)
            ? input.favoriteCategory
            : "Shawarma";
        isNewSignup = true;
        const created: LoyaltyMember = {
          id: `ATC-${phone.slice(-4)}-${String(site.loyaltyMembers.length + 101)}`,
          name: cleanName,
          username: makeUsername(cleanName) || `user${phone.slice(-4)}`,
          phone,
          favoriteCategory: fav,
          joinedAt: new Date().toISOString(),
          bonusStamps: 0,
          claimedTargets: [],
          rewardCodes: [],
        };
        site.loyaltyMembers.unshift(created);
        memberRecord = sanitizeMemberForClient(created);
      }
    });

    const card = await buildLoyaltyCardState(
      memberRecord,
      milestonesList,
      isNewSignup,
    );

    revalidatePath("/");
    revalidatePath("/admin");

    return {
      ok: true,
      card,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not load your loyalty card.",
    };
  }
}

export async function claimLoyaltyMilestone(input: {
  phone: string;
  targetOrders: number;
}): Promise<{ ok: true; card: LoyaltyCardState; claimedCode: string } | { ok: false; error: string }> {
  try {
    const phone = normalizePakistanPhone(input.phone || "");
    if (!/^923\d{9}$/.test(phone)) {
      return { ok: false, error: "Invalid phone number." };
    }

    const currentCardRes = await lookupOrJoinLoyalty({ phone });
    if (!currentCardRes.ok) return currentCardRes;
    const currentCard = currentCardRes.card;

    if (currentCard.totalStamps < 10) {
      return {
        ok: false,
        error: `Complete ${10 - currentCard.totalStamps} more order(s) to unlock your 10-Order Free Reward!`,
      };
    }

    let claimedCode = "";
    const evalInfo = currentCard.rewardEvaluation;

    await updateSite((site) => {
      const member = site.loyaltyMembers.find((m) => m.phone === phone);
      if (!member) throw new Error("Sign up or log in to your account first.");
      const existingClaim = member.rewardCodes.find((r) => r.target === 10);
      if (existingClaim) {
        claimedCode = existingClaim.code;
        return;
      }
      const suffix = Math.floor(1000 + Math.random() * 9000);
      claimedCode = `${evalInfo.codePrefix}-${suffix}`;
      if (!member.claimedTargets.includes(10)) {
        member.claimedTargets.push(10);
      }
      member.rewardCodes.push({
        target: 10,
        code: claimedCode,
        reward: evalInfo.unboxedPrize,
        claimedAt: new Date().toISOString(),
        redeemed: false,
      });
    });

    const refreshed = await lookupOrJoinLoyalty({ phone });
    if (!refreshed.ok) return refreshed;
    return { ok: true, card: refreshed.card, claimedCode };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not claim reward.",
    };
  }
}

export async function adminAdjustLoyaltyStamps(input: {
  phone: string;
  delta: number;
  redeemCode?: string;
}) {
  try {
    await requireAdmin();
    const phone = normalizePakistanPhone(input.phone);
    await updateSite((site) => {
      const member = site.loyaltyMembers.find((m) => m.phone === phone);
      if (!member) throw new Error("Loyalty member not found.");
      if (input.redeemCode) {
        const reward = member.rewardCodes.find(
          (r) => r.code === input.redeemCode,
        );
        if (reward) reward.redeemed = !reward.redeemed;
      } else {
        member.bonusStamps = Math.max(
          0,
          Math.min(100, member.bonusStamps + input.delta),
        );
      }
    });
    revalidatePath("/");
    revalidatePath("/admin");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Could not update loyalty card.",
    };
  }
}

export async function submitCustomerReview(input: {
  customerName: string;
  phone?: string;
  rating: number;
  category: Category | "Overall";
  favoriteDish?: string;
  comment: string;
}): Promise<{ ok: true; review: CustomerReview } | { ok: false; error: string }> {
  try {
    const customerName = (input.customerName || "").trim().slice(0, 60);
    if (customerName.length < 2) {
      return { ok: false, error: "Please enter your name (at least 2 characters)." };
    }
    const comment = (input.comment || "").trim().slice(0, 500);
    if (comment.length < 8) {
      return {
        ok: false,
        error: "Please write a short review (at least 8 characters).",
      };
    }
    const rating = Math.max(1, Math.min(5, Math.round(Number(input.rating) || 5)));
    const rawPhone = (input.phone || "").trim();
    const normalizedPhone = rawPhone ? normalizePakistanPhone(rawPhone) : "";
    let verifiedOrder = false;

    if (/^923\d{9}$/.test(normalizedPhone)) {
      const orders = await listAllOrders();
      verifiedOrder = orders.some(
        (o) => o.phone === normalizedPhone && o.status !== "cancelled",
      );
    }

    const review: CustomerReview = {
      id: `REV-${randomUUID().slice(0, 8).toUpperCase()}`,
      customerName,
      ...(normalizedPhone ? { phone: normalizedPhone } : {}),
      verifiedOrder,
      rating,
      category: input.category || "Overall",
      favoriteDish: (input.favoriteDish || "").trim().slice(0, 70) || undefined,
      comment,
      createdAt: new Date().toISOString(),
      approved: true,
      featured: rating === 5 && verifiedOrder,
    };

    await updateSite((site) => {
      site.reviews.unshift(review);
    });

    revalidatePath("/");
    revalidatePath("/admin");
    const { phone: _omittedPhone, ...publicReview } = review;
    void _omittedPhone;
    return { ok: true, review: publicReview };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not submit your review.",
    };
  }
}

export async function adminModerateReview(input: {
  id: string;
  action: "toggle-approve" | "toggle-feature" | "reply" | "delete";
  reply?: string;
}) {
  try {
    await requireAdmin();
    await updateSite((site) => {
      const idx = site.reviews.findIndex((r) => r.id === input.id);
      if (idx === -1) throw new Error("Review not found.");
      if (input.action === "delete") {
        site.reviews.splice(idx, 1);
      } else if (input.action === "toggle-approve") {
        site.reviews[idx].approved = !site.reviews[idx].approved;
      } else if (input.action === "toggle-feature") {
        site.reviews[idx].featured = !site.reviews[idx].featured;
      } else if (input.action === "reply") {
        site.reviews[idx].adminReply =
          (input.reply ?? "").trim().slice(0, 350) || undefined;
      }
    });
    revalidatePath("/");
    revalidatePath("/admin");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Could not update review.",
    };
  }
}

export async function adminSaveBlogPost(input: {
  id?: string;
  title: string;
  slug?: string;
  excerpt: string;
  contentText: string;
  coverImage: string;
  category: string;
  primaryKeyword: string;
  secondaryKeywordsText: string;
  published: boolean;
}) {
  try {
    await requireAdmin();
    const title = input.title.trim().slice(0, 140);
    if (title.length < 5) throw new Error("Enter a blog title.");
    const slug = (
      input.slug?.trim() ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    ).slice(0, 100);
    const paragraphs = input.contentText
      .split(/\r?\n\r?\n|\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!paragraphs.length) throw new Error("Enter blog article content.");
    const secondaryKeywords = input.secondaryKeywordsText
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    await updateSite((site) => {
      const existing = input.id
        ? site.blogs.find((b) => b.id === input.id)
        : undefined;
      if (existing) {
        existing.title = title;
        existing.slug = slug;
        existing.excerpt = input.excerpt.trim().slice(0, 260);
        existing.content = paragraphs;
        existing.coverImage =
          input.coverImage.trim() || "/menu/broast-quarter.jpg";
        existing.category = input.category.trim() || "Local Food Guide";
        existing.primaryKeyword =
          input.primaryKeyword.trim() || "best fast food in Jaranwala";
        existing.secondaryKeywords = secondaryKeywords;
        existing.published = input.published;
        existing.readTimeMinutes = Math.max(
          2,
          Math.ceil(paragraphs.join(" ").split(/\s+/).length / 160),
        );
      } else {
        const post: BlogPost = {
          id: `BLOG-${randomUUID().slice(0, 6).toUpperCase()}`,
          slug,
          title,
          excerpt: input.excerpt.trim().slice(0, 260),
          content: paragraphs,
          coverImage: input.coverImage.trim() || "/menu/broast-quarter.jpg",
          category: input.category.trim() || "Local Food Guide",
          primaryKeyword:
            input.primaryKeyword.trim() || "best fast food in Jaranwala",
          secondaryKeywords,
          searchIntent: "Transactional",
          readTimeMinutes: Math.max(
            2,
            Math.ceil(paragraphs.join(" ").split(/\s+/).length / 160),
          ),
          published: input.published,
          publishedAt: new Date().toISOString().slice(0, 10),
          author: "Al-Tharid Jaranwala",
          faqs: [],
        };
        site.blogs.unshift(post);
      }
    });

    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath("/admin");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not save blog post.",
    };
  }
}

export async function adminDeleteBlogPost(id: string) {
  try {
    await requireAdmin();
    await updateSite((site) => {
      site.blogs = site.blogs.filter((b) => b.id !== id);
    });
    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath("/admin");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Could not delete blog post.",
    };
  }
}

export async function getAdminSiteExtras() {
  await requireAdmin();
  const site = await getSite();
  return {
    loyaltyMilestones: site.loyaltyMilestones,
    loyaltyMembers: site.loyaltyMembers,
    reviews: site.reviews,
    blogs: site.blogs,
    seoKeywords: site.seoKeywords,
  };
}
