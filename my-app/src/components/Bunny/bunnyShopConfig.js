import headBowImage from "../../assets/images/бант.png";
import broomImage from "../../assets/images/веник.png";
import clownWigImage from "../../assets/images/клоунский_парик.png";
import hatImage from "../../assets/images/шляпа.png";
import clownNoseImage from "../../assets/images/клоунский_нос.png";
import mustacheImage from "../../assets/images/усы.png";
import bodyBowImage from "../../assets/images/бантик.png";
import tieImage from "../../assets/images/галстук.png";
import starImage from "../../assets/images/звезда.png";
import iconImage from "../../assets/images/значек.png";
import scarfImage from "../../assets/images/шарф.png";

export const BUNNY_SHOP_STORAGE_KEY = "quiet-pages-bunny-shop";

export const DEFAULT_BUNNY_SHOP_COSTS = {
  name: 25,
  background: 30,
};

export const BUNNY_SHOP_BUTTON_STATES = {
  BUY: "buy",
  EQUIP: "equip",
  EQUIPPED: "equipped",
};

export const BUNNY_SHOP_REUSABLE_TYPES = {
  NAME: "bunny_name",
  BACKGROUND: "bunny_background",
};

export const BUNNY_SHOP_SLOT_BY_SECTION = {
  head: "head_accessory",
  nose: "nose_accessory",
  body: "body_accessory",
};

export const BUNNY_SHOP_BACKEND_SECTION_BY_UI_SECTION = {
  head: "headAccessories",
  nose: "noseAccessories",
  body: "bodyAccessories",
};

export const EMPTY_EQUIPPED_ITEMS = {
  head: null,
  nose: null,
  body: null,
};

export const BUNNY_ACCESSORY_SECTIONS = [
  {
    id: "head",
    title: "Аксессуары на голову",
    items: [
      {
        id: "head-bow",
        backendKeys: ["head_bow", "bow", "бант"],
        title: "Бант",
        image: headBowImage,
        param: "bow",
        price: 40,
      },
      {
        id: "head-broom",
        backendKeys: ["head_broom", "broom", "веник"],
        title: "Веник",
        image: broomImage,
        param: "broom",
        price: 45,
      },
      {
        id: "head-clown-wig",
        backendKeys: ["head_clown_wig", "cloun_wig", "clown_wig", "клоунский парик"],
        title: "Клоунский парик",
        image: clownWigImage,
        param: "cloun_wig",
        price: 55,
      },
      {
        id: "head-hat",
        backendKeys: ["head_hat", "hat", "шляпа"],
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
        backendKeys: ["nose_clown_nose", "cloun_nose", "clown_nose", "клоунский нос"],
        title: "Клоунский нос",
        image: clownNoseImage,
        param: "cloun_nose",
        price: 35,
      },
      {
        id: "nose-mustache",
        backendKeys: ["nose_mustache", "mustache", "усы"],
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
        backendKeys: ["body_bow", "boww", "бантик"],
        title: "Бантик",
        image: bodyBowImage,
        param: "boww",
        price: 40,
      },
      {
        id: "body-tie",
        backendKeys: ["body_tie", "tie", "галстук"],
        title: "Галстук",
        image: tieImage,
        param: "tie",
        price: 45,
      },
      {
        id: "body-star",
        backendKeys: ["body_star", "star", "звезда"],
        title: "Звезда",
        image: starImage,
        param: "star",
        price: 45,
      },
      {
        id: "body-icon",
        backendKeys: ["body_icon", "icon", "значок", "значек"],
        title: "Значок",
        image: iconImage,
        param: "icon",
        price: 45,
      },
      {
        id: "body-scarf",
        backendKeys: ["body_scarf", "scarf", "шарф"],
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

const normalizeCompareValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[\s-]+/g, "_");

const getRawBackendId = (item) => item?.id ?? item?.itemId ?? item?.item_id ?? null;

const getRawItemType = (item) => item?.itemType || item?.item_type || item?.type || item?.code || item?.slug || "";

const getRawItemTitle = (item) => item?.name || item?.title || item?.label || "";

function findLocalAccessoryMeta(sectionId, item) {
  const section = BUNNY_ACCESSORY_SECTIONS.find((candidate) => candidate.id === sectionId);
  if (!section) return null;

  const itemType = normalizeCompareValue(getRawItemType(item));
  const title = normalizeCompareValue(getRawItemTitle(item));
  const rawId = normalizeCompareValue(getRawBackendId(item));

  return (
    section.items.find((localItem) => {
      const localValues = [
        localItem.id,
        localItem.title,
        localItem.param,
        ...(Array.isArray(localItem.backendKeys) ? localItem.backendKeys : []),
      ].map(normalizeCompareValue);

      return localValues.includes(itemType) || localValues.includes(title) || localValues.includes(rawId);
    }) || null
  );
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

export function normalizeShopButtonState(value, fallback = BUNNY_SHOP_BUTTON_STATES.BUY) {
  const normalized = String(value || "").trim().toLowerCase();

  if (Object.values(BUNNY_SHOP_BUTTON_STATES).includes(normalized)) return normalized;

  return fallback;
}

export function createDefaultBunnyShopState(defaultName = "Банни") {
  return {
    name: defaultName,
    bunnyName: defaultName,
    backgroundColor: "#f7eadf",
    bunnyBgColor: "#f7eadf",
    coins: 0,
    userCoinsBalance: 0,
    reusableItems: {
      name: {
        id: "local-bunny-name",
        backendId: null,
        title: "Имя зайчика",
        name: "Имя зайчика",
        itemType: BUNNY_SHOP_REUSABLE_TYPES.NAME,
        price: DEFAULT_BUNNY_SHOP_COSTS.name,
      },
      background: {
        id: "local-bunny-background",
        backendId: null,
        title: "Фон зайчика",
        name: "Фон зайчика",
        itemType: BUNNY_SHOP_REUSABLE_TYPES.BACKGROUND,
        price: DEFAULT_BUNNY_SHOP_COSTS.background,
      },
    },
    sections: BUNNY_ACCESSORY_SECTIONS,
    purchasedItemIds: [],
    equippedItems: { ...EMPTY_EQUIPPED_ITEMS },
  };
}

export function normalizeBackendReusableShopItem(item, fallback = null) {
  if (!item || typeof item !== "object") return fallback;

  const backendId = getRawBackendId(item);
  const itemType = getRawItemType(item);
  const title = getRawItemTitle(item) || fallback?.title || "Покупка";
  const price = Number(item.price ?? item.cost ?? fallback?.price ?? 0);

  return {
    ...fallback,
    ...item,
    id: backendId ?? itemType ?? fallback?.id ?? title,
    backendId,
    title,
    name: title,
    itemType,
    price: Number.isFinite(price) ? price : Number(fallback?.price || 0),
  };
}

export function normalizeBackendAccessoryShopItem(item, sectionId) {
  const localMeta = findLocalAccessoryMeta(sectionId, item);
  const backendId = getRawBackendId(item);
  const itemType = getRawItemType(item) || localMeta?.backendKeys?.[0] || localMeta?.param || "";
  const title = getRawItemTitle(item) || localMeta?.title || "Предмет";
  const price = Number(item?.price ?? item?.cost ?? localMeta?.price ?? 0);
  const id = localMeta?.id || `${sectionId}-${backendId ?? (itemType || title)}`;

  return {
    ...localMeta,
    ...item,
    id,
    backendId,
    title,
    name: title,
    itemType,
    sectionId,
    slot: BUNNY_SHOP_SLOT_BY_SECTION[sectionId] || sectionId,
    image: item?.image || item?.imageUrl || item?.image_url || localMeta?.image || "",
    param: item?.param || localMeta?.param || "",
    price: Number.isFinite(price) ? price : 0,
    buttonState: normalizeShopButtonState(
      item?.buttonState || item?.button_state || item?.state,
      BUNNY_SHOP_BUTTON_STATES.BUY
    ),
  };
}

export function normalizeBackendBunnyShopResponse(data, defaultName = "Банни") {
  const fallback = createDefaultBunnyShopState(defaultName);
  if (!data || typeof data !== "object") return fallback;

  const reusableRawItems = Array.isArray(data?.sections?.reusable) ? data.sections.reusable : [];
  const nameRawItem =
    reusableRawItems.find((item) => normalizeCompareValue(getRawItemType(item)) === BUNNY_SHOP_REUSABLE_TYPES.NAME) ||
    reusableRawItems.find((item) => normalizeCompareValue(getRawItemTitle(item)).includes("имя"));
  const backgroundRawItem =
    reusableRawItems.find((item) => normalizeCompareValue(getRawItemType(item)) === BUNNY_SHOP_REUSABLE_TYPES.BACKGROUND) ||
    reusableRawItems.find((item) => normalizeCompareValue(getRawItemTitle(item)).includes("фон"));

  const sections = BUNNY_ACCESSORY_SECTIONS.map((section) => {
    const backendSectionKey = BUNNY_SHOP_BACKEND_SECTION_BY_UI_SECTION[section.id];
    const rawItems = Array.isArray(data?.sections?.[backendSectionKey]) ? data.sections[backendSectionKey] : [];

    return {
      ...section,
      items: rawItems.map((item) => normalizeBackendAccessoryShopItem(item, section.id)),
    };
  });

  const purchasedItemIds = sections.flatMap((section) =>
    section.items
      .filter((item) => item.buttonState !== BUNNY_SHOP_BUTTON_STATES.BUY)
      .map((item) => item.id)
  );
  const equippedItems = { ...EMPTY_EQUIPPED_ITEMS };

  for (const section of sections) {
    const equippedItem = section.items.find((item) => item.buttonState === BUNNY_SHOP_BUTTON_STATES.EQUIPPED);
    equippedItems[section.id] = equippedItem?.id || null;
  }

  const rawCoins = Number(data.userCoinsBalance ?? data.user_coins_balance ?? data.coins ?? fallback.coins);
  const bunnyName =
    data?.bunnySettings?.bunnyName ||
    data?.bunny_settings?.bunny_name ||
    data?.bunnyName ||
    data?.name ||
    fallback.name;
  const bunnyBgColor = normalizeShopHexColor(
    data?.bunnySettings?.bunnyBgColor ||
      data?.bunny_settings?.bunny_bg_color ||
      data?.bunnyBgColor ||
      data?.backgroundColor,
    fallback.backgroundColor
  );

  return {
    name: String(bunnyName || fallback.name).trim().slice(0, 24) || fallback.name,
    bunnyName: String(bunnyName || fallback.name).trim().slice(0, 24) || fallback.name,
    backgroundColor: bunnyBgColor,
    bunnyBgColor,
    coins: Number.isFinite(rawCoins) ? rawCoins : fallback.coins,
    userCoinsBalance: Number.isFinite(rawCoins) ? rawCoins : fallback.userCoinsBalance,
    reusableItems: {
      name: normalizeBackendReusableShopItem(nameRawItem, fallback.reusableItems.name),
      background: normalizeBackendReusableShopItem(backgroundRawItem, fallback.reusableItems.background),
    },
    sections,
    purchasedItemIds,
    equippedItems,
    raw: data,
  };
}

export function normalizeBunnyShopState(value, defaultName = "Банни") {
  const fallback = createDefaultBunnyShopState(defaultName);

  if (!value || typeof value !== "object") return fallback;

  if (value.sections && (value.bunnySettings || value.userCoinsBalance !== undefined || value.user_coins_balance !== undefined)) {
    return normalizeBackendBunnyShopResponse(value, defaultName);
  }

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

  const rawCoins = Number(value.coins ?? value.userCoinsBalance ?? fallback.coins);

  return {
    ...fallback,
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim().slice(0, 24) : fallback.name,
    bunnyName: typeof value.name === "string" && value.name.trim() ? value.name.trim().slice(0, 24) : fallback.name,
    backgroundColor: normalizeShopHexColor(value.backgroundColor, fallback.backgroundColor),
    bunnyBgColor: normalizeShopHexColor(value.backgroundColor, fallback.backgroundColor),
    coins: Number.isFinite(rawCoins) ? rawCoins : fallback.coins,
    userCoinsBalance: Number.isFinite(rawCoins) ? rawCoins : fallback.userCoinsBalance,
    purchasedItemIds,
    equippedItems,
  };
}

export function getBunnyAccessoryParams(equippedItems = {}, sections = BUNNY_ACCESSORY_SECTIONS) {
  const params = BUNNY_ACCESSORY_PARAM_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  for (const section of sections) {
    const equippedItemId = equippedItems?.[section.id];
    const equippedItem = section.items.find((item) => item.id === equippedItemId);

    if (equippedItem?.param) {
      params[equippedItem.param] = 1;
    }
  }

  return params;
}