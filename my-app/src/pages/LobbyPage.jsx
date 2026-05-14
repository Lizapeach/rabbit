import { useCallback, useEffect, useMemo, useState } from "react";

import ClickSpark from "../components/ClickSpark";
import Header from "../components/Header";
import achievementIcon from "../assets/icons/achievement.svg";
import appleIcon from "../assets/icons/apple.svg";
import booksIcon from "../assets/icons/books.svg";
import cleanIcon from "../assets/icons/clean.svg";
import dumbbellsIcon from "../assets/icons/dumbbells.svg";
import AnimatedContent from "../components/AnimatedContent";
import AnimatedScrollList from "../components/AnimatedScrollList";
import BorderGlow from "../components/BorderGlow";
import GroupFormModal from "../components/GroupFormModal";

import "../styles/lobby.css";

const CATEGORY_OPTIONS = [
  {
    id: "sport",
    title: "Спорт",
  },
  {
    id: "nutrition",
    title: "Питание",
  },
  {
    id: "cleaning",
    title: "Уборка",
  },
  {
    id: "reading",
    title: "Чтение",
  },
];

const CATEGORY_TITLE_BY_ID = CATEGORY_OPTIONS.reduce((acc, category) => {
  acc[category.id] = category.title;
  return acc;
}, {});

const CATEGORY_ICON_BY_ID = {
  sport: dumbbellsIcon,
  nutrition: appleIcon,
  cleaning: cleanIcon,
  reading: booksIcon,
};

const ACHIEVEMENTS = [
  {
    title: "7 дней подряд",
    desc: "Ты удерживала ритм без пропусков целую неделю.",
  },
  {
    title: "Первый устойчивый ритм",
    desc: "Закрыто 10 выполнений по разным привычкам.",
  },
  {
    title: "Внимание к себе",
    desc: "Стабильный прогресс в категории Питание.",
  },
  {
    title: "Тихий фокус",
    desc: "Серия чтения превысила 5 дней.",
  },
  {
    title: "Мягкий старт",
    desc: "Первые привычки успешно добавлены и активны.",
  },
  {
    title: "Командный темп",
    desc: "Внутри одной привычки неделя прошла без общего провала.",
  },
  {
    title: "Нежная настойчивость",
    desc: "Серия закрытых задач продолжает расти каждый день.",
  },
];

const RECORD_STREAK = {
  days: 29,
  category: "Чтение",
  group: "Буба",
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://habbit-backend-k33d.onrender.com";

function getStoredAuthToken() {
  try {
    return (
      localStorage.getItem("habbit-auth-token") ||
      localStorage.getItem("habbitToken") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      ""
    );
  } catch {
    return "";
  }
}

async function requestHabitsFromServer() {
  const token = getStoredAuthToken();

  if (!token) {
    throw new Error("Нет токена авторизации");
  }

  const response = await fetch(`${API_BASE_URL}/api/habits`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Не удалось получить список привычек");
  }

  return Array.isArray(data?.habits) ? data.habits : [];
}

async function createHabitOnServer(payload) {
  const token = getStoredAuthToken();

  if (!token) {
    throw new Error("Нет токена авторизации");
  }

  const response = await fetch(`${API_BASE_URL}/api/habits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      habitTypeCode: payload.categoryId,
      title: payload.groupName,
      description: payload.groupDescription,
      templateTasks: payload.templateTasks || [],
      customTasks: payload.customTasks || [],
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Не удалось создать привычку");
  }

  return data;
}

function getInitial(name) {
  const trimmedName = String(name || "").trim();
  return (trimmedName[0] || "П").toUpperCase();
}

function getGroupWord(count) {
  const number = Math.abs(Number(count));
  const lastTwoDigits = number % 100;
  const lastDigit = number % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "привычек";
  if (lastDigit === 1) return "привычка";
  if (lastDigit >= 2 && lastDigit <= 4) return "привычки";
  return "привычек";
}

function getStreakText(value) {
  const days = Number(value) || 0;
  const lastTwoDigits = Math.abs(days) % 100;
  const lastDigit = Math.abs(days) % 10;

  let dayWord = "дней";

  if (lastTwoDigits < 11 || lastTwoDigits > 14) {
    if (lastDigit === 1) dayWord = "день";
    else if (lastDigit >= 2 && lastDigit <= 4) dayWord = "дня";
  }

  return `${days} ${dayWord}`;
}

function getRoleText(role) {
  if (role === "owner") return "Администратор";
  if (role === "member") return "Участник";
  return "Участник";
}

function normalizeHabitToGroup(habit) {
  const title = String(habit?.title || "Без названия").trim() || "Без названия";
  const description = String(habit?.description || "").trim();
  const currentStreak = Number(habit?.currentStreak || 0);
  const roleText = getRoleText(habit?.role);
  const statusText = habit?.status === "active" ? "активна" : "неактивна";

  return {
    id: habit?.id,
    name: title,
    note: description || `${roleText}, привычка ${statusText}`,
    progress: `Серия: ${getStreakText(currentStreak)}`,
    groupCode: habit?.inviteCode || "",
    habitTypeCode: habit?.habitTypeCode,
    habitMemberId: habit?.habitMemberId,
    role: habit?.role,
    status: habit?.status,
    createdAt: habit?.createdAt,
    joinedAt: habit?.joinedAt,
    currentStreak,
    metaLabel: roleText,
  };
}

function buildCategoriesFromHabits(habits) {
  const categoriesMap = new Map(
    CATEGORY_OPTIONS.map((category) => [
      category.id,
      {
        ...category,
        groups: [],
      },
    ])
  );

  habits.forEach((habit) => {
    const habitTypeCode = habit?.habitTypeCode;
    const status = habit?.status;

    if (status && status !== "active") return;
    if (!habitTypeCode) return;

    if (!categoriesMap.has(habitTypeCode)) {
      categoriesMap.set(habitTypeCode, {
        id: habitTypeCode,
        title: CATEGORY_TITLE_BY_ID[habitTypeCode] || habitTypeCode,
        groups: [],
      });
    }

    categoriesMap.get(habitTypeCode).groups.push(normalizeHabitToGroup(habit));
  });

  return Array.from(categoriesMap.values()).filter(
    (category) => category.groups.length > 0
  );
}

export default function LobbyPage({ navigate, userProfile, userAvatar }) {
  const userName = userProfile?.name || "Елизавета";
  const userEmail = userProfile?.email || "ela@gmail.com";
  const coins = userProfile?.coinsBalance ?? userProfile?.coins ?? 0;
  const [habits, setHabits] = useState([]);
  const [habitsLoadState, setHabitsLoadState] = useState({ status: "idle", error: "" });
  const [expandedCategories, setExpandedCategories] = useState({});
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [inviteCodeModal, setInviteCodeModal] = useState(null);
  const [isInviteCodeCopied, setIsInviteCodeCopied] = useState(false);

  const isHabitsLoading = habitsLoadState.status === "loading";
  const habitsLoadError = habitsLoadState.error;

  const categories = useMemo(() => buildCategoriesFromHabits(habits), [habits]);
  const hasGroups = categories.some((category) => category.groups?.length > 0);

  const loadHabits = useCallback(async ({ silent = false } = {}) => {
    if (!getStoredAuthToken()) {
      setHabits([]);
      setHabitsLoadState({ status: "no-token", error: "" });
      return [];
    }

    if (!silent) {
      setHabitsLoadState({ status: "loading", error: "" });
    }

    try {
      const nextHabits = await requestHabitsFromServer();
      setHabits(nextHabits);
      setHabitsLoadState({ status: "success", error: "" });
      return nextHabits;
    } catch (error) {
      console.error("Habit list loading failed:", error);
      setHabits([]);
      setHabitsLoadState({
        status: "error",
        error: error?.message || "Не удалось загрузить привычку",
      });
      return [];
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHabits();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadHabits, userProfile?.id]);

  useEffect(() => {
    const handleHabitsChanged = () => {
      void loadHabits({ silent: true });
    };

    window.addEventListener("habits:changed", handleHabitsChanged);

    return () => {
      window.removeEventListener("habits:changed", handleHabitsChanged);
    };
  }, [loadHabits]);

  const toggleCategory = (id) => {
    setExpandedCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const goToLobby = useCallback(() => {
    navigate?.("/lobby");
  }, [navigate]);

  const goToProfile = useCallback(() => {
    navigate?.("/profile");
  }, [navigate]);

  const openGroupPage = useCallback(
    (category, group) => {
      const groupSlug = `${category.id}-${group.id}`;

      navigate?.(`/group/${groupSlug}`, {
        categoryId: category.id,
        categoryTitle: category.title,
        groupId: group.id,
        habitMemberId: group.habitMemberId,
        groupName: group.name,
        groupCode: group.groupCode,
        role: group.role,
        status: group.status,
        currentStreak: group.currentStreak,
      });
    },
    [navigate]
  );

  const openServerHabitPage = useCallback(
    (habit, member) => {
      if (!habit?.id) return;

      const habitTypeCode = habit.habitTypeCode || "habit";
      const groupSlug = `${habitTypeCode}-${habit.id}`;

      navigate?.(`/group/${groupSlug}`, {
        categoryId: habitTypeCode,
        categoryTitle: CATEGORY_TITLE_BY_ID[habitTypeCode] || habitTypeCode,
        groupId: habit.id,
        habitMemberId: member?.id || habit?.habitMemberId,
        groupName: habit.title || "Привычка",
        groupCode: habit.inviteCode || "",
        role: member?.role || habit?.role,
        status: member?.status || habit?.status || "active",
        currentStreak: Number(habit.currentStreak || 0),
      });
    },
    [navigate]
  );

  const handleGroupKeyDown = useCallback(
    (event, category, group) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openGroupPage(category, group);
      }
    },
    [openGroupPage]
  );

  const handleGroupFormSubmit = useCallback(
    async (payload) => {
      const isCreateFlow = payload.mode === "create";

      if (!isCreateFlow) {
        const data = payload.serverResponse || {};
        const habit = data?.habit || {};
        const member = data?.member || {};

        setIsGroupFormOpen(false);
        await loadHabits({ silent: true });
        openServerHabitPage(habit, member);
        return;
      }

      try {
        const data = await createHabitOnServer(payload);
        const habit = data?.habit || {};
        const member = data?.member || {};
        const inviteCode = habit?.inviteCode || payload.groupCode || "";

        setIsGroupFormOpen(false);
        await loadHabits({ silent: true });

        if (inviteCode) {
          setIsInviteCodeCopied(false);
          setInviteCodeModal({
            code: inviteCode,
            groupName: habit?.title || payload.groupName || "Новая привычка",
            habit,
            member,
          });
          return;
        }

        openServerHabitPage(habit, member);
      } catch (error) {
        console.error("Habit creation failed:", error);
        alert(error?.message || "Не удалось создать привычку на сервере");
      }
    },
    [loadHabits, openServerHabitPage]
  );

  const handleCopyInviteCode = useCallback(async () => {
    if (!inviteCodeModal?.code) return;

    try {
      await navigator.clipboard.writeText(inviteCodeModal.code);
      setIsInviteCodeCopied(true);
    } catch {
      setIsInviteCodeCopied(false);
    }
  }, [inviteCodeModal]);

  const handleCloseInviteCodeModal = useCallback(() => {
    const createdHabit = inviteCodeModal?.habit;
    const createdMember = inviteCodeModal?.member;

    setInviteCodeModal(null);
    setIsInviteCodeCopied(false);

    if (createdHabit?.id) {
      openServerHabitPage(createdHabit, createdMember);
    }
  }, [inviteCodeModal, openServerHabitPage]);

  return (
    <ClickSpark>
      <div className="lobby-page">
        <div className="lobby-container">
          <Header
            userName={userName}
            userEmail={userEmail}
            coins={coins}
            initials={userAvatar?.label || getInitial(userName)}
            avatar={userAvatar}
            onLogoClick={goToLobby}
            onProfileClick={goToProfile}
          />

          <main className="lobby-main">
            <AnimatedContent distance={80} duration={0.8} delay={0}>
              <section className="hero-card">
                <BorderGlow>
                  <div className="hero-card__inner">
                    <h1 className="hero-card__title">
                      Рады вас видеть,
                      <span>{userName}</span>
                    </h1>

                    <div className="hero-card__divider" />

                    <p className="hero-card__text">
                      Даже одно маленькое выполненное действие движет вперёд.
                    </p>
                  </div>
                </BorderGlow>
              </section>
            </AnimatedContent>

            <section className="content-grid">
              <div className="content-grid__main">
                <AnimatedContent distance={80} duration={0.8} delay={0.15}>
                  <BorderGlow>
                    <div className="panel-card panel-card--categories">
                      <div>
                        <h2 className="section-title">Категории привычек</h2>
                        <p className="section-description">
                          {hasGroups
                            ? "Здесь собраны твои привычки по категориям. Открывай карточки, чтобы смотреть созданные привычки, участников и ежедневный прогресс."
                            : "Здесь будут отображаться все твои привычки собранные по категориям. Пока тут пусто, поэтому предлагаю нажать на плюс, создать первую привычку или присоединиться по коду"}
                        </p>
                      </div>

                      {isHabitsLoading && (
                        <p className="section-description">Загружаю Привычки...</p>
                      )}

                      {habitsLoadError && (
                        <p className="section-description">{habitsLoadError}</p>
                      )}

                      <AnimatedScrollList className="category-list">
                        {categories.map((category) => {
                          const isOpen = !!expandedCategories[category.id];
                          const categoryIcon = CATEGORY_ICON_BY_ID[category.id];

                          return (
                            <div
                              key={category.id}
                              className={`category-card category-card--${category.id}`}
                            >
                              <button
                                type="button"
                                onClick={() => toggleCategory(category.id)}
                                className="category-card__button"
                              >
                                <div className="category-card__left">
                                  <div className="category-card__icon" aria-hidden="true">
                                    {categoryIcon ? (
                                      <img
                                        src={categoryIcon}
                                        alt=""
                                        className="category-card__icon-image"
                                      />
                                    ) : (
                                      <span className="category-card__icon-empty">
                                        {getInitial(category.title)}
                                      </span>
                                    )}
                                  </div>

                                  <div>
                                    <div className="category-card__title">{category.title}</div>
                                    <div className="category-card__subtitle">
                                      {category.groups.length} {getGroupWord(category.groups.length)} в категории
                                    </div>
                                  </div>
                                </div>

                                <div
                                  className={`category-card__arrow ${
                                    isOpen ? "category-card__arrow--open" : ""
                                  }`}
                                  aria-hidden="true"
                                >
                                  <span className="category-card__arrow-shape" />
                                </div>
                              </button>

                              <div
                                className={`category-card__content ${
                                  isOpen ? "category-card__content--open" : ""
                                }`}
                              >
                                <div className="category-card__content-inner">
                                  <div className="group-list">
                                    {category.groups.map((group) => (
                                        <div
                                          key={group.id}
                                          className="group-card"
                                          role="button"
                                          tabIndex={0}
                                          onClick={() => openGroupPage(category, group)}
                                          onKeyDown={(event) =>
                                            handleGroupKeyDown(event, category, group)
                                          }
                                          aria-label={`Открыть привычку ${group.name}`}
                                        >
                                          <div className="group-card__top">
                                            <div>
                                              <div className="group-card__title">{group.name}</div>
                                              <div className="group-card__note">{group.note}</div>
                                            </div>
                                            <div className="group-card__progress">{group.progress}</div>
                                          </div>
                                          <div className="group-card__members">
                                            {group.metaLabel}
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </AnimatedScrollList>

                      <div className="add-category">
                        <button
                          type="button"
                          onClick={() => setIsGroupFormOpen(true)}
                          className="add-category__button"
                        >
                          <span className="add-category__plus" />
                        </button>
                      </div>
                    </div>
                  </BorderGlow>
                </AnimatedContent>
              </div>

              <aside className="content-grid__side">
                <div className="record-panel">
                  <AnimatedContent distance={80} duration={0.8} delay={0.22}>
                    <BorderGlow>
                      <div className="panel-card panel-card--record">
                        <h2 className="section-title">Рекордная серия</h2>
                        <p className="section-description">Самое большое количество дней подряд без пропусков.</p>
                        <div className="record-streak">
                          <div className="record-streak__inner">
                            <div className="record-streak__days">
                              <div className="record-streak__card-label">Дней</div>
                              <div className="record-streak__value">{RECORD_STREAK.days}</div>
                            </div>

                            <div className="record-streak__details">
                              <div className="record-streak__meta-card">
                                <div className="record-streak__card-label">Категория</div>
                                <div className="record-streak__meta-value">{RECORD_STREAK.category}</div>
                              </div>

                              <div className="record-streak__meta-card">
                                <div className="record-streak__card-label">Название</div>
                                <div className="record-streak__meta-value">{RECORD_STREAK.group}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </BorderGlow>
                  </AnimatedContent>
                </div>

                <div className="achievements-panel">
                  <AnimatedContent distance={80} duration={0.8} delay={0.3}>
                    <BorderGlow>
                      <div className="panel-card panel-card--achievements">
                        <h2 className="section-title">Личные достижения</h2>
                        <AnimatedScrollList className="achievement-list">
                          {ACHIEVEMENTS.map((item, index) => (
                            <div key={`${item.title}-${index}`} className="achievement-card">
                              <div className="achievement-card__content">
                                <div className="achievement-card__icon">
                                  <img
                                    src={achievementIcon}
                                    alt="Иконка достижения"
                                    className="achievement-card__icon-image"
                                  />
                                </div>
                                <div>
                                  <div className="achievement-card__title">{item.title}</div>
                                  <div className="achievement-card__desc">{item.desc}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </AnimatedScrollList>
                      </div>
                    </BorderGlow>
                  </AnimatedContent>
                </div>
              </aside>
            </section>
          </main>
        </div>

        <GroupFormModal
          isOpen={isGroupFormOpen}
          onClose={() => setIsGroupFormOpen(false)}
          onSubmit={handleGroupFormSubmit}
        />

        {inviteCodeModal && (
          <InviteCodeModal
            code={inviteCodeModal.code}
            groupName={inviteCodeModal.groupName}
            copied={isInviteCodeCopied}
            onCopy={handleCopyInviteCode}
            onClose={handleCloseInviteCodeModal}
          />
        )}
      </div>
    </ClickSpark>
  );
}

function InviteCodeModal({ code, groupName, copied, onCopy, onClose }) {
  return (
    <div className="group-form-invite-modal" role="presentation">
      <button
        type="button"
        className="group-form-invite-modal__backdrop"
        onClick={onClose}
      />

      <section
        className="group-form-invite-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-code-title"
      >
        <h2 id="invite-code-title" className="group-form-invite-modal__title">
          Привычка с названием «{groupName}» создана
        </h2>

        <p className="group-form-invite-modal__text">
          Отправь этот код друзьям, чтобы они могли присоединиться к данной привычке.
        </p>

        <button type="button" className="group-form-invite-modal__code" onClick={onCopy}>
          {code}
        </button>

        <div className="group-form-invite-modal__copy-state">
          {copied ? "Код скопирован" : "Нажми на код, чтобы скопировать"}
        </div>

        <p className="group-form-invite-modal__hint">
          Данный код можно также найти позже в настройках.
        </p>

        <button type="button" className="group-form-invite-modal__ok" onClick={onClose}>
          Окей
        </button>
      </section>
    </div>
  );
}
