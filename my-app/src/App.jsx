import { useCallback, useEffect, useMemo, useState } from "react";

import LobbyPage from "./pages/LobbyPage";
import GroupPage from "./pages/GroupPage";
import ProfilePage from "./pages/ProfilePage";

const USER = {
  name: "Елизавета",
  email: "elizareads@mail.com",
  login: "eliza_reads",
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

  if (path === "/" || path === "/lobby") return "/lobby";
  if (path === "/profile") return "/profile";
  if (path.startsWith("/group")) return "/group";

  return "/lobby";
}

function getInitial(name) {
  const trimmedName = String(name || "").trim();
  return (trimmedName[0] || "П").toUpperCase();
}

function normalizeEditableValue(value, fallback) {
  const nextValue = String(value || "").trim();
  return nextValue || fallback;
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

function readStoredProfileData() {
  const fallbackData = {
    name: USER.name,
    email: USER.email,
    login: USER.login,
    password: "••••••••••",
    coins: USER.coins,
    registeredAt: USER.registeredAt,
  };

  const parsedData = readJsonStorage(PROFILE_DATA_STORAGE_KEY, {});

  if (!parsedData || typeof parsedData !== "object" || Array.isArray(parsedData)) {
    return fallbackData;
  }

  return {
    ...fallbackData,
    ...parsedData,
    email: fallbackData.email,
    password: "••••••••••",
    coins: fallbackData.coins,
    registeredAt: fallbackData.registeredAt,
  };
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
    color: avatarColors.monogram || "#ede2da",
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
    color: avatar.color || "#ede2da",
  };
}

function App() {
  const [route, setRoute] = useState(() => getRoute(window.location.pathname));
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

  const updateProfileData = useCallback((nextProfileData) => {
    setUserProfile((prev) => ({
      ...prev,
      ...nextProfileData,
      email: prev.email,
      password: "••••••••••",
      coins: prev.coins,
      registeredAt: prev.registeredAt,
      name: normalizeEditableValue(nextProfileData?.name, prev.name),
      login: normalizeEditableValue(nextProfileData?.login, prev.login),
    }));
  }, []);

  const updateProfileAvatar = useCallback((nextAvatar) => {
    setUserAvatar((prev) => normalizeAvatar(nextAvatar || prev, userProfile));
  }, [userProfile]);

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
    if (route === "/profile") return ProfilePage;
    if (route === "/group") return GroupPage;

    return LobbyPage;
  }, [route]);

  return (
    <CurrentPage
      navigate={navigate}
      userProfile={userProfile}
      userAvatar={displayedUserAvatar}
      onProfileDataChange={updateProfileData}
      onProfileAvatarChange={updateProfileAvatar}
    />
  );
}

export default App;
