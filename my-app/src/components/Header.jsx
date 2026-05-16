import { useEffect, useState } from "react";
import AnimatedScrollList from "./Animation/AnimatedScrollList";

import bellIcon from "../assets/icons/bell.svg";
import coinIcon from "../assets/icons/coin.svg";
import logoIcon from "../assets/icons/logo.svg";

import "../styles/components/header.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://habbit-backend-k33d.onrender.com";

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

  const avatarBackgroundColor =
    displayAvatar.color ||
    displayAvatar.bgColor ||
    displayAvatar.bg_color ||
    displayAvatar.backgroundColor;

  const avatarSymbolColor = getReadableAvatarTextColor(avatarBackgroundColor);

  const avatarImageSrc =
    displayAvatar.src ||
    displayAvatar.url ||
    displayAvatar.imageUrl ||
    displayAvatar.fileUrl ||
    displayAvatar.file_url;

  const avatarLabel = displayAvatar.label || displayAvatar.value || initials;

  const isImageAvatar =
    (displayAvatar.type === "photo" || displayAvatar.type === "picture") &&
    avatarImageSrc;

  return (
    <div
      className="user-icon"
      style={{
        backgroundColor: avatarBackgroundColor,
        color: avatarSymbolColor,
        "--avatar-symbol-color": avatarSymbolColor,
      }}
    >
      {isImageAvatar ? (
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

  const hex =
    hexMatch[1].length === 3
      ? hexMatch[1]
          .split("")
          .map((char) => char + char)
          .join("")
      : hexMatch[1];

  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance < 150 ? "#fffaf6" : "#4c342b";
}

function getAuthToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt") ||
    ""
  );
}

function formatTimeLeft(dateValue, nowTimestamp) {
  if (!dateValue) {
    return "";
  }

  const targetTimestamp = new Date(dateValue).getTime();

  if (Number.isNaN(targetTimestamp)) {
    return "";
  }

  const diff = targetTimestamp - nowTimestamp;

  if (diff <= 0) {
    return "время для возвращения истекло";
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days} д. ${hours} ч.`;
  }

  if (hours > 0) {
    return `${hours} ч. ${minutes} мин.`;
  }

  if (minutes > 0) {
    return `${minutes} мин. ${seconds} сек.`;
  }

  return `${seconds} сек.`;
}

function getNotificationText(notification, nowTimestamp) {
  const type = notification?.type;
  const payload = notification?.payload || {};
  const title = notification?.title || "Уведомление";
  const message = notification?.message || "";

  if (type === "return_to_group_warning") {
    const returnUntil = payload.returnUntil || notification.expiresAt;
    const timeLeft = formatTimeLeft(returnUntil, nowTimestamp);

    return {
      title,
      message: timeLeft
        ? `${message} Осталось: ${timeLeft}.`
        : message,
    };
  }

  if (type === "achievement_received") {
    const rewardCoins =
      notification.rewardCoins ||
      notification.reward_coins ||
      payload.rewardCoins ||
      payload.reward_coins;

    return {
      title,
      message: rewardCoins
        ? `${message} Награда: ${rewardCoins} монет.`
        : message,
    };
  }

  if (type === "shop_purchase") {
    return {
      title: title || "Покупка в магазине Bunny",
      message: message || "Покупка успешно выполнена.",
    };
  }

  if (type === "shop_equipped") {
    return {
      title: title || "Обновление Bunny",
      message: message || "Предмет применён к Bunny.",
    };
  }

  if (type === "group_member_joined") {
    return {
      title: title || "Новый участник",
      message: message || "К группе присоединился новый участник.",
    };
  }

  if (type === "group_member_left") {
    return {
      title: title || "Участник вышел",
      message: message || "Один из участников вышел из группы.",
    };
  }

  return {
    title,
    message,
  };
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
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCoinsOpen, setIsCoinsOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadNotifications() {
      const token = getAuthToken();

      if (!token) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/api/notifications`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Notifications request failed: ${response.status}`);
        }

        const data = await response.json();

        const nextNotifications = Array.isArray(data.notifications)
          ? data.notifications
          : [];

        setNotifications(nextNotifications);
        setUnreadCount(
          Number.isFinite(Number(data.unreadCount))
            ? Number(data.unreadCount)
            : nextNotifications.filter((item) => !item.isRead && !item.readAt).length
        );
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Не удалось загрузить уведомления:", error);
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    }

    loadNotifications();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const hasReturnTimer = notifications.some(
      (notification) => notification.type === "return_to_group_warning"
    );

    if (!hasReturnTimer) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [notifications]);

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

  const handleRemoveNotification = (event, notificationId) => {
    event.preventDefault();
    event.stopPropagation();

    setNotifications((currentNotifications) => {
      const removedNotification = currentNotifications.find(
        (notification) => notification.id === notificationId
      );

      if (removedNotification && !removedNotification.isRead && !removedNotification.readAt) {
        setUnreadCount((currentUnreadCount) => Math.max(currentUnreadCount - 1, 0));
      }

      return currentNotifications.filter(
        (notification) => notification.id !== notificationId
      );
    });
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
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
            onClick={() => setIsCoinsOpen((prev) => !prev)}
          >
            <div className="coins-widget__panel">
              <span>{coins ?? 0}</span>
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

            {unreadCount > 0 && (
              <span className="notification-count">{unreadCount}</span>
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
              notifications.map((notification) => {
                const notificationText = getNotificationText(
                  notification,
                  nowTimestamp
                );

                return (
                  <div
                    key={notification.id}
                    className={`notifications__item ${
                      notification.isRead || notification.readAt
                        ? "notifications__item--read"
                        : "notifications__item--unread"
                    }`}
                  >
                    <span className="notifications__item-text">
                      <strong>{notificationText.title}</strong>

                      {notificationText.message && (
                        <span>{notificationText.message}</span>
                      )}
                    </span>

                    <button
                      type="button"
                      className="notifications__remove-button"
                      onClick={(event) =>
                        handleRemoveNotification(event, notification.id)
                      }
                      aria-label="Скрыть уведомление"
                    >
                      ×
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="notifications__empty">Уведомлений пока нет.</div>
            )}
          </AnimatedScrollList>

          {notifications.length > 0 && (
            <div className="notifications__footer">
              <button
                type="button"
                onClick={handleClearNotifications}
                className="notifications__clear-button"
              >
                Очистить
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}