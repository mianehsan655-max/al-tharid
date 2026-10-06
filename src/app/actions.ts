"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { endSession, requireAdmin, startSession, validPassword } from "@/lib/auth";
import { updateSite, type Category } from "@/lib/store";

const value = (form: FormData, key: string, max = 300) => String(form.get(key) ?? "").trim().slice(0, max);

export async function login(form: FormData) {
  if (!validPassword(value(form, "password", 200))) redirect("/admin?error=1");
  await startSession();
  redirect("/admin");
}

export async function logout() { await endSession(); redirect("/admin"); }

export async function saveItem(form: FormData) {
  await requireAdmin();
  await updateSite((site) => {
  const id = value(form, "id", 80);
  const item = site.items.find((entry) => entry.id === id);
  if (!item) throw new Error("Unknown item");
  const name = value(form, "name", 70);
  if (!name) throw new Error("Item name is required");
  const category = value(form, "category", 30);
  if (!["Shawarma", "Burger", "Loaded Fries", "Cold Drinks", "Deals"].includes(category)) throw new Error("Invalid category");
  const rawPrice = value(form, "price", 12);
  const price = rawPrice === "" ? null : Number(rawPrice);
  if (price !== null && (!Number.isSafeInteger(price) || price < 0 || price > 100000)) throw new Error("Enter a whole PKR price between 0 and 100000");
  const imageText = String(form.get("images") ?? "");
  if (imageText.length > 20000) throw new Error("Image list is too long.");
  const images = imageText.split(/\r?\n/).map(entry => entry.trim()).filter(Boolean);
  if (images.length > 50) throw new Error("Use at most 50 photos per product.");
  for (const src of images) {
    if (src.startsWith("/") && !src.startsWith("//") && !/[\\<>\s]/.test(src)) continue;
    try { const url = new URL(src); if (url.protocol === "https:" && !url.username && !url.password) continue; } catch { /* Report below. */ }
    throw new Error("Use a local /menu/photo.png path or a valid HTTPS image URL.");
  }
  if (form.has("images")) item.images = images;
  item.name = name;
  item.category = category as Category;
  item.description = value(form, "description", 180);
  item.price = price;
  item.published = form.get("published") === "on";
  item.available = form.get("available") === "on";
  });
  revalidatePath("/"); revalidatePath("/menu"); revalidatePath("/admin");
  redirect("/admin#menu-items");
}

export async function addItem(form: FormData) {
  await requireAdmin();
  const name = value(form, "name", 70);
  const category = value(form, "category", 30);
  if (!name || !["Shawarma", "Burger", "Loaded Fries", "Cold Drinks", "Deals"].includes(category)) throw new Error("Enter a name and category");
  await updateSite((site) => {
  site.items.push({ id: randomUUID(), category: category as Category, name, description: "", price: null, published: false, available: true });
  });
  revalidatePath("/"); revalidatePath("/menu"); revalidatePath("/admin");
  redirect("/admin#menu-items");
}

export async function saveSettings(form: FormData) {
  await requireAdmin();
  await updateSite((site) => {
  for (const field of ["phone", "whatsapp", "address", "hours", "announcement", "instagram", "facebook", "mapsUrl"] as const) {
    site.settings[field] = value(form, field, 300);
  }
  });
  revalidatePath("/"); revalidatePath("/menu"); revalidatePath("/admin");
  redirect("/admin#settings");
}
