import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import ClickSpark from "../components/Animation/ClickSpark";
import Header from "../components/Header";
import BunnyShopModal from "../components/Bunny/BunnyShopModal";
import {
  BUNNY_SHOP_STORAGE_KEY,
  createDefaultBunnyShopState,
  getBunnyAccessoryParams,
  normalizeBunnyShopState,
} from "../components/Bunny/bunnyShopConfig";
import GroupTitleRibbon from "../components/GroupPage/GroupTitleRibbon";
import GroupOverviewBlock from "../components/GroupPage/GroupOverviewBlock";
import GroupStatsBlock from "../components/GroupPage/GroupStatsBlock";
import GroupNotesBlock from "../components/GroupPage/GroupNotesBlock";
import {
  ExitGroupModal,
  GroupInfoEditorModal,
  MemberInfoModal,
  MemberRemoveConfirmModal,
  SpecialUploadModal,
  TaskEditorModal,
} from "../components/GroupPage/GroupSettings";
import {
  USER,
  MAX_SPECIAL_TASK_FILE_SIZE_BYTES,
  MEMBER_COLOR_STORAGE_KEY,
  NOTES_POLL_INTERVAL_MS,
  getDefaultMemberColors,
  sortCurrentMemberFirst,
  getStoredAuthToken,
  getIsMobileViewport,
  getHabitIdFromLocation,
  getErrorMessage,
  getBackendFileUrl,
  apiRequest,
  apiUploadFile,
  normalizeTaskEditOptions,
  normalizeBackendSpecialTask,
  doesSpecialSubmissionBelongToMember,
  normalizeBackendPage,
  normalizeMemberProfileResponse,
  normalizeLeaveOwnerCandidate,
  extractHabitCreatedDateKey,
  normalizeBackendNote,
  getCalendarRange,
  getAnalyticsRange,
  toPercent,
  normalizeHexColor,
  hexToRgba,
  normalizeUserAvatar,
  BUNNY_MODEL_URL,
  BUNNY_CRY_MODEL_URL,
  BUNNY_NAME,
  getDateKey,
  buildPastDates,
  normalizeStatsResponse
} from "../utils/groupPageUtils.jsx";

import "../styles/global.css";
import "../styles/group.css";

export default function GroupPage({ navigate, userProfile, userAvatar, onPageLoadingChange, pageLoadingRoute }) {
  const pageRef = useRef(null);
  const notesPanelRef = useRef(null);
  const notesRevealRef = useRef(null);
  const settingsRef = useRef(null);
  const dragRef = useRef(null);
  const noteElementsRef = useRef(new Map());
  const notePressRef = useRef(null);
  const notesBoardTapRef = useRef(null);

  const [habitId] = useState(() => getHabitIdFromLocation());
  const authToken = useMemo(
    () => userProfile?.token || userProfile?.jwt || userProfile?.accessToken || getStoredAuthToken(),
    [userProfile?.accessToken, userProfile?.jwt, userProfile?.token]
  );
  const [, setPageStatus] = useState("idle");
  const [pageError, setPageError] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [backendStreakDays, setBackendStreakDays] = useState(null);
  const [calendarDays, setCalendarDays] = useState([]);
  const [weekStatsResponse, setWeekStatsResponse] = useState(null);
  const [monthStatsResponse, setMonthStatsResponse] = useState(null);

  const [groupInfo, setGroupInfo] = useState(() => ({
    name: window.history.state?.groupName || "",
    description: window.history.state?.groupDescription || "",
  }));
  const [groupCode, setGroupCode] = useState(() => window.history.state?.groupCode || "");
  const [userCoins, setUserCoins] = useState(() => userProfile?.coins || USER.coins);
  const [bunnyShopState, setBunnyShopState] = useState(() => {
    const defaultState = createDefaultBunnyShopState(BUNNY_NAME);

    if (typeof window === "undefined") return defaultState;

    try {
      return normalizeBunnyShopState(
        JSON.parse(window.localStorage.getItem(BUNNY_SHOP_STORAGE_KEY) || "null"),
        BUNNY_NAME
      );
    } catch {
      return defaultState;
    }
  });
  const [isBunnyShopOpen, setIsBunnyShopOpen] = useState(false);
  const [membersData, setMembersData] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [selectedFriendId, setSelectedFriendId] = useState("me");
  const [memberColors, setMemberColors] = useState(() => {
    const defaultColors = getDefaultMemberColors();

    if (typeof window === "undefined") return defaultColors;

    try {
      const savedColors = JSON.parse(window.localStorage.getItem(MEMBER_COLOR_STORAGE_KEY) || "{}");

      return Object.fromEntries(
        Object.entries(savedColors).map(([memberId, color]) => [memberId, normalizeHexColor(color)])
      );
    } catch {
      return defaultColors;
    }
  });
  const [draftMemberColors, setDraftMemberColors] = useState(() => memberColors);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
  const [isGroupInfoEditorOpen, setIsGroupInfoEditorOpen] = useState(false);
  const [isMemberInfoOpen, setIsMemberInfoOpen] = useState(false);
  const [memberProfileState, setMemberProfileState] = useState({
    status: "idle",
    data: null,
    error: "",
    fallbackMember: null,
  });
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [exitModalStep, setExitModalStep] = useState("confirm");
  const [exitPreview, setExitPreview] = useState(null);
  const [exitRequestStatus, setExitRequestStatus] = useState("idle");
  const [exitRequestError, setExitRequestError] = useState("");
  const [adminTransferMemberId, setAdminTransferMemberId] = useState("");
  const [adminMemberId, setAdminMemberId] = useState("me");
  const [removedMemberIds] = useState([]);
  const [memberRemoveConfirm, setMemberRemoveConfirm] = useState(null);
  const [specialTask, setSpecialTask] = useState(null);
  const [isSpecialUploadOpen, setIsSpecialUploadOpen] = useState(false);
  const [specialUploadStatus, setSpecialUploadStatus] = useState("idle");
  const [specialUploadError, setSpecialUploadError] = useState("");
  const [specialAwardedCoins, setSpecialAwardedCoins] = useState(0);
  const [isFriendsExpanded, setIsFriendsExpanded] = useState(false);
  const [calendarMode, setCalendarMode] = useState("week");
  const [viewedDate, setViewedDate] = useState(() => new Date());
  const [analyticsOpen, setAnalyticsOpen] = useState({ week: true, month: true });
  const [notes, setNotes] = useState([]);
  const [isNotesPanelVisible, setIsNotesPanelVisible] = useState(false);
  const [notesPanelScale, setNotesPanelScale] = useState(1);
  const [notesMenu, setNotesMenu] = useState(null);
  const [activeNoteMenu, setActiveNoteMenu] = useState(null);
  const [noteEditor, setNoteEditor] = useState(null);
  const [isClearNotesConfirmOpen, setIsClearNotesConfirmOpen] = useState(false);
  const [groupCreatedDateKey, setGroupCreatedDateKey] = useState("");
  const [taskEditorOptions, setTaskEditorOptions] = useState(null);
  const [taskEditorStatus, setTaskEditorStatus] = useState("idle");
  const [taskEditorError, setTaskEditorError] = useState("");
  const [groupInfoEditorData, setGroupInfoEditorData] = useState(null);
  const [groupInfoEditorStatus, setGroupInfoEditorStatus] = useState("idle");
  const [groupInfoEditorError, setGroupInfoEditorError] = useState("");

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const displayUserName = userProfile?.name || USER.name;
  const displayUserEmail = userProfile?.email || USER.email;
  const resolvedUserAvatar = useMemo(
    () => normalizeUserAvatar(userAvatar, displayUserName),
    [displayUserName, userAvatar]
  );
  const displayUserInitials = resolvedUserAvatar.label || USER.initials;

  useLayoutEffect(() => {
    const node = notesPanelRef.current;
    if (!node) return undefined;

    const updateNotesPanelScale = () => {
      const width = node.clientWidth || node.getBoundingClientRect().width || 0;
      const nextScale = width > 0 && width < 360 ? Math.max(0.82, Math.min(1, width / 360)) : 1;
      setNotesPanelScale((prevScale) => {
        const roundedScale = Math.round(nextScale * 1000) / 1000;
        return Math.abs(prevScale - roundedScale) > 0.005 ? roundedScale : prevScale;
      });
    };

    updateNotesPanelScale();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateNotesPanelScale);
      return () => window.removeEventListener("resize", updateNotesPanelScale);
    }

    const observer = new ResizeObserver(updateNotesPanelScale);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateCurrentDate = () => setCurrentDate(new Date());
    const now = new Date();
    const nextMidnight = new Date(now);
    let intervalId = null;

    nextMidnight.setDate(now.getDate() + 1);
    nextMidnight.setHours(0, 0, 1, 0);

    const timeoutId = window.setTimeout(() => {
      updateCurrentDate();
      intervalId = window.setInterval(updateCurrentDate, 24 * 60 * 60 * 1000);
    }, Math.max(1000, nextMidnight.getTime() - now.getTime()));

    return () => {
      window.clearTimeout(timeoutId);

      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  const loadHabitPage = useCallback(async ({ silent = false } = {}) => {
    if (!habitId || !authToken) {
      setPageError(!habitId ? "Не найден habitId для загрузки группы" : "Не найден токен авторизации");
      onPageLoadingChange?.(false, pageLoadingRoute);
      return null;
    }

    if (!silent) {
      onPageLoadingChange?.(true, pageLoadingRoute);
      setPageStatus("loading");
      setPageError("");
    }

    try {
      const data = await apiRequest(`/api/habits/${habitId}/page?date=${getDateKey(currentDate)}`, {
        token: authToken,
      });
      const normalized = normalizeBackendPage(data);
      const nextMembers = normalized.members;
      const nextColors = getDefaultMemberColors(nextMembers);

      setGroupInfo(normalized.groupInfo);
      setGroupCode(normalized.groupCode || "");
      setMembersData(nextMembers);
      setMyTasks(normalized.currentMemberTasks);
      setMemberColors(nextColors);
      setDraftMemberColors(nextColors);
      setIsOwner(normalized.isOwner);
      setAdminMemberId(normalized.ownerMemberUiId || "me");
      setBackendStreakDays(normalized.currentStreak);
      setGroupCreatedDateKey(extractHabitCreatedDateKey(normalized.habit));
      setSpecialTask(normalized.specialTask);
      setSelectedFriendId((prev) =>
        nextMembers.some((member) => member.id === prev) ? prev : normalized.currentMemberUiId || "me"
      );
      setPageStatus("ready");
      setPageError("");

      return normalized;
    } catch (error) {
      const message = getErrorMessage(error);
      setPageStatus("error");
      setPageError(message);
      return null;
    } finally {
      if (!silent) {
        onPageLoadingChange?.(false, pageLoadingRoute);
      }
    }
  }, [authToken, currentDate, habitId, onPageLoadingChange, pageLoadingRoute]);

  const loadCalendar = useCallback(async () => {
    if (!habitId || !authToken) return;

    const { from, to } = getCalendarRange(viewedDate, calendarMode);

    try {
      const data = await apiRequest(`/api/habits/${habitId}/calendar?from=${from}&to=${to}`, {
        token: authToken,
      });

      setCalendarDays(Array.isArray(data?.days) ? data.days : []);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  }, [authToken, calendarMode, habitId, viewedDate]);

  const loadStats = useCallback(async () => {
    if (!habitId || !authToken) return;

    const weekRange = getAnalyticsRange(currentDate, "week", groupCreatedDateKey);
    const monthRange = getAnalyticsRange(currentDate, "month", groupCreatedDateKey);

    try {
      const [weekData, monthData] = await Promise.all([
        apiRequest(`/api/habits/${habitId}/stats?from=${weekRange.from}&to=${weekRange.to}`, {
          token: authToken,
        }),
        apiRequest(`/api/habits/${habitId}/stats?from=${monthRange.from}&to=${monthRange.to}`, {
          token: authToken,
        }),
      ]);

      setWeekStatsResponse(weekData);
      setMonthStatsResponse(monthData);
    } catch (error) {
      setPageError(getErrorMessage(error));
      setWeekStatsResponse(null);
      setMonthStatsResponse(null);
    }
  }, [authToken, currentDate, groupCreatedDateKey, habitId]);

  const loadNotes = useCallback(async () => {
    if (!habitId || !authToken) return;

    try {
      const data = await apiRequest(`/api/habits/${habitId}/notes`, { token: authToken });
      setNotes(Array.isArray(data?.notes) ? data.notes.map(normalizeBackendNote) : []);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  }, [authToken, habitId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHabitPage();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadHabitPage]);

  useEffect(() => () => {
    onPageLoadingChange?.(false, pageLoadingRoute);
  }, [onPageLoadingChange, pageLoadingRoute]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCalendar();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadCalendar]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadStats();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadStats]);

  useEffect(() => {
    if (!habitId || !authToken) return undefined;

    const timeoutId = window.setTimeout(() => {
      void loadNotes();
    }, 0);

    const intervalId = window.setInterval(() => {
      void loadNotes();
    }, NOTES_POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [authToken, habitId, loadNotes]);

  const activeFriendsData = useMemo(
    () => sortCurrentMemberFirst(membersData.filter((friend) => !removedMemberIds.includes(friend.id))),
    [membersData, removedMemberIds]
  );


  const friendsWithColors = useMemo(
    () =>
      activeFriendsData.map((friend) => {
        const fallbackAvatar = {
          id: `${friend.id}-avatar`,
          type: "monogram",
          label: friend.initials,
          color: friend.avatarColor || friend.color,
        };
        const friendAvatar = friend.id === "me"
          ? (userAvatar ? resolvedUserAvatar : friend.avatar || resolvedUserAvatar)
          : friend.avatar || fallbackAvatar;

        return {
          ...friend,
          name: friend.id === "me" ? (userProfile?.name || friend.name || displayUserName) : friend.name,
          email: friend.id === "me" ? (userProfile?.email || friend.email || displayUserEmail) : friend.email,
          initials: friend.id === "me" ? (friendAvatar.label || friend.initials || displayUserInitials) : friend.initials,
          avatar: friendAvatar,
          avatarColor: friendAvatar.color || friend.avatarColor || friend.color,
          color: memberColors[friend.id] || friend.color,
        };
      }),
    [activeFriendsData, displayUserEmail, displayUserInitials, displayUserName, memberColors, resolvedUserAvatar, userAvatar, userProfile?.email, userProfile?.name]
  );

  const selectedFriend = useMemo(
    () =>
      friendsWithColors.find((friend) => friend.id === selectedFriendId) ||
      friendsWithColors[0] ||
      {
        id: "",
        name: "Участник",
        email: "",
        initials: "П",
        color: USER.avatarColor,
        avatarColor: USER.avatarColor,
        avatar: { id: "empty-avatar", type: "monogram", label: "П", color: USER.avatarColor },
        tasks: [],
      },
    [friendsWithColors, selectedFriendId]
  );

  const visibleTasks = selectedFriendId === "me" ? myTasks : selectedFriend?.tasks || [];

  const settingsMembers = useMemo(
    () =>
      friendsWithColors.map((member) => ({
        ...member,
        color: normalizeHexColor(draftMemberColors[member.id], member.color),
      })),
    [draftMemberColors, friendsWithColors]
  );

  const hasUnsavedMemberColors = useMemo(
    () =>
      activeFriendsData.some((friend) =>
        normalizeHexColor(draftMemberColors[friend.id], friend.color) !==
        normalizeHexColor(memberColors[friend.id], friend.color)
      ),
    [activeFriendsData, draftMemberColors, memberColors]
  );

  const groupStats = useMemo(() => {
    const members = friendsWithColors.map((friend) => {
      const memberTasks = friend.id === "me" ? myTasks : friend.tasks;
      const completed = memberTasks.filter((task) => task.done).length;

      return {
        id: friend.id,
        name: friend.name,
        completed,
        total: memberTasks.length,
      };
    });

    const completed = members.reduce((sum, member) => sum + member.completed, 0);
    const total = members.reduce((sum, member) => sum + member.total, 0);

    return {
      members,
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [friendsWithColors, myTasks]);

  const streakDays = backendStreakDays ?? 0;

  const selectedMemberStats = useMemo(
    () =>
      groupStats.members.find((member) => member.id === selectedFriendId) ||
      groupStats.members[0] ||
      { id: "", name: "Участник", completed: 0, total: 0 },
    [groupStats.members, selectedFriendId]
  );

  const selectedSpecialTask = useMemo(() => {
    if (!specialTask) return null;

    const submission =
      selectedFriendId === "me"
        ? specialTask.mySubmission
        : specialTask.submissions.find((item) => doesSpecialSubmissionBelongToMember(item, selectedFriend));

    return {
      ...specialTask,
      done: selectedFriendId === "me" ? specialTask.isSubmittedByMe : Boolean(submission),
      photo: getBackendFileUrl(submission?.file),
      submission,
    };
  }, [selectedFriend, selectedFriendId, specialTask]);

  const requiredProgressTasks = useMemo(
    () => myTasks.filter((task) => task.type !== "special"),
    [myTasks]
  );

  const shouldShowCryBunny = useMemo(
    () =>
      requiredProgressTasks.length > 0 &&
      requiredProgressTasks.every((task) => !task.done),
    [requiredProgressTasks]
  );

  const shouldShowHappyBunny = useMemo(
    () =>
      requiredProgressTasks.length > 0 &&
      requiredProgressTasks.every((task) => task.done),
    [requiredProgressTasks]
  );

  const activeBunnyModelUrl = shouldShowCryBunny ? BUNNY_CRY_MODEL_URL : BUNNY_MODEL_URL;
  const activeBunnyAnimationMode = shouldShowCryBunny ? "cry" : "idle";
  const bunnyAccessoryParams = useMemo(
    () => getBunnyAccessoryParams(bunnyShopState.equippedItems),
    [bunnyShopState.equippedItems]
  );
  const activeBunnyAccessoryParams = shouldShowCryBunny ? null : bunnyAccessoryParams;

  const adminTransferMembers = useMemo(
    () => friendsWithColors.filter((member) => member.id !== "me"),
    [friendsWithColors]
  );

  const previewAdminTransferMembers = useMemo(
    () =>
      Array.isArray(exitPreview?.newOwnerCandidates)
        ? exitPreview.newOwnerCandidates.map(normalizeLeaveOwnerCandidate)
        : [],
    [exitPreview]
  );

  const exitTransferMembers = useMemo(
    () =>
      exitPreview?.mode === "transfer_owner_before_leave"
        ? previewAdminTransferMembers
        : adminTransferMembers,
    [adminTransferMembers, exitPreview?.mode, previewAdminTransferMembers]
  );

  const activeAdminTransferMemberId = useMemo(() => {
    if (exitTransferMembers.some((member) => member.id === adminTransferMemberId)) {
      return adminTransferMemberId;
    }

    return exitTransferMembers[0]?.id || "";
  }, [adminTransferMemberId, exitTransferMembers]);

  const weekAnalyticsData = useMemo(
    () =>
      weekStatsResponse
        ? normalizeStatsResponse(weekStatsResponse, friendsWithColors)
        : { dates: buildPastDates(7, currentDate), datasets: [], maxTasks: 1 },
    [currentDate, friendsWithColors, weekStatsResponse]
  );

  const monthAnalyticsData = useMemo(
    () =>
      monthStatsResponse
        ? normalizeStatsResponse(monthStatsResponse, friendsWithColors)
        : { dates: buildPastDates(30, currentDate), datasets: [], maxTasks: 1 },
    [currentDate, friendsWithColors, monthStatsResponse]
  );

  const selectedMemberColor = selectedFriend?.color || USER.avatarColor;
  const selectedMemberColorSoft = hexToRgba(selectedMemberColor, 0.22);

  const isSoloGroup = friendsWithColors.length <= 1;

  const overviewTitle = isSoloGroup ? "Личный прогресс" : "Прогресс группы";

  const overviewDescription = isSoloGroup
    ? "Отмечай задания, заполняй шкалу и следи за настроением питомца. Нажми на зайчика, чтобы приодеть его, сменить имя или фон."
    : "Отмечайте задания вместе, следите за прогрессом друзей и их достижениями, нажав на икноку профиля. Общий прогресс влияет на настроение питомца. Нажми на зайчика, чтобы приодеть его, сменить имя или фон.";
  
  const rhythmTitle = isSoloGroup ? "Личный ритм" : "Ритм группы";

  const rhythmDescription = isSoloGroup
    ? "Здесь хранится история твоего прогресса. Зелёный день означает, что все задания выполнены, красный означает, что задания не были выполнены и серия потеряна. В статистике можно посмотреть, сколько заданий было сделано по дням."
    : "Здесь хранится история совместного прогресса. Зелёный день означает, что группа хорошо справилась со всеми заданиями, красный означает, что кто-то не выполнил ни одного задания и серия была потеряна. В статистике можно посмотреть, сколько заданий сделали участники по дням.";
   
  const notesDescription = isSoloGroup
  ? "Щёлкни правой кнопкой по панели, чтобы оставить заметку для себя. Заметку можно перетаскивать по полю, удерживая её левой кнопкой мыши. Когда пригласишь друзей, они тоже смогут её видеть :)."
  : "Щёлкни правой кнопкой по панели, чтобы оставить заметку для себя или друга. Участники группы её увидят, а саму заметку можно перетаскивать по полю левой кнопкой мыши.";
  
  const handleOpenBunnyShop = () => {
    setIsBunnyShopOpen(true);
  };

  const handleBunnyShopKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    setIsBunnyShopOpen(true);
  };

  const spendBunnyCoins = (cost) => {
    setUserCoins((prevCoins) => Math.max(0, prevCoins - cost));
  };

  const handleBuyBunnyName = (nextName, cost) => {
    if (userCoins < cost) return;

    spendBunnyCoins(cost);
    setBunnyShopState((prev) => ({
      ...prev,
      name: nextName,
    }));
  };

  const handleBuyBunnyBackground = (nextColor, cost) => {
    if (userCoins < cost) return;

    spendBunnyCoins(cost);
    setBunnyShopState((prev) => ({
      ...prev,
      backgroundColor: nextColor,
    }));
  };

  const handleBuyBunnyItem = (section, item) => {
    if (!section || !item || userCoins < item.price) return;

    spendBunnyCoins(item.price);
    setBunnyShopState((prev) => ({
      ...prev,
      purchasedItemIds: prev.purchasedItemIds.includes(item.id)
        ? prev.purchasedItemIds
        : [...prev.purchasedItemIds, item.id],
    }));
  };

  const handleEquipBunnyItem = (section, item) => {
    if (!section || !item) return;

    setBunnyShopState((prev) => {
      if (!prev.purchasedItemIds.includes(item.id)) return prev;

      return {
        ...prev,
        equippedItems: {
          ...prev.equippedItems,
          [section.id]: item.id,
        },
      };
    });
  };

  const handleUnequipBunnyCategory = (sectionId) => {
    setBunnyShopState((prev) => ({
      ...prev,
      equippedItems: {
        ...prev.equippedItems,
        [sectionId]: null,
      },
    }));
  };

  const handleMemberColorChange = (memberId, nextColor) => {
    const memberFallback = activeFriendsData.find((friend) => friend.id === memberId)?.color || "#d8cde3";
    const safeColor = normalizeHexColor(nextColor, memberFallback);

    setDraftMemberColors((prev) => ({
      ...prev,
      [memberId]: safeColor,
    }));
  };

  const handleToggleGroupSettings = () => {
    if (isGroupSettingsOpen) {
      setIsGroupSettingsOpen(false);
      return;
    }

    setDraftMemberColors(memberColors);
    setIsGroupSettingsOpen(true);
  };

  const handleSaveMemberColors = async () => {
    const nextColors = activeFriendsData.reduce((colors, friend) => {
      colors[friend.id] = normalizeHexColor(draftMemberColors[friend.id], memberColors[friend.id] || friend.color);
      return colors;
    }, {});

    if (!habitId || !authToken) {
      setPageError(!habitId ? "Не найден habitId для сохранения цвета" : "Не найден токен авторизации");
      return;
    }

    try {
      await apiRequest(`/api/habits/${habitId}/member-colors`, {
        method: "PATCH",
        token: authToken,
        body: {
          colors: activeFriendsData.map((friend) => ({
            targetUserId: friend.userId,
            color: nextColors[friend.id],
          })),
        },
      });

      setMemberColors(nextColors);
      setDraftMemberColors(nextColors);
      await loadHabitPage({ silent: true });
      await loadStats();
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  };

  const handleRequestRemoveMember = (member) => {
    if (!member || member.id === "me") return;

    setMemberRemoveConfirm(member);
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberRemoveConfirm || memberRemoveConfirm.id === "me") return;

    if (!habitId || !authToken || !memberRemoveConfirm.backendMemberId) {
      setPageError("Не хватает данных для удаления участника через backend");
      return;
    }

    try {
      await apiRequest(`/api/habits/${habitId}/members/${memberRemoveConfirm.backendMemberId}/remove`, {
        method: "PATCH",
        token: authToken,
      });

      setMemberRemoveConfirm(null);
      setIsGroupSettingsOpen(false);
      await loadHabitPage({ silent: true });
      await loadCalendar();
      await loadStats();
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  };

  const handleOpenTaskEditor = async () => {
    setIsGroupSettingsOpen(false);
    setTaskEditorOptions(null);
    setTaskEditorError("");
    setTaskEditorStatus("loading");
    setIsTaskEditorOpen(true);

    if (!habitId || !authToken) {
      const message = !habitId ? "Не найден habitId для изменения заданий" : "Не найден токен авторизации";
      setTaskEditorStatus("error");
      setTaskEditorError(message);
      setPageError(message);
      return;
    }

    try {
      const data = await apiRequest(`/api/habits/${habitId}/tasks/me/edit-options`, {
        token: authToken,
      });

      setTaskEditorOptions(normalizeTaskEditOptions(data));
      setTaskEditorStatus("ready");
      setTaskEditorError("");
    } catch (error) {
      const message = getErrorMessage(error);
      setTaskEditorStatus("error");
      setTaskEditorError(message);
      setPageError(message);
    }
  };

  const handleSaveMyTasks = async (requestBody) => {
    if (!habitId || !authToken) {
      const message = !habitId ? "Не найден habitId для сохранения заданий" : "Не найден токен авторизации";
      setTaskEditorStatus("error");
      setTaskEditorError(message);
      setPageError(message);
      return;
    }

    try {
      setTaskEditorStatus("saving");
      setTaskEditorError("");

      await apiRequest(`/api/habits/${habitId}/tasks/me`, {
        method: "PUT",
        token: authToken,
        body: requestBody,
      });

      setIsTaskEditorOpen(false);
      setTaskEditorOptions(null);
      setTaskEditorStatus("idle");
      await loadHabitPage({ silent: true });
      await loadCalendar();
      await loadStats();
    } catch (error) {
      const message = getErrorMessage(error);
      setTaskEditorStatus("ready");
      setTaskEditorError(message);
      setPageError(message);
    }
  };

  const handleOpenGroupInfoEditor = async () => {
    if (!isOwner) return;

    setIsGroupSettingsOpen(false);
    setGroupInfoEditorData(null);
    setGroupInfoEditorError("");
    setGroupInfoEditorStatus("loading");
    setIsGroupInfoEditorOpen(true);

    if (!habitId || !authToken) {
      const message = !habitId ? "Не найден habitId для изменения группы" : "Не найден токен авторизации";
      setGroupInfoEditorStatus("error");
      setGroupInfoEditorError(message);
      setPageError(message);
      return;
    }

    try {
      const data = await apiRequest(`/api/habits/${habitId}/details/edit-options`, {
        token: authToken,
      });

      setGroupInfoEditorData(data?.habit || null);
      setGroupInfoEditorStatus("ready");
      setGroupInfoEditorError("");
    } catch (error) {
      const message = getErrorMessage(error);
      setGroupInfoEditorStatus("error");
      setGroupInfoEditorError(message);
      setPageError(message);
    }
  };

  const handleCloseMemberInfo = () => {
    setIsMemberInfoOpen(false);
    setMemberProfileState({
      status: "idle",
      data: null,
      error: "",
      fallbackMember: null,
    });
  };

  const handleOpenSelectedMemberInfo = async () => {
    if (selectedFriendId === "me") return;

    const targetMember = selectedFriend;
    const backendMemberId = targetMember?.backendMemberId || targetMember?.id;

    setIsMemberInfoOpen(true);
    setMemberProfileState({
      status: "loading",
      data: null,
      error: "",
      fallbackMember: targetMember,
    });

    if (!habitId || !authToken || !backendMemberId) {
      setMemberProfileState({
        status: "error",
        data: null,
        error: !habitId
          ? "Не найден habitId для загрузки профиля участника"
          : !authToken
            ? "Не найден токен авторизации"
            : "Не найден memberId участника",
        fallbackMember: targetMember,
      });
      return;
    }

    try {
      const data = await apiRequest(`/api/habits/${habitId}/members/${backendMemberId}/profile`, {
        token: authToken,
      });

      setMemberProfileState({
        status: "ready",
        data: normalizeMemberProfileResponse(data, targetMember, groupInfo),
        error: "",
        fallbackMember: targetMember,
      });
    } catch (error) {
      setMemberProfileState({
        status: "error",
        data: null,
        error: getErrorMessage(error, "Не удалось загрузить профиль участника"),
        fallbackMember: targetMember,
      });
    }
  };

  const handleSaveGroupInfo = async (nextInfo) => {
    if (!habitId || !authToken) {
      const message = !habitId ? "Не найден habitId для сохранения группы" : "Не найден токен авторизации";
      setGroupInfoEditorStatus("error");
      setGroupInfoEditorError(message);
      setPageError(message);
      return;
    }

    try {
      setGroupInfoEditorStatus("saving");
      setGroupInfoEditorError("");

      await apiRequest(`/api/habits/${habitId}/details`, {
        method: "PUT",
        token: authToken,
        body: {
          title: nextInfo.title,
          description: nextInfo.description,
        },
      });

      setIsGroupInfoEditorOpen(false);
      setGroupInfoEditorData(null);
      setGroupInfoEditorStatus("idle");
      await loadHabitPage({ silent: true });
    } catch (error) {
      const message = getErrorMessage(error);
      setGroupInfoEditorStatus("ready");
      setGroupInfoEditorError(message);
      setPageError(message);
    }
  };

  const handleRequestExitGroup = async () => {
    setIsGroupSettingsOpen(false);
    setIsExitConfirmOpen(false);
    setExitModalStep("confirm");
    setExitPreview(null);
    setExitRequestError("");
    setExitRequestStatus("loading");

    if (!habitId || !authToken) {
      const message = !habitId
        ? "Не найден habitId для выхода из группы"
        : "Не найден токен авторизации";

      setExitRequestError(message);
      setExitRequestStatus("error");
      setIsExitConfirmOpen(true);
      setPageError(message);
      return;
    }

    try {
      const preview = await apiRequest(`/api/habits/${habitId}/leave-preview`, {
        token: authToken,
      });
      const candidates = Array.isArray(preview?.newOwnerCandidates)
        ? preview.newOwnerCandidates.map(normalizeLeaveOwnerCandidate)
        : [];

      setExitPreview(preview);
      setExitModalStep(preview?.mode === "transfer_owner_before_leave" ? "transfer" : "confirm");
      setAdminTransferMemberId(candidates[0]?.id || "");
      setExitRequestStatus("ready");
      setExitRequestError("");
      setIsExitConfirmOpen(true);
    } catch (error) {
      const message = getErrorMessage(error);

      setExitRequestError(message);
      setExitRequestStatus("error");
      setIsExitConfirmOpen(true);
      setPageError(message);
    }
  };

  const closeExitConfirm = () => {
    if (exitRequestStatus === "submitting") return;

    setIsExitConfirmOpen(false);
    setExitModalStep("confirm");
    setExitPreview(null);
    setExitRequestStatus("idle");
    setExitRequestError("");
  };

  const leaveGroup = async (body = {}) => {
    if (!habitId || !authToken) {
      const message = !habitId ? "Не найден habitId для выхода из группы" : "Не найден токен авторизации";

      setExitRequestError(message);
      setExitRequestStatus("error");
      setPageError(message);
      return;
    }

    try {
      setExitRequestStatus("submitting");
      setExitRequestError("");

      await apiRequest(`/api/habits/${habitId}/leave`, {
        method: "POST",
        token: authToken,
        body,
      });

      window.dispatchEvent(new CustomEvent("habits:changed"));
      setIsExitConfirmOpen(false);
      setExitModalStep("confirm");
      setExitPreview(null);
      setExitRequestStatus("idle");
      setIsGroupSettingsOpen(false);
      navigate?.("/lobby");
    } catch (error) {
      const message = getErrorMessage(error);

      setExitRequestError(message);
      setExitRequestStatus("error");
      setPageError(message);
    }
  };

  const handleConfirmExitGroup = async () => {
    if (exitRequestStatus === "loading" || exitRequestStatus === "submitting") return;

    const mode = exitPreview?.mode;

    if (mode === "delete_habit_on_leave") {
      await leaveGroup({ confirmDeleteHabit: true });
      return;
    }

    if (mode === "transfer_owner_before_leave" || exitModalStep === "transfer") {
      const newOwner = exitTransferMembers.find((member) => member.id === activeAdminTransferMemberId);

      if (!newOwner?.backendMemberId) {
        const message = "Нужно выбрать нового владельца группы";

        setExitRequestError(message);
        setPageError(message);
        return;
      }

      await leaveGroup({ newOwnerMemberId: newOwner.backendMemberId });
      return;
    }

    await leaveGroup({});
  };

  const handleToggleTask = async (taskId) => {
    if (selectedFriendId !== "me") return;

    const currentTask = myTasks.find((task) => task.id === taskId);
    if (!currentTask) return;

    const wasDone = Boolean(currentTask.done);

    setMyTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task))
    );

    if (!habitId || !authToken) return;

    try {
      await apiRequest(`/api/habits/${habitId}/tasks/${currentTask.backendTaskId || currentTask.id}/complete`, {
        method: wasDone ? "DELETE" : "POST",
        token: authToken,
        body: { date: getDateKey(currentDate) },
      });

      await loadHabitPage({ silent: true });
      await loadCalendar();
      await loadStats();
    } catch (error) {
      setMyTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, done: wasDone } : task))
      );
      setPageError(getErrorMessage(error));
    }
  };

  const handleOpenSpecialUpload = () => {
    if (!specialTask || selectedFriendId !== "me") return;

    setSpecialUploadError("");
    setSpecialAwardedCoins(0);
    setIsSpecialUploadOpen(true);
  };

  const handleCloseSpecialUpload = () => {
    if (specialUploadStatus === "submitting") return;

    setIsSpecialUploadOpen(false);
    setSpecialUploadError("");
  };

  const handleSpecialPhoto = async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    if (!specialTask?.id) {
      setSpecialUploadError("Особое задание не найдено");
      input.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSpecialUploadError("Для особого задания нужно прикрепить изображение");
      input.value = "";
      return;
    }

    if (file.size > MAX_SPECIAL_TASK_FILE_SIZE_BYTES) {
      setSpecialUploadError("Размер файла не должен превышать 5 МБ");
      input.value = "";
      return;
    }

    setSpecialUploadStatus("submitting");
    setSpecialUploadError("");
    setSpecialAwardedCoins(0);

    try {
      const uploadData = await apiUploadFile("/api/files/upload", {
        token: authToken,
        file,
      });
      const fileId = uploadData?.file?.id;

      if (!fileId) {
        throw new Error("Сервер не вернул id загруженного файла");
      }

      const submissionData = await apiRequest(
        `/api/habits/${habitId}/special-tasks/${specialTask.id}/submission`,
        {
          method: "PUT",
          token: authToken,
          body: { fileId },
        }
      );

      const nextSpecialTask = normalizeBackendSpecialTask(submissionData?.specialTask);
      const awardedCoins = Number(submissionData?.awardedCoins || 0);

      if (nextSpecialTask) {
        setSpecialTask(nextSpecialTask);
      } else {
        await loadHabitPage({ silent: true });
      }

      if (submissionData?.coinsAwarded && awardedCoins > 0) {
        setUserCoins((prevCoins) => prevCoins + awardedCoins);
        setSpecialAwardedCoins(awardedCoins);
      }

      setIsSpecialUploadOpen(false);
    } catch (error) {
      setSpecialUploadError(getErrorMessage(error));
    } finally {
      setSpecialUploadStatus("idle");
      input.value = "";
    }
  };

  const getBoardMenuPoint = (event, menuWidth = 230, menuHeight = 96) => {
    const rect = notesPanelRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const margin = 12;
    const cursorOffset = 10;
    const rawX = event.clientX - rect.left + cursorOffset;
    const rawY = event.clientY - rect.top + cursorOffset;
    const maxX = Math.max(margin, rect.width - menuWidth - margin);
    const maxY = Math.max(margin, rect.height - menuHeight - margin);

    return {
      x: Math.min(Math.max(rawX, margin), maxX),
      y: Math.min(Math.max(rawY, margin), maxY),
      boardX: Math.min(Math.max(event.clientX - rect.left, 16), Math.max(16, rect.width - 190)),
      boardY: Math.min(Math.max(event.clientY - rect.top, 16), Math.max(16, rect.height - 140)),
    };
  };

  const handleNotesBoardContextMenu = (event) => {
    event.preventDefault();

    if (getIsMobileViewport()) return;

    const clickedUi = event.target.closest(
      "button, a, input, textarea, label, [data-note-ui='true'], [data-note-item='true']"
    );

    if (clickedUi || isSpecialUploadOpen || noteEditor) return;

    const point = getBoardMenuPoint(event, 230, notes.length > 0 ? 106 : 58);
    if (!point) return;

    setActiveNoteMenu(null);
    setNotesMenu({
      x: point.x,
      y: point.y,
      boardX: point.boardX,
      boardY: point.boardY,
    });
  };

  const handleNotesBoardPointerDown = (event) => {
    if (!getIsMobileViewport() || event.pointerType === "mouse") return;

    const clickedUi = event.target.closest(
      "button, a, input, textarea, label, [data-note-ui='true'], [data-note-item='true']"
    );

    if (clickedUi || isSpecialUploadOpen || noteEditor) {
      notesBoardTapRef.current = null;
      return;
    }

    notesBoardTapRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };
  };

  const handleNotesBoardPointerUp = (event) => {
    const boardTap = notesBoardTapRef.current;
    notesBoardTapRef.current = null;

    if (!boardTap || boardTap.pointerId !== event.pointerId) return;
    if (!getIsMobileViewport() || event.pointerType === "mouse") return;

    const movedDistance = Math.hypot(event.clientX - boardTap.clientX, event.clientY - boardTap.clientY);
    if (movedDistance > 10) return;

    const clickedUi = event.target.closest(
      "button, a, input, textarea, label, [data-note-ui='true'], [data-note-item='true']"
    );

    if (clickedUi || isSpecialUploadOpen || noteEditor) return;

    const point = getBoardMenuPoint(event, 230, 58);
    if (!point) return;

    setNotesMenu(null);
    setActiveNoteMenu(null);
    setNoteEditor({
      x: point.boardX,
      y: point.boardY,
      text: "",
    });
  };

  const openNoteEditor = () => {
    if (!notesMenu) return;

    setNoteEditor({
      x: notesMenu.boardX,
      y: notesMenu.boardY,
      text: "",
    });
    setNotesMenu(null);
  };

  const requestClearNotes = () => {
    setNotesMenu(null);
    setActiveNoteMenu(null);
    setIsClearNotesConfirmOpen(true);
  };

  const confirmClearNotes = async () => {
    if (!habitId || !authToken) {
      setPageError(!habitId ? "Не найден habitId для очистки заметок" : "Не найден токен авторизации");
      return;
    }

    try {
      await apiRequest(`/api/habits/${habitId}/notes`, {
        method: "DELETE",
        token: authToken,
      });
      await loadNotes();
    } catch (error) {
      setPageError(getErrorMessage(error));
      return;
    }

    setNotesMenu(null);
    setActiveNoteMenu(null);
    setIsClearNotesConfirmOpen(false);
  };

  const saveNote = async () => {
    if (!noteEditor || !noteEditor.text.trim()) {
      setNoteEditor(null);
      return;
    }

    const rect = notesPanelRef.current?.getBoundingClientRect();
    const boardWidth = rect?.width || 800;
    const boardHeight = rect?.height || 520;
    const nextX = Math.min(Math.max(noteEditor.x - 76, 12), Math.max(12, boardWidth - 190));
    const nextY = Math.min(Math.max(noteEditor.y - 24, 12), Math.max(12, boardHeight - 130));
    const content = noteEditor.text.trim().slice(0, 200);

    if (!habitId || !authToken) {
      setPageError(!habitId ? "Не найден habitId для создания заметки" : "Не найден токен авторизации");
      return;
    }

    try {
      await apiRequest(`/api/habits/${habitId}/notes`, {
        method: "POST",
        token: authToken,
        body: {
          content,
          pinXPercent: toPercent(nextX, boardWidth),
          pinYPercent: toPercent(nextY, boardHeight),
        },
      });

      setNoteEditor(null);
      await loadNotes();
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  };

  const openNoteActions = (event, noteId) => {
    event.preventDefault();
    event.stopPropagation();

    const note = notes.find((item) => item.id === noteId);
    if (!note) return;

    const point = getBoardMenuPoint(event, 230, 58);
    if (!point) return;

    setNotesMenu(null);
    setActiveNoteMenu({
      id: noteId,
      x: point.x,
      y: point.y,
    });
  };

  const deleteNote = async () => {
    if (!activeNoteMenu) return;

    const note = notes.find((item) => item.id === activeNoteMenu.id);

    if (!habitId || !authToken || !note?.backendNoteId) {
      setPageError("Не хватает данных для удаления заметки через backend");
      return;
    }

    try {
      await apiRequest(`/api/habits/${habitId}/notes/${note.backendNoteId}`, {
        method: "DELETE",
        token: authToken,
      });
      setActiveNoteMenu(null);
      await loadNotes();
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  };

  const clearNotePress = useCallback(() => {
    if (notePressRef.current?.timerId) {
      window.clearTimeout(notePressRef.current.timerId);
    }

    notePressRef.current = null;
  }, []);

  const onDrag = useCallback((event) => {
    const activeDrag = dragRef.current;
    if (!activeDrag) return;
    if (event.cancelable) event.preventDefault();

    const { rect, offsetX, offsetY, originX, originY, lastClientX, lastClientY } = activeDrag;
    const noteWidth = window.innerWidth <= 760 ? 150 : 200;
    const noteMinHeight = 26;
    const nextX = Math.max(10, Math.min(rect.width - noteWidth + 160, event.clientX - rect.left - offsetX));
    const nextY = Math.max(10, Math.min(rect.height - noteMinHeight - 10, event.clientY - rect.top - offsetY));
    const pinXPercent = toPercent(nextX, rect.width);
    const pinYPercent = toPercent(nextY, rect.height);

    activeDrag.nextX = nextX;
    activeDrag.nextY = nextY;
    activeDrag.pinXPercent = pinXPercent;
    activeDrag.pinYPercent = pinYPercent;

    const movementX = event.clientX - lastClientX;
    const movementY = event.clientY - lastClientY;
    const movementPower = Math.min(1, Math.hypot(movementX, movementY) / 10);

    const currentTilt = activeDrag.currentTilt || 0;
    const currentPeelX = activeDrag.currentPeelX || 0;
    const currentPeelY = activeDrag.currentPeelY || 0;

    const targetTilt =
      Math.abs(movementX) < 0.15
        ? currentTilt * 0.9
        : Math.max(-8, Math.min(8, Math.sign(movementX) * (2.2 + movementPower * 5.8)));

    const targetPeelX = Math.max(-5, Math.min(5, movementX * 0.18));
    const targetPeelY = Math.max(-5, Math.min(5, movementY * 0.18));

    const tilt = currentTilt + (targetTilt - currentTilt) * 0.22;
    const peelX = currentPeelX + (targetPeelX - currentPeelX) * 0.2;
    const peelY = currentPeelY + (targetPeelY - currentPeelY) * 0.2;

    activeDrag.currentTilt = tilt;
    activeDrag.currentPeelX = peelX;
    activeDrag.currentPeelY = peelY;
    activeDrag.lastClientX = event.clientX;
    activeDrag.lastClientY = event.clientY;
    activeDrag.visualTranslateX = nextX - originX + peelX;
    activeDrag.visualTranslateY = nextY - originY + peelY;

    if (activeDrag.animationFrameId) return;

    activeDrag.animationFrameId = window.requestAnimationFrame(() => {
      const currentDrag = dragRef.current;
      if (!currentDrag) return;

      currentDrag.animationFrameId = null;

      const noteElement = noteElementsRef.current.get(currentDrag.id);
      if (!noteElement) return;

      noteElement.style.transform = `translate(${currentDrag.visualTranslateX}px, ${currentDrag.visualTranslateY}px) rotate(${currentDrag.currentTilt}deg) scale(var(--note-scale, 1))`;
    });
  }, []);

  const stopDrag = useCallback(async () => {
    const activeDrag = dragRef.current;
    if (!activeDrag) return;

    const {
      id,
      backendNoteId,
      nextX,
      nextY,
      pinXPercent,
      pinYPercent,
      animationFrameId,
    } = activeDrag;

    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
    }

    const noteElement = noteElementsRef.current.get(id);
    if (noteElement && typeof nextX === "number" && typeof nextY === "number") {
      noteElement.style.transition = "none";
      noteElement.style.left = `${nextX}px`;
      noteElement.style.top = `${nextY}px`;
      noteElement.style.transform = "translate(0px, 0px) rotate(0deg) scale(var(--note-scale, 1))";
      noteElement.style.zIndex = "";
    }

    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? { ...note, x: nextX, y: nextY, pinXPercent, pinYPercent, dragging: false, tilt: 0, peelX: 0, peelY: 0 }
          : note
      )
    );

    if (noteElement) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          noteElement.style.transition = "";
          noteElement.style.transform = "";
        });
      });
    }

    dragRef.current = null;
    clearNotePress();
    window.removeEventListener("mousemove", onDrag);
    window.removeEventListener("pointermove", onDrag);

    if (habitId && authToken && backendNoteId && typeof pinXPercent === "number" && typeof pinYPercent === "number") {
      try {
        await apiRequest(`/api/habits/${habitId}/notes/${backendNoteId}`, {
          method: "PATCH",
          token: authToken,
          body: { pinXPercent, pinYPercent, bringToFront: true },
        });
      } catch (error) {
        setPageError(getErrorMessage(error));
      }
    }
  }, [authToken, clearNotePress, habitId, onDrag]);

  const startDrag = (event, noteId, { usePointerEvents = false } = {}) => {
    if (event.button !== undefined && event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    const note = notes.find((item) => item.id === noteId);
    const rect = notesPanelRef.current?.getBoundingClientRect();
    if (!note || !rect) return;

    const noteX = typeof note.x === "number" ? note.x : (rect.width * Number(note.pinXPercent || 0)) / 100;
    const noteY = typeof note.y === "number" ? note.y : (rect.height * Number(note.pinYPercent || 0)) / 100;

    dragRef.current = {
      id: noteId,
      backendNoteId: note.backendNoteId,
      rect,
      offsetX: event.clientX - rect.left - noteX,
      offsetY: event.clientY - rect.top - noteY,
      originX: noteX,
      originY: noteY,
      nextX: noteX,
      nextY: noteY,
      visualTranslateX: 0,
      visualTranslateY: -2,
      animationFrameId: null,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      pinXPercent: Number(note.pinXPercent || 0),
      pinYPercent: Number(note.pinYPercent || 0),
      currentTilt: -2,
      currentPeelX: 0,
      currentPeelY: -2,
    };

    const noteElement = noteElementsRef.current.get(noteId);
    if (noteElement) {
      noteElement.style.zIndex = "200";
      noteElement.style.transform = "translate(0px, -2px) rotate(-2deg) scale(var(--note-scale, 1))";
    }

    setActiveNoteMenu(null);
    setNotes((prev) =>
      prev.map((item) =>
        item.id === noteId
          ? { ...item, dragging: true, tilt: -2, peelX: 0, peelY: -2 }
          : item
      )
    );
    if (usePointerEvents) {
      window.addEventListener("pointermove", onDrag, { passive: false });
      window.addEventListener("pointerup", stopDrag, { once: true });
      window.addEventListener("pointercancel", stopDrag, { once: true });
      return;
    }

    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", stopDrag, { once: true });
  };

  const handleNoteMouseDown = (event, noteId) => {
    if (getIsMobileViewport()) return;
    startDrag(event, noteId);
  };

  const startNotePointerPress = (event, noteId) => {
    if (event.pointerType === "mouse") return;
    if (!getIsMobileViewport()) return;

    event.preventDefault();
    event.stopPropagation();
    clearNotePress();

    const pressData = {
      pointerId: event.pointerId,
      noteId,
      clientX: event.clientX,
      clientY: event.clientY,
      pointerType: event.pointerType,
    };

    notePressRef.current = {
      ...pressData,
      timerId: window.setTimeout(() => {
        const activePress = notePressRef.current;
        if (!activePress || activePress.pointerId !== pressData.pointerId || activePress.noteId !== noteId) return;

        startDrag(
          {
            button: 0,
            clientX: pressData.clientX,
            clientY: pressData.clientY,
            pointerId: pressData.pointerId,
            pointerType: pressData.pointerType,
            preventDefault: () => {},
            stopPropagation: () => {},
          },
          noteId,
          { usePointerEvents: true }
        );
        notePressRef.current = null;
      }, 340),
    };
  };

  const handleNotePointerMove = (event) => {
    const activePress = notePressRef.current;
    if (!activePress || activePress.pointerId !== event.pointerId) return;

    const movedDistance = Math.hypot(event.clientX - activePress.clientX, event.clientY - activePress.clientY);
    if (movedDistance > 9) clearNotePress();
  };

  const handleNotePointerEnd = (event) => {
    const activePress = notePressRef.current;
    if (!activePress || activePress.pointerId !== event.pointerId) return;

    clearNotePress();
  };

  useEffect(() => {
    return () => {
      clearNotePress();
      window.removeEventListener("mousemove", onDrag);
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("pointermove", onDrag);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, [clearNotePress, onDrag, stopDrag]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const node = notesRevealRef.current;
    if (!node) return undefined;

    const revealIfVisible = () => {
      const rect = node.getBoundingClientRect();
      const shouldReveal = rect.top <= window.innerHeight * 0.92 && rect.bottom >= 0;

      if (shouldReveal) {
        setIsNotesPanelVisible(true);
      }

      return shouldReveal;
    };

    if (revealIfVisible()) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        setIsNotesPanelVisible(true);
        observer.disconnect();
      },
      {
        threshold: 0.02,
        rootMargin: "0px 0px -6% 0px",
      }
    );

    observer.observe(node);
    window.addEventListener("scroll", revealIfVisible, { passive: true });
    window.addEventListener("resize", revealIfVisible);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", revealIfVisible);
      window.removeEventListener("resize", revealIfVisible);
    };
  }, []);

  useEffect(() => {
    const closeNoteMenusOutsideBoard = (event) => {
      const board = notesPanelRef.current;

      if (!board || board.contains(event.target)) return;

      setNotesMenu(null);
      setActiveNoteMenu(null);
    };

    document.addEventListener("mousedown", closeNoteMenusOutsideBoard);

    return () => {
      document.removeEventListener("mousedown", closeNoteMenusOutsideBoard);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(MEMBER_COLOR_STORAGE_KEY, JSON.stringify(memberColors));
  }, [memberColors]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(BUNNY_SHOP_STORAGE_KEY, JSON.stringify(bunnyShopState));
  }, [bunnyShopState]);

  useEffect(() => {
    if (!isGroupSettingsOpen) return undefined;

    const closeSettingsOutside = (event) => {
      if (settingsRef.current?.contains(event.target)) return;

      setIsGroupSettingsOpen(false);
    };

    document.addEventListener("mousedown", closeSettingsOutside);

    return () => {
      document.removeEventListener("mousedown", closeSettingsOutside);
    };
  }, [isGroupSettingsOpen]);

  const goToLobby = useCallback(() => {
    navigate?.("/lobby");
  }, [navigate]);

  const goToProfile = useCallback(() => {
    navigate?.("/profile");
  }, [navigate]);


  return (
    <ClickSpark>
      <div
        ref={pageRef}
        className="group-page"
        style={{
          "--selected-member-color": selectedMemberColor,
          "--selected-member-color-soft": selectedMemberColorSoft,
        }}
      >
        <div className="group-container">
          <Header
            userName={displayUserName}
            userEmail={displayUserEmail}
            coins={userCoins}
            initials={displayUserInitials}
            avatar={resolvedUserAvatar}
            onLogoClick={goToLobby}
            onProfileClick={goToProfile}
          />

          {pageError && (
            <div className="group-form-error-card" style={{ marginTop: 14 }}>
              {pageError}
            </div>
          )}

          <GroupTitleRibbon groupName={groupInfo.name} streakDays={streakDays} />

          <main className="group-main">
            <GroupOverviewBlock
              overviewTitle={overviewTitle}
              overviewDescription={overviewDescription}
              bunnyShopState={bunnyShopState}
              shouldShowCryBunny={shouldShowCryBunny}
              shouldShowHappyBunny={shouldShowHappyBunny}
              activeBunnyModelUrl={activeBunnyModelUrl}
              activeBunnyAnimationMode={activeBunnyAnimationMode}
              activeBunnyAccessoryParams={activeBunnyAccessoryParams}
              isBunnyShopOpen={isBunnyShopOpen}
              onOpenBunnyShop={handleOpenBunnyShop}
              onBunnyShopKeyDown={handleBunnyShopKeyDown}
              groupStats={groupStats}
              selectedFriendId={selectedFriendId}
              selectedFriend={selectedFriend}
              selectedMemberStats={selectedMemberStats}
              visibleTasks={visibleTasks}
              selectedSpecialTask={selectedSpecialTask}
              specialUploadStatus={specialUploadStatus}
              specialAwardedCoins={specialAwardedCoins}
              onOpenSelectedMemberInfo={handleOpenSelectedMemberInfo}
              onToggleTask={handleToggleTask}
              onOpenSpecialUpload={handleOpenSpecialUpload}
              friendsWithColors={friendsWithColors}
              isFriendsExpanded={isFriendsExpanded}
              onFriendsExpandedChange={setIsFriendsExpanded}
              onSelectFriend={setSelectedFriendId}
              groupSettings={{
                isOpen: isGroupSettingsOpen,
                settingsRef,
                onToggle: handleToggleGroupSettings,
                panelProps: {
                  members: settingsMembers,
                  savedMemberColors: memberColors,
                  hasChanges: hasUnsavedMemberColors,
                  onColorChange: handleMemberColorChange,
                  onSave: handleSaveMemberColors,
                  onEditTasks: handleOpenTaskEditor,
                  onEditGroupInfo: handleOpenGroupInfoEditor,
                  onRequestRemoveMember: handleRequestRemoveMember,
                  onRequestExit: handleRequestExitGroup,
                  adminMemberId,
                  groupCode,
                  isOwner,
                },
              }}
            />

            <section className="group-content-grid">
            <GroupStatsBlock
              rhythmTitle={rhythmTitle}
              rhythmDescription={rhythmDescription}
              calendarMode={calendarMode}
              setCalendarMode={setCalendarMode}
              viewedDate={viewedDate}
              setViewedDate={setViewedDate}
              currentDate={currentDate}
              groupStats={groupStats}
              calendarDays={calendarDays}
              analyticsOpen={analyticsOpen}
              setAnalyticsOpen={setAnalyticsOpen}
              weekAnalyticsData={weekAnalyticsData}
              monthAnalyticsData={monthAnalyticsData}
            />

            <GroupNotesBlock
              notesRevealRef={notesRevealRef}
              isNotesPanelVisible={isNotesPanelVisible}
              notesPanelRef={notesPanelRef}
              notesDescription={notesDescription}
              notes={notes}
              friendsWithColors={friendsWithColors}
              notesPanelScale={notesPanelScale}
              noteElementsRef={noteElementsRef}
              notesMenu={notesMenu}
              activeNoteMenu={activeNoteMenu}
              noteEditor={noteEditor}
              isClearNotesConfirmOpen={isClearNotesConfirmOpen}
              onNotesBoardPointerDown={handleNotesBoardPointerDown}
              onNotesBoardPointerUp={handleNotesBoardPointerUp}
              onNotesBoardContextMenu={handleNotesBoardContextMenu}
              onNoteMouseDown={handleNoteMouseDown}
              onNotePointerDown={startNotePointerPress}
              onNotePointerMove={handleNotePointerMove}
              onNotePointerUp={handleNotePointerEnd}
              onOpenNoteActions={openNoteActions}
              onOpenNoteEditor={openNoteEditor}
              onRequestClearNotes={requestClearNotes}
              onDeleteNote={deleteNote}
              onCloseClearNotesConfirm={() => setIsClearNotesConfirmOpen(false)}
              onConfirmClearNotes={confirmClearNotes}
              onCloseNoteEditor={() => setNoteEditor(null)}
              onChangeNoteEditorText={(text) => setNoteEditor((prev) => ({ ...prev, text }))}
              onSaveNote={saveNote}
            />
            </section>
          </main>
        </div>

        {isTaskEditorOpen && (
          <TaskEditorModal
            key={`${taskEditorStatus}-${taskEditorOptions?.habit?.id || "empty"}-${taskEditorOptions?.currentMemberId || "member"}`}
            editOptions={taskEditorOptions}
            status={taskEditorStatus}
            requestError={taskEditorError}
            onClose={() => setIsTaskEditorOpen(false)}
            onSave={handleSaveMyTasks}
          />
        )}

        {isBunnyShopOpen && (
          <BunnyShopModal
            isCry={shouldShowCryBunny}
            coins={userCoins}
            bunnyName={bunnyShopState.name}
            backgroundColor={bunnyShopState.backgroundColor}
            purchasedItemIds={bunnyShopState.purchasedItemIds}
            equippedItems={bunnyShopState.equippedItems}
            onClose={() => setIsBunnyShopOpen(false)}
            onBuyName={handleBuyBunnyName}
            onBuyBackground={handleBuyBunnyBackground}
            onBuyItem={handleBuyBunnyItem}
            onEquipItem={handleEquipBunnyItem}
            onUnequipCategory={handleUnequipBunnyCategory}
          />
        )}

        {isGroupInfoEditorOpen && (
          <GroupInfoEditorModal
            key={`${groupInfoEditorStatus}-${groupInfoEditorData?.id || groupInfo?.id || "empty"}-${groupInfoEditorData?.title || groupInfo?.name || "group"}`}
            habit={groupInfoEditorData}
            fallbackGroupInfo={groupInfo}
            status={groupInfoEditorStatus}
            requestError={groupInfoEditorError}
            onClose={() => setIsGroupInfoEditorOpen(false)}
            onSave={handleSaveGroupInfo}
          />
        )}

        {isMemberInfoOpen && (
          <MemberInfoModal
            profileState={memberProfileState}
            isAdmin={(memberProfileState.fallbackMember || selectedFriend)?.id === adminMemberId}
            onClose={handleCloseMemberInfo}
          />
        )}

        {isSpecialUploadOpen && specialTask && (
          <SpecialUploadModal
            specialTask={specialTask}
            specialUploadStatus={specialUploadStatus}
            specialUploadError={specialUploadError}
            onClose={handleCloseSpecialUpload}
            onPhotoChange={handleSpecialPhoto}
          />
        )}

        {isExitConfirmOpen && (
          <ExitGroupModal
            exitRequestStatus={exitRequestStatus}
            exitRequestError={exitRequestError}
            pageError={pageError}
            exitModalStep={exitModalStep}
            exitPreview={exitPreview}
            exitTransferMembers={exitTransferMembers}
            activeAdminTransferMemberId={activeAdminTransferMemberId}
            onAdminTransferMemberChange={setAdminTransferMemberId}
            onClose={closeExitConfirm}
            onConfirmExit={handleConfirmExitGroup}
          />
        )}

        {memberRemoveConfirm && (
          <MemberRemoveConfirmModal
            member={memberRemoveConfirm}
            onCancel={() => setMemberRemoveConfirm(null)}
            onConfirm={handleConfirmRemoveMember}
          />
        )}
      </div>
    </ClickSpark>
  );
}
