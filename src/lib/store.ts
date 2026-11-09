import "server-only";
import { readState, withDatabaseTransaction, writeState } from "./db";

export type Category =
  | "Shawarma"
  | "Burger"
  | "Chicken Broast"
  | "Loaded Fries"
  | "Cold Drinks"
  | "Deals";

export const ALL_CATEGORIES: Category[] = [
  "Shawarma",
  "Burger",
  "Chicken Broast",
  "Loaded Fries",
  "Cold Drinks",
  "Deals",
];

export type Item = {
  id: string;
  category: Category;
  name: string;
  description: string;
  price: number | null;
  published: boolean;
  available: boolean;
  images?: string[];
  badge?: string;
  spiceLevel?: "mild" | "medium" | "hot";
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

export type LoyaltyMilestone = {
  targetOrders: number;
  title: string;
  reward: string;
  worthPKR: number;
  codePrefix: string;
  icon: string;
  badgeColor: string;
};

export type LoyaltyRewardClaim = {
  target: number;
  code: string;
  reward: string;
  claimedAt: string;
  redeemed?: boolean;
};

export type LoyaltyMember = {
  id: string;
  name: string;
  username?: string;
  phone: string;
  email?: string;
  address?: string;
  passwordHash?: string;
  verifiedBy?: "mobile" | "email";
  verifiedAt?: string;
  favoriteCategory: Category;
  joinedAt: string;
  bonusStamps: number;
  claimedTargets: number[];
  rewardCodes: LoyaltyRewardClaim[];
};

export type PendingCustomerOtp = {
  id: string;
  channel: "mobile" | "email";
  target: string;
  name: string;
  username: string;
  phone: string;
  email?: string;
  address?: string;
  passwordHash: string;
  favoriteCategory: Category;
  code: string;
  expiresAt: string;
  createdAt: string;
};

export type CustomerReview = {
  id: string;
  customerName: string;
  phone?: string;
  verifiedOrder: boolean;
  rating: number;
  category: Category | "Overall";
  favoriteDish?: string;
  comment: string;
  createdAt: string;
  approved: boolean;
  featured: boolean;
  adminReply?: string;
};

export type BlogFaq = {
  question: string;
  answer: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  coverImage: string;
  category: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  searchIntent: "Transactional" | "Local Commercial" | "Informational";
  readTimeMinutes: number;
  published: boolean;
  publishedAt: string;
  author: string;
  faqs: BlogFaq[];
};

export type SeoKeyword = {
  keyword: string;
  urduTransliteration?: string;
  intent: "Transactional" | "Local Commercial" | "Informational";
  monthlySearchPotential: string;
  competition: "Low" | "Medium";
  targetPage: string;
  strategyNote: string;
};

export type Site = {
  settings: Settings;
  items: Item[];
  loyaltyMilestones: LoyaltyMilestone[];
  loyaltyMembers: LoyaltyMember[];
  pendingOtps?: PendingCustomerOtp[];
  reviews: CustomerReview[];
  blogs: BlogPost[];
  seoKeywords: SeoKeyword[];
};

export const DEFAULT_LOYALTY_MILESTONES: LoyaltyMilestone[] = [
  {
    targetOrders: 10,
    title: "10-Order Free Shawarma / Same-Item / Mystery Unbox",
    reward:
      "Complete 10 orders of Shawarma, Burger, Broast, or Fries to get that SAME item FREE — or complete 10 mixed orders to unlock the Mystery Unbox (Free Shawarma or Surprise Treat)!",
    worthPKR: 520,
    codePrefix: "AT-REWARD10",
    icon: "🎁",
    badgeColor: "#e93822",
  },
];

export const DEFAULT_BROAST_ITEMS: Item[] = [
  {
    id: "BR01",
    category: "Chicken Broast",
    name: "Crispy Quarter Broast",
    description:
      "2 golden pressure-fried chicken pieces with signature creamy garlic mayo dip, seasoned fries & soft toasted bun.",
    price: 620,
    published: true,
    available: true,
    images: ["/menu/broast-quarter.jpg", "/menu/broast-garlic.jpg"],
    badge: "JARANWALA FAVOURITE",
    spiceLevel: "mild",
  },
  {
    id: "BR02",
    category: "Chicken Broast",
    name: "Spicy Masala Injected Broast",
    description:
      "Marinated & injected with fiery chili masala spices down to the bone, fried to an ultra-crunchy golden crust.",
    price: 680,
    published: true,
    available: true,
    images: ["/menu/broast-spicy.jpg", "/menu/broast-quarter.jpg"],
    badge: "SPICY 🔥",
    spiceLevel: "hot",
  },
  {
    id: "BR03",
    category: "Chicken Broast",
    name: "Garlic Mayo Crunch Broast",
    description:
      "Crispy golden quarter broast drizzled generously with roasted garlic toum sauce, herbs & crinkle fries.",
    price: 660,
    published: true,
    available: true,
    images: ["/menu/broast-garlic.jpg", "/menu/broast-quarter.jpg"],
    badge: "CHEF'S SPECIAL",
    spiceLevel: "mild",
  },
  {
    id: "BR04",
    category: "Chicken Broast",
    name: "Half Chicken Broast Platter",
    description:
      "4 juicy golden-fried chicken broast pieces (leg, thigh, breast, wing) with double fries, 2 buns & 2 dips.",
    price: 1180,
    published: true,
    available: true,
    images: ["/menu/broast-half.jpg", "/menu/broast-quarter.jpg"],
    badge: "SHAREABLE",
    spiceLevel: "medium",
  },
  {
    id: "BR05",
    category: "Chicken Broast",
    name: "Al-Tharid Family Broast Bucket",
    description:
      "8 ultra-crispy golden broast pieces, large family fries, 4 dinner rolls, and 4 signature garlic & spicy dips.",
    price: 2250,
    published: true,
    available: true,
    images: ["/menu/broast-family.jpg", "/menu/broast-half.jpg"],
    badge: "FAMILY FEAST",
    spiceLevel: "medium",
  },
  {
    id: "DL04",
    category: "Deals",
    name: "Broast & Burger Mega Feast",
    description:
      "Quarter Crispy Chicken Broast + 1 Spicy Zinger Burger + 1 Classic Garlic Shawarma + 1 Loaded Fries + 2 Cold Drinks.",
    price: 1890,
    published: true,
    available: true,
    images: ["/menu/deal-combo.jpg", "/menu/broast-quarter.jpg", "/menu/burger-classic.jpg"],
    badge: "BEST VALUE",
    spiceLevel: "medium",
  },
];

export const DEFAULT_REVIEWS: CustomerReview[] = [
  {
    id: "REV-01",
    customerName: "Ehsan Ali",
    phone: "923008668915",
    verifiedOrder: true,
    rating: 5,
    category: "Chicken Broast",
    favoriteDish: "Spicy Masala Injected Broast",
    comment:
      "Finally Jaranwala has proper pressure-fried Crispy Chicken Broast! The spicy masala injection goes right to the bone and the garlic dip is next level. Delivered hot to Housing Colony.",
    createdAt: "2026-11-02T16:20:00.000Z",
    approved: true,
    featured: true,
    adminReply:
      "Shukriya Ehsan bhai! Glad the Spicy Masala Broast hit the spot. See you on your next craving!",
  },
  {
    id: "REV-02",
    customerName: "Hamza Tariq",
    verifiedOrder: true,
    rating: 5,
    category: "Shawarma",
    favoriteDish: "Al-Tharid Special Shawarma",
    comment:
      "Best Arabic style shawarma in Jaranwala hands down. The garlic toum sauce feels authentic and the pita bread is super fresh, not soggy at all.",
    createdAt: "2026-11-04T19:15:00.000Z",
    approved: true,
    featured: true,
  },
  {
    id: "REV-03",
    customerName: "Ayesha Malik",
    verifiedOrder: true,
    rating: 5,
    category: "Burger",
    favoriteDish: "Jalapeño Cheese Burger",
    comment:
      "Ordered The Tharid Feast and Jalapeño Cheese Zinger for a family get-together near College Road. Every single burger was super crunchy even after delivery!",
    createdAt: "2026-11-05T20:40:00.000Z",
    approved: true,
    featured: true,
    adminReply:
      "Thank you Ayesha! We pack our crispy fillets in vented boxes so they stay crunchy all the way to your door.",
  },
  {
    id: "REV-04",
    customerName: "Usman Cheema",
    verifiedOrder: true,
    rating: 5,
    category: "Loaded Fries",
    favoriteDish: "BBQ Loaded Fries",
    comment:
      "The portion size of the Spicy Chicken and BBQ Loaded Fries is huge for the price. Plus the Loyalty Stamp Card is such a fun feature — already on 4 stamps!",
    createdAt: "2026-11-06T21:10:00.000Z",
    approved: true,
    featured: false,
  },
];

export const DEFAULT_SEO_KEYWORDS: SeoKeyword[] = [
  {
    keyword: "best fast food in Jaranwala",
    urduTransliteration: "Jaranwala ka sab se acha fast food",
    intent: "Local Commercial",
    monthlySearchPotential: "High (1,200+ local searches/mo)",
    competition: "Low",
    targetPage: "/ & /blog/best-fast-food-in-jaranwala-guide",
    strategyNote: "Primary local category anchor for Google Maps & organic search in Jaranwala.",
  },
  {
    keyword: "crispy chicken broast in Jaranwala",
    urduTransliteration: "Jaranwala crispy broast price & delivery",
    intent: "Transactional",
    monthlySearchPotential: "High (850+ local searches/mo)",
    competition: "Low",
    targetPage: "/#chicken-broast & /blog/crispy-chicken-broast-in-jaranwala",
    strategyNote: "High-margin signature product with very low local SEO competition in Jaranwala.",
  },
  {
    keyword: "best zinger burger in Jaranwala",
    urduTransliteration: "crunchy zinger burger Jaranwala",
    intent: "Transactional",
    monthlySearchPotential: "High (950+ local searches/mo)",
    competition: "Medium",
    targetPage: "/#burgers & /blog/why-al-tharid-zinger-burger-and-arabic-shawarma-lead-jaranwala",
    strategyNote: "Captures students & evening family orders searching for Zinger combos.",
  },
  {
    keyword: "arabic chicken shawarma Jaranwala",
    urduTransliteration: "garlic mayo shawarma Jaranwala",
    intent: "Transactional",
    monthlySearchPotential: "Medium-High (700+ local searches/mo)",
    competition: "Low",
    targetPage: "/#shawarma",
    strategyNote: "Targets evening street-food & quick-bite searchers looking for hygienic Arabic wraps.",
  },
  {
    keyword: "fast food home delivery Jaranwala",
    urduTransliteration: "online food order Jaranwala cash on delivery",
    intent: "Transactional",
    monthlySearchPotential: "High (1,100+ local searches/mo)",
    competition: "Low",
    targetPage: "/cart & /blog/late-night-food-delivery-and-family-deals-in-jaranwala",
    strategyNote: "Converts direct website orders with free delivery over Rs 500 in Jaranwala.",
  },
  {
    keyword: "loaded cheese fries Jaranwala",
    urduTransliteration: "cheesy chicken fries Jaranwala",
    intent: "Transactional",
    monthlySearchPotential: "Medium (450+ local searches/mo)",
    competition: "Low",
    targetPage: "/#loaded-fries",
    strategyNote: "Popular add-on keyword that boosts average order value (AOV).",
  },
];

export const DEFAULT_BLOGS: BlogPost[] = [
  {
    id: "BLOG-01",
    slug: "crispy-chicken-broast-in-jaranwala",
    title: "Crispy Chicken Broast in Jaranwala: Why Al-Tharid’s Pressure-Fried Crunch Is a Game Changer",
    excerpt:
      "Searching for authentic, golden-crispy Chicken Broast in Jaranwala? Discover how Al-Tharid locks in juicy masala flavour down to the bone with our signature garlic toum dip.",
    coverImage: "/menu/broast-quarter.jpg",
    category: "Menu Spotlight",
    primaryKeyword: "crispy chicken broast in Jaranwala",
    secondaryKeywords: [
      "best broast in Jaranwala",
      "spicy masala injected broast",
      "family broast bucket Jaranwala",
      "halal fried chicken Jaranwala",
    ],
    searchIntent: "Transactional",
    readTimeMinutes: 4,
    published: true,
    publishedAt: "2026-11-01",
    author: "Al-Tharid Culinary Team",
    content: [
      "Until now, food lovers in Jaranwala often had to travel toward Faisalabad just to enjoy authentic, pressure-fried Crispy Chicken Broast that stays crunchy on the outside and tender to the bone. At Al-Tharid Jaranwala, we built our new Chicken Broast station from the ground up to bring that golden crunch right to your neighbourhood.",
      "Every piece of Al-Tharid Chicken Broast starts with fresh, locally sourced halal chicken marinated for 12 hours in our house blend of warm Arabic spices and Punjabi aromatics. For spice lovers, our Spicy Masala Injected Broast delivers bold heat directly into the meat before it ever touches our seasoned flour dredge.",
      "What truly sets our broast apart in Jaranwala is the double-dredge flaky breading and controlled pressure-frying. This seals natural juices inside while creating shatteringly crisp golden ridges that hold up even during home delivery across Jaranwala city.",
      "Whether you are ordering a quick Quarter Broast (Rs 620) after college, sharing a Half Chicken Broast Platter (Rs 1,180) with friends, or hosting guests with our 8-piece Al-Tharid Family Broast Bucket (Rs 2,250), every order comes complete with golden fries, toasted buns, and our famous whipped garlic mayo dip.",
    ],
    faqs: [
      {
        question: "What is the price of Chicken Broast at Al-Tharid Jaranwala?",
        answer:
          "Our Crispy Quarter Broast starts at Rs 620 (2 pieces with fries, bun, and garlic dip), Spicy Masala Injected Broast is Rs 680, Half Broast Platter (4 pieces) is Rs 1,180, and the 8-piece Family Bucket is Rs 2,250.",
      },
      {
        question: "Does Al-Tharid deliver hot Chicken Broast across Jaranwala?",
        answer:
          "Yes! We deliver across Jaranwala city and up to 5 km into surrounding areas, with free home delivery on orders of Rs 500 or above.",
      },
    ],
  },
  {
    id: "BLOG-02",
    slug: "best-fast-food-in-jaranwala-guide",
    title: "The Ultimate Guide to the Best Fast Food in Jaranwala (2026 Local Cravings Edition)",
    excerpt:
      "From sizzling Arabic Shawarmas and towering Zinger Burgers to Loaded Cheesy Fries and Crispy Broast — here is why Al-Tharid is becoming Jaranwala’s favourite food spot.",
    coverImage: "/menu/deal-combo.jpg",
    category: "Local Food Guide",
    primaryKeyword: "best fast food in Jaranwala",
    secondaryKeywords: [
      "fast food restaurant in Jaranwala",
      "Jaranwala food point",
      "online food order Jaranwala",
      "best restaurant in Jaranwala Punjab",
    ],
    searchIntent: "Local Commercial",
    readTimeMinutes: 5,
    published: true,
    publishedAt: "2026-11-03",
    author: "Al-Tharid Jaranwala",
    content: [
      "Jaranwala has always been a city that loves bold, generous hospitality and unforgettable food. Yet when it comes to modern fast food — where kitchen hygiene, consistent recipes, and fast online ordering meet bold local flavour — residents have long deserved a dedicated hometown brand.",
      "That is the exact vision behind Al-Tharid in Jaranwala: 'Good Food for Happy People.' We curated our five core menu pillars around the cravings Jaranwala asks for most: Arabic & Spicy Shawarmas, Crispy Chicken Zinger Burgers, Golden Chicken Broast, Loaded Cheesy Fries, and Chilled Fresh Mint Lemonade.",
      "Instead of generic frozen patties, our kitchen prepares fresh chicken thigh and breast fillets daily, pairs them with house-blended sauces (from smoky BBQ and jalapeño cheese to whipped Arabic garlic toum), and serves them at honest PKR prices.",
      "Even better, ordering fast food in Jaranwala no longer requires long phone calls. With our live online cart, instant GPS delivery pin sharing, Cash on Delivery, and the Al-Tharid Craving Club loyalty card, every order brings you closer to free meals!",
    ],
    faqs: [
      {
        question: "Which fast food categories are available at Al-Tharid Jaranwala?",
        answer:
          "Al-Tharid serves 5 signature categories in Jaranwala: Shawarma, Crispy Chicken Burgers, Chicken Broast, Loaded Fries, and Cold Drinks, plus value Combo Deals.",
      },
      {
        question: "How does the Al-Tharid Loyalty Card work for Jaranwala customers?",
        answer:
          "Simply sign up with your mobile number in our Craving Club section! You get 1 free welcome stamp immediately, and every order earns stamps toward free drinks (3 orders), free shawarma/fries (5 orders), free broast (8 orders), and a free combo meal (10 orders).",
      },
    ],
  },
  {
    id: "BLOG-03",
    slug: "why-al-tharid-zinger-burger-and-arabic-shawarma-lead-jaranwala",
    title: "Zinger Burger vs. Arabic Shawarma: Picking Your Perfect Evening Craving in Jaranwala",
    excerpt:
      "Torn between a towering Jalapeño Cheese Zinger Burger and a warm Classic Garlic Shawarma? Take a peek inside Al-Tharid’s sauces, marinades, and most-ordered items.",
    coverImage: "/menu/burger-special.jpg",
    category: "Behind The Kitchen",
    primaryKeyword: "best zinger burger in Jaranwala",
    secondaryKeywords: [
      "arabic chicken shawarma Jaranwala",
      "jalapeno cheese burger Jaranwala",
      "garlic shawarma Jaranwala",
    ],
    searchIntent: "Transactional",
    readTimeMinutes: 4,
    published: true,
    publishedAt: "2026-11-05",
    author: "Al-Tharid Culinary Team",
    content: [
      "Walk into any lively evening gathering in Jaranwala and you will find two undefeated fast-food champions: the extra-crunchy Chicken Zinger Burger and the saucy, flame-kissed Chicken Shawarma.",
      "For burger purists, our Crispy Classic (Rs 520) and Spicy Zinger (Rs 570) use whole chicken fillets coated in our spiced crunch batter, layered inside soft toasted buns with crisp lettuce and house sauce. Want maximum indulgence? The Jalapeño Cheese Burger (Rs 620) and Al-Tharid Special Burger (Rs 650) add melted cheese and smoky heat.",
      "On the shawarma side, we moved away from dry, over-spiced cabbage wraps. Our Classic Garlic Shawarma (Rs 360) and Spicy Arabic Shawarma (Rs 390) focus on juicy marinated chicken strips, authentic garlic toum, and pillowy toasted flatbread.",
      "Can’t decide between the two? Grab The Tharid Feast (Rs 2,890) or our new Broast & Burger Mega Feast (Rs 1,890) so nobody at the table has to compromise!",
    ],
    faqs: [
      {
        question: "What is the most popular burger and shawarma at Al-Tharid?",
        answer:
          "Our Spicy Zinger Burger (Rs 570), Jalapeño Cheese Burger (Rs 620), and Al-Tharid Special Shawarma (Rs 450) are the top customer favourites in Jaranwala.",
      },
    ],
  },
  {
    id: "BLOG-04",
    slug: "late-night-food-delivery-and-family-deals-in-jaranwala",
    title: "Best Family Fast Food Deals & Free Home Delivery in Jaranwala — How to Save More",
    excerpt:
      "Feeding the whole crew or ordering dinner at home in Jaranwala? See how our Combo Deals, Free Delivery over Rs 500, and Loyalty Stamp Rewards stretch your PKR further.",
    coverImage: "/menu/fries-spicy.jpg",
    category: "Deals & Combos",
    primaryKeyword: "fast food home delivery Jaranwala",
    secondaryKeywords: [
      "family food deals Jaranwala",
      "loaded cheese fries Jaranwala",
      "cheap fast food combos Jaranwala",
    ],
    searchIntent: "Transactional",
    readTimeMinutes: 3,
    published: true,
    publishedAt: "2026-11-07",
    author: "Al-Tharid Jaranwala",
    content: [
      "Ordering food for family or friends in Jaranwala shouldn't mean paying steep delivery charges or settling for small portions. At Al-Tharid, we designed our combo deals and delivery rules specifically for local households.",
      "First, home delivery across Jaranwala city is completely FREE whenever your cart subtotal reaches Rs 500 or more (and just Rs 100 below that). That means even a singleCrispy Burger or Quarter Chicken Broast unlocks free doorstep delivery!",
      "Second, our dedicated Deals section bundles our bestsellers at a built-in discount: the Solo Crunch Combo (Rs 990) gives one person a Burger, Loaded Fries, and Drink; the Shawarma Duo (Rs 1,390) is built for two; the new Broast & Burger Mega Feast (Rs 1,890) mixes Broast, Burger, Shawarma, Fries, and Drinks; and The Tharid Feast (Rs 2,890) feeds the whole family.",
      "Don't forget to enter your same mobile number on every checkout — your orders automatically count toward your Al-Tharid Craving Club stamp card so you unlock free drinks, shawarmas, and broast platters!",
    ],
    faqs: [
      {
        question: "Is there free home delivery in Jaranwala?",
        answer:
          "Yes! Home delivery in Jaranwala is 100% free on all orders of Rs 500 and above.",
      },
    ],
  },
];

const DEFAULT_ITEM_IMAGES: Record<string, string[]> = {
  SH01: ["/menu/shawarma-classic.jpg", "/menu/shawarma-special.jpg"],
  SH02: ["/menu/shawarma-spicy.jpg", "/menu/shawarma-classic.jpg"],
  SH03: ["/menu/shawarma-special.jpg", "/menu/shawarma-classic.jpg"],
  SH04: ["/menu/shawarma-spicy.jpg", "/menu/shawarma-special.jpg"],
  SH05: ["/menu/shawarma-special.jpg", "/menu/shawarma-spicy.jpg", "/menu/shawarma-classic.jpg"],
  BG01: ["/menu/burger-classic.jpg", "/menu/burger-special.jpg"],
  BG02: ["/menu/burger-spicy.jpg", "/menu/burger-classic.jpg"],
  BG03: ["/menu/burger-special.jpg", "/menu/burger-classic.jpg"],
  BG04: ["/menu/burger-spicy.jpg", "/menu/burger-special.jpg"],
  BG05: ["/menu/burger-special.jpg", "/menu/burger-spicy.jpg", "/menu/burger-classic.jpg"],
  BR01: ["/menu/broast-quarter.jpg", "/menu/broast-garlic.jpg"],
  BR02: ["/menu/broast-spicy.jpg", "/menu/broast-quarter.jpg"],
  BR03: ["/menu/broast-garlic.jpg", "/menu/broast-quarter.jpg"],
  BR04: ["/menu/broast-half.jpg", "/menu/broast-quarter.jpg"],
  BR05: ["/menu/broast-family.jpg", "/menu/broast-half.jpg"],
  FR01: ["/menu/fries-cheesy.jpg", "/menu/fries-spicy.jpg"],
  FR02: ["/menu/fries-spicy.jpg", "/menu/fries-cheesy.jpg"],
  FR03: ["/menu/fries-spicy.jpg", "/menu/fries-cheesy.jpg"],
  FR04: ["/menu/fries-cheesy.jpg", "/menu/fries-spicy.jpg"],
  FR05: ["/menu/fries-spicy.jpg", "/menu/fries-cheesy.jpg"],
  DR01: ["/menu/drink-mint.jpg"],
  DR02: ["/menu/drink-mint.jpg"],
  DR03: ["/menu/drink-mint.jpg"],
  DR04: ["/menu/drink-mint.jpg"],
  DL01: ["/menu/burger-classic.jpg", "/menu/fries-cheesy.jpg", "/menu/drink-mint.jpg"],
  DL02: ["/menu/shawarma-classic.jpg", "/menu/fries-cheesy.jpg", "/menu/drink-mint.jpg"],
  DL03: ["/menu/deal-combo.jpg", "/menu/burger-special.jpg", "/menu/shawarma-special.jpg"],
  DL04: ["/menu/deal-combo.jpg", "/menu/broast-quarter.jpg", "/menu/burger-spicy.jpg"],
};

function enrichSite(raw: Partial<Site>): Site {
  const settings: Settings = {
    phone: raw.settings?.phone || "+92 300 8668915",
    whatsapp: raw.settings?.whatsapp || "923008668915",
    address: raw.settings?.address || "Main City Center, Jaranwala, Punjab, Pakistan",
    hours: raw.settings?.hours || "Open Daily · 12:00 PM – 1:00 AM",
    announcement:
      raw.settings?.announcement ||
      "Now serving Jaranwala’s crispiest Chicken Broast, Zinger Burgers, Arabic Shawarma & Loaded Fries!",
    instagram: raw.settings?.instagram || "",
    facebook: raw.settings?.facebook || "",
    mapsUrl: raw.settings?.mapsUrl || "https://www.google.com/maps/search/?api=1&query=Jaranwala+Punjab+Pakistan",
  };

  const existingItems = Array.isArray(raw.items) ? [...raw.items] : [];
  const existingIds = new Set(existingItems.map((i) => i.id));

  for (const defaultItem of DEFAULT_BROAST_ITEMS) {
    if (!existingIds.has(defaultItem.id)) {
      existingItems.push(structuredClone(defaultItem));
    }
  }

  const items = existingItems.map((item) => ({
    ...item,
    images:
      item.images && item.images.length > 0
        ? item.images
        : DEFAULT_ITEM_IMAGES[item.id] ?? ["/menu/deal-combo.jpg"],
  }));

  return {
    settings,
    items,
    loyaltyMilestones:
      Array.isArray(raw.loyaltyMilestones) &&
      raw.loyaltyMilestones.length > 0 &&
      !raw.loyaltyMilestones.some((m) => m.targetOrders === 1 && m.codePrefix === "AT-DIP1")
        ? raw.loyaltyMilestones
        : structuredClone(DEFAULT_LOYALTY_MILESTONES),
    loyaltyMembers: Array.isArray(raw.loyaltyMembers) ? raw.loyaltyMembers : [],
    pendingOtps: Array.isArray(raw.pendingOtps) ? raw.pendingOtps : [],
    reviews:
      Array.isArray(raw.reviews) && raw.reviews.length > 0
        ? raw.reviews
        : structuredClone(DEFAULT_REVIEWS),
    blogs:
      Array.isArray(raw.blogs) && raw.blogs.length > 0
        ? raw.blogs
        : structuredClone(DEFAULT_BLOGS),
    seoKeywords:
      Array.isArray(raw.seoKeywords) && raw.seoKeywords.length > 0
        ? raw.seoKeywords
        : structuredClone(DEFAULT_SEO_KEYWORDS),
  };
}

export async function getSite(): Promise<Site> {
  const raw = await readState<Partial<Site>>("site");
  return enrichSite(raw);
}

export async function putSite(site: Site): Promise<void> {
  await withDatabaseTransaction(() => writeState("site", site));
}

export async function updateSite(change: (site: Site) => void): Promise<Site> {
  return withDatabaseTransaction(async () => {
    const site = await getSite();
    change(site);
    await writeState("site", site);
    return site;
  });
}
