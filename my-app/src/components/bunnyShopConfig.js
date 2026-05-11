import headBowImage from "../assets/images/бант.png";
import broomImage from "../assets/images/веник.png";
import clownWigImage from "../assets/images/клоунский_парик.png";
import hatImage from "../assets/images/шляпа.png";
import clownNoseImage from "../assets/images/клоунский_нос.png";
import mustacheImage from "../assets/images/усы.png";
import bodyBowImage from "../assets/images/бантик.png";
import tieImage from "../assets/images/галстук.png";
import starImage from "../assets/images/звезда.png";
import iconImage from "../assets/images/значек.png";
import scarfImage from "../assets/images/шарф.png";

export const BUNNY_SHOP_STORAGE_KEY = "quiet-pages-bunny-shop";

export const DEFAULT_BUNNY_SHOP_COSTS = {
  name: 25,
  background: 30,
};

export const BUNNY_ACCESSORY_SECTIONS = [
  {
    id: "head",
    title: "Аксессуары на голову",
    items: [
      {
        id: "head-bow",
        title: "Бант",
        image: headBowImage,
        param: "bow",
        price: 40,
      },
      {
        id: "head-broom",
        title: "Веник",
        image: broomImage,
        param: "broom",
        price: 45,
      },
      {
        id: "head-clown-wig",
        title: "Клоунский парик",
        image: clownWigImage,
        param: "cloun_wig",
        price: 55,
      },
      {
        id: "head-hat",
        title: "Шляпа",
        image: hatImage,
        param: "hat",
        price: 50,
      },
    ],
  },
  {
    id: "nose",
    title: "Аксессуары на нос",
    items: [
      {
        id: "nose-clown-nose",
        title: "Клоунский нос",
        image: clownNoseImage,
        param: "cloun_nose",
        price: 35,
      },
      {
        id: "nose-mustache",
        title: "Усы",
        image: mustacheImage,
        param: "mustache",
        price: 35,
      },
    ],
  },
  {
    id: "body",
    title: "Аксессуары на тело",
    items: [
      {
        id: "body-bow",
        title: "Бантик",
        image: bodyBowImage,
        param: "boww",
        price: 40,
      },
      {
        id: "body-tie",
        title: "Галстук",
        image: tieImage,
        param: "tie",
        price: 45,
      },
      {
        id: "body-star",
        title: "Звезда",
        image: starImage,
        param: "star",
        price: 45,
      },
      {
        id: "body-icon",
        title: "Значок",
        image: iconImage,
        param: "icon",
        price: 45,
      },
      {
        id: "body-scarf",
        title: "Шарф",
        image: scarfImage,
        param: "scarf",
        price: 50,
      },
    ],
  },
];

export const BUNNY_ACCESSORY_PARAM_KEYS = [
  "icon",
  "tie",
  "broom",
  "bow",
  "boww",
  "hat",
  "scarf",
  "mustache",
  "cloun_wig",
  "cloun_nose",
  "star",
];

const getAllShopItemIds = () =>
  BUNNY_ACCESSORY_SECTIONS.flatMap((section) => section.items.map((item) => item.id));

export const EMPTY_EQUIPPED_ITEMS = {
  head: null,
  nose: null,
  body: null,
};

export function createDefaultBunnyShopState(defaultName = "Банни") {
  return {
    name: defaultName,
    backgroundColor: "#f7eadf",
    purchasedItemIds: [],
    equippedItems: { ...EMPTY_EQUIPPED_ITEMS },
  };
}

export function normalizeBunnyShopState(value, defaultName = "Банни") {
  const fallback = createDefaultBunnyShopState(defaultName);

  if (!value || typeof value !== "object") return fallback;

  const allItemIds = new Set(getAllShopItemIds());
  const purchasedItemIds = Array.isArray(value.purchasedItemIds)
    ? value.purchasedItemIds.filter((id) => allItemIds.has(id))
    : [];

  const purchasedSet = new Set(purchasedItemIds);
  const equippedItems = { ...EMPTY_EQUIPPED_ITEMS };

  for (const section of BUNNY_ACCESSORY_SECTIONS) {
    const candidate = value.equippedItems?.[section.id] || null;
    const isValidInSection = section.items.some((item) => item.id === candidate);

    equippedItems[section.id] = isValidInSection && purchasedSet.has(candidate) ? candidate : null;
  }

  return {
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim().slice(0, 24) : fallback.name,
    backgroundColor: normalizeShopHexColor(value.backgroundColor, fallback.backgroundColor),
    purchasedItemIds,
    equippedItems,
  };
}

export function normalizeShopHexColor(value, fallback = "#f7eadf") {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase();

  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return fallback;
}

export function getBunnyAccessoryParams(equippedItems = {}) {
  const params = BUNNY_ACCESSORY_PARAM_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  for (const section of BUNNY_ACCESSORY_SECTIONS) {
    const equippedItemId = equippedItems?.[section.id];
    const equippedItem = section.items.find((item) => item.id === equippedItemId);

    if (equippedItem?.param) {
      params[equippedItem.param] = 1;
    }
  }

  return params;
}

