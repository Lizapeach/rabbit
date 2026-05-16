export const CATEGORY_OPTIONS = [
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

export const CATEGORY_TITLE_BY_ID = CATEGORY_OPTIONS.reduce((acc, category) => {
  acc[category.id] = category.title;
  return acc;
}, {});

export const ACHIEVEMENTS = [
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

export const RECORD_STREAK = {
  days: 0,
  category: "",
  group: "",
  hasRecord: false,
  isPreview: false,
};

export const TODAY_STREAK_PREVIEW_STORAGE_KEY = "habbit-today-streak-preview";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://habbit-backend-k33d.onrender.com";

export function getDateKey(date = new Date()) {
  const safeDate = date instanceof Date ? date : new Date(date);
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getEmptyTodayStreakPreview(dateKey = getDateKey()) {
  return {
    dateKey,
    personalHabitIds: {},
    groupHabitIds: {},
  };
}

function normalizeTodayStreakPreview(rawPreview, dateKey = getDateKey()) {
  if (!rawPreview || rawPreview.dateKey !== dateKey) {
    return getEmptyTodayStreakPreview(dateKey);
  }

  return {
    dateKey,
    personalHabitIds:
      rawPreview.personalHabitIds && typeof rawPreview.personalHabitIds === "object"
        ? rawPreview.personalHabitIds
        : {},
    groupHabitIds:
      rawPreview.groupHabitIds && typeof rawPreview.groupHabitIds === "object"
        ? rawPreview.groupHabitIds
        : {},
  };
}

export function readTodayStreakPreview(date = new Date()) {
  const dateKey = getDateKey(date);

  if (typeof window === "undefined") {
    return getEmptyTodayStreakPreview(dateKey);
  }

  try {
    return normalizeTodayStreakPreview(
      JSON.parse(window.localStorage.getItem(TODAY_STREAK_PREVIEW_STORAGE_KEY) || "null"),
      dateKey
    );
  } catch {
    return getEmptyTodayStreakPreview(dateKey);
  }
}

export function getStoredAuthToken() {
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

export async function requestHabitsFromServer() {
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

  return {
    habits: Array.isArray(data?.habits) ? data.habits : [],
    record: data?.record || null,
  };
}

export async function createHabitOnServer(payload) {
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

export function getInitial(name) {
  const trimmedName = String(name || "").trim();
  return (trimmedName[0] || "П").toUpperCase();
}

export function getGroupWord(count) {
  const number = Math.abs(Number(count));
  const lastTwoDigits = number % 100;
  const lastDigit = number % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "привычек";
  if (lastDigit === 1) return "привычка";
  if (lastDigit >= 2 && lastDigit <= 4) return "привычки";
  return "привычек";
}

export function getParticipantWord(count) {
  const number = Math.abs(Number(count));
  const lastTwoDigits = number % 100;
  const lastDigit = number % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "участников";
  if (lastDigit === 1) return "участник";
  if (lastDigit >= 2 && lastDigit <= 4) return "участника";
  return "участников";
}

export function getStreakText(days) {
  const count = Number(days || 0);
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${count} дней`;
  }

  if (lastDigit === 1) {
    return `${count} день`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${count} дня`;
  }

  return `${count} дней`;
}

export function getHabitMembersText(activeMembersCount, maxMembers) {
  const activeCount = Number(activeMembersCount || 0);
  const maxCount = Number(maxMembers || 0);

  if (maxCount > 0) {
    return `${activeCount} из ${maxCount} участников`;
  }

  return `${activeCount} ${getParticipantWord(activeCount)}`;
}

export function getRoleText(role) {
  if (role === "owner") return "Администратор";
  if (role === "member") return "Участник";
  return "Участник";
}

export function getHabitTypeLabel(habitTypeCode) {
  return CATEGORY_TITLE_BY_ID[habitTypeCode] || habitTypeCode || "—";
}

export function getHabitTodayPersonalCompleted(habit, todayPreview = readTodayStreakPreview()) {
  const habitId = String(habit?.id || "");

  return Boolean(
    (habitId && todayPreview.personalHabitIds?.[habitId]) ||
      habit?.memberTodayCompleted ||
      habit?.todayPersonalCompleted ||
      habit?.todayCompletedByMe ||
      habit?.isTodayCompletedByMe ||
      habit?.isTodayCompleted ||
      habit?.todayCompleted ||
      habit?.todayStatus === "done" ||
      habit?.todayStatus === "good"
  );
}

export function getHabitTodayGroupCompleted(habit, todayPreview = readTodayStreakPreview()) {
  const habitId = String(habit?.id || "");

  return Boolean(
    (habitId && todayPreview.groupHabitIds?.[habitId]) ||
      habit?.groupTodayCompleted ||
      habit?.todayGroupCompleted ||
      habit?.isTodayGroupCompleted ||
      habit?.todayHabitStatus === "good" ||
      habit?.todayGroupStatus === "good"
  );
}

export function normalizeHabitToGroup(habit, todayPreview = readTodayStreakPreview()) {
  const title = String(habit?.title || "Без названия").trim() || "Без названия";
  const description = String(habit?.description || "").trim();
  const currentStreak = Number(habit?.currentStreak || 0);
  const memberCurrentStreak = Number(habit?.memberCurrentStreak || 0);
  const memberBestStreak = Number(habit?.memberBestStreak || 0);
  const isTodayGroupCompleted = getHabitTodayGroupCompleted(habit, todayPreview);
  const isTodayPersonalCompleted = getHabitTodayPersonalCompleted(habit, todayPreview);
  const roleText = getRoleText(habit?.role);

  return {
    id: habit?.id,
    name: title,
    note: description || "Описание не добавлено",
    membersText: getHabitMembersText(habit?.activeMembersCount, habit?.maxMembers),
    roleLabel: roleText.toLowerCase(),
    groupCode: habit?.inviteCode || "",
    habitTypeCode: habit?.habitTypeCode,
    habitMemberId: habit?.habitMemberId,
    role: habit?.role,
    status: habit?.status,
    createdAt: habit?.createdAt,
    joinedAt: habit?.joinedAt,
    currentStreak,
    displayedCurrentStreak: currentStreak + (isTodayGroupCompleted ? 1 : 0),
    memberCurrentStreak,
    displayedMemberCurrentStreak: memberCurrentStreak + (isTodayPersonalCompleted ? 1 : 0),
    memberBestStreak,
    isTodayGroupCompleted,
    isTodayPersonalCompleted,
  };
}

export function buildCategoriesFromHabits(habits) {
  const todayPreview = readTodayStreakPreview();
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
        title: getHabitTypeLabel(habitTypeCode),
        groups: [],
      });
    }

    categoriesMap.get(habitTypeCode).groups.push(normalizeHabitToGroup(habit, todayPreview));
  });

  return Array.from(categoriesMap.values()).filter(
    (category) => category.groups.length > 0
  );
}

export function buildRecordStreak(record, habits = []) {
  const todayPreview = readTodayStreakPreview();
  const officialDays = Number(record?.days || 0);
  const officialHabitTypeCode = record?.habitTypeCode || "";

  const result = {
    days: officialDays,
    category: officialDays > 0 ? getHabitTypeLabel(officialHabitTypeCode) : "",
    group: officialDays > 0 ? record?.habitTitle || "—" : "",
    habitId: record?.habitId || "",
    habitTypeCode: officialHabitTypeCode,
    hasRecord: officialDays > 0,
    isPreview: false,
  };

  habits.forEach((habit) => {
    if (habit?.status && habit.status !== "active") return;
    if (!getHabitTodayPersonalCompleted(habit, todayPreview)) return;

    const previewDays = Number(habit?.memberCurrentStreak || 0) + 1;

    if (previewDays > result.days) {
      result.days = previewDays;
      result.category = getHabitTypeLabel(habit?.habitTypeCode);
      result.group = habit?.title || "—";
      result.habitId = habit?.id || "";
      result.habitTypeCode = habit?.habitTypeCode || "";
      result.hasRecord = previewDays > 0;
      result.isPreview = true;
    }
  });

  return result;
}