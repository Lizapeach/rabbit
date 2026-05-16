import { useCallback, useEffect, useMemo, useState } from "react";

import ClickSpark from "../components/Animation/ClickSpark";
import Header from "../components/Header";
import GroupFormModal from "../components/GroupFormModal";
import LobbyCategoriesBlock from "../components/LobbyPage/LobbyCategoriesBlock";
import LobbyHeroBlock from "../components/LobbyPage/LobbyHeroBlock";
import LobbySideBlock from "../components/LobbyPage/LobbySideBlock";

import {
  ACHIEVEMENTS,
  CATEGORY_TITLE_BY_ID,
  RECORD_STREAK,
  buildCategoriesFromHabits,
  createHabitOnServer,
  getInitial,
  getStoredAuthToken,
  requestHabitsFromServer,
} from "../utils/lobbyPageUtils";

import "../styles/lobby.css";

export default function LobbyPage({
  navigate,
  userProfile,
  userAvatar,
  onPageLoadingChange,
  pageLoadingRoute,
}) {
  const userName = userProfile?.name || "Елизавета";
  const userEmail = userProfile?.email || "ela@gmail.com";
  const coins = userProfile?.coinsBalance ?? userProfile?.coins ?? 0;
  const [habits, setHabits] = useState([]);
  const [habitsLoadState, setHabitsLoadState] = useState({
    status: "idle",
    error: "",
  });
  const [expandedCategories, setExpandedCategories] = useState({});
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [inviteCodeModal, setInviteCodeModal] = useState(null);
  const [isInviteCodeCopied, setIsInviteCodeCopied] = useState(false);

  const habitsLoadError = habitsLoadState.error;

  const categories = useMemo(() => buildCategoriesFromHabits(habits), [habits]);
  const hasGroups = categories.some((category) => category.groups?.length > 0);

  const loadHabits = useCallback(
    async ({ silent = false } = {}) => {
      if (!getStoredAuthToken()) {
        setHabits([]);
        setHabitsLoadState({ status: "no-token", error: "" });
        onPageLoadingChange?.(false, pageLoadingRoute);
        return [];
      }

      if (!silent) {
        onPageLoadingChange?.(true, pageLoadingRoute);
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
      } finally {
        if (!silent) {
          onPageLoadingChange?.(false, pageLoadingRoute);
        }
      }
    },
    [onPageLoadingChange, pageLoadingRoute]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHabits();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadHabits, userProfile?.id]);

  useEffect(
    () => () => {
      onPageLoadingChange?.(false, pageLoadingRoute);
    },
    [onPageLoadingChange, pageLoadingRoute]
  );

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
            <LobbyHeroBlock userName={userName} />

            <section className="content-grid">
              <LobbyCategoriesBlock
                categories={categories}
                expandedCategories={expandedCategories}
                habitsLoadError={habitsLoadError}
                hasGroups={hasGroups}
                onGroupKeyDown={handleGroupKeyDown}
                onOpenGroup={openGroupPage}
                onOpenGroupForm={() => setIsGroupFormOpen(true)}
                onToggleCategory={toggleCategory}
              />

              <LobbySideBlock
                achievements={ACHIEVEMENTS}
                recordStreak={RECORD_STREAK}
              />
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
