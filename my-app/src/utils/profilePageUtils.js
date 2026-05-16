export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://habbit-backend-k33d.onrender.com";

export const USER = {
  name: "",
  email: "",
  coins: 0,
  registeredAt: "",
};

export const AVATAR_COLORS_STORAGE_KEY = "habbit-profile-avatar-colors";
export const AVATAR_SELECTED_STORAGE_KEY = "habbit-profile-selected-avatar-id";
export const AVATAR_PHOTOS_STORAGE_KEY = "habbit-profile-uploaded-photos";
export const PROFILE_DATA_STORAGE_KEY = "habbit-profile-data";
export const TOKEN_STORAGE_KEYS = ["habbit-auth-token", "habbitToken", "authToken", "token"];
export const MAX_UPLOADED_PHOTOS = 3;
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function getStoredAuthToken() {
  if (typeof window === "undefined") return "";

  try {
    for (const key of TOKEN_STORAGE_KEYS) {
      const token = window.localStorage.getItem(key);
      if (token) return token;
    }
  } catch {
    return "";
  }

  return "";
}

export function clearStoredAuthTokens() {
  if (typeof window === "undefined") return;

  try {
    TOKEN_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Даже если localStorage недоступен, визуально пользователь всё равно выйдет.
  }
}

export async function requestProfileApi(path, options = {}) {
  const token = getStoredAuthToken();

  if (!token) {
    throw new Error("Нет токена авторизации");
  }

  const { method = "GET", body, isFormData = false } = options;
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  if (!isFormData && body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Запрос к профилю не выполнен");
  }

  return data;
}

export function readStoredAvatarColors() {
  if (typeof window === "undefined") return {};

  try {
    const storedColors = window.localStorage.getItem(AVATAR_COLORS_STORAGE_KEY);
    const parsedColors = storedColors ? JSON.parse(storedColors) : {};

    if (!parsedColors || typeof parsedColors !== "object" || Array.isArray(parsedColors)) {
      return {};
    }

    return parsedColors;
  } catch {
    return {};
  }
}

export function saveStoredAvatarColors(colors) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(AVATAR_COLORS_STORAGE_KEY, JSON.stringify(colors));
  } catch {
    // Цвет просто останется до текущей перезагрузки, если браузер запретил localStorage.
  }
}

export function readStoredSelectedAvatarId() {
  if (typeof window === "undefined") return "monogram";

  try {
    const storedAvatarId = window.localStorage.getItem(AVATAR_SELECTED_STORAGE_KEY);
    return storedAvatarId || "monogram";
  } catch {
    return "monogram";
  }
}

export function saveStoredSelectedAvatarId(avatarId) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(AVATAR_SELECTED_STORAGE_KEY, avatarId);
  } catch {
    // Выбор останется только до перезагрузки, если браузер запретил localStorage.
  }
}

export function readStoredUploadedPhotos() {
  if (typeof window === "undefined") return [];

  try {
    const storedPhotos = window.localStorage.getItem(AVATAR_PHOTOS_STORAGE_KEY);
    const parsedPhotos = storedPhotos ? JSON.parse(storedPhotos) : [];

    if (!Array.isArray(parsedPhotos)) {
      return [];
    }

    return parsedPhotos
      .filter(
        (photo) =>
          photo &&
          typeof photo === "object" &&
          typeof photo.id === "string" &&
          typeof photo.src === "string" &&
          photo.src.startsWith("data:image/")
      )
      .slice(0, MAX_UPLOADED_PHOTOS);
  } catch {
    return [];
  }
}

export function saveStoredUploadedPhotos(photos) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      AVATAR_PHOTOS_STORAGE_KEY,
      JSON.stringify(photos.slice(0, MAX_UPLOADED_PHOTOS))
    );
  } catch {
    // Если картинка слишком большая для localStorage, фото останется только до перезагрузки.
  }
}

export function readStoredProfileData() {
  const fallbackData = {
    name: "",
    email: "",
    password: "••••••••",
    coins: 0,
    registeredAt: "",
  };

  if (typeof window === "undefined") return fallbackData;

  try {
    const storedData = window.localStorage.getItem(PROFILE_DATA_STORAGE_KEY);
    const parsedData = storedData ? JSON.parse(storedData) : {};

    if (!parsedData || typeof parsedData !== "object" || Array.isArray(parsedData)) {
      return fallbackData;
    }

    return {
      name: normalizeEditableValue(parsedData.name, fallbackData.name),
      email: normalizeEditableValue(parsedData.email, fallbackData.email),
      password: "••••••••",
      coins: parsedData.coins ?? fallbackData.coins,
      registeredAt: parsedData.registeredAt || fallbackData.registeredAt,
    };
  } catch {
    return fallbackData;
  }
}

export function saveStoredProfileData(profileData) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      PROFILE_DATA_STORAGE_KEY,
      JSON.stringify({
        name: normalizeEditableValue(profileData.name, USER.name),
        email: normalizeEditableValue(profileData.email, USER.email),
        password: "••••••••",
        coins: profileData.coins ?? USER.coins,
        registeredAt: profileData.registeredAt || USER.registeredAt,
      })
    );
  } catch {
    // Данные останутся только до перезагрузки, если браузер запретил localStorage.
  }
}

export function clampIndex(index, length) {
  return Math.max(0, Math.min(index, length - 1));
}

export function getInitial(name) {
  const trimmedName = String(name || "").trim();
  return (trimmedName[0] || "П").toUpperCase();
}

export function normalizeEditableValue(value, fallback) {
  const nextValue = String(value || "").trim();
  return nextValue || fallback;
}

export function formatBackendDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function getFiniteNumber(...values) {
  for (const value of values) {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
}

export function getBackendUser(profileResponse) {
  return profileResponse?.user && typeof profileResponse.user === "object"
    ? profileResponse.user
    : profileResponse || {};
}

export function normalizeProfileFromBackend(profileResponse, fallbackProfile = {}) {
  const user = getBackendUser(profileResponse);
  const coins = getFiniteNumber(
    user.coinsBalance,
    user.coins,
    user.coins_balance,
    fallbackProfile.coins,
    fallbackProfile.coinsBalance
  );

  const registeredAt =
    user.registeredAtFormatted ||
    user.registered_at_formatted ||
    (user.registeredAt ? formatBackendDate(user.registeredAt) : "") ||
    (user.registered_at ? formatBackendDate(user.registered_at) : "") ||
    fallbackProfile.registeredAt ||
    fallbackProfile.registeredAtFormatted ||
    "";

  return {
    id: user.id ?? fallbackProfile.id ?? null,
    name: normalizeEditableValue(user.name, fallbackProfile.name || ""),
    email: normalizeEditableValue(user.email, fallbackProfile.email || ""),
    password: user.passwordMasked || fallbackProfile.passwordMasked || fallbackProfile.password || "••••••••",
    coins: coins ?? 0,
    registeredAt,
    activeUserAvatarId:
      user.activeUserAvatarId ??
      user.active_user_avatar_id ??
      fallbackProfile.activeUserAvatarId ??
      null,
    avatarBgColor: user.avatarBgColor || user.avatar_bg_color || fallbackProfile.avatarBgColor || "#F3E3DB",
    activeAvatar: user.activeAvatar || user.active_avatar || fallbackProfile.activeAvatar || null,
  };
}

export function getBackendAvatars(profileResponse) {
  if (Array.isArray(profileResponse?.avatars)) return profileResponse.avatars;
  if (Array.isArray(profileResponse?.user?.avatars)) return profileResponse.user.avatars;
  return [];
}

export function getBackendActiveAvatar(profileResponse) {
  return (
    profileResponse?.user?.activeAvatar ||
    profileResponse?.user?.active_avatar ||
    profileResponse?.activeAvatar ||
    profileResponse?.active_avatar ||
    profileResponse?.avatar ||
    null
  );
}

export function getSlideIdForBackendActiveAvatar(profileResponse) {
  const backendAvatars = getBackendAvatars(profileResponse);
  const activeAvatar = getBackendActiveAvatar(profileResponse);
  const user = getBackendUser(profileResponse);
  const activeAvatarId = activeAvatar?.id ?? user.activeUserAvatarId ?? user.active_user_avatar_id;

  if (!activeAvatarId) return null;

  const avatar =
    activeAvatar && String(activeAvatar.id) === String(activeAvatarId)
      ? activeAvatar
      : backendAvatars.find((item) => String(item?.id) === String(activeAvatarId));

  if (!avatar) return null;

  if (isBackendPictureAvatar(avatar)) {
    return `photo-${avatar.id}`;
  }

  if (avatar.type === "letter") {
    return "monogram";
  }

  if (avatar.type === "emoji") {
    return `emoji-${avatar.id}`;
  }

  return null;
}

export function getBackendAvatarUrl(avatar) {
  return avatar?.file?.url || avatar?.src || "";
}

export function isBackendPictureAvatar(avatar) {
  return avatar?.type === "picture" || avatar?.type === "photo";
}

export function getBackendHoverText(item) {
  return String(item?.hoverText || item?.hover_text || "").trim();
}

export function getEmojiAvatarHoverText(slide) {
  if (slide?.type !== "emoji") return "";

  return String(slide.hoverText || getBackendHoverText(slide.raw) || "").trim();
}

export function isColorEditableSlide(slide) {
  return slide?.type === "monogram" || slide?.type === "emoji";
}

export function normalizeSharedAvatar(slide, fallbackName = "") {
  if (!slide) return null;

  if (slide.type === "photo") {
    return {
      id: slide.backendId || slide.id,
      type: "photo",
      label: slide.label,
      color: slide.color,
      src: slide.src,
      hoverText: slide.hoverText || getBackendHoverText(slide.raw),
      raw: slide.raw || null,
    };
  }

  return {
    id: slide.backendId || slide.id,
    type: slide.type === "emoji" ? "emoji" : "letter",
    label: slide.label || getInitial(fallbackName),
    color: slide.color,
    hoverText: slide.hoverText || getBackendHoverText(slide.raw),
    raw: slide.raw || null,
  };
}

export function normalizePreviewSlideFromSharedAvatar(avatar, fallbackName = "") {
  if (!avatar || typeof avatar !== "object") return null;

  const avatarType = avatar.type === "picture" ? "photo" : avatar.type;
  const color = avatar.color || avatar.bgColor || avatar.bg_color || "#ede2da";

  if (avatarType === "photo") {
    const src = avatar.src || avatar.file?.url || "";

    if (!src) return null;

    return {
      id: avatar.id ? `preview-photo-${avatar.id}` : "preview-photo",
      type: "photo",
      backendId: avatar.backendId || avatar.id || null,
      label: avatar.label || avatar.file?.originalName || "Фото профиля",
      color,
      src,
      raw: avatar.raw || avatar,
    };
  }

  if (avatarType === "emoji") {
    return {
      id: avatar.id ? `preview-emoji-${avatar.id}` : "preview-emoji",
      type: "emoji",
      backendId: avatar.backendId || avatar.id || null,
      label: avatar.label || avatar.value || "🙂",
      color,
      hoverText: avatar.hoverText || avatar.hover_text || getBackendHoverText(avatar.raw),
      raw: avatar.raw || avatar,
    };
  }

  return {
    id: avatar.id ? `preview-letter-${avatar.id}` : "preview-letter",
    type: "monogram",
    backendId: avatar.backendId || avatar.id || null,
    label: avatar.label || avatar.value || getInitial(fallbackName),
    color,
    hoverText: avatar.hoverText || avatar.hover_text || getBackendHoverText(avatar.raw),
    raw: avatar.raw || avatar,
  };
}
