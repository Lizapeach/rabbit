

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
  days: 29,
  category: "Чтение",
  group: "Буба",
};

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://habbit-backend-k33d.onrender.com";

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

  return Array.isArray(data?.habits) ? data.habits : [];
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

export function normalizeHabitToGroup(habit) {
  const title = String(habit?.title || "Без названия").trim() || "Без названия";
  const description = String(habit?.description || "").trim();
  const currentStreak = Number(habit?.currentStreak || 0);
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
  };
}

export function buildCategoriesFromHabits(habits) {
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
