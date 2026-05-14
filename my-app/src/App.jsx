import { useCallback, useEffect, useMemo, useState } from "react";

import LobbyPage from "./pages/LobbyPage";
import GroupPage from "./pages/GroupPage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const TOKEN_STORAGE_KEY = "habbit-auth-token";

const EMPTY_PROFILE = {
  id: null,
  name: "",
  email: "",
  password: "••••••••••",
  coins: 0,
  registeredAt: "",
  activeUserAvatarId: null,
  avatarBgColor: "",
};

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

function normalizeEditableValue(value, fallback = "") {
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
  if (!value) return "";

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

function normalizeProfileData(profileData = {}, fallback = EMPTY_PROFILE) {
  const coins = getFiniteNumber(
    profileData.coins,
    profileData.coinsBalance,
    profileData.coins_balance,
    fallback.coins
  );

  return {
    id: profileData.id ?? fallback.id,
    name: normalizeEditableValue(profileData.name, fallback.name),
    email: normalizeEditableValue(profileData.email, fallback.email),
    password: "••••••••••",
    coins: coins ?? fallback.coins ?? 0,
    registeredAt: profileData.registeredAt
      ? formatBackendDate(profileData.registeredAt)
      : profileData.registered_at
        ? formatBackendDate(profileData.registered_at)
        : fallback.registeredAt || "",
    activeUserAvatarId:
      profileData.activeUserAvatarId ??
      profileData.active_user_avatar_id ??
      fallback.activeUserAvatarId,
    avatarBgColor:
      profileData.avatarBgColor || profileData.avatar_bg_color || fallback.avatarBgColor || "",
  };
}

function buildDefaultAvatar(profileData = EMPTY_PROFILE) {
  return {
    id: "monogram",
    type: "monogram",
    label: getInitial(profileData.name),
    color: profileData.avatarBgColor || "#ede2da",
  };
}

function normalizeAvatar(avatar, profileData = EMPTY_PROFILE) {
  if (!avatar || typeof avatar !== "object") {
    return buildDefaultAvatar(profileData);
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

async function requestCurrentUser() {
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

  return normalizeProfileData(data?.user || data);
}

function App() {
  const [route, setRoute] = useState(() => getRoute(window.location.pathname));
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userProfile, setUserProfile] = useState(EMPTY_PROFILE);
  const [userAvatar, setUserAvatar] = useState(() => buildDefaultAvatar(EMPTY_PROFILE));

  const navigate = useCallback((to, state = {}) => {
    const nextRoute = getRoute(to);

    window.history.pushState(state, "", to);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const updateProfileData = useCallback((nextProfileData = {}) => {
    setUserProfile((prev) => normalizeProfileData(nextProfileData, prev));
  }, []);

  const updateProfileAvatar = useCallback((nextAvatar) => {
    setUserAvatar((prevAvatar) => normalizeAvatar(nextAvatar || prevAvatar, userProfile));
  }, [userProfile]);

  const handleAuthSuccess = useCallback((nextProfileData = {}) => {
    const nextProfile = normalizeProfileData(nextProfileData);

    setUserProfile(nextProfile);
    setUserAvatar(normalizeAvatar(nextProfileData.avatar || nextProfileData.userAvatar, nextProfile));
  }, []);

  useEffect(() => {
    let isActive = true;

    async function checkAuth() {
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

        setUserProfile(profile);
        setUserAvatar((prevAvatar) => normalizeAvatar(prevAvatar, profile));

        if (getRoute(window.location.pathname) === "/auth") {
          navigate("/lobby");
        }
      } catch {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);

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
    const normalizedAvatar = normalizeAvatar(userAvatar, userProfile);

    if (normalizedAvatar.type !== "monogram") {
      return normalizedAvatar;
    }

    return {
      ...normalizedAvatar,
      label: getInitial(userProfile.name),
      color: normalizedAvatar.color || userProfile.avatarBgColor || "#ede2da",
    };
  }, [userAvatar, userProfile]);

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
