import type { Category, Item } from "./store";

export type ProductPhoto = {
  src: string;
  credit: string;
  url: string;
};

const localPhoto = (src: string): ProductPhoto => ({
  src,
  credit: "Al-Tharid Studio (Nano Banana AI)",
  url: "",
});

const photos: Record<string, ProductPhoto> = {
  SH01: localPhoto("/menu/shawarma-classic.jpg"),
  SH02: localPhoto("/menu/shawarma-spicy.jpg"),
  SH03: localPhoto("/menu/shawarma-special.jpg"),
  SH04: localPhoto("/menu/shawarma-spicy.jpg"),
  SH05: localPhoto("/menu/shawarma-special.jpg"),
  BG01: localPhoto("/menu/burger-classic.jpg"),
  BG02: localPhoto("/menu/burger-spicy.jpg"),
  BG03: localPhoto("/menu/burger-special.jpg"),
  BG04: localPhoto("/menu/burger-spicy.jpg"),
  BG05: localPhoto("/menu/burger-special.jpg"),
  BR01: localPhoto("/menu/broast-quarter.jpg"),
  BR02: localPhoto("/menu/broast-spicy.jpg"),
  BR03: localPhoto("/menu/broast-garlic.jpg"),
  BR04: localPhoto("/menu/broast-half.jpg"),
  BR05: localPhoto("/menu/broast-family.jpg"),
  FR01: localPhoto("/menu/fries-cheesy.jpg"),
  FR02: localPhoto("/menu/fries-spicy.jpg"),
  FR03: localPhoto("/menu/fries-spicy.jpg"),
  FR04: localPhoto("/menu/fries-cheesy.jpg"),
  FR05: localPhoto("/menu/fries-spicy.jpg"),
  DR01: localPhoto("/menu/drink-mint.jpg"),
  DR02: localPhoto("/menu/drink-mint.jpg"),
  DR03: localPhoto("/menu/drink-mint.jpg"),
  DR04: localPhoto("/menu/drink-mint.jpg"),
  DL01: localPhoto("/menu/burger-classic.jpg"),
  DL02: localPhoto("/menu/shawarma-classic.jpg"),
  DL03: localPhoto("/menu/deal-combo.jpg"),
  DL04: localPhoto("/menu/deal-combo.jpg"),
};

const fallback: Record<Category, ProductPhoto> = {
  Shawarma: photos.SH01,
  Burger: photos.BG01,
  "Chicken Broast": photos.BR01,
  "Loaded Fries": photos.FR01,
  "Cold Drinks": photos.DR04,
  Deals: photos.DL03,
};

export const productGalleries: Record<string, ProductPhoto[]> = {
  DL01: [photos.BG01, photos.FR01, photos.DR04],
  DL02: [photos.SH01, photos.FR01, photos.DR04],
  DL03: [photos.DL03, photos.BG05, photos.SH05, photos.FR02],
  DL04: [photos.DL04, photos.BR01, photos.BG02, photos.SH01],
  SH01: [photos.SH01, photos.SH03, photos.SH05],
  SH02: [photos.SH02, photos.SH01, photos.SH03],
  SH03: [photos.SH03, photos.SH05, photos.SH01],
  SH04: [photos.SH04, photos.SH02, photos.SH03],
  SH05: [photos.SH05, photos.SH02, photos.SH01],
  BG01: [photos.BG01, photos.BG02, photos.BG05],
  BG02: [photos.BG02, photos.BG01, photos.BG05],
  BG03: [photos.BG03, photos.BG05, photos.BG01],
  BG04: [photos.BG04, photos.BG02, photos.BG05],
  BG05: [photos.BG05, photos.BG02, photos.BG01],
  BR01: [photos.BR01, photos.BR03, photos.BR04],
  BR02: [photos.BR02, photos.BR01, photos.BR04],
  BR03: [photos.BR03, photos.BR01, photos.BR02],
  BR04: [photos.BR04, photos.BR01, photos.BR02],
  BR05: [photos.BR05, photos.BR04, photos.BR02],
  FR01: [photos.FR01, photos.FR02],
  FR02: [photos.FR02, photos.FR01],
  FR03: [photos.FR03, photos.FR01],
  FR04: [photos.FR04, photos.FR02],
  FR05: [photos.FR05, photos.FR01],
  DR01: [photos.DR01],
  DR02: [photos.DR02],
  DR03: [photos.DR03],
  DR04: [photos.DR04],
};

export function getProductPhotos(item: Item): ProductPhoto[] {
  if (item.images?.length) {
    return item.images.map((src) => ({ src, credit: "Al-Tharid", url: "" }));
  }
  const gallery = productGalleries[item.id];
  return gallery?.length ? gallery : [photos[item.id] ?? fallback[item.category]];
}

export function getProductPhoto(item: Item): ProductPhoto {
  return getProductPhotos(item)[0];
}

export function getPhotoCredits(): ProductPhoto[] {
  return [];
}
