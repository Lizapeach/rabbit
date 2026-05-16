import { Component, useCallback, useEffect, useMemo, useState } from "react";

import LobbyPage from "./pages/LobbyPage";
import GroupPage from "./pages/GroupPage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://habbit-backend-k33d.onrender.com";

const TOKEN_STORAGE_KEYS = [
  "habbit-auth-token",
  "habbitToken",
  "authToken",
  "token",
];

const EMPTY_PROFILE = {
  id: null,
  name: "",
  email: "",
  password: "••••••••••",
  passwordMasked: "••••••••",
  coins: 0,
  coinsBalance: 0,
  registeredAt: "",
  registeredAtFormatted: "",
  activeUserAvatarId: null,
  avatarBgColor: "",
  activeAvatar: null,
};

function getRoute(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/" || path === "/auth") return "/auth";
  if (path === "/lobby") return "/lobby";
  if (path === "/profile") return "/profile";
  if (path.startsWith("/group")) return "/group";

  return "/auth";
}

function getLocationKey() {
  return `${window.location.pathname}${window.location.search}`;
}

function getNavigationLocationKey(to) {
  const url = new URL(to, window.location.origin);
  return `${url.pathname}${url.search}`;
}

function getNavigationRoute(to) {
  const url = new URL(to, window.location.origin);
  return getRoute(url.pathname);
}

function getInitial(name) {
  const trimmedName = String(name || "").trim();
  return (trimmedName[0] || "П").toUpperCase();
}

function getStoredAuthToken() {
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
  try {
    TOKEN_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // localStorage can be unavailable in private mode. Logout should still continue visually.
  }
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

function getProfileUserFromResponse(profileData = {}) {
  if (profileData?.user && typeof profileData.user === "object") {
    return profileData.user;
  }

  return profileData;
}

function normalizeProfileData(profileData = {}, fallback = EMPTY_PROFILE) {
  const source = getProfileUserFromResponse(profileData);
  const coins = getFiniteNumber(
    source.coins,
    source.coinsBalance,
    source.coins_balance,
    fallback.coins,
    fallback.coinsBalance
  );
  const registeredAtFormatted =
    source.registeredAtFormatted ||
    source.registered_at_formatted ||
    (source.registeredAt
      ? formatBackendDate(source.registeredAt)
      : source.registered_at
        ? formatBackendDate(source.registered_at)
        : fallback.registeredAtFormatted || fallback.registeredAt || "");

  return {
    id: source.id ?? fallback.id,
    name: normalizeEditableValue(source.name, fallback.name),
    email: normalizeEditableValue(source.email, fallback.email),
    password: source.passwordMasked || source.password || fallback.password || "••••••••••",
    passwordMasked: source.passwordMasked || fallback.passwordMasked || "••••••••",
    coins: coins ?? fallback.coins ?? 0,
    coinsBalance: coins ?? fallback.coinsBalance ?? 0,
    registeredAt: registeredAtFormatted,
    registeredAtFormatted,
    activeUserAvatarId:
      source.activeUserAvatarId ??
      source.active_user_avatar_id ??
      fallback.activeUserAvatarId,
    avatarBgColor:
      source.avatarBgColor || source.avatar_bg_color || fallback.avatarBgColor || "",
    activeAvatar: source.activeAvatar || source.active_avatar || fallback.activeAvatar || null,
  };
}

function buildDefaultAvatar(profileData = EMPTY_PROFILE) {
  return {
    id: profileData.activeUserAvatarId || "monogram",
    type: "monogram",
    label: getInitial(profileData.name),
    color: profileData.avatarBgColor || "#ede2da",
    src: "",
    raw: null,
  };
}

function normalizeAvatar(avatar, profileData = EMPTY_PROFILE) {
  if (!avatar || typeof avatar !== "object") {
    return buildDefaultAvatar(profileData);
  }

  if ((avatar.type === "picture" || avatar.type === "photo") && (avatar.file?.url || avatar.src)) {
    return {
      id: avatar.id || profileData.activeUserAvatarId || "uploaded-avatar",
      type: "photo",
      label: avatar.label || "Фото профиля",
      color: avatar.bgColor || avatar.color || profileData.avatarBgColor || "#f3e3db",
      src: avatar.file?.url || avatar.src,
      raw: avatar,
    };
  }

  if (avatar.type === "letter" || avatar.type === "emoji") {
    return {
      id: avatar.id || profileData.activeUserAvatarId || avatar.type,
      type: avatar.type,
      label: avatar.value || avatar.label || getInitial(profileData.name),
      color: avatar.bgColor || avatar.color || profileData.avatarBgColor || "#ede2da",
      src: "",
      raw: avatar,
    };
  }

  if (avatar.type === "monogram" || avatar.type === "avatar") {
    return {
      id: avatar.id || profileData.activeUserAvatarId || "monogram",
      type: "monogram",
      label: avatar.label || avatar.value || getInitial(profileData.name),
      color: avatar.color || avatar.bgColor || profileData.avatarBgColor || "#ede2da",
      src: avatar.src || "",
      raw: avatar,
    };
  }

  return {
    id: avatar.id || profileData.activeUserAvatarId || "monogram",
    type: avatar.type || "monogram",
    label: avatar.label || avatar.value || getInitial(profileData.name),
    color: avatar.color || avatar.bgColor || profileData.avatarBgColor || "#ede2da",
    src: avatar.src || avatar.file?.url || "",
    raw: avatar,
  };
}

function getActiveAvatarFromProfileResponse(data = {}) {
  return (
    data?.user?.activeAvatar ||
    data?.user?.active_avatar ||
    data?.activeAvatar ||
    data?.active_avatar ||
    data?.avatar ||
    data?.userAvatar ||
    null
  );
}

async function requestCurrentProfile() {
  const token = getStoredAuthToken();
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

  return data;
}

function AppLoader() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--surface-page-gradient, #f8efe9)",
        color: "var(--text-primary, #3a2f2a)",
        fontFamily: "var(--font-main, inherit)",
        fontSize: "18px",
        fontWeight: 700,
      }}
    >
      Загрузка...
    </div>
  );
}

class PageErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Page render failed:", error, errorInfo);
    this.props.onError?.(error);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "var(--surface-page-gradient, #f8efe9)",
          color: "var(--text-primary, #3a2f2a)",
          fontFamily: "var(--font-main, inherit)",
        }}
      >
        <div
          style={{
            width: "min(520px, 100%)",
            padding: "24px",
            borderRadius: "28px",
            background: "rgba(255, 250, 246, 0.92)",
            boxShadow: "0 24px 60px rgba(74, 55, 46, 0.14)",
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: "0 0 12px", fontSize: "24px" }}>Страница временно не достепна</h1>
          <p style={{ margin: "0 0 20px", lineHeight: 1.5 }}>
            Мне очень жаль. Можно вернуться в лобби или обновить страницу.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => this.props.onNavigate?.("/lobby")}
              style={{
                border: 0,
                borderRadius: "999px",
                padding: "12px 18px",
                fontWeight: 700,
                cursor: "pointer",
                background: "var(--accent-primary, #d7b8a8)",
                color: "var(--text-primary, #3a2f2a)",
              }}
            >
              В лобби
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                border: "1px solid rgba(72, 55, 45, 0.16)",
                borderRadius: "999px",
                padding: "12px 18px",
                fontWeight: 700,
                cursor: "pointer",
                background: "rgba(255, 255, 255, 0.8)",
                color: "var(--text-primary, #3a2f2a)",
              }}
            >
              Обновить
            </button>
          </div>
        </div>
      </div>
    );
  }
}

function App() {
  const [route, setRoute] = useState(() => getRoute(window.location.pathname));
  const [locationKey, setLocationKey] = useState(() => getLocationKey());
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(() => {
    const initialRoute = getRoute(window.location.pathname);
    return initialRoute !== "/auth" && Boolean(getStoredAuthToken());
  });
  const [userProfile, setUserProfile] = useState(EMPTY_PROFILE);
  const [userAvatar, setUserAvatar] = useState(() => buildDefaultAvatar(EMPTY_PROFILE));

  const navigate = useCallback((to, state = {}) => {
    const nextRoute = getNavigationRoute(to);
    const nextLocationKey = getNavigationLocationKey(to);
    const currentLocationKey = getLocationKey();

    if (nextLocationKey === currentLocationKey) {
      window.history.replaceState({ ...window.history.state, ...state }, "", to);
      setRoute(nextRoute);
      setLocationKey(nextLocationKey);
      setIsPageLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    window.history.pushState(state, "", to);
    setRoute(nextRoute);
    setLocationKey(nextLocationKey);
    setIsPageLoading(nextRoute !== "/auth");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const updateProfileData = useCallback((nextProfileData = {}) => {
    setUserProfile((prev) => normalizeProfileData(nextProfileData, prev));
  }, []);

  const updateProfileAvatar = useCallback((nextAvatar) => {
    setUserAvatar((prevAvatar) => normalizeAvatar(nextAvatar || prevAvatar, userProfile));
  }, [userProfile]);

  const resetAuthState = useCallback(() => {
    clearStoredAuthTokens();
    setUserProfile(EMPTY_PROFILE);
    setUserAvatar(buildDefaultAvatar(EMPTY_PROFILE));
    setIsPageLoading(false);
  }, []);

  const handlePageLoadingChange = useCallback((isLoading, sourceRoute) => {
    const currentRoute = getRoute(window.location.pathname);

    if (sourceRoute && sourceRoute !== currentRoute) {
      return;
    }

    setIsPageLoading(Boolean(isLoading));
  }, []);

  const handlePageRenderError = useCallback(() => {
    setIsPageLoading(false);
  }, []);

  const handleProfileResponse = useCallback((profileResponse = {}) => {
    const nextProfile = normalizeProfileData(profileResponse);
    const nextAvatar = normalizeAvatar(getActiveAvatarFromProfileResponse(profileResponse), nextProfile);

    setUserProfile(nextProfile);
    setUserAvatar(nextAvatar);

    return { profile: nextProfile, avatar: nextAvatar };
  }, []);

  const handleAuthSuccess = useCallback((authResponse = {}) => {
    const responseData = authResponse?.user
      ? authResponse
      : {
          user: authResponse,
          activeAvatar:
            authResponse.activeAvatar ||
            authResponse.active_avatar ||
            authResponse.avatar ||
            authResponse.userAvatar,
        };

    handleProfileResponse(responseData);
  }, [handleProfileResponse]);

  useEffect(() => {
    let isActive = true;

    async function checkAuth() {
      const token = getStoredAuthToken();

      if (!token) {
        if (getRoute(window.location.pathname) !== "/auth") {
          navigate("/auth");
        }

        if (isActive) {
          setIsPageLoading(false);
          setIsCheckingAuth(false);
        }

        return;
      }

      try {
        const profileResponse = await requestCurrentProfile();

        if (!isActive || !profileResponse) return;

        handleProfileResponse(profileResponse);

        if (getRoute(window.location.pathname) === "/auth") {
          navigate("/lobby");
        }
      } catch {
        resetAuthState();

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
  }, [handleProfileResponse, navigate, resetAuthState]);

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = getRoute(window.location.pathname);
      setRoute(nextRoute);
      setLocationKey(getLocationKey());
      setIsPageLoading(nextRoute !== "/auth");
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const displayedUserAvatar = useMemo(() => {
    const normalizedAvatar = normalizeAvatar(userAvatar, userProfile);

    if (normalizedAvatar.type !== "monogram" && normalizedAvatar.type !== "letter") {
      return normalizedAvatar;
    }

    return {
      ...normalizedAvatar,
      label: normalizedAvatar.label || getInitial(userProfile.name),
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
    return <AppLoader />;
  }

  return (
    <>
      <div
        style={
          isPageLoading
            ? { minHeight: "100vh", visibility: "hidden", pointerEvents: "none" }
            : undefined
        }
        aria-hidden={isPageLoading ? "true" : undefined}
      >
        <PageErrorBoundary
          resetKey={locationKey}
          onError={handlePageRenderError}
          onNavigate={navigate}
        >
          <CurrentPage
            key={locationKey}
            navigate={navigate}
            userProfile={userProfile}
            userAvatar={displayedUserAvatar}
            onProfileDataChange={updateProfileData}
            onProfileAvatarChange={updateProfileAvatar}
            onProfileResponse={handleProfileResponse}
            onPageLoadingChange={handlePageLoadingChange}
            pageLoadingRoute={route}
            onLogout={resetAuthState}
            onAuthSuccess={handleAuthSuccess}
          />
        </PageErrorBoundary>
      </div>

      {isPageLoading && <AppLoader />}
    </>
  );
}

export default App;
