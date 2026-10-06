import "server-only";
import { readState, withDatabaseTransaction, writeState } from "./db";

export type Category =
  "Shawarma" | "Burger" | "Loaded Fries" | "Cold Drinks" | "Deals";
export type Item = {
  id: string;
  category: Category;
  name: string;
  description: string;
  price: number | null;
  published: boolean;
  available: boolean;
  images?: string[];
};
export type Settings = {
  phone: string;
  whatsapp: string;
  address: string;
  hours: string;
  announcement: string;
  instagram: string;
  facebook: string;
  mapsUrl: string;
};
export type Site = { settings: Settings; items: Item[] };

export async function getSite(): Promise<Site> {
  return readState<Site>("site");
}

export async function putSite(site: Site): Promise<void> {
  await withDatabaseTransaction(() => writeState("site", site));
}

export async function updateSite(change: (site: Site) => void): Promise<void> {
  await withDatabaseTransaction(async () => {
    const site = await getSite();
    change(site);
    await writeState("site", site);
  });
}
