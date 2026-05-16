import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ClickSpark from "../components/Animation/ClickSpark";
import Header from "../components/Header";
import AnimatedContent from "../components/Animation/AnimatedContent";
import BorderGlow from "../components/Animation/BorderGlow";
import gearIcon from "../assets/icons/gear.png";

import "../styles/global.css";
import "../styles/profile.css";

import {
  MAX_UPLOADED_PHOTOS,
  MAX_AVATAR_SIZE_BYTES,
  ALLOWED_AVATAR_MIME_TYPES,
  clearStoredAuthTokens,
  requestProfileApi,
  readStoredAvatarColors,
  saveStoredAvatarColors,
  readStoredSelectedAvatarId,
  saveStoredSelectedAvatarId,
  readStoredUploadedPhotos,
  saveStoredUploadedPhotos,
  readStoredProfileData,
  saveStoredProfileData,
  clampIndex,
  getInitial,
  normalizeEditableValue,
  normalizeProfileFromBackend,
  getBackendAvatars,
  getBackendActiveAvatar,
  getSlideIdForBackendActiveAvatar,
  getBackendAvatarUrl,
  getBackendHoverText,
  isBackendPictureAvatar,
  getEmojiAvatarHoverText,
  isColorEditableSlide,
  PROFILE_DATA_STORAGE_KEY,
  AVATAR_COLORS_STORAGE_KEY,
  AVATAR_SELECTED_STORAGE_KEY,
  AVATAR_PHOTOS_STORAGE_KEY,
  normalizeSharedAvatar,
  normalizePreviewSlideFromSharedAvatar,
} from "../utils/profilePageUtils";

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
                        className="profile-edit-mode-button"
                        onClick={handleProfileModeButtonClick}
                        disabled={isBusy}
                        aria-label={isProfileEditing ? "Сохранить изменения профиля" : "Открыть настройки профиля"}
                        title={isProfileEditing ? "Сохранить изменения профиля" : "Открыть настройки профиля"}
                      >
                        <img
                          className="profile-edit-mode-button__gear-icon"
                          src={gearIcon}
                          alt=""
                          aria-hidden="true"
                        />
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
                                    "--avatar-symbol-color": getReadableAvatarTextColor(slide.color),
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
                          style={{
                            "--avatar-bg": stablePreviewSlide?.color || "#ede2da",
                            "--avatar-symbol-color": getReadableAvatarTextColor(stablePreviewSlide?.color || "#ede2da"),
                          }}
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
                  className={`modal-card__button ${
                    deleteModalState === "confirm"
                      ? "modal-card__button--ghost"
                      : "modal-card__button--danger"
                  }`}
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


function getReadableAvatarTextColor(backgroundColor) {
  if (!backgroundColor || typeof backgroundColor !== "string") {
    return "var(--color-text-main)";
  }

  const normalizedColor = backgroundColor.trim();
  const hexMatch = normalizedColor.match(/^#?([a-f\d]{3}|[a-f\d]{6})$/i);

  if (!hexMatch) {
    return "var(--color-text-main)";
  }

  const hex = hexMatch[1].length === 3
    ? hexMatch[1].split("").map((char) => char + char).join("")
    : hexMatch[1];

  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance < 150 ? "#fffaf6" : "#4c342b";
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
