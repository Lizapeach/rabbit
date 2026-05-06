import { useCallback, useEffect, useMemo, useState } from "react";

import LobbyPage from "./pages/LobbyPage";
import GroupPage from "./pages/GroupPage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const TOKEN_STORAGE_KEY = "habbit-auth-token";

const USER = {
  name: "Елизавета",
  email: "elizareads@mail.com",
  coins: 240,
  registeredAt: "14 марта 2026",
};

const BASE_EMOJI_SLIDES = [
  { id: "emoji-1", type: "emoji", label: "📚", defaultColor: "#d8cde3" },
  { id: "emoji-2", type: "emoji", label: "🌷", defaultColor: "#f0d9d0" },
  { id: "emoji-3", type: "emoji", label: "🐰", defaultColor: "#d7e2cf" },
  { id: "emoji-4", type: "emoji", label: "✨", defaultColor: "#f4e4bc" },
  { id: "emoji-5", type: "emoji", label: "🌙", defaultColor: "#d9d6ee" },
];

const AVATAR_COLORS_STORAGE_KEY = "habbit-profile-avatar-colors";
const AVATAR_SELECTED_STORAGE_KEY = "habbit-profile-selected-avatar-id";
const AVATAR_PHOTOS_STORAGE_KEY = "habbit-profile-uploaded-photos";
const PROFILE_DATA_STORAGE_KEY = "habbit-profile-data";

function getRoute(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/" || path === "/auth") return "/auth";
  if (path === "/lobby") return "/lobby";
  if (path === "/profile") return "/profile";
  if (path.startsWith("/group")) return "/group";

  return "/auth";
}

function getInitial(name) {
  const trimmedName = String(name || "").trim();
  return (trimmedName[0] || "П").toUpperCase();
}

function normalizeEditableValue(value, fallback) {
  const nextValue = String(value || "").trim();
  return nextValue || fallback;
}

function formatRegisteredAt(date = new Date()) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatBackendDate(value) {
  if (!value) return formatRegisteredAt();

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return formatRegisteredAt(date);
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

function readJsonStorage(key, fallback) {
  if (typeof window === "undefined") return fallback;

  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
}

function saveProfileData(profileData) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(PROFILE_DATA_STORAGE_KEY, JSON.stringify(profileData));
  } catch {
    // Данные останутся в состоянии приложения, если браузер запретил localStorage.
  }
}

function readStoredProfileData() {
  const fallbackData = {
    name: USER.name,
    email: USER.email,
    password: "••••••••••",
    coins: USER.coins,
    registeredAt: USER.registeredAt,
    activeUserAvatarId: null,
    avatarBgColor: "",
  };

  const parsedData = readJsonStorage(PROFILE_DATA_STORAGE_KEY, {});

  if (!parsedData || typeof parsedData !== "object" || Array.isArray(parsedData)) {
    return fallbackData;
  }

  const coins = getFiniteNumber(parsedData.coins, fallbackData.coins);

  return {
    id: parsedData.id ?? fallbackData.id,
    name: normalizeEditableValue(parsedData.name, fallbackData.name),
    email: normalizeEditableValue(parsedData.email, fallbackData.email),
    password: "••••••••••",
    coins: coins ?? fallbackData.coins,
    registeredAt: parsedData.registeredAt || fallbackData.registeredAt,
    activeUserAvatarId: parsedData.activeUserAvatarId ?? fallbackData.activeUserAvatarId,
    avatarBgColor: parsedData.avatarBgColor || fallbackData.avatarBgColor,
  };
}

function buildProfileFromBackendUser(user, fallback = readStoredProfileData()) {
  if (!user || typeof user !== "object") {
    return fallback;
  }

  const coins = getFiniteNumber(user.coinsBalance, user.coins, user.coins_balance, fallback.coins);

  return {
    id: user.id ?? fallback.id,
    name: normalizeEditableValue(user.name, fallback.name),
    email: normalizeEditableValue(user.email, fallback.email),
    password: "••••••••••",
    coins: coins ?? fallback.coins ?? 0,
    registeredAt: user.registeredAt
      ? formatBackendDate(user.registeredAt)
      : user.registered_at
        ? formatBackendDate(user.registered_at)
        : fallback.registeredAt || formatRegisteredAt(),
    activeUserAvatarId: user.activeUserAvatarId ?? fallback.activeUserAvatarId,
    avatarBgColor: user.avatarBgColor || fallback.avatarBgColor,
  };
}

async function requestCurrentUser() {
  if (typeof window === "undefined") return null;

  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return null;

  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Не удалось получить данные пользователя");
  }

  return buildProfileFromBackendUser(data?.user);
}

function readStoredAvatarColors() {
  const parsedColors = readJsonStorage(AVATAR_COLORS_STORAGE_KEY, {});

  if (!parsedColors || typeof parsedColors !== "object" || Array.isArray(parsedColors)) {
    return {};
  }

  return parsedColors;
}

function readStoredUploadedPhotos() {
  const parsedPhotos = readJsonStorage(AVATAR_PHOTOS_STORAGE_KEY, []);

  if (!Array.isArray(parsedPhotos)) return [];

  return parsedPhotos.filter(
    (photo) =>
      photo &&
      typeof photo === "object" &&
      typeof photo.id === "string" &&
      typeof photo.src === "string" &&
      photo.src.startsWith("data:image/")
  );
}

function readStoredSelectedAvatarId() {
  if (typeof window === "undefined") return "monogram";

  try {
    return window.localStorage.getItem(AVATAR_SELECTED_STORAGE_KEY) || "monogram";
  } catch {
    return "monogram";
  }
}

function buildAvatarFromStorage(profileData) {
  const avatarColors = readStoredAvatarColors();
  const uploadedPhotos = readStoredUploadedPhotos();
  const selectedAvatarId = readStoredSelectedAvatarId();
  const monogramAvatar = {
    id: "monogram",
    type: "monogram",
    label: getInitial(profileData.name),
    color: avatarColors.monogram || profileData.avatarBgColor || "#ede2da",
  };

  const photoAvatars = uploadedPhotos.map((photo, index) => ({
    id: photo.id,
    type: "photo",
    src: photo.src,
    label: `Фото ${index + 1}`,
    color: "#f3e3db",
  }));

  const emojiAvatars = BASE_EMOJI_SLIDES.map((slide) => ({
    id: slide.id,
    type: slide.type,
    label: slide.label,
    color: avatarColors[slide.id] || slide.defaultColor,
  }));

  return [monogramAvatar, ...photoAvatars, ...emojiAvatars].find(
    (avatar) => avatar.id === selectedAvatarId
  ) || monogramAvatar;
}

function normalizeAvatar(avatar, profileData) {
  if (!avatar || typeof avatar !== "object") {
    return buildAvatarFromStorage(profileData);
  }

  if (avatar.type === "photo" && typeof avatar.src === "string") {
    return {
      id: avatar.id || "uploaded-avatar",
      type: "photo",
      label: avatar.label || "Фото профиля",
      color: avatar.color || "#f3e3db",
      src: avatar.src,
    };
  }

  return {
    id: avatar.id || "monogram",
    type: avatar.type || "monogram",
    label: avatar.label || getInitial(profileData.name),
    color: avatar.color || profileData.avatarBgColor || "#ede2da",
  };
}

function App() {
  const [route, setRoute] = useState(() => getRoute(window.location.pathname));
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userProfile, setUserProfile] = useState(readStoredProfileData);
  const [userAvatar, setUserAvatar] = useState(() =>
    buildAvatarFromStorage(readStoredProfileData())
  );

  const navigate = useCallback((to, state = {}) => {
    const nextRoute = getRoute(to);

    window.history.pushState(state, "", to);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const updateProfileData = useCallback((nextProfileData = {}) => {
    setUserProfile((prev) => {
      const nextProfile = {
        ...prev,
        name: normalizeEditableValue(nextProfileData.name, prev.name),
        email: prev.email,
        password: "••••••••••",
        coins: prev.coins,
        registeredAt: prev.registeredAt,
      };

      saveProfileData(nextProfile);
      return nextProfile;
    });
  }, []);

  const handleAuthSuccess = useCallback((nextProfileData = {}) => {
    setUserProfile((prev) => {
      const nextProfile = {
        ...prev,
        ...nextProfileData,
        name: normalizeEditableValue(nextProfileData.name, prev.name),
        email: normalizeEditableValue(nextProfileData.email, prev.email),
        password: "••••••••••",
        coins: nextProfileData.coins ?? prev.coins,
        registeredAt: nextProfileData.registeredAt || prev.registeredAt,
      };

      saveProfileData(nextProfile);
      setUserAvatar(buildAvatarFromStorage(nextProfile));
      return nextProfile;
    });
  }, []);

  const updateProfileAvatar = useCallback((nextAvatar) => {
    setUserAvatar((prev) => normalizeAvatar(nextAvatar || prev, userProfile));
  }, [userProfile]);

  useEffect(() => {
    let isActive = true;

    async function checkAuth() {
      if (typeof window === "undefined") return;

      const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);

      if (!token) {
        if (getRoute(window.location.pathname) !== "/auth") {
          navigate("/auth");
        }

        if (isActive) {
          setIsCheckingAuth(false);
        }

        return;
      }

      try {
        const profile = await requestCurrentUser();

        if (!isActive || !profile) return;

        saveProfileData(profile);
        setUserProfile(profile);
        setUserAvatar(buildAvatarFromStorage(profile));

        if (getRoute(window.location.pathname) === "/auth") {
          navigate("/lobby");
        }
      } catch {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        }

        if (getRoute(window.location.pathname) !== "/auth") {
          navigate("/auth");
        }
      } finally {
        if (isActive) {
          setIsCheckingAuth(false);
        }
      }
    }

    checkAuth();

    return () => {
      isActive = false;
    };
  }, [navigate]);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getRoute(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const displayedUserAvatar = useMemo(() => {
    if (userAvatar.type !== "monogram") return userAvatar;

    return {
      ...userAvatar,
      label: getInitial(userProfile.name),
    };
  }, [userAvatar, userProfile.name]);

  const CurrentPage = useMemo(() => {
    if (route === "/auth") return AuthPage;
    if (route === "/profile") return ProfilePage;
    if (route === "/group") return GroupPage;

    return LobbyPage;
  }, [route]);

  if (isCheckingAuth) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        Загрузка профиля...
      </div>
    );
  }

  return (
    <CurrentPage
      navigate={navigate}
      userProfile={userProfile}
      userAvatar={displayedUserAvatar}
      onProfileDataChange={updateProfileData}
      onProfileAvatarChange={updateProfileAvatar}
      onAuthSuccess={handleAuthSuccess}
    />
  );
}

export default App;
