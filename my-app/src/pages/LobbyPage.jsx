import { useCallback, useMemo, useState } from "react";

import ClickSpark from "../components/ClickSpark";
import Header from "../components/Header";
import achievementIcon from "../assets/icons/achievement.svg";
import AnimatedContent from "../components/AnimatedContent";
import AnimatedScrollList from "../components/AnimatedScrollList";
import BorderGlow from "../components/BorderGlow";
import GroupFormModal from "../components/GroupFormModal";

import "../styles/lobby.css";

const ALL_CATEGORIES = [
  {
    id: "sport",
    title: "Спорт",
    groups: [
      {
        id: 1,
        name: "Morning Motion",
        members: 4,
        progress: "68%",
        note: "3 участника уже активны сегодня",
      },
      {
        id: 2,
        name: "Step by Step",
        members: 3,
        progress: "54%",
        note: "Общий фокус на шагах и зарядке",
      },
    ],
  },
  {
    id: "nutrition",
    title: "Питание",
    groups: [
      {
        id: 1,
        name: "Water First",
        members: 5,
        progress: "71%",
        note: "Сегодня у группы хороший темп",
      },
      {
        id: 2,
        name: "Soft Balance",
        members: 3,
        progress: "49%",
        note: "Упор на воду и завтрак",
      },
    ],
  },
  {
    id: "cleaning",
    title: "Уборка",
    groups: [
      {
        id: 1,
        name: "Clear Space",
        members: 4,
        progress: "63%",
        note: "2 мини-задачи уже закрыты сегодня",
      },
      {
        id: 2,
        name: "Tiny Reset",
        members: 2,
        progress: "44%",
        note: "Маленькие ежедневные действия",
      },
    ],
  },
  {
    id: "reading",
    title: "Чтение",
    groups: [
      {
        id: 1,
        name: "Quiet Pages",
        members: 4,
        progress: "82%",
        note: "У группы длинная серия без пропусков",
      },
      {
        id: 2,
        name: "Daily Chapter",
        members: 3,
        progress: "58%",
        note: "Сегодня у всех цель — 20 минут",
      },
    ],
  },
];

const INITIAL_CREATED = ["reading", "sport", "nutrition", "cleaning"];

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
    desc: "Внутри одной группы неделя прошла без общего провала.",
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
  import.meta.env.VITE_API_BASE_URL || "https://habbit-backend-k33d.onrender.com";

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
    throw new Error(data?.message || "Не удалось создать группу");
  }

  return data;
}

function getInitial(name) {
  const trimmedName = String(name || "").trim();
  return (trimmedName[0] || "П").toUpperCase();
}

export default function LobbyPage({ navigate, userProfile, userAvatar }) {
  const userName = userProfile?.name || "Елизавета";
  const userEmail = userProfile?.email || "ela@gmail.com";
  const coins = userProfile?.coins || 240;
  const [categories, setCategories] = useState(ALL_CATEGORIES);
  const [createdCategories, setCreatedCategories] = useState(INITIAL_CREATED);
  const [expandedCategories, setExpandedCategories] = useState({
    reading: true,
    sport: false,
    nutrition: false,
    cleaning: false,
  });
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [inviteCodeModal, setInviteCodeModal] = useState(null);
  const [isInviteCodeCopied, setIsInviteCodeCopied] = useState(false);

  const createdCategoryObjects = useMemo(
    () => categories.filter((category) => createdCategories.includes(category.id)),
    [categories, createdCategories]
  );

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
        groupName: group.name,
        groupCode: group.groupCode || group.code || "HAB-READ-PAGE",
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

  const handleGroupFormSubmit = useCallback(async (payload) => {
    const categoryId = payload.categoryId || "reading";
    const isCreateFlow = payload.mode === "create";
    let groupName = payload.groupName || (isCreateFlow ? "Новая группа" : "Группа по коду");
    let groupCode = payload.groupCode || payload.inviteCode || "";
    let serverHabitId = null;

    if (isCreateFlow) {
      try {
        const data = await createHabitOnServer(payload);
        const habit = data?.habit || {};

        serverHabitId = habit.id || null;
        groupName = habit.title || groupName;
        groupCode = data?.inviteCode || habit.inviteCode || groupCode;
      } catch (error) {
        console.error("Habit creation failed:", error);

        if (getStoredAuthToken()) {
          alert(error?.message || "Не удалось создать группу на сервере");
          return;
        }
      }
    }

    const nextGroup = {
      id: serverHabitId || `local-${Date.now()}`,
      name: groupName,
      members: isCreateFlow ? 1 : 4,
      progress: "0%",
      note: isCreateFlow ? "Новая группа создана. Пригласи друзей по коду." : "Ты присоединилась к группе по коду.",
      groupCode,
    };

    setCategories((prevCategories) =>
      prevCategories.map((category) =>
        category.id === categoryId
          ? { ...category, groups: [nextGroup, ...category.groups] }
          : category
      )
    );

    setCreatedCategories((prevCategories) =>
      prevCategories.includes(categoryId) ? prevCategories : [...prevCategories, categoryId]
    );

    setExpandedCategories((prevExpanded) => ({ ...prevExpanded, [categoryId]: true }));

    if (isCreateFlow && groupCode) {
      setIsInviteCodeCopied(false);
      setInviteCodeModal({ code: groupCode, groupName });
    }
  }, []);

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
    setInviteCodeModal(null);
    setIsInviteCodeCopied(false);
  }, []);

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
                      Добро пожаловать,
                      <span>{userName}</span>
                    </h1>

                    <div className="hero-card__divider" />

                    <p className="hero-card__text">
                      Даже одно маленькое выполненное действие уже создаёт движение вперёд.
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
                        <div className="section-label">Категории</div>
                        <h2 className="section-title">Твои категории и группы</h2>
                        <p className="section-description">
                          Уже созданные категории отображаются выше. В каждой можно открыть список групп и посмотреть короткую сводку по ним.
                        </p>
                      </div>

                      <AnimatedScrollList className="category-list">
                        {createdCategoryObjects.map((category) => {
                          const isOpen = !!expandedCategories[category.id];

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
                                  <div className="category-card__icon">
                                    {category.title.slice(0, 1)}
                                  </div>

                                  <div>
                                    <div className="category-card__title">{category.title}</div>
                                    <div className="category-card__subtitle">
                                      {category.groups.length}{" "}
                                      {category.groups.length === 1 ? "группа" : "группы"} в категории
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
                                        aria-label={`Открыть группу ${group.name}`}
                                      >
                                        <div className="group-card__top">
                                          <div>
                                            <div className="group-card__title">{group.name}</div>
                                            <div className="group-card__note">{group.note}</div>
                                          </div>
                                          <div className="group-card__progress">{group.progress}</div>
                                        </div>
                                        <div className="group-card__members">
                                          Участников: {group.members}
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
                          aria-label="Добавить группу"
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
                        <div className="section-label">Результат</div>
                        <h2 className="section-title section-title--record">Рекордная серия</h2>

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
                                <div className="record-streak__card-label">Группа</div>
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
                        <div className="section-label">Достижения</div>
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
        aria-label="Закрыть окно с кодом"
      />

      <section
        className="group-form-invite-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-code-title"
      >
        <div className="section-label">Код для друзей</div>
        <h2 id="invite-code-title" className="group-form-invite-modal__title">
          Группа «{groupName}» создана
        </h2>

        <p className="group-form-invite-modal__text">
          Отправь этот код друзьям, чтобы они могли присоединиться к группе.
        </p>

        <button type="button" className="group-form-invite-modal__code" onClick={onCopy}>
          {code}
        </button>

        <div className="group-form-invite-modal__copy-state">
          {copied ? "Код скопирован" : "Нажми на код, чтобы скопировать"}
        </div>

        <p className="group-form-invite-modal__hint">
          Ты можешь найти данный код в настройках группы.
        </p>

        <button type="button" className="group-form-invite-modal__ok" onClick={onClose}>
          Окей
        </button>
      </section>
    </div>
  );
}
