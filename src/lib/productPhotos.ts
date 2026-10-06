import type { Category, Item } from "./store";

export type ProductPhoto = {
  src: string;
  credit: string;
  url: string;
};

const photo = (id: string, credit: string, url: string): ProductPhoto => ({
  src: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=82`,
  credit,
  url,
});

const photos: Record<string, ProductPhoto> = {
  SH01: photo("photo-1778168199427-4e839943d20f", "Yosia Cahyana", "https://unsplash.com/photos/UmnvfuGPIuE"),
  SH02: photo("photo-1760888548893-bc2f7e09e972", "Rodrigo Rodrigues", "https://unsplash.com/photos/YDSWdXBaFdI"),
  SH03: photo("photo-1773620494884-940e0db95e46", "Omar Hakeem", "https://unsplash.com/photos/APbsVh624WA"),
  SH04: photo("photo-1561620141-343a829938de", "Leslie del Moral", "https://unsplash.com/photos/hBIOPgO7OeU"),
  SH05: photo("photo-1529006557810-274b9b2fc783", "Alexander Mils", "https://unsplash.com/photos/SNLfVYmL8os"),
  BG01: photo("photo-1777634659945-fae3d53ea1dd", "Ahmed Farook", "https://unsplash.com/photos/tVvQrch1trM"),
  BG02: photo("photo-1607730127050-e32a8c756fb9", "Ghaly Wedinly", "https://unsplash.com/photos/GNLBSImPgIA"),
  BG03: photo("photo-1700768400970-428c50bffc11", "Crunch", "https://unsplash.com/photos/So-jSM-B9uI"),
  BG04: photo("photo-1778449690398-25637cfdb822", "Shoeib Abolhassani", "https://unsplash.com/photos/S9CjBUhWZus"),
  BG05: photo("photo-1761515397046-44035db91504", "Allen Y", "https://unsplash.com/photos/Omyk3J_LPfk"),
  FR01: photo("photo-1568483417501-19a2e26b971d", "Val Vesa", "https://unsplash.com/photos/_qgMA9qL150"),
  FR02: photo("photo-1770117160166-cece70b1f0b0", "atelierbyvineeth", "https://unsplash.com/photos/XVXKSrCDUHQ"),
  FR03: photo("photo-1754317567681-a5322f280e9c", "Virginia Marinova", "https://unsplash.com/photos/-mSFhA0egYo"),
  FR04: photo("photo-1771818708792-d671ae9b4b46", "Christopher Stites", "https://unsplash.com/photos/xy7BK6oDD2s"),
  FR05: photo("photo-1564115895589-c8c6bd1076f8", "Erik Mclean", "https://unsplash.com/photos/7LYsFAt-OSI"),
  DR01: photo("photo-1687553644341-a8569c9e52f7", "Nathan Mullet", "https://unsplash.com/photos/eR7dpK-DBMY"),
  DR02: photo("photo-1773319295520-29d8a856e6e1", "Andrew Bright", "https://unsplash.com/photos/Ut81Ec_dCjY"),
  DR03: photo("photo-1665582295782-eecc2e25b74f", "Keesha's Kitchen", "https://unsplash.com/photos/AOHf9aljlxg"),
  DR04: photo("photo-1775264175004-604006f6c8b0", "Zhang Ziyu", "https://unsplash.com/photos/-uC6z3S8CMI"),
};

const fallback: Record<Category, ProductPhoto> = {
  Shawarma: photos.SH01,
  Burger: photos.BG01,
  "Loaded Fries": photos.FR01,
  "Cold Drinks": photos.DR03,
  Deals: photos.BG01,
};

// Add or remove photo objects in any item's array to change its gallery.
// Local files also work: { src: "/menu/burger-side.jpg", credit: "Al-Tharid", url: "" }.
// These stock images are placeholders until each item's own photos are ready.
export const productGalleries: Record<string, ProductPhoto[]> = {
  DL01: [photos.BG01, photos.FR01, photos.DR03],
  DL02: [photos.SH01, photos.FR01, photos.DR03],
  DL03: [photos.BG01, photos.SH01, photos.FR01, photos.DR03],
  SH01: [photos.SH01, photos.SH03, photos.SH05],
  SH02: [photos.SH02, photos.SH01, photos.SH03],
  SH03: [photos.SH03, photos.SH05, photos.SH01],
  SH04: [photos.SH04, photos.SH01, photos.SH03],
  SH05: [photos.SH05, photos.SH03, photos.SH01],
  BG01: [photos.BG01, photos.BG02, photos.BG05],
  BG02: [photos.BG02, photos.BG01, photos.BG04],
  BG03: [photos.BG03, photos.BG05, photos.BG01],
  BG04: [photos.BG04, photos.BG02, photos.BG01],
  BG05: [photos.BG05, photos.BG01, photos.BG03],
  FR01: [photos.FR01, photos.FR04, photos.FR05],
  FR02: [photos.FR02, photos.FR01, photos.FR03],
  FR03: [photos.FR03, photos.FR05, photos.FR01],
  FR04: [photos.FR04, photos.FR01, photos.FR05],
  FR05: [photos.FR05, photos.FR03, photos.FR01],
  DR01: [
    photos.DR01,
    photo("photo-1655604646151-8edc8746bb01", "James Yarema", "https://unsplash.com/photos/a-can-of-soda-ujtTw1WO9dE"),
  ],
  DR02: [
    photos.DR02,
    photo("photo-1681495514493-eaf0bd047714", "Mineragua Sparkling Water", "https://unsplash.com/photos/a-bottle-of-mineral-water-sitting-on-top-of-a-wooden-table-n6nxmphBJT4"),
  ],
  DR03: [photos.DR03, photos.DR04],
  DR04: [photos.DR04, photos.DR03],
};

export function getProductPhotos(item: Item): ProductPhoto[] {
  if (item.images?.length) return item.images.map(src => ({src, credit:"Al-Tharid", url:""}));
  const gallery = productGalleries[item.id];
  return gallery?.length ? gallery : [photos[item.id] ?? fallback[item.category]];
}

export function getProductPhoto(item: Item): ProductPhoto {
  return getProductPhotos(item)[0];
}

export function getPhotoCredits(): ProductPhoto[] {
  const credits = new Map<string, ProductPhoto>();
  [...Object.values(photos), ...Object.values(productGalleries).flat()].forEach((entry) => {
    if (entry.url) credits.set(entry.url, entry);
  });
  return [...credits.values()];
}
