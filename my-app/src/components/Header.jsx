import { useState } from "react";
import AnimatedScrollList from "./Animation/AnimatedScrollList";

import bellIcon from "../assets/icons/bell.svg";
import coinIcon from "../assets/icons/coin.svg";
import logoIcon from "../assets/icons/logo.svg";

import "../styles/components/header.css";

const INITIAL_NOTIFICATIONS = [
  "В группе Quiet Pages появился новый прогресс за сегодня.",
  "Ты получила достижение: 7 дней подряд.",
  "Сегодня доступно новое короткое задание в категории Питание.",
  "Один из участников твоей группы завершил привычку раньше обычного.",
];

function CoinIcon() {
  return (
    <div className="coin-icon">
      <img src={coinIcon} alt="Монеты" className="coin-icon__image" />
    </div>
  );
}

function BellIcon() {
  return (
    <div className="bell-icon">
      <img src={bellIcon} alt="Уведомления" className="bell-icon__image" />
    </div>
  );
}

function UserIcon({ initials, avatar }) {
  const displayAvatar = avatar || {
    type: "monogram",
    label: initials,
    color: undefined,
  };

  const avatarBackgroundColor = displayAvatar.color
    || displayAvatar.bgColor
    || displayAvatar.bg_color
    || displayAvatar.backgroundColor;
  const avatarSymbolColor = getReadableAvatarTextColor(avatarBackgroundColor);
  const avatarImageSrc = displayAvatar.src || displayAvatar.url || displayAvatar.imageUrl;
  const avatarLabel = displayAvatar.label || displayAvatar.value || initials;

  return (
    <div
      className="user-icon"
      style={{
        backgroundColor: avatarBackgroundColor,
        color: avatarSymbolColor,
        "--avatar-symbol-color": avatarSymbolColor,
      }}
    >
      {displayAvatar.type === "photo" && avatarImageSrc ? (
        <img src={avatarImageSrc} alt="Фото профиля" className="user-icon__image" />
      ) : (
        <span className="user-icon__symbol">{avatarLabel}</span>
      )}
    </div>
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

export default function Header({
  userName,
  userEmail,
  coins,
  initials = "EL",
  avatar,
  onLogoClick,
  onProfileClick,
}) {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCoinsOpen, setIsCoinsOpen] = useState(false);

  const handleLogoClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onLogoClick?.();
  };

  const handleProfileClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onProfileClick?.();
  };

  const handleRemoveNotification = (event, notificationIndex) => {
    event.preventDefault();
    event.stopPropagation();

    setNotifications((currentNotifications) =>
      currentNotifications.filter((_, index) => index !== notificationIndex)
    );
  };

  return (
    <header className="lobby-header">
      <div className="topbar">
        <button
          className="brand-button"
          type="button"
          onClick={handleLogoClick}
          aria-label="Перейти в лобби"
        >
          <img src={logoIcon} alt="Логотип" className="brand-logo__image" />
        </button>

        <div className="topbar-actions">
          <div 
          className={`coins-widget ${isCoinsOpen ? "coins-widget--open" : ""}`}
          onClick={() => setIsCoinsOpen((prev) => !prev)}>
            <div className="coins-widget__panel">
              <span>{coins}</span>
            </div>

            <CoinIcon />
          </div>

          <button
            type="button"
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
            className="icon-button"
            aria-label="Открыть уведомления"
          >
            <BellIcon />

            {notifications.length > 0 && (
              <span className="notification-count">{notifications.length}</span>
            )}
          </button>

          <div className="profile-widget">
            <div className="profile-widget__panel">
              <div className="profile-widget__info">
                <div className="profile-widget__name">{userName}</div>
                <div className="profile-widget__email">{userEmail}</div>
              </div>
            </div>

            <button
              className="profile-widget__button"
              type="button"
              onClick={handleProfileClick}
              aria-label="Перейти в профиль пользователя"
            >
              <UserIcon initials={initials} avatar={avatar} />
            </button>
          </div>
        </div>

        <div className={`notifications ${isNotificationsOpen ? "notifications--open" : ""}`}>
          <div className="notifications__title">Уведомления</div>

          <AnimatedScrollList className="notifications__list" showGradients={false}>
            {notifications.length > 0 ? (
              notifications.map((item, index) => (
                <div key={`${item}-${index}`} className="notifications__item">
                  <span className="notifications__item-text">{item}</span>

                  <button
                    type="button"
                    className="notifications__remove-button"
                    onClick={(event) => handleRemoveNotification(event, index)}
                    aria-label="Удалить уведомление"
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              <div className="notifications__empty">Уведомлений пока нет.</div>
            )}
          </AnimatedScrollList>

          <div className="notifications__footer">
            <button
              type="button"
              onClick={() => setNotifications([])}
              className="notifications__clear-button"
            >
              Очистить
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
