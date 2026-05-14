import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ClickSpark from "../components/ClickSpark";
import Header from "../components/Header";
import AnimatedContent from "../components/AnimatedContent";
import BorderGlow from "../components/BorderGlow";
import gearIcon from "../assets/icons/gear.png";

import "../styles/global.css";
import "../styles/profile.css";

const USER = {
  name: "",
  email: "",
  coins: 0,
  registeredAt: "",
};

const BASE_EMOJI_SLIDES = [
  {
    id: "emoji-1",
    type: "emoji",
    label: "🐰",
    defaultColor: "#d8cde3",
    hoverMessage: "ЭТО КРОЛЬ-ПАТРУЛЬ, ОН СЛЕДИТ ЗА ПРИВЫЧКАМИ",
  },
  {
    id: "emoji-2",
    type: "emoji",
    label: "💪",
    defaultColor: "#f0d9d0",
    hoverMessage: "ЭТО БИЦУХА МОТИВАЦИИ, ОНА НЕ ПРИНИМАЕТ ОТМАЗКИ",
  },
  {
    id: "emoji-3",
    type: "emoji",
    label: "🧽",
    defaultColor: "#d7e2cf",
    hoverMessage: "ЭТО ГУБКА БОБ, ОН ЛЮБИТ ЧИСТОТУ",
  },
  {
    id: "emoji-4",
    type: "emoji",
    label: "🥕",
    defaultColor: "#f4e4bc",
    hoverMessage: "ЭТО МОРКОВНЫЙ БОСС, ОН ЗА ПОЛЕЗНЫЙ ПЕРЕКУС",
  },
  {
    id: "emoji-5",
    type: "emoji",
    label: "👓",
    defaultColor: "#d9d6ee",
    hoverMessage: "ЭТО УМНИК В ОЧКАХ, ОН ЧИТАЕТ ДАЖЕ СОСТАВ ШАМПУНЯ",
  },
];



const AVATAR_COLORS_STORAGE_KEY = "habbit-profile-avatar-colors";
const AVATAR_SELECTED_STORAGE_KEY = "habbit-profile-selected-avatar-id";
const AVATAR_PHOTOS_STORAGE_KEY = "habbit-profile-uploaded-photos";
const PROFILE_DATA_STORAGE_KEY = "habbit-profile-data";
const TOKEN_STORAGE_KEY = "habbit-auth-token";
const MAX_UPLOADED_PHOTOS = 3;

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

export default function ProfilePage({
  navigate,
  userProfile,
  userAvatar,
  onProfileDataChange,
  onProfileAvatarChange,
}) {
  const [profileData, setProfileData] = useState(() => {
    const storedProfileData = readStoredProfileData();

    return {
      name: normalizeEditableValue(userProfile?.name, storedProfileData.name),
      email: userProfile?.email || storedProfileData.email,
      password: "••••••••",
      coins: userProfile?.coins ?? storedProfileData.coins,
      registeredAt: userProfile?.registeredAt || storedProfileData.registeredAt,
    };
  });
  const [uploadedPhotos, setUploadedPhotos] = useState(readStoredUploadedPhotos);
  const [currentAvatarId, setCurrentAvatarId] = useState(readStoredSelectedAvatarId);
  const [avatarHoverShift, setAvatarHoverShift] = useState(0);
  const [avatarColors, setAvatarColors] = useState(readStoredAvatarColors);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isProfileEditing, setIsProfileEditing] = useState(false);

  const previousAvatarIdRef = useRef("monogram");
  const uploadInputRef = useRef(null);
  const avatarColorInputRef = useRef(null);
  const uploadOpenTimerRef = useRef(null);
  const uploadCancelTimerRef = useRef(null);
  const uploadDialogRef = useRef({ isOpen: false, fallbackId: "monogram" });

  const currentInitial = getInitial(profileData.name);

  const canAddMorePhotos = uploadedPhotos.length < MAX_UPLOADED_PHOTOS;

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
      label: currentInitial,
      color: avatarColors.monogram || "#ede2da",
    };

    const photoSlides = uploadedPhotos.slice(0, MAX_UPLOADED_PHOTOS).map((photo, index) => ({
      id: photo.id,
      type: "photo",
      src: photo.src,
      label: `Фото ${index + 1}`,
      color: "#f3e3db",
      photoId: photo.id,
    }));

    const emojiSlides = BASE_EMOJI_SLIDES.map((slide) => ({
      ...slide,
      color: avatarColors[slide.id] || slide.defaultColor,
    }));

    return [
      ...(canAddMorePhotos ? [uploadSlide] : []),
      monogramSlide,
      ...photoSlides,
      ...emojiSlides,
    ];
  }, [avatarColors, canAddMorePhotos, currentInitial, uploadedPhotos]);

  const storedAvatarIndex = carousel.findIndex((slide) => slide.id === currentAvatarId);
  const monogramIndex = carousel.findIndex((slide) => slide.id === "monogram");
  const fallbackAvatarIndex = monogramIndex >= 0 ? monogramIndex : 0;
  const safeIndex = storedAvatarIndex >= 0 ? storedAvatarIndex : fallbackAvatarIndex;
  const currentSlide = carousel[safeIndex];
  const selectedDisplaySlide =
    currentSlide?.type === "upload" ? carousel.find((slide) => slide.id === "monogram") : currentSlide;
  const canMoveLeft = safeIndex > 0;
  const canMoveRight = safeIndex < carousel.length - 1;
  const canEditCurrentAvatarColor =
    currentSlide?.type === "monogram" || currentSlide?.type === "emoji";
  const sharedAvatar = useMemo(() => {
    if (!selectedDisplaySlide) return userAvatar || null;

    if (selectedDisplaySlide.type === "photo") {
      return {
        id: selectedDisplaySlide.id,
        type: "photo",
        label: selectedDisplaySlide.label,
        color: selectedDisplaySlide.color,
        src: selectedDisplaySlide.src,
      };
    }

    return {
      id: selectedDisplaySlide.id,
      type: selectedDisplaySlide.type,
      label: selectedDisplaySlide.label,
      color: selectedDisplaySlide.color,
    };
  }, [selectedDisplaySlide, userAvatar]);


  const selectAvatarId = useCallback((avatarId) => {
    setCurrentAvatarId(avatarId);
  }, []);

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
  };

  const moveAvatar = (direction) => {
    selectAvatar(direction === "left" ? safeIndex - 1 : safeIndex + 1);
  };

  const handleCurrentAvatarClick = (slide, index) => {
    if (slide.type === "upload") {
      selectAvatar(index);
      return;
    }

    if (slide.type === "photo") return;

    if (canEditCurrentAvatarColor) {
      avatarColorInputRef.current?.click();
    }
  };

  const handleUpload = (event) => {
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

    if (uploadedPhotos.length >= MAX_UPLOADED_PHOTOS) {
      selectAvatarId("monogram");
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

  const removeCurrentPhoto = () => {
    if (currentSlide?.type !== "photo") return;

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

  const updateProfileField = (field, value) => {
    setProfileData((prev) => {
      const nextData = {
        ...prev,
        [field]: normalizeEditableValue(value, prev[field]),
      };

      saveStoredProfileData(nextData);
      onProfileDataChange?.(nextData);
      return nextData;
    });
  };

  const handleProfileModeButtonClick = () => {
    if (isProfileEditing) {
      saveStoredProfileData(profileData);
      saveStoredAvatarColors(avatarColors);
      saveStoredSelectedAvatarId(currentAvatarId);
      saveStoredUploadedPhotos(uploadedPhotos);
      onProfileDataChange?.(profileData);
      onProfileAvatarChange?.(sharedAvatar);
      setIsProfileEditing(false);
      return;
    }

    setIsProfileEditing(true);
  };

  const clearAuthSession = useCallback(({ clearProfile = false } = {}) => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);

      if (clearProfile) {
        window.localStorage.removeItem(PROFILE_DATA_STORAGE_KEY);
        window.localStorage.removeItem(AVATAR_COLORS_STORAGE_KEY);
        window.localStorage.removeItem(AVATAR_SELECTED_STORAGE_KEY);
        window.localStorage.removeItem(AVATAR_PHOTOS_STORAGE_KEY);
      }
    } catch {
      // Даже если localStorage недоступен, пользователь всё равно вернётся на экран входа.
    }
  }, []);

  const goToAuth = useCallback(() => {
    navigate?.("/auth");
  }, [navigate]);

  const confirmLogout = useCallback(() => {
    clearAuthSession();
    setIsLogoutModalOpen(false);
    goToAuth();
  }, [clearAuthSession, goToAuth]);

  const confirmDeactivate = useCallback(() => {
    clearAuthSession({ clearProfile: true });
    setIsDeactivateModalOpen(false);
    goToAuth();
  }, [clearAuthSession, goToAuth]);

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
            initials={userAvatar?.label || currentInitial}
            avatar={userAvatar}
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
                        <strong>{profileData.registeredAt}</strong>
                      </div>

                      <button
                        type="button"
                        className={`profile-edit-mode-button ${isProfileEditing ? "profile-edit-mode-button--save" : ""}`}
                        onClick={handleProfileModeButtonClick}
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
                                  title={slide.type === "emoji" ? slide.hoverMessage : undefined}
                                  tabIndex={isVisible ? 0 : -1}
                                >
                                  <AvatarContent slide={slide} size={isCurrent ? "large" : distance === 1 ? "medium" : "small"} />

                                  {isCurrent && slide.type === "photo" && (
                                    <span
                                      className="profile-avatar-item__remove"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        removeCurrentPhoto();
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
                              onChange={(event) => updateAvatarColor(event.currentTarget.value)}
                              aria-label="Выбрать цвет фона иконки"
                              tabIndex={-1}
                            />
                          )}

                          <input
                            ref={uploadInputRef}
                            type="file"
                            accept="image/*"
                            className="profile-avatar-carousel__input"
                            onChange={handleUpload}
                          />
                        </div>
                      ) : (
                        <div
                          className="profile-avatar-preview"
                          style={{ "--avatar-bg": selectedDisplaySlide?.color || "#ede2da" }}
                          aria-label="Текущая аватарка профиля"
                        >
                          <AvatarContent slide={selectedDisplaySlide} size="hero" />
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
                            onSave={() => updateProfileField("password", "••••••••")}
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
                  </div>
                </BorderGlow>
              </section>
            </AnimatedContent>

            <section className="profile-actions">
              <button
                type="button"
                className="profile-action-button profile-action-button--danger"
                onClick={() => setIsDeactivateModalOpen(true)}
              >
                Деактивировать аккаунт
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
              <div id="deactivate-title" className="modal-card__title">
                Деактивировать аккаунт?
              </div>
              <div className="modal-card__text">
                После деактивации профиль, прогресс и личные данные будут недоступны. Точно хотите продолжить?
              </div>
              <div className="modal-card__actions">
                <button
                  type="button"
                  className="modal-card__button modal-card__button--ghost"
                  onClick={() => setIsDeactivateModalOpen(false)}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="modal-card__button modal-card__button--danger"
                  onClick={confirmDeactivate}
                >
                  Деактивировать
                </button>
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

  const saveValue = () => {
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

      onSave?.("••••••••");
      setDraft("");
      setConfirmDraft("");
      setError("");
      setIsEditing(false);
      return;
    }

    const nextValue = normalizeEditableValue(draft, value);
    onSave?.(nextValue);
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
      saveValue();
      return;
    }

    setDraft(isPassword ? "" : value);
    setConfirmDraft("");
    setError("");
    setIsEditing(true);
  };

  const handleEditKeyDown = (event) => {
    if (event.key === "Enter") {
      saveValue();
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

