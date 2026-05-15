import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ClickSpark from "../components/ClickSpark";
import Header from "../components/Header";
import AnimatedContent from "../components/AnimatedContent";
import BorderGlow from "../components/BorderGlow";
import gearIcon from "../assets/icons/gear.png";

import "../styles/global.css";
import "../styles/profile.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://habbit-backend-k33d.onrender.com";

const USER = {
  name: "",
  email: "",
  coins: 0,
  registeredAt: "",
};

const AVATAR_COLORS_STORAGE_KEY = "habbit-profile-avatar-colors";
const AVATAR_SELECTED_STORAGE_KEY = "habbit-profile-selected-avatar-id";
const AVATAR_PHOTOS_STORAGE_KEY = "habbit-profile-uploaded-photos";
const PROFILE_DATA_STORAGE_KEY = "habbit-profile-data";
const TOKEN_STORAGE_KEYS = ["habbit-auth-token", "habbitToken", "authToken", "token"];
const MAX_UPLOADED_PHOTOS = 3;
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getStoredAuthToken() {
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

function clearStoredAuthTokens() {
  if (typeof window === "undefined") return;

  try {
    TOKEN_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Даже если localStorage недоступен, визуально пользователь всё равно выйдет.
  }
}

async function requestProfileApi(path, options = {}) {
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

function readStoredAvatarColors() {
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

function saveStoredAvatarColors(colors) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(AVATAR_COLORS_STORAGE_KEY, JSON.stringify(colors));
  } catch {
    // Цвет просто останется до текущей перезагрузки, если браузер запретил localStorage.
  }
}

function readStoredSelectedAvatarId() {
  if (typeof window === "undefined") return "monogram";

  try {
    const storedAvatarId = window.localStorage.getItem(AVATAR_SELECTED_STORAGE_KEY);
    return storedAvatarId || "monogram";
  } catch {
    return "monogram";
  }
}

function saveStoredSelectedAvatarId(avatarId) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(AVATAR_SELECTED_STORAGE_KEY, avatarId);
  } catch {
    // Выбор останется только до перезагрузки, если браузер запретил localStorage.
  }
}

function readStoredUploadedPhotos() {
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

function saveStoredUploadedPhotos(photos) {
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

function readStoredProfileData() {
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

function saveStoredProfileData(profileData) {
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

function clampIndex(index, length) {
  return Math.max(0, Math.min(index, length - 1));
}

function getInitial(name) {
  const trimmedName = String(name || "").trim();
  return (trimmedName[0] || "П").toUpperCase();
}

function normalizeEditableValue(value, fallback) {
  const nextValue = String(value || "").trim();
  return nextValue || fallback;
}

function formatBackendDate(value) {
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

function getFiniteNumber(...values) {
  for (const value of values) {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
}

function getBackendUser(profileResponse) {
  return profileResponse?.user && typeof profileResponse.user === "object"
    ? profileResponse.user
    : profileResponse || {};
}

function normalizeProfileFromBackend(profileResponse, fallbackProfile = {}) {
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
  };
}

function getBackendAvatars(profileResponse) {
  return Array.isArray(profileResponse?.avatars) ? profileResponse.avatars : [];
}

function getBackendActiveAvatar(profileResponse) {
  return profileResponse?.activeAvatar || profileResponse?.avatar || null;
}

function getSlideIdForBackendActiveAvatar(profileResponse) {
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

function getBackendAvatarUrl(avatar) {
  return avatar?.file?.url || avatar?.src || "";
}

function isBackendPictureAvatar(avatar) {
  return avatar?.type === "picture" || avatar?.type === "photo";
}

function getBackendHoverText(item) {
  return String(item?.hoverText || item?.hover_text || "").trim();
}

function getEmojiAvatarHoverText(slide) {
  if (slide?.type !== "emoji") return "";

  return String(slide.hoverText || getBackendHoverText(slide.raw) || "").trim();
}

function isColorEditableSlide(slide) {
  return slide?.type === "monogram" || slide?.type === "emoji";
}

function normalizeSharedAvatar(slide, fallbackName = "") {
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

function normalizePreviewSlideFromSharedAvatar(avatar, fallbackName = "") {
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

export default function ProfilePage({
  navigate,
  userProfile,
  userAvatar,
  onProfileDataChange,
  onProfileAvatarChange,
  onProfileResponse,
  onPageLoadingChange,
  pageLoadingRoute,
  onLogout,
}) {
  const [profileResponse, setProfileResponse] = useState(null);
  const [profileData, setProfileData] = useState(() => {
    const storedProfileData = readStoredProfileData();

    return {
      name: normalizeEditableValue(userProfile?.name, storedProfileData.name),
      email: userProfile?.email || storedProfileData.email,
      password: userProfile?.passwordMasked || userProfile?.password || "••••••••",
      coins: userProfile?.coins ?? userProfile?.coinsBalance ?? storedProfileData.coins,
      registeredAt:
        userProfile?.registeredAtFormatted ||
        userProfile?.registeredAt ||
        storedProfileData.registeredAt,
      activeUserAvatarId: userProfile?.activeUserAvatarId ?? null,
      avatarBgColor: userProfile?.avatarBgColor || "#F3E3DB",
    };
  });
  const [uploadedPhotos, setUploadedPhotos] = useState(readStoredUploadedPhotos);
  const [currentAvatarId, setCurrentAvatarId] = useState(readStoredSelectedAvatarId);
  const [avatarHoverShift, setAvatarHoverShift] = useState(0);
  const [avatarColors, setAvatarColors] = useState(readStoredAvatarColors);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [deleteModalState, setDeleteModalState] = useState("confirm");
  const [deletePreview, setDeletePreview] = useState(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [loadState, setLoadState] = useState({ status: "idle", message: "" });
  const [actionState, setActionState] = useState({ status: "idle", message: "" });

  const previousAvatarIdRef = useRef("monogram");
  const uploadInputRef = useRef(null);
  const avatarColorInputRef = useRef(null);
  const uploadOpenTimerRef = useRef(null);
  const uploadCancelTimerRef = useRef(null);
  const uploadDialogRef = useRef({ isOpen: false, fallbackId: "monogram" });
  const hasLoadedProfileRef = useRef(false);

  const backendAvatars = useMemo(() => getBackendAvatars(profileResponse), [profileResponse]);
  const backendActiveAvatar = useMemo(() => getBackendActiveAvatar(profileResponse), [profileResponse]);
  const backendLetterAvatar = useMemo(
    () =>
      backendAvatars.find((avatar) => avatar?.type === "letter") ||
      (backendActiveAvatar?.type === "letter" ? backendActiveAvatar : null),
    [backendActiveAvatar, backendAvatars]
  );
  const backendEmojiAvatars = useMemo(
    () => backendAvatars.filter((avatar) => avatar?.type === "emoji"),
    [backendAvatars]
  );
  const backendPictureAvatars = useMemo(
    () => backendAvatars.filter((avatar) => isBackendPictureAvatar(avatar)),
    [backendAvatars]
  );

  const currentInitial = getInitial(profileData.name);
  const backendMode = Boolean(profileResponse);
  const photoCount = backendMode ? backendPictureAvatars.length : uploadedPhotos.length;
  const canAddMorePhotos = photoCount < MAX_UPLOADED_PHOTOS;
  const isBusy = actionState.status === "loading" || loadState.status === "loading";

  const applyProfileResponse = useCallback((nextProfileResponse) => {
    const nextProfileData = normalizeProfileFromBackend(nextProfileResponse, userProfile || profileData);
    const nextActiveAvatar = getBackendActiveAvatar(nextProfileResponse);
    const nextActiveSlideId = getSlideIdForBackendActiveAvatar(nextProfileResponse);

    setProfileResponse(nextProfileResponse);
    setProfileData(nextProfileData);

    if (nextActiveSlideId) {
      setCurrentAvatarId(nextActiveSlideId);
      saveStoredSelectedAvatarId(nextActiveSlideId);
    }

    saveStoredProfileData(nextProfileData);

    onProfileResponse?.(nextProfileResponse);
    onProfileDataChange?.(nextProfileResponse?.user || nextProfileData);
    onProfileAvatarChange?.(nextActiveAvatar || normalizeSharedAvatar(null, nextProfileData.name));

    return nextProfileResponse;
  }, [onProfileAvatarChange, onProfileDataChange, onProfileResponse, profileData, userProfile]);

  const loadProfile = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      onPageLoadingChange?.(true, pageLoadingRoute);
      setLoadState({ status: "loading", message: "" });
    }

    try {
      const data = await requestProfileApi("/api/profile");
      applyProfileResponse(data);
      setLoadState({ status: "success", message: "" });
      return data;
    } catch (error) {
      setLoadState({
        status: "error",
        message: error?.message || "Не удалось загрузить профиль",
      });
      return null;
    } finally {
      if (!silent) {
        onPageLoadingChange?.(false, pageLoadingRoute);
      }
    }
  }, [applyProfileResponse, onPageLoadingChange, pageLoadingRoute]);

  useEffect(() => {
    if (hasLoadedProfileRef.current) return;

    hasLoadedProfileRef.current = true;
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => () => {
    onPageLoadingChange?.(false, pageLoadingRoute);
  }, [onPageLoadingChange, pageLoadingRoute]);

  const carousel = useMemo(() => {
    const uploadSlide = {
      id: "upload",
      type: "upload",
      label: "+",
      color: "#f3e3db",
    };

    const monogramSlide = {
      id: "monogram",
      type: "monogram",
      backendId: backendLetterAvatar?.id || null,
      label: currentInitial,
      color: avatarColors.monogram || backendLetterAvatar?.bgColor || profileData.avatarBgColor || "#ede2da",
      hoverText: getBackendHoverText(backendLetterAvatar),
      raw: backendLetterAvatar || null,
    };

    const photoSlides = backendMode
      ? backendPictureAvatars.slice(0, MAX_UPLOADED_PHOTOS).map((avatar, index) => ({
          id: `photo-${avatar.id}`,
          type: "photo",
          backendId: avatar.id,
          src: getBackendAvatarUrl(avatar),
          label: avatar.file?.originalName || `Фото ${index + 1}`,
          color: avatar.bgColor || "#f3e3db",
          photoId: avatar.id,
          raw: avatar,
        }))
      : uploadedPhotos.slice(0, MAX_UPLOADED_PHOTOS).map((photo, index) => ({
          id: photo.id,
          type: "photo",
          src: photo.src,
          label: `Фото ${index + 1}`,
          color: "#f3e3db",
          photoId: photo.id,
          raw: null,
        }));

    const emojiSlides = backendEmojiAvatars.map((avatar) => ({
      id: `emoji-${avatar.id}`,
      type: "emoji",
      backendId: avatar.id,
      label: avatar.value || "🙂",
      color: avatar.bgColor || avatar.bg_color || "#f3e3db",
      hoverText: getBackendHoverText(avatar),
      raw: avatar,
    }));

    return [
      ...(canAddMorePhotos ? [uploadSlide] : []),
      monogramSlide,
      ...photoSlides,
      ...emojiSlides,
    ];
  }, [
    avatarColors,
    backendEmojiAvatars,
    backendLetterAvatar,
    backendMode,
    backendPictureAvatars,
    canAddMorePhotos,
    currentInitial,
    profileData.avatarBgColor,
    uploadedPhotos,
  ]);

  const storedAvatarIndex = carousel.findIndex((slide) => slide.id === currentAvatarId);
  const monogramIndex = carousel.findIndex((slide) => slide.id === "monogram");
  const fallbackAvatarIndex = monogramIndex >= 0 ? monogramIndex : 0;
  const safeIndex = storedAvatarIndex >= 0 ? storedAvatarIndex : fallbackAvatarIndex;
  const currentSlide = carousel[safeIndex];
  const selectedDisplaySlide =
    currentSlide?.type === "upload" ? carousel.find((slide) => slide.id === "monogram") : currentSlide;
  const canMoveLeft = safeIndex > 0;
  const canMoveRight = safeIndex < carousel.length - 1;
  const canEditCurrentAvatarColor = isColorEditableSlide(currentSlide);
  const stablePreviewSlide = useMemo(() => {
    const sharedSlide = normalizePreviewSlideFromSharedAvatar(userAvatar, profileData.name);

    if (!profileResponse && sharedSlide) {
      return sharedSlide;
    }

    return selectedDisplaySlide;
  }, [profileData.name, profileResponse, selectedDisplaySlide, userAvatar]);

  const sharedAvatar = useMemo(
    () => normalizeSharedAvatar(stablePreviewSlide, profileData.name) || userAvatar || null,
    [profileData.name, stablePreviewSlide, userAvatar]
  );


  const setActionMessage = useCallback((status, message) => {
    setActionState({ status, message });
  }, []);

  const refreshProfileAfterShortResponse = useCallback(async (responseData) => {
    if (responseData?.user && (responseData?.activeAvatar || responseData?.avatars)) {
      applyProfileResponse(responseData);
      return responseData;
    }

    return loadProfile({ silent: true });
  }, [applyProfileResponse, loadProfile]);

  const selectAvatarId = useCallback((avatarId) => {
    setCurrentAvatarId(avatarId);
    saveStoredSelectedAvatarId(avatarId);
  }, []);

  const saveActiveAvatar = useCallback(async (slide) => {
    if (!slide?.backendId || slide.type === "upload") return true;

    try {
      setActionMessage("loading", "Обновляю активную аватарку...");
      const data = await requestProfileApi("/api/profile/avatars/active", {
        method: "PATCH",
        body: { avatarId: String(slide.backendId) },
      });
      await refreshProfileAfterShortResponse(data);
      setActionMessage("success", "Активная аватарка обновлена.");
      return true;
    } catch (error) {
      setActionMessage("error", error?.message || "Не удалось выбрать аватарку.");
      return false;
    }
  }, [refreshProfileAfterShortResponse, setActionMessage]);

  const closeUploadDialogAsCanceled = useCallback(() => {
    if (!uploadDialogRef.current.isOpen) return;

    uploadDialogRef.current.isOpen = false;
    selectAvatarId(uploadDialogRef.current.fallbackId);
  }, [selectAvatarId]);

  const handleUploadWindowFocus = useCallback(() => {
    if (uploadCancelTimerRef.current) {
      clearTimeout(uploadCancelTimerRef.current);
    }

    uploadCancelTimerRef.current = window.setTimeout(() => {
      closeUploadDialogAsCanceled();
    }, 180);
  }, [closeUploadDialogAsCanceled]);

  useEffect(() => {
    return () => {
      if (uploadOpenTimerRef.current) {
        clearTimeout(uploadOpenTimerRef.current);
      }

      if (uploadCancelTimerRef.current) {
        clearTimeout(uploadCancelTimerRef.current);
      }

      window.removeEventListener("focus", handleUploadWindowFocus);
    };
  }, [handleUploadWindowFocus]);

  const openUpload = ({ fallbackId = currentSlide?.id || "monogram", delay = false } = {}) => {
    if (!canAddMorePhotos) {
      selectAvatarId("monogram");
      setActionMessage("error", "Можно загрузить максимум 3 фото-аватарки.");
      return;
    }

    previousAvatarIdRef.current = fallbackId;

    if (uploadOpenTimerRef.current) {
      clearTimeout(uploadOpenTimerRef.current);
    }

    const triggerUpload = () => {
      if (!uploadInputRef.current) return;

      uploadInputRef.current.value = "";
      uploadDialogRef.current = {
        isOpen: true,
        fallbackId,
      };

      window.removeEventListener("focus", handleUploadWindowFocus);
      window.addEventListener("focus", handleUploadWindowFocus, { once: true });
      uploadInputRef.current.click();
    };

    if (delay) {
      uploadOpenTimerRef.current = window.setTimeout(triggerUpload, 560);
      return;
    }

    triggerUpload();
  };

  const selectAvatar = (index) => {
    const nextIndex = clampIndex(index, carousel.length);
    const nextSlide = carousel[nextIndex];

    if (nextSlide?.type === "upload") {
      if (nextIndex !== safeIndex) {
        selectAvatarId(nextSlide.id);
        openUpload({ fallbackId: currentSlide?.id || "monogram", delay: true });
        return;
      }

      openUpload({ fallbackId: previousAvatarIdRef.current, delay: false });
      return;
    }

    if (uploadOpenTimerRef.current) {
      clearTimeout(uploadOpenTimerRef.current);
    }

    selectAvatarId(nextSlide.id);
    void saveActiveAvatar(nextSlide);
  };

  const moveAvatar = (direction) => {
    selectAvatar(direction === "left" ? safeIndex - 1 : safeIndex + 1);
  };

  const handleCurrentAvatarClick = (slide, index) => {
    if (slide.type === "upload") {
      selectAvatar(index);
      return;
    }

    if (slide.type === "photo") {
      void saveActiveAvatar(slide);
      return;
    }

    if (canEditCurrentAvatarColor) {
      avatarColorInputRef.current?.click();
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];

    if (uploadCancelTimerRef.current) {
      clearTimeout(uploadCancelTimerRef.current);
    }

    window.removeEventListener("focus", handleUploadWindowFocus);
    uploadDialogRef.current.isOpen = false;

    if (!file) {
      selectAvatarId(previousAvatarIdRef.current);
      event.target.value = "";
      return;
    }

    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
      setActionMessage("error", "Поддерживаются только JPEG, PNG и WEBP.");
      selectAvatarId(previousAvatarIdRef.current);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setActionMessage("error", "Фото должно быть не больше 5 МБ.");
      selectAvatarId(previousAvatarIdRef.current);
      event.target.value = "";
      return;
    }

    if (photoCount >= MAX_UPLOADED_PHOTOS) {
      setActionMessage("error", "Можно загрузить максимум 3 фото-аватарки.");
      selectAvatarId("monogram");
      event.target.value = "";
      return;
    }

    if (backendMode) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        setActionMessage("loading", "Загружаю фото...");
        const data = await requestProfileApi("/api/profile/avatars/picture", {
          method: "POST",
          body: formData,
          isFormData: true,
        });
        const uploadedAvatarId = data?.avatar?.id;
        await loadProfile({ silent: true });

        if (uploadedAvatarId) {
          selectAvatarId(`photo-${uploadedAvatarId}`);
        }

        setActionMessage("success", "Фото-аватарка загружена.");
      } catch (error) {
        setActionMessage("error", error?.message || "Не удалось загрузить фото.");
        selectAvatarId(previousAvatarIdRef.current);
      }

      event.target.value = "";
      return;
    }

    const photoId = `uploaded-${file.name}-${file.size}-${file.lastModified}`;
    const reader = new FileReader();

    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : "";
      if (!src) return;

      setUploadedPhotos((prev) => [
        { id: photoId, src },
        ...prev.filter((photo) => photo.id !== photoId),
      ].slice(0, MAX_UPLOADED_PHOTOS));

      selectAvatarId(photoId);
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const removeCurrentPhoto = async () => {
    if (currentSlide?.type !== "photo") return;

    if (backendMode && currentSlide.backendId) {
      try {
        setActionMessage("loading", "Удаляю фото-аватарку...");
        await requestProfileApi(`/api/profile/avatars/${currentSlide.backendId}`, {
          method: "DELETE",
        });
        await loadProfile({ silent: true });
        selectAvatarId("monogram");
        setActionMessage("success", "Фото-аватарка удалена.");
      } catch (error) {
        setActionMessage("error", error?.message || "Не удалось удалить фото-аватарку.");
      }
      return;
    }

    setUploadedPhotos((prev) => prev.filter((photo) => photo.id !== currentSlide.photoId));
    selectAvatarId("monogram");
  };

  const updateAvatarColor = (color) => {
    if (!currentSlide || !canEditCurrentAvatarColor) return;

    setAvatarColors((prev) => ({
      ...prev,
      [currentSlide.id]: color,
    }));
  };

  const saveAvatarColor = async (color) => {
    if (!currentSlide || !canEditCurrentAvatarColor || !currentSlide.backendId) return;

    try {
      setActionMessage("loading", "Меняю цвет аватарки...");
      const data = await requestProfileApi(`/api/profile/avatars/${currentSlide.backendId}/color`, {
        method: "PATCH",
        body: { bgColor: color },
      });
      await refreshProfileAfterShortResponse(data);
      setActionMessage("success", "Цвет аватарки обновлён.");
    } catch (error) {
      setActionMessage("error", error?.message || "Не удалось изменить цвет аватарки.");
    }
  };

  const updateProfileField = async (field, value, repeatedValue) => {
    if (field === "name") {
      const nextName = normalizeEditableValue(value, profileData.name);

      try {
        setActionMessage("loading", "Сохраняю имя...");
        const data = await requestProfileApi("/api/profile/name", {
          method: "PATCH",
          body: { name: nextName },
        });
        await refreshProfileAfterShortResponse(data);
        setActionMessage("success", "Имя обновлено.");
        return true;
      } catch (error) {
        setActionMessage("error", error?.message || "Не удалось изменить имя.");
        return false;
      }
    }

    if (field === "password") {
      try {
        setActionMessage("loading", "Сохраняю пароль...");
        await requestProfileApi("/api/profile/password", {
          method: "PATCH",
          body: {
            newPassword: value,
            repeatPassword: repeatedValue,
          },
        });
        setProfileData((prev) => ({ ...prev, password: "••••••••" }));
        setActionMessage("success", "Пароль обновлён.");
        return true;
      } catch (error) {
        setActionMessage("error", error?.message || "Не удалось изменить пароль.");
        return false;
      }
    }

    return false;
  };

  const handleProfileModeButtonClick = () => {
    if (isProfileEditing) {
      saveStoredProfileData(profileData);
      saveStoredAvatarColors(avatarColors);
      saveStoredSelectedAvatarId(currentAvatarId);
      saveStoredUploadedPhotos(uploadedPhotos);
      onProfileDataChange?.(profileData);
      onProfileAvatarChange?.(sharedAvatar?.raw || sharedAvatar);
      setIsProfileEditing(false);
      return;
    }

    setIsProfileEditing(true);
    setActionMessage("idle", "");
  };

  const goToAuth = useCallback(() => {
    navigate?.("/auth");
  }, [navigate]);

  const clearAuthSession = useCallback(({ clearProfile = false } = {}) => {
    clearStoredAuthTokens();

    if (clearProfile && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(PROFILE_DATA_STORAGE_KEY);
        window.localStorage.removeItem(AVATAR_COLORS_STORAGE_KEY);
        window.localStorage.removeItem(AVATAR_SELECTED_STORAGE_KEY);
        window.localStorage.removeItem(AVATAR_PHOTOS_STORAGE_KEY);
      } catch {
        // Даже если localStorage недоступен, пользователь всё равно вернётся на экран входа.
      }
    }
  }, []);

  const confirmLogout = useCallback(() => {
    clearAuthSession();
    onLogout?.();
    setIsLogoutModalOpen(false);
    goToAuth();
  }, [clearAuthSession, goToAuth, onLogout]);

  const openDeactivateModal = useCallback(async () => {
    setDeleteModalState("loading");
    setDeletePreview(null);
    setActionState({ status: "loading", message: "" });

    try {
      const preview = await requestProfileApi("/api/profile/delete-preview");
      setDeletePreview(preview);
      setDeleteModalState(preview?.canDelete ? "confirm" : "blocked");
      setIsDeactivateModalOpen(true);
    } catch (error) {
      setDeletePreview({ message: error?.message || "Не удалось проверить удаление аккаунта." });
      setDeleteModalState("error");
      setIsDeactivateModalOpen(true);
    } finally {
      setActionState({ status: "idle", message: "" });
    }
  }, []);

  const confirmDeactivate = useCallback(async () => {
    try {
      setDeleteModalState("deleting");
      await requestProfileApi("/api/profile", { method: "DELETE" });
      clearAuthSession({ clearProfile: true });
      onLogout?.();
      setIsDeactivateModalOpen(false);
      goToAuth();
    } catch (error) {
      setDeletePreview({ message: error?.message || "Не удалось удалить аккаунт." });
      setDeleteModalState("error");
    }
  }, [clearAuthSession, goToAuth, onLogout]);

  const goToLobby = useCallback(() => {
    navigate?.("/lobby");
  }, [navigate]);

  const goToProfile = useCallback(() => {
    navigate?.("/profile");
  }, [navigate]);

  return (
    <ClickSpark>
      <div className="profile-page">
        <div className="profile-page__decor" aria-hidden="true">
          <span className="profile-page__orb profile-page__orb--one" />
          <span className="profile-page__orb profile-page__orb--two" />
          <span className="profile-page__orb profile-page__orb--three" />
        </div>

        <div className="profile-container">
          <Header
            userName={profileData.name}
            userEmail={profileData.email}
            coins={profileData.coins ?? 0}
            initials={sharedAvatar?.label || currentInitial}
            avatar={sharedAvatar || userAvatar}
            onLogoClick={goToLobby}
            onProfileClick={goToProfile}
          />

          <main className="profile-main">
            <AnimatedContent distance={80} duration={0.8} delay={0}>
              <section className="profile-hero">
                <BorderGlow>
                  <div className={`profile-hero__inner ${isProfileEditing ? "profile-hero__inner--editing" : "profile-hero__inner--view"}`}>
                    <div className="profile-hero__heading-corner">
                      <h1 className="section-title">Личные данные</h1>
                      <p className="section-description">
                        Здесь собраны основные данные аккаунта и настройки аватарки.
                      </p>
                    </div>

                    <div className="profile-top-controls">
                      <div className="profile-registration-note">
                        <span>Дата регистрации</span>
                        <strong>{profileData.registeredAt || "—"}</strong>
                      </div>

                      <button
                        type="button"
                        className={`profile-edit-mode-button ${isProfileEditing ? "profile-edit-mode-button--save" : ""}`}
                        onClick={handleProfileModeButtonClick}
                        disabled={isBusy}
                        aria-label={isProfileEditing ? "Сохранить изменения профиля" : "Открыть настройки профиля"}
                      >
                        {isProfileEditing ? (
                          "сохранить"
                        ) : (
                          <img
                            className="profile-edit-mode-button__gear-icon"
                            src={gearIcon}
                            alt=""
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </div>

                    {loadState.status === "error" && (
                      <p className="profile-action-message profile-action-message--error">
                        {loadState.message}
                      </p>
                    )}

                    <div className={`profile-avatar-block ${isProfileEditing ? "profile-avatar-block--edit" : "profile-avatar-block--view"}`}>
                      {isProfileEditing ? (
                        <div className="profile-avatar-carousel" aria-label="Выбор аватарки">
                          <div className="profile-avatar-carousel__stage">
                            {carousel.map((slide, index) => {
                              const offset = index - safeIndex;
                              const distance = Math.abs(offset);
                              const isCurrent = offset === 0;
                              const isVisible = distance <= 2;
                              const scale = isCurrent ? 1 : distance === 1 ? 0.62 : 0.46;
                              const opacity = isCurrent ? 1 : distance === 1 ? 0.5 : distance === 2 ? 0.24 : 0;
                              const shift = isCurrent ? avatarHoverShift : 0;
                              const direction = Math.sign(offset);
                              const desktopX = offset === 0 ? 0 : direction * (distance === 1 ? 112 : 176);
                              const mobileX = offset === 0 ? 0 : direction * (distance === 1 ? 86 : 134);
                              const avatarHoverText = getEmojiAvatarHoverText(slide);

                              return (
                                <button
                                  key={slide.id}
                                  type="button"
                                  className={`profile-avatar-item profile-avatar-item--${slide.type} ${isCurrent ? "profile-avatar-item--current" : ""} ${!isVisible ? "profile-avatar-item--hidden" : ""}`}
                                  style={{
                                    "--avatar-x": `${desktopX}px`,
                                    "--avatar-x-mobile": `${mobileX}px`,
                                    "--avatar-scale": scale,
                                    "--avatar-opacity": opacity,
                                    "--avatar-hover-shift": `${shift}px`,
                                    zIndex: isCurrent ? 24 : isVisible ? 20 - distance : 1,
                                    "--avatar-bg": slide.color,
                                  }}
                                  onClick={() =>
                                    isCurrent
                                      ? handleCurrentAvatarClick(slide, index)
                                      : selectAvatar(index)
                                  }
                                  aria-label={slide.type === "upload" ? "Загрузить фото" : `Выбрать аватарку ${slide.label}`}
                                  title={avatarHoverText || undefined}
                                  tabIndex={isVisible ? 0 : -1}
                                  disabled={isBusy && slide.type !== "upload"}
                                >
                                  <AvatarContent slide={slide} size={isCurrent ? "large" : distance === 1 ? "medium" : "small"} />

                                  {isCurrent && slide.type === "photo" && (
                                    <span
                                      className="profile-avatar-item__remove"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void removeCurrentPhoto();
                                      }}
                                      role="button"
                                      tabIndex={0}
                                      aria-label="Удалить фото"
                                    >
                                      ×
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {canMoveLeft && (
                            <button
                              type="button"
                              className="profile-avatar-carousel__arrow profile-avatar-carousel__arrow--left"
                              onMouseEnter={() => setAvatarHoverShift(12)}
                              onMouseLeave={() => setAvatarHoverShift(0)}
                              onClick={() => moveAvatar("left")}
                              aria-label="Предыдущая аватарка"
                              disabled={isBusy}
                            >
                              <span className="profile-avatar-carousel__arrow-shape" />
                            </button>
                          )}

                          {canMoveRight && (
                            <button
                              type="button"
                              className="profile-avatar-carousel__arrow profile-avatar-carousel__arrow--right"
                              onMouseEnter={() => setAvatarHoverShift(-12)}
                              onMouseLeave={() => setAvatarHoverShift(0)}
                              onClick={() => moveAvatar("right")}
                              aria-label="Следующая аватарка"
                              disabled={isBusy}
                            >
                              <span className="profile-avatar-carousel__arrow-shape" />
                            </button>
                          )}

                          {canEditCurrentAvatarColor && (
                            <input
                              ref={avatarColorInputRef}
                              type="color"
                              className="profile-avatar-color-input"
                              value={currentSlide.color}
                              onInput={(event) => updateAvatarColor(event.currentTarget.value)}
                              onChange={(event) => {
                                updateAvatarColor(event.currentTarget.value);
                                void saveAvatarColor(event.currentTarget.value);
                              }}
                              aria-label="Выбрать цвет фона иконки"
                              tabIndex={-1}
                            />
                          )}

                          <input
                            ref={uploadInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="profile-avatar-carousel__input"
                            onChange={handleUpload}
                          />
                        </div>
                      ) : (
                        <div
                          className="profile-avatar-preview"
                          style={{ "--avatar-bg": stablePreviewSlide?.color || "#ede2da" }}
                          aria-label="Текущая аватарка профиля"
                          title={getEmojiAvatarHoverText(stablePreviewSlide) || undefined}
                        >
                          <AvatarContent slide={stablePreviewSlide} size="hero" />
                        </div>
                      )}
                    </div>

                    <div className={`profile-info-grid ${isProfileEditing ? "profile-info-grid--edit" : "profile-info-grid--view"}`}>
                      {isProfileEditing ? (
                        <>
                          <ProfileInfoCard
                            label="Имя"
                            value={profileData.name}
                            onSave={(value) => updateProfileField("name", value)}
                          />
                          <ProfileInfoCard label="Почта" value={profileData.email} editable={false} />
                          <ProfileInfoCard
                            label="Пароль"
                            value={profileData.password}
                            isPassword
                            onSave={(newPassword, repeatPassword) => updateProfileField("password", newPassword, repeatPassword)}
                          />
                        </>
                      ) : (
                        <>
                          <ProfileInfoDisplayCard label="Имя" value={profileData.name} />
                          <ProfileInfoDisplayCard label="Почта" value={profileData.email} />
                          <ProfileInfoDisplayCard label="Пароль" value={profileData.password} />
                        </>
                      )}
                    </div>

                    {actionState.message && actionState.status !== "idle" && (
                      <p className={`profile-action-message profile-action-message--${actionState.status}`}>
                        {actionState.message}
                      </p>
                    )}
                  </div>
                </BorderGlow>
              </section>
            </AnimatedContent>

            <section className="profile-actions">
              <button
                type="button"
                className="profile-action-button profile-action-button--danger"
                onClick={openDeactivateModal}
                disabled={isBusy}
              >
                Удалить аккаунт
              </button>
              <button
                type="button"
                className="profile-action-button"
                onClick={() => setIsLogoutModalOpen(true)}
              >
                Выйти из аккаунта
              </button>
            </section>
          </main>
        </div>

        {isLogoutModalOpen && (
          <div className="modal-backdrop" role="presentation" onClick={() => setIsLogoutModalOpen(false)}>
            <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="logout-title" onClick={(event) => event.stopPropagation()}>
              <div id="logout-title" className="modal-card__title">
                Выйти из аккаунта?
              </div>
              <div className="modal-card__text">
                После выхода нужно будет снова войти через почту и пароль. Точно хотите продолжить?
              </div>
              <div className="modal-card__actions">
                <button
                  type="button"
                  className="modal-card__button modal-card__button--ghost"
                  onClick={() => setIsLogoutModalOpen(false)}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="modal-card__button modal-card__button--danger"
                  onClick={confirmLogout}
                >
                  Выйти
                </button>
              </div>
            </div>
          </div>
        )}

        {isDeactivateModalOpen && (
          <div className="modal-backdrop" role="presentation" onClick={() => setIsDeactivateModalOpen(false)}>
            <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="deactivate-title" onClick={(event) => event.stopPropagation()}>
              {deleteModalState === "blocked" && (
                <>
                  <div id="deactivate-title" className="modal-card__title">
                    Аккаунт нельзя удалить
                  </div>
                  <div className="modal-card__text">
                    Нельзя удалить аккаунт, пока вы являетесь владельцем группы с другими участниками. Сначала передайте права владельца или выйдите из группы.
                  </div>
                  {deletePreview?.blockingOwnedHabits?.length > 0 && (
                    <div className="modal-card__text">
                      Блокирующие группы: {deletePreview.blockingOwnedHabits.map((habit) => habit.title).join(", ")}
                    </div>
                  )}
                </>
              )}

              {deleteModalState === "confirm" && (
                <>
                  <div id="deactivate-title" className="modal-card__title">
                    Удалить аккаунт?
                  </div>
                  <div className="modal-card__text">
                    После удаления профиль, прогресс и личные данные будут недоступны. Точно хотите продолжить?
                  </div>
                </>
              )}

              {deleteModalState === "deleting" && (
                <>
                  <div id="deactivate-title" className="modal-card__title">
                    Удаляю аккаунт
                  </div>
                  <div className="modal-card__text">
                    Запрос отправлен на сервер.
                  </div>
                </>
              )}

              {deleteModalState === "error" && (
                <>
                  <div id="deactivate-title" className="modal-card__title">
                    Ошибка
                  </div>
                  <div className="modal-card__text">
                    {deletePreview?.message || "Не удалось выполнить действие."}
                  </div>
                </>
              )}

              <div className="modal-card__actions">
                <button
                  type="button"
                  className="modal-card__button modal-card__button--ghost"
                  onClick={() => setIsDeactivateModalOpen(false)}
                >
                  {deleteModalState === "confirm" ? "Отмена" : "Закрыть"}
                </button>

                {deleteModalState === "confirm" && (
                  <button
                    type="button"
                    className="modal-card__button modal-card__button--danger"
                    onClick={confirmDeactivate}
                  >
                    Удалить 
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ClickSpark>
  );
}

function AvatarContent({ slide, size }) {
  if (!slide) return null;

  if (slide.type === "photo") {
    return <img src={slide.src} alt="Фото профиля" className="profile-avatar-image" />;
  }

  return <span className={`profile-avatar-symbol profile-avatar-symbol--${size}`}>{slide.label}</span>;
}

function ProfileInfoDisplayCard({ label, value }) {
  const displayValue = value || "";

  return (
    <div className="profile-info-card profile-info-card--display">
      <div className="profile-info-card__content">
        <div className="profile-info-card__text">
          <div className="profile-info-card__label">{label}</div>
          <div className="profile-info-card__value">{displayValue}</div>
        </div>
      </div>
    </div>
  );
}

function ProfileInfoCard({ label, value, editable = true, isPassword = false, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirmDraft, setConfirmDraft] = useState("");
  const [error, setError] = useState("");

  const saveValue = async () => {
    const trimmedDraft = draft.trim();
    const trimmedConfirmDraft = confirmDraft.trim();

    if (isPassword) {
      if (!trimmedDraft || !trimmedConfirmDraft) {
        setError("Введите новый пароль два раза.");
        return;
      }

      if (trimmedDraft !== trimmedConfirmDraft) {
        setError("Пароли не совпадают.");
        return;
      }

      const isSaved = await onSave?.(trimmedDraft, trimmedConfirmDraft);
      if (isSaved === false) return;

      setDraft("");
      setConfirmDraft("");
      setError("");
      setIsEditing(false);
      return;
    }

    const nextValue = normalizeEditableValue(draft, value);
    const isSaved = await onSave?.(nextValue);
    if (isSaved === false) return;

    setDraft("");
    setConfirmDraft("");
    setError("");
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setDraft("");
    setConfirmDraft("");
    setError("");
    setIsEditing(false);
  };

  const handleButtonClick = () => {
    if (!editable) return;

    if (isEditing) {
      void saveValue();
      return;
    }

    setDraft(isPassword ? "" : value);
    setConfirmDraft("");
    setError("");
    setIsEditing(true);
  };

  const handleEditKeyDown = (event) => {
    if (event.key === "Enter") {
      void saveValue();
    }

    if (event.key === "Escape") {
      cancelEdit();
    }
  };

  return (
    <div className={`profile-info-card ${!editable ? "profile-info-card--locked" : ""} ${isEditing ? "profile-info-card--editing" : ""}`}>
      <div className="profile-info-card__content">
        <div className="profile-info-card__text">
          <div className="profile-info-card__label">{label}</div>
          {isEditing ? (
            <div className="profile-info-card__inputs">
              <input
                className={`profile-info-card__input ${error ? "profile-info-card__input--error" : ""}`}
                type={isPassword ? "password" : "text"}
                value={draft}
                autoFocus
                placeholder={isPassword ? "Новый пароль" : undefined}
                autoComplete={isPassword ? "new-password" : undefined}
                onChange={(event) => {
                  setDraft(event.target.value);
                  if (error) setError("");
                }}
                onKeyDown={handleEditKeyDown}
              />

              {isPassword && (
                <input
                  className={`profile-info-card__input ${error ? "profile-info-card__input--error" : ""}`}
                  type="password"
                  value={confirmDraft}
                  placeholder="Повторите пароль"
                  autoComplete="new-password"
                  onChange={(event) => {
                    setConfirmDraft(event.target.value);
                    if (error) setError("");
                  }}
                  onKeyDown={handleEditKeyDown}
                />
              )}

              {error && <div className="profile-info-card__error">{error}</div>}
            </div>
          ) : (
            <div className="profile-info-card__value">{value}</div>
          )}
        </div>

        {editable && (
          <button type="button" className="profile-info-card__button" onClick={handleButtonClick}>
            {isEditing ? "сохранить" : "изменить"}
          </button>
        )}
      </div>
    </div>
  );
}
