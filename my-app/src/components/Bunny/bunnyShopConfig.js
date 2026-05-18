export const BUNNY_SHOP_STORAGE_KEY = "quiet-pages-bunny-shop";

export const BUNNY_SHOP_API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ||
  import.meta.env?.VITE_API_URL ||
  "https://habbit-backend-k33d.onrender.com";

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
    items: [],
  },
  {
    id: "nose",
    title: "Аксессуары на нос",
    items: [],
  },
  {
    id: "body",
    title: "Аксессуары на тело",
    items: [],
  },
];

const BUNNY_ACCESSORY_LOCAL_META_BY_SECTION = {
  head: [
    {
      id: "head-bow",
      backendKeys: ["head_bow", "bow", "бант"],
      title: "Бант",
      param: "bow",
      price: 40,
    },
    {
      id: "head-broom",
      backendKeys: ["head_broom", "broom", "веник", "венок"],
      title: "Венок",
      param: "broom",
      price: 45,
    },
    {
      id: "head-clown-wig",
      backendKeys: ["head_clown_wig", "cloun_wig", "clown_wig", "клоунский парик"],
      title: "Парик клоуна",
      param: "cloun_wig",
      price: 55,
    },
    {
      id: "head-hat",
      backendKeys: ["head_hat", "hat", "шляпа"],
      title: "Шляпа",
      param: "hat",
      price: 50,
    },
  ],
  nose: [
    {
      id: "nose-clown-nose",
      backendKeys: ["nose_clown_nose", "cloun_nose", "clown_nose", "клоунский нос"],
      title: "Клоунский нос",
      param: "cloun_nose",
      price: 35,
    },
    {
      id: "nose-mustache",
      backendKeys: ["nose_mustache", "mustache", "усы"],
      title: "Усы",
      param: "mustache",
      price: 35,
    },
  ],
  body: [
    {
      id: "body-bow",
      backendKeys: ["body_bow", "boww", "бантик"],
      title: "Бантик",
      param: "boww",
      price: 40,
    },
    {
      id: "body-tie",
      backendKeys: ["body_tie", "tie", "галстук"],
      title: "Галстук",
      param: "tie",
      price: 45,
    },
    {
      id: "body-star",
      backendKeys: ["body_star", "star", "звезда"],
      title: "Звезда",
      param: "star",
      price: 45,
    },
    {
      id: "body-icon",
      backendKeys: ["body_icon", "icon", "значок", "значек"],
      title: "Значок",
      param: "icon",
      price: 45,
    },
    {
      id: "body-scarf",
      backendKeys: ["body_scarf", "scarf", "шарф"],
      title: "Шарф",
      param: "scarf",
      price: 50,
    },
  ],
};

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
  Object.values(BUNNY_ACCESSORY_LOCAL_META_BY_SECTION)
    .flat()
    .map((item) => item.id);

const normalizeCompareValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[\s-]+/g, "_");

const getRawBackendId = (item) => item?.id ?? item?.itemId ?? item?.item_id ?? null;

const getRawItemType = (item) => item?.itemType || item?.item_type || item?.type || item?.code || item?.slug || "";

const getRawItemTitle = (item) => item?.name || item?.title || item?.label || "";

const getRawImageValue = (item) =>
  item?.imageUrl ||
  item?.image_url ||
  item?.image ||
  item?.url ||
  item?.fileUrl ||
  item?.file_url ||
  item?.publicUrl ||
  item?.public_url ||
  item?.storageUrl ||
  item?.storage_url ||
  item?.storageKey ||
  item?.storage_key ||

  // ВАЖНО: твои поля из БД
  item?.assetStorageKey ||
  item?.asset_storage_key ||
  item?.assetFileUrl ||
  item?.asset_file_url ||
  item?.assetUrl ||
  item?.asset_url ||

  item?.file?.imageUrl ||
  item?.file?.image_url ||
  item?.file?.url ||
  item?.file?.fileUrl ||
  item?.file?.file_url ||
  item?.file?.publicUrl ||
  item?.file?.public_url ||
  item?.file?.storageUrl ||
  item?.file?.storage_url ||
  item?.file?.storageKey ||
  item?.file?.storage_key ||
  item?.file?.assetStorageKey ||
  item?.file?.asset_storage_key ||
  "";
function findLocalAccessoryMeta(sectionId, item) {
  const sectionItems = BUNNY_ACCESSORY_LOCAL_META_BY_SECTION[sectionId] || [];
  if (sectionItems.length === 0) return null;

  const itemValues = [
    getRawBackendId(item),
    getRawItemType(item),
    getRawItemTitle(item),
    item?.code,
    item?.slug,
    item?.param,
    item?.accessoryCode,
    item?.accessory_code,
    item?.shopItemCode,
    item?.shop_item_code,
  ].map(normalizeCompareValue);

  return (
    sectionItems.find((localItem) => {
      const localValues = [
        localItem.id,
        localItem.title,
        localItem.param,
        ...(Array.isArray(localItem.backendKeys) ? localItem.backendKeys : []),
      ].map(normalizeCompareValue);

      return itemValues.some((value) => value && localValues.includes(value));
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

export function normalizeBackendImageUrl(value) {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;

  if (trimmed.startsWith("//")) {
    const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
    return `${protocol}${trimmed}`;
  }

  const baseUrl = String(BUNNY_SHOP_API_BASE_URL || "").replace(/\/+$/, "");
  const imagePath = trimmed.replace(/^\/+/, "");

  return baseUrl ? `${baseUrl}/${imagePath}` : `/${imagePath}`;
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
  const itemType = getRawItemType(item) || BUNNY_SHOP_SLOT_BY_SECTION[sectionId] || "";
  const title = getRawItemTitle(item) || localMeta?.title || "Предмет";
  const price = Number(item?.price ?? item?.cost ?? localMeta?.price ?? 0);
  const imageUrl = normalizeBackendImageUrl(getRawImageValue(item));
  const id = backendId ?? localMeta?.id ?? `${sectionId}-${itemType || title}`;

  return {
    ...localMeta,
    ...item,
    id,
    localId: localMeta?.id || null,
    backendId,
    title,
    name: title,
    itemType,
    sectionId,
    slot: item?.slot || item?.slotType || item?.slot_type || BUNNY_SHOP_SLOT_BY_SECTION[sectionId] || sectionId,
    image: imageUrl,
    imageUrl,
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

  for (const sectionId of Object.keys(BUNNY_ACCESSORY_LOCAL_META_BY_SECTION)) {
    const candidate = value.equippedItems?.[sectionId] || null;
    const isValidInSection = BUNNY_ACCESSORY_LOCAL_META_BY_SECTION[sectionId].some((item) => item.id === candidate);

    equippedItems[sectionId] = isValidInSection && purchasedSet.has(candidate) ? candidate : null;
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