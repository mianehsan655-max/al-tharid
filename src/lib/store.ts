import "server-only";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type Category = "Shawarma" | "Burger" | "Loaded Fries" | "Cold Drinks" | "Deals";
export type Item = { id: string; category: Category; name: string; description: string; price: number | null; published: boolean; available: boolean; images?: string[] };
export type Settings = { phone: string; whatsapp: string; address: string; hours: string; announcement: string; instagram: string; facebook: string; mapsUrl: string };
export type Site = { settings: Settings; items: Item[] };

const filename = path.join(process.cwd(), "data", "site.json");

export async function getSite(): Promise<Site> {
  return JSON.parse(await readFile(filename, "utf8")) as Site;
}

// This starter uses one writable Node server. Replace the file store with a database before serverless hosting.
export async function putSite(site: Site): Promise<void> {
  const temporary = `${filename}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(site, null, 2) + "\n", { mode: 0o600 });
  await rename(temporary, filename);
}

let siteQueue: Promise<unknown> = Promise.resolve();
export async function updateSite(change: (site: Site) => void): Promise<void> {
  const operation = async () => { const site = await getSite(); change(site); await putSite(site); };
  const result = siteQueue.then(operation, operation);
  siteQueue = result.catch(() => undefined);
  return result;
}
