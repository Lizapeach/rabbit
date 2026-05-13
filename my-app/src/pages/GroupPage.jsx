import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import ClickSpark from "../components/ClickSpark";
import Header from "../components/Header";
import AnimatedContent from "../components/AnimatedContent";
import AnimatedScrollList from "../components/AnimatedScrollList";
import BorderGlow from "../components/BorderGlow";
import { TaskDoneAnimation, AnimatedCheckMark } from "../components/TaskDoneAnimation";
import Live2DBunny from "../components/Live2DBunny";
import BunnyShopModal from "../components/BunnyShopModal";
import {
  BUNNY_SHOP_STORAGE_KEY,
  createDefaultBunnyShopState,
  getBunnyAccessoryParams,
  normalizeBunnyShopState,
} from "../components/bunnyShopConfig";
import gearIcon from "../assets/icons/gear.png";
import achievementIcon from "../assets/icons/achievement.svg";

import "../styles/global.css";
import "../styles/group.css";

const USER = {
  name: "Елизавета",
  email: "ela@gmail.com",
  initials: "EL",
  avatarColor: "#d8cde3",
  coins: 240,
};

const friendsData = [
  {
    id: "me",
    name: "Елизавета",
    email: "ela@gmail.com",
    initials: "EL",
    color: "#d8cde3",
    avatarColor: USER.avatarColor,
    tasks: [
      {
        id: "reading_pages",
        type: "template",
        templateId: "reading_pages",
        templateValue: "20",
        title: "Прочитать 20 страниц",
        done: false,
      },
      {
        id: "reading_minutes",
        type: "template",
        templateId: "reading_minutes",
        templateValue: "20",
        title: "Читать 20 минут",
        done: false,
      },
      {
        id: "reading_note",
        type: "template",
        templateId: "reading_note",
        templateValue: "мысль",
        title: "Записать мысль из прочитанного",
        done: false,
      },
    ],
  },
  {
    id: "anna",
    name: "Анна",
    email: "anna.circle@mail.com",
    initials: "AN",
    color: "#c7d8c0",
    avatarColor: "#c7d8c0",
    tasks: [
      {
        id: "anna-reading_pages",
        title: "Прочитать 10 страниц",
        done: true,
      },
      {
        id: "anna-note",
        title: "Написать вывод",
        done: true,
      },
      {
        id: "anna-mark",
        title: "Отметить чтение",
        done: false,
      },
    ],
  },
  {
    id: "mira",
    name: "Мира",
    email: "mira.daily@mail.com",
    initials: "MI",
    color: "#e8c4b7",
    avatarColor: "#e8c4b7",
    tasks: [
      {
        id: "mira-reading_minutes",
        title: "Читать 15 минут",
        done: false,
      },
      {
        id: "mira-note",
        title: "Открыть заметку",
        done: false,
      },
      {
        id: "mira-mark",
        title: "Закрыть привычку",
        done: false,
      },
    ],
  },
  {
    id: "sofia",
    name: "София",
    email: "sofia.pages@mail.com",
    initials: "SO",
    color: "#e7d8bf",
    avatarColor: "#e7d8bf",
    tasks: [
      {
        id: "sofia-reading_chapters",
        title: "Прочитать 1 главу",
        done: true,
      },
      {
        id: "sofia-break",
        title: "Сделать паузу",
        done: true,
      },
      {
        id: "sofia-result",
        title: "Отметить результат",
        done: true,
      },
    ],
  },
];

const uniqueTaskBase = {
  id: "special",
  title: "Особое задание дня",
  desc: "Прикрепи фото своего уютного места для чтения или процесса выполнения задания.",
};

const SPECIAL_TASK_REWARD_COINS = 15;
const MEMBER_COLOR_STORAGE_KEY = "quiet-pages-member-colors";
const API_URL = import.meta.env.VITE_API_URL || "https://habbit-backend-k33d.onrender.com";
const NOTES_POLL_INTERVAL_MS = 5000;
const AUTH_TOKEN_STORAGE_KEYS = ["token", "authToken", "habbitToken", "habbit-auth-token"];

const TASK_EDITOR_PLACEHOLDERS = {
  reading_pages: "например, 10",
  reading_minutes: "например, 20",
  reading_chapters: "например, 2",
  reading_note: "цитату, вывод, мысль",
};

const PERSONAL_TASK_TEMPLATES = [
  {
    id: "reading_pages",
    code: "reading_pages",
    title: "Чтение страниц",
    templateText: "Прочитать __",
    valueType: "number",
    unitForms: { one: "страницу", few: "страницы", many: "страниц" },
    minValue: 1,
    maxValue: 300,
    step: 1,
    choiceOptions: null,
  },
  {
    id: "reading_minutes",
    code: "reading_minutes",
    title: "Чтение по времени",
    templateText: "Читать __",
    valueType: "number",
    unitForms: { one: "минуту", few: "минуты", many: "минут" },
    minValue: 1,
    maxValue: 300,
    step: 1,
    choiceOptions: null,
  },
  {
    id: "reading_chapters",
    code: "reading_chapters",
    title: "Чтение главами",
    templateText: "Прочитать __",
    valueType: "number",
    unitForms: { one: "главу", few: "главы", many: "глав" },
    minValue: 1,
    maxValue: 100,
    step: 1,
    choiceOptions: null,
  },
  {
    id: "reading_note",
    code: "reading_note",
    title: "Записать мысль",
    templateText: "Записать __ из прочитанного",
    valueType: "text",
    unitForms: null,
    minValue: null,
    maxValue: null,
    maxLength: 30,
    choiceOptions: null,
  },
];

const PERSONAL_CUSTOM_TASK_IDS = ["custom-1", "custom-2", "custom-3", "custom-4"];

const getDefaultMemberColors = (members = friendsData) =>
  members.reduce((colors, friend) => {
    colors[friend.id] = friend.color;
    return colors;
  }, {});

function sortCurrentMemberFirst(items = []) {
  return [...items].sort((first, second) => {
    if (first?.id === "me" && second?.id !== "me") return -1;
    if (first?.id !== "me" && second?.id === "me") return 1;
    return 0;
  });
}

function getStoredAuthToken() {
  if (typeof window === "undefined") return "";

  for (const key of AUTH_TOKEN_STORAGE_KEYS) {
    const token = window.localStorage.getItem(key);
    if (token) return token;
  }

  return "";
}

function getHabitIdFromLocation() {
  if (typeof window === "undefined") return "";

  const stateHabitId = window.history.state?.habitId || window.history.state?.groupId;
  if (stateHabitId) return String(stateHabitId);

  const params = new URLSearchParams(window.location.search);
  const queryHabitId = params.get("habitId") || params.get("groupId");
  if (queryHabitId) return queryHabitId;

  const match = window.location.pathname.match(/(?:habits|groups|group)\/(\d+)/i);
  return match?.[1] || "";
}

function getErrorMessage(error, fallback = "Ошибка запроса к серверу") {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function apiRequest(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text ? { message: text } : null;
  }

  if (!response.ok) {
    throw new Error(data?.message || `Ошибка ${response.status}`);
  }

  return data;
}

function normalizeBackendAvatar(avatar, member) {
  const fallbackColor = member?.displayColor || member?.avatar?.bgColor || USER.avatarColor;
  const fallbackLabel = getInitial(member?.name || member?.login || USER.name);

  if ((avatar?.type === "picture" || avatar?.type === "photo") && avatar.src) {
    return {
      id: avatar.id || `${member?.id || "member"}-photo`,
      type: "photo",
      label: avatar.label || fallbackLabel,
      color: avatar.bgColor || fallbackColor,
      src: avatar.src,
    };
  }

  return {
    id: avatar?.id || `${member?.id || "member"}-avatar`,
    type: avatar?.type === "emoji" ? "emoji" : "monogram",
    label: avatar?.value || fallbackLabel,
    color: avatar?.bgColor || fallbackColor,
  };
}

function normalizeBackendTask(task) {
  return {
    id: String(task.id),
    backendTaskId: task.id,
    type: task.isCustom ? "custom" : "template",
    templateId: task.taskTemplateCode || (task.taskTemplateId ? String(task.taskTemplateId) : null),
    templateValue: task.customValue || "",
    title: task.finalText || task.title || "Задание",
    done: Boolean(task.isCompletedToday),
    desc: undefined,
  };
}

function normalizeBackendPage(pageData) {
  const currentMemberId = pageData?.currentMemberId;
  const tasksByMemberId = pageData?.tasksByMemberId || {};

  const members = (pageData?.members || [])
    .filter((member) => !member?.status || member.status === "active")
    .map((member) => {
      const isCurrentMember = String(member.id) === String(currentMemberId);
      const uiId = isCurrentMember ? "me" : String(member.id);
      const avatar = normalizeBackendAvatar(member.avatar, member);
      const color = normalizeHexColor(member.displayColor || avatar.color || USER.avatarColor, USER.avatarColor);

      return {
        id: uiId,
        backendMemberId: member.id,
        userId: member.userId,
        habitId: member.habitId,
        role: member.role,
        status: member.status,
        joinedAt: member.joinedAt,
        name: member.name || member.login || "Участник",
        email: member.email || member.login || "",
        login: member.login || "",
        initials: avatar.label || getInitial(member.name || member.login),
        color,
        avatarColor: avatar.color || color,
        avatar,
        colorSource: member.colorSource || "avatar",
        tasks: (tasksByMemberId[String(member.id)] || []).map(normalizeBackendTask),
      };
    });

  const orderedMembers = sortCurrentMemberFirst(members);
  const currentMember = orderedMembers.find((member) => member.id === "me") || orderedMembers[0];
  const ownerMember = orderedMembers.find((member) => member.role === "owner");

  return {
    members: orderedMembers,
    currentMemberUiId: currentMember?.id || "me",
    currentMemberTasks: currentMember?.tasks || [],
    ownerMemberUiId: ownerMember?.id || (pageData?.isOwner ? "me" : ""),
    groupInfo: {
      name: pageData?.habit?.title || "Группа",
      description: pageData?.habit?.description || "",
    },
    groupCode: pageData?.habit?.inviteCode || "",
    isOwner: Boolean(pageData?.isOwner),
    currentStreak: Number(pageData?.habit?.currentStreak || 0),
    progress: pageData?.progress || null,
    memberProgress: pageData?.memberProgress || {},
    habit: pageData?.habit || null,
  };
}

function normalizeLeaveOwnerCandidate(candidate) {
  const memberId = String(candidate?.memberId || candidate?.id || "");
  const userId = candidate?.userId ? String(candidate.userId) : "";
  const fallbackName = candidate?.name || candidate?.login || "Участник";
  const avatar = normalizeBackendAvatar(candidate?.avatar, {
    id: memberId || userId,
    name: fallbackName,
    login: candidate?.login,
    displayColor: candidate?.displayColor || candidate?.avatar?.bgColor || candidate?.avatar?.bg_color,
  });
  const color = normalizeHexColor(
    candidate?.displayColor || candidate?.avatar?.bgColor || candidate?.avatar?.bg_color || avatar.color,
    USER.avatarColor
  );

  return {
    id: memberId || userId || `candidate-${fallbackName}`,
    backendMemberId: memberId,
    userId,
    role: candidate?.role || "member",
    name: fallbackName,
    login: candidate?.login || "",
    email: candidate?.login || "",
    initials: avatar.label || getInitial(fallbackName),
    color,
    avatarColor: color,
    avatar: {
      ...avatar,
      color: avatar.color || color,
    },
  };
}

function extractHabitCreatedDateKey(habit) {
  const rawDate =
    habit?.createdAt ||
    habit?.created_at ||
    habit?.createdDate ||
    habit?.created_date ||
    "";

  if (!rawDate) return "";

  if (/^\d{4}-\d{2}-\d{2}/.test(String(rawDate))) {
    return String(rawDate).slice(0, 10);
  }

  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) return "";

  return getDateKey(date);
}

function normalizeBackendNote(note) {
  return {
    id: String(note.id),
    backendNoteId: note.id,
    habitId: note.habitId,
    authorMemberId: note.authorMemberId,
    authorUserId: note.authorUserId,
    authorName: note.authorName,
    authorLogin: note.authorLogin,
    text: note.content || "",
    pinXPercent: Number(note.pinXPercent ?? 0),
    pinYPercent: Number(note.pinYPercent ?? 0),
    zIndex: Number(note.zIndex || 1),
  };
}

function getCalendarRange(viewedDate, mode) {
  if (mode === "week") {
    const from = getMonday(viewedDate);
    const to = new Date(from);
    to.setDate(from.getDate() + 6);

    return { from: getDateKey(from), to: getDateKey(to) };
  }

  const from = new Date(viewedDate.getFullYear(), viewedDate.getMonth(), 1);
  const to = new Date(viewedDate.getFullYear(), viewedDate.getMonth() + 1, 0);

  return { from: getDateKey(from), to: getDateKey(to) };
}

function getAnalyticsRange(currentDate, mode, startDateKey = "") {
  if (!startDateKey) {
    return mode === "week"
      ? getCalendarRange(currentDate, "week")
      : getCalendarRange(currentDate, "month");
  }

  const periodLength = mode === "week" ? 7 : 30;
  const groupStartDate = parseDateKey(startDateKey);
  const current = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate()
  );
  const firstPeriodEnd = new Date(groupStartDate);

  firstPeriodEnd.setDate(groupStartDate.getDate() + periodLength - 1);

  const from = new Date(groupStartDate);

  if (current > firstPeriodEnd) {
    from.setFullYear(current.getFullYear(), current.getMonth(), current.getDate());
    from.setDate(current.getDate() - periodLength + 1);
  }

  const to = new Date(from);
  to.setDate(from.getDate() + periodLength - 1);

  return {
    from: getDateKey(from),
    to: getDateKey(to),
  };
}

function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);

  if (!year || !month || !day) return new Date();

  return new Date(year, month - 1, day);
}

function buildDateKeysBetween(from, to) {
  const start = parseDateKey(from);
  const end = parseDateKey(to);
  const dates = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    dates.push(getDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function toPercent(value, total) {
  if (!total) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 10000) / 100));
}

function normalizeHexColor(value, fallback = "#d8cde3") {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return fallback;
}

function hexToRgba(hex, alpha = 0.18) {
  const safeHex = normalizeHexColor(hex).replace("#", "");
  const r = parseInt(safeHex.slice(0, 2), 16);
  const g = parseInt(safeHex.slice(2, 4), 16);
  const b = parseInt(safeHex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getInitial(name) {
  const trimmedName = String(name || "").trim();
  return (trimmedName[0] || "П").toUpperCase();
}

function normalizeUserAvatar(avatar, fallbackName = USER.name) {
  if (avatar?.type === "photo" && avatar.src) {
    return {
      id: avatar.id || "profile-photo",
      type: "photo",
      label: avatar.label || "Фото профиля",
      color: avatar.color || USER.avatarColor,
      src: avatar.src,
    };
  }

  return {
    id: avatar?.id || "monogram",
    type: avatar?.type || "monogram",
    label: avatar?.label || getInitial(fallbackName),
    color: avatar?.color || USER.avatarColor,
  };
}

function renderMemberAvatar(avatar, fallbackLabel = "") {
  if (avatar?.type === "photo" && avatar.src) {
    return <img src={avatar.src} alt="Фото профиля" className="group-member-avatar__image" />;
  }

  return <span className="group-member-avatar__symbol">{avatar?.label || fallbackLabel}</span>;
}

function splitTemplateText(templateText = "") {
  const [before = "", after = ""] = String(templateText).split("__");

  return {
    before: before.trim(),
    after: after.trim(),
  };
}

function getRussianNumberForm(numberValue) {
  const absValue = Math.abs(Number(numberValue));
  const lastTwoDigits = absValue % 100;
  const lastDigit = absValue % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "many";
  if (lastDigit === 1) return "one";
  if (lastDigit >= 2 && lastDigit <= 4) return "few";
  return "many";
}

function getTaskEditorTemplateUnit(template, value = "") {
  if (!template?.unitForms) return "";

  const preparedValue = String(value || "").trim();

  if ((template.valueType === "number" || template.valueType === "choice") && /^\d+$/.test(preparedValue)) {
    return template.unitForms[getRussianNumberForm(Number(preparedValue))] || template.unitForms.many || "";
  }

  return template.unitForms.many || "";
}

function getTaskEditorTemplateTail(template, value = "") {
  const { after } = splitTemplateText(template?.templateText);
  const unit = getTaskEditorTemplateUnit(template, value);

  return [unit, after]
    .filter((part) => String(part || "").trim().length > 0)
    .map((part) => String(part).trim())
    .join(" ");
}

function buildTemplateTaskTitle(template, value) {
  if (!template) return "";
  if (template.valueType === "none") return template.templateText || "";

  const preparedValue = String(value || "").trim();
  const { before } = splitTemplateText(template.templateText);
  const tail = getTaskEditorTemplateTail(template, preparedValue);

  return [before, preparedValue, tail]
    .filter((part) => String(part || "").trim().length > 0)
    .map((part) => String(part).trim())
    .join(" ");
}

function getTaskEditorChoices(template) {
  return Array.isArray(template?.choiceOptions) ? template.choiceOptions : [];
}

function sanitizeTaskEditorTemplateValue(template, value) {
  const rawValue = String(value || "");

  if (template.valueType === "number") {
    return rawValue.replace(/[^0-9]/g, "");
  }

  if (template.valueType === "text") {
    return rawValue.slice(0, template.maxLength || 30);
  }

  if (template.valueType === "choice") {
    return getTaskEditorChoices(template).includes(rawValue) ? rawValue : "";
  }

  return "";
}

function validateTaskEditorTemplateValue(template, value) {
  if (!template || template.valueType === "none") return null;

  const preparedValue = String(value || "").trim();

  if (!preparedValue) {
    return template.valueType === "choice" ? "Выберите вариант" : "Заполните поле";
  }

  if (template.valueType === "number") {
    if (!/^\d+$/.test(preparedValue)) {
      return "Значение должно быть целым числом";
    }

    const numberValue = Number(preparedValue);

    if (typeof template.minValue === "number" && numberValue < template.minValue) {
      return `Число не может быть меньше ${template.minValue}`;
    }

    if (typeof template.maxValue === "number" && numberValue > template.maxValue) {
      return `Число не может быть больше ${template.maxValue}`;
    }
  }

  if (template.valueType === "text" && template.maxLength && preparedValue.length > template.maxLength) {
    return `Текст не может быть длиннее ${template.maxLength} символов`;
  }

  if (template.valueType === "choice" && !getTaskEditorChoices(template).includes(preparedValue)) {
    return "Некорректный вариант";
  }

  return null;
}

function getTaskEditorInputProps(template) {
  if (template.valueType !== "number" && template.valueType !== "text") return {};

  return {
    type: template.valueType === "number" ? "number" : "text",
    placeholder: template.placeholder || TASK_EDITOR_PLACEHOLDERS[template.code] || "Введите значение",
    min: template.minValue,
    max: template.maxValue,
    step: template.step || (template.valueType === "number" ? 1 : undefined),
    maxLength: template.maxLength,
    inputMode: template.valueType === "number" ? "numeric" : undefined,
  };
}

function createTaskEditorDraft(tasks) {
  const selectedTaskIds = [];
  const templateValues = {};
  const customTaskIds = [];
  const customTasks = {};
  let customIndex = 0;

  tasks.forEach((task) => {
    if (task.type === "template" && task.templateId) {
      selectedTaskIds.push(task.templateId);
      templateValues[task.templateId] = task.templateValue || "";
      return;
    }

    const customId = task.customTaskId || PERSONAL_CUSTOM_TASK_IDS[customIndex];
    if (!customId) return;

    customTaskIds.push(customId);
    customTasks[customId] = task.title || "";
    customIndex += 1;
  });

  return {
    selectedTaskIds,
    templateValues,
    customTaskIds,
    customTasks,
  };
}

function validateTaskEditorDraft(draft) {
  const errors = {
    templates: {},
    customTasks: {},
    common: "",
  };

  const selectedTemplateIds = draft.selectedTaskIds || [];
  const selectedCustomIds = draft.customTaskIds || [];
  const hasAnyTask = selectedTemplateIds.length > 0 || selectedCustomIds.length > 0;

  selectedTemplateIds.forEach((templateId) => {
    const template = PERSONAL_TASK_TEMPLATES.find((item) => item.id === templateId);
    const templateError = validateTaskEditorTemplateValue(template, draft.templateValues?.[templateId]);

    if (templateError) {
      errors.templates[templateId] = templateError;
    }
  });

  const usedCustomTexts = new Set();

  selectedCustomIds.forEach((taskId, index) => {
    const preparedText = String(draft.customTasks?.[taskId] || "").trim();
    const loweredText = preparedText.toLowerCase();

    if (!preparedText) {
      errors.customTasks[taskId] = `Свое задание №${index + 1} пустое`;
      return;
    }

    if (preparedText.length > 160) {
      errors.customTasks[taskId] = `Свое задание №${index + 1} должно быть не длиннее 160 символов`;
      return;
    }

    if (usedCustomTexts.has(loweredText)) {
      errors.customTasks[taskId] = `Свое задание «${preparedText}» повторяется`;
      return;
    }

    usedCustomTexts.add(loweredText);
  });

  if (!hasAnyTask) {
    errors.common = "Выберите хотя бы одно задание";
  }

  if (Object.keys(errors.templates).length > 0) {
    errors.common = "Заполните выбранные шаблоны заданий";
  }

  if (Object.keys(errors.customTasks).length > 0) {
    errors.common = "Заполните выбранные свои задания";
  }

  return errors;
}

function hasTaskEditorErrors(errors) {
  return Boolean(
    errors.common ||
    Object.keys(errors.templates || {}).length > 0 ||
    Object.keys(errors.customTasks || {}).length > 0
  );
}

function buildTasksFromEditorDraft(draft, previousTasks) {
  const previousById = new Map(previousTasks.map((task) => [task.id, task]));
  const nextTasks = [];

  (draft.selectedTaskIds || []).forEach((templateId) => {
    const template = PERSONAL_TASK_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;

    const templateValue = String(draft.templateValues?.[templateId] || "").trim();
    const title = buildTemplateTaskTitle(template, templateValue);
    const previousTask = previousById.get(templateId);

    nextTasks.push({
      id: templateId,
      type: "template",
      templateId,
      templateValue,
      title,
      done: previousTask?.title === title ? Boolean(previousTask.done) : false,
    });
  });

  (draft.customTaskIds || []).forEach((taskId) => {
    const title = String(draft.customTasks?.[taskId] || "").trim();
    if (!title) return;

    const previousTask = previousById.get(taskId);

    nextTasks.push({
      id: taskId,
      type: "custom",
      customTaskId: taskId,
      title,
      done: previousTask?.title === title ? Boolean(previousTask.done) : false,
    });
  });

  return nextTasks;
}

const createInitialSpecialTasks = () =>
  friendsData.reduce((tasksByMember, friend) => {
    tasksByMember[friend.id] = {
      done: false,
      photo: null,
      completedAt: null,
    };

    return tasksByMember;
  }, {});

const BUNNY_MODEL_URL = "/live2d/bunny/bunny.json";
const BUNNY_CRY_MODEL_URL = "/live2d/bunny/bunnycry.json";
const BUNNY_NAME = "Банни";

const weekDayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(firstDate, secondDate) {
  return getDateKey(firstDate) === getDateKey(secondDate);
}

function isFutureDay(date, today) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  return day > currentDay;
}

function getMonday(date) {
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayIndex = (current.getDay() + 6) % 7;
  current.setDate(current.getDate() - dayIndex);
  return current;
}

function buildMonthCells(currentDate) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = getMonday(firstDay);
  const endDate = new Date(lastDay);
  const lastDayIndex = (lastDay.getDay() + 6) % 7;

  endDate.setDate(lastDay.getDate() + (6 - lastDayIndex));

  const cells = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const date = new Date(cursor);

    cells.push({
      id: getDateKey(date),
      date,
      number: date.getDate(),
      outOfMonth: date.getMonth() !== month,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return cells;
}

function chunkCalendarRows(cells) {
  const rows = [];

  for (let index = 0; index < cells.length; index += 7) {
    rows.push(cells.slice(index, index + 7));
  }

  return rows;
}

function getActiveMonthRowIndex(rows, viewedDate) {
  const viewedDateKey = getDateKey(viewedDate);
  const rowIndex = rows.findIndex((row) => row.some((cell) => cell.id === viewedDateKey));

  return rowIndex >= 0 ? rowIndex : 0;
}

function createDemoZeroTaskDates(today) {
  const zeroTaskDates = new Set();
  const offsets = [-12, -7, -2, 4, 11, 18];

  offsets.forEach((offset) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    date.setDate(date.getDate() + offset);
    zeroTaskDates.add(getDateKey(date));
  });

  return zeroTaskDates;
}

function calculateCurrentGroupStreak(today, zeroTaskDates, groupStats) {
  let streak = 0;

  for (let offset = 0; offset < 365; offset += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    date.setDate(date.getDate() - offset);

    const isBrokenDay = isSameDay(date, today)
      ? groupStats.members.some((member) => member.completed === 0)
      : zeroTaskDates.has(getDateKey(date));

    if (isBrokenDay) break;
    streak += 1;
  }

  return streak;
}

function getDayGroupProgress(date, today, zeroTaskDates, groupStats) {
  if (isSameDay(date, today)) {
    return { completed: groupStats.completed, total: groupStats.total };
  }

  const total = groupStats.total;
  const seed = date.getDate() * 7 + (date.getMonth() + 1) * 11 + date.getFullYear();
  const hasZeroMember = zeroTaskDates.has(getDateKey(date));

  if (hasZeroMember) {
    return {
      completed: Math.max(1, Math.min(total - 2, seed % total)),
      total,
    };
  }

  return {
    completed: Math.max(Math.ceil(total * 0.55), seed % (total + 1)),
    total,
  };
}



function formatAnalyticsDateLabel(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

function getMemberTasks(member, myTasks) {
  return member.id === "me" ? myTasks : member.tasks;
}

function buildPastDates(daysCount, currentDate) {
  return Array.from({ length: daysCount }, (_, index) => {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate()
    );

    date.setDate(date.getDate() - (daysCount - 1 - index));
    return date;
  });
}

function getMemberCompletedForDate(member, date, currentDate, myTasks, zeroTaskDates, membersData = friendsData) {
  const memberTasks = getMemberTasks(member, myTasks);
  const totalTasks = memberTasks.length;

  if (isSameDay(date, currentDate)) {
    return memberTasks.filter((task) => task.done).length;
  }

  const dateKey = getDateKey(date);
  const memberIndex = membersData.findIndex((friend) => friend.id === member.id);
  const zeroMemberIndex = (date.getDate() + date.getMonth() * 2) % membersData.length;

  if (zeroTaskDates.has(dateKey) && memberIndex === zeroMemberIndex) {
    return 0;
  }

  const seed =
    member.id.split("").reduce((sum, symbol) => sum + symbol.charCodeAt(0), 0) +
    date.getDate() * 11 +
    (date.getMonth() + 1) * 17 +
    date.getFullYear();

  return seed % (totalTasks + 1);
}

function buildAnalyticsSeries(daysCount, currentDate, myTasks, zeroTaskDates, membersData = friendsData, startDateKey = "") {
  const orderedMembers = sortCurrentMemberFirst(membersData);
  const mode = daysCount === 7 ? "week" : "month";
  const analyticsRange = startDateKey ? getAnalyticsRange(currentDate, mode, startDateKey) : null;
  const dates = analyticsRange
    ? buildDateKeysBetween(analyticsRange.from, analyticsRange.to).map(parseDateKey)
    : buildPastDates(daysCount, currentDate);
  const maxTasks = Math.max(
    1,
    ...orderedMembers.map((member) => getMemberTasks(member, myTasks).length)
  );

  const datasets = orderedMembers.map((member) => ({
    id: member.id,
    name: member.name,
    initials: member.initials,
    avatar: member.avatar,
    avatarColor: member.avatarColor || member.avatar?.color || member.color,
    color: member.color,
    points: dates.map((date) => ({
      id: `${member.id}-${getDateKey(date)}`,
      date,
      value: getMemberCompletedForDate(member, date, currentDate, myTasks, zeroTaskDates, orderedMembers),
      hasData: true,
    })),
  }));

  return {
    dates,
    datasets,
    maxTasks,
  };
}

function findStatsMember(statsMember, membersData = friendsData) {
  return membersData.find((member) => {
    const sameHabitMemberId =
      statsMember?.habitMemberId !== undefined &&
      member.backendMemberId !== undefined &&
      String(member.backendMemberId) === String(statsMember.habitMemberId);
    const sameUserId =
      statsMember?.userId !== undefined &&
      member.userId !== undefined &&
      String(member.userId) === String(statsMember.userId);
    const sameLogin =
      statsMember?.login && member.login && String(member.login) === String(statsMember.login);

    return sameHabitMemberId || sameUserId || sameLogin;
  });
}

function normalizeStatsResponse(statsData, membersData = friendsData) {
  const from = statsData?.from || getDateKey(new Date());
  const to = statsData?.to || from;
  const dateKeys = buildDateKeysBetween(from, to);
  const dates = dateKeys.map(parseDateKey);
  const series = Array.isArray(statsData?.series) ? statsData.series : [];
  const datasets = series.map((statsMember) => {
    const matchedMember = findStatsMember(statsMember, membersData);
    const fallbackId =
      statsMember?.habitMemberId ?? statsMember?.userId ?? statsMember?.login ?? statsMember?.name ?? "member";
    const memberId = matchedMember?.id || `member-${fallbackId}`;
    const pointByDate = new Map(
      (Array.isArray(statsMember?.points) ? statsMember.points : [])
        .filter((point) => point?.date)
        .map((point) => [point.date, point])
    );
    const color = normalizeHexColor(
      statsMember?.displayColor || matchedMember?.color || matchedMember?.avatarColor,
      matchedMember?.color || USER.avatarColor
    );

    return {
      id: memberId,
      backendMemberId: statsMember?.habitMemberId,
      userId: statsMember?.userId,
      name: statsMember?.name || matchedMember?.name || statsMember?.login || "Участник",
      login: statsMember?.login || matchedMember?.login || "",
      initials: matchedMember?.initials || getInitial(statsMember?.name || statsMember?.login),
      avatar: matchedMember?.avatar || {
        id: `${memberId}-avatar`,
        type: "monogram",
        label: getInitial(statsMember?.name || statsMember?.login),
        color,
      },
      avatarColor: matchedMember?.avatarColor || color,
      color,
      points: dateKeys.map((dateKey) => {
        const point = pointByDate.get(dateKey);
        const hasData = point ? point.hasData !== false : false;

        return {
          id: `${memberId}-${dateKey}`,
          date: parseDateKey(dateKey),
          dateKey,
          value: hasData ? Number(point?.completedTasksCount || 0) : 0,
          completedTasksCount: hasData ? Number(point?.completedTasksCount || 0) : 0,
          totalTasksCount: Number(point?.totalTasksCount || statsData?.maxTasksCount || 0),
          hasData,
        };
      }),
    };
  });

  const maxFromPoints = datasets.reduce((max, dataset) => {
    const datasetMax = dataset.points.reduce(
      (pointMax, point) => Math.max(pointMax, Number(point.totalTasksCount || point.value || 0)),
      0
    );

    return Math.max(max, datasetMax);
  }, 0);

  return {
    dates,
    datasets: sortCurrentMemberFirst(datasets),
    maxTasks: Math.max(1, Number(statsData?.maxTasksCount || 0), maxFromPoints),
  };
}

export default function GroupPage({ navigate, userProfile, userAvatar }) {
  const pageRef = useRef(null);
  const notesPanelRef = useRef(null);
  const notesRevealRef = useRef(null);
  const settingsRef = useRef(null);
  const dragRef = useRef(null);

  const [habitId] = useState(() => getHabitIdFromLocation());
  const authToken = useMemo(
    () => userProfile?.token || userProfile?.jwt || userProfile?.accessToken || getStoredAuthToken(),
    [userProfile?.accessToken, userProfile?.jwt, userProfile?.token]
  );
  const [pageStatus, setPageStatus] = useState("idle");
  const [pageError, setPageError] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [backendStreakDays, setBackendStreakDays] = useState(null);
  const [calendarDays, setCalendarDays] = useState([]);
  const [weekStatsResponse, setWeekStatsResponse] = useState(null);
  const [monthStatsResponse, setMonthStatsResponse] = useState(null);

  const [groupInfo, setGroupInfo] = useState(() => ({
    name: window.history.state?.groupName || "Quiet Pages",
    description:
      window.history.state?.groupDescription ||
      "Личная группа для спокойного чтения, ежедневных заданий и общей серии без пропусков.",
  }));
  const [groupCode, setGroupCode] = useState(() => window.history.state?.groupCode || "HAB-READ-PAGE");
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
  const [membersData, setMembersData] = useState(friendsData);
  const [myTasks, setMyTasks] = useState(friendsData[0].tasks);
  const [selectedFriendId, setSelectedFriendId] = useState("me");
  const [memberColors, setMemberColors] = useState(() => {
    const defaultColors = getDefaultMemberColors();

    if (typeof window === "undefined") return defaultColors;

    try {
      const savedColors = JSON.parse(window.localStorage.getItem(MEMBER_COLOR_STORAGE_KEY) || "{}");

      return friendsData.reduce((colors, friend) => {
        colors[friend.id] = normalizeHexColor(savedColors[friend.id], friend.color);
        return colors;
      }, {});
    } catch {
      return defaultColors;
    }
  });
  const [draftMemberColors, setDraftMemberColors] = useState(() => memberColors);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
  const [isGroupInfoEditorOpen, setIsGroupInfoEditorOpen] = useState(false);
  const [isMemberInfoOpen, setIsMemberInfoOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [exitModalStep, setExitModalStep] = useState("confirm");
  const [exitPreview, setExitPreview] = useState(null);
  const [exitRequestStatus, setExitRequestStatus] = useState("idle");
  const [exitRequestError, setExitRequestError] = useState("");
  const [adminTransferMemberId, setAdminTransferMemberId] = useState("");
  const [adminMemberId, setAdminMemberId] = useState("me");
  const [removedMemberIds, setRemovedMemberIds] = useState([]);
  const [memberRemoveConfirm, setMemberRemoveConfirm] = useState(null);
  const [specialTasks, setSpecialTasks] = useState(() => createInitialSpecialTasks());
  const [isSpecialUploadOpen, setIsSpecialUploadOpen] = useState(false);
  const [isFriendsExpanded, setIsFriendsExpanded] = useState(false);
  const [calendarMode, setCalendarMode] = useState("week");
  const [viewedDate, setViewedDate] = useState(() => new Date());
  const [analyticsOpen, setAnalyticsOpen] = useState({ week: true, month: true });
  const [notes, setNotes] = useState([]);
  const [isNotesPanelVisible, setIsNotesPanelVisible] = useState(false);
  const [notesMenu, setNotesMenu] = useState(null);
  const [activeNoteMenu, setActiveNoteMenu] = useState(null);
  const [noteEditor, setNoteEditor] = useState(null);
  const [isClearNotesConfirmOpen, setIsClearNotesConfirmOpen] = useState(false);
  const [groupCreatedDateKey, setGroupCreatedDateKey] = useState("");

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const displayUserName = userProfile?.name || USER.name;
  const displayUserEmail = userProfile?.email || USER.email;
  const resolvedUserAvatar = useMemo(
    () => normalizeUserAvatar(userAvatar, displayUserName),
    [displayUserName, userAvatar]
  );
  const displayUserInitials = resolvedUserAvatar.label || USER.initials;

  const zeroTaskDates = useMemo(() => createDemoZeroTaskDates(currentDate), [currentDate]);

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
      return null;
    }

    if (!silent) {
      setPageStatus("loading");
      setPageError("");
    }

    try {
      const data = await apiRequest(`/api/habits/${habitId}/page?date=${getDateKey(currentDate)}`, {
        token: authToken,
      });
      const normalized = normalizeBackendPage(data);
      const nextMembers = normalized.members.length > 0 ? normalized.members : friendsData;
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
    }
  }, [authToken, currentDate, habitId]);

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
    () => friendsWithColors.find((friend) => friend.id === selectedFriendId) || friendsWithColors[0],
    [friendsWithColors, selectedFriendId]
  );

  const visibleTasks = selectedFriendId === "me" ? myTasks : selectedFriend.tasks;

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

  const streakDays = useMemo(
    () => backendStreakDays ?? calculateCurrentGroupStreak(currentDate, zeroTaskDates, groupStats),
    [backendStreakDays, currentDate, zeroTaskDates, groupStats]
  );

  const selectedMemberStats = useMemo(
    () => groupStats.members.find((member) => member.id === selectedFriendId) || groupStats.members[0],
    [groupStats.members, selectedFriendId]
  );

  const selectedSpecialTask = specialTasks[selectedFriendId] || {
    done: false,
    photo: null,
    completedAt: null,
  };

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
        : buildAnalyticsSeries(7, currentDate, myTasks, zeroTaskDates, friendsWithColors, groupCreatedDateKey),
    [currentDate, friendsWithColors, groupCreatedDateKey, myTasks, weekStatsResponse, zeroTaskDates]
  );

  const monthAnalyticsData = useMemo(
    () =>
      monthStatsResponse
        ? normalizeStatsResponse(monthStatsResponse, friendsWithColors)
        : buildAnalyticsSeries(30, currentDate, myTasks, zeroTaskDates, friendsWithColors, groupCreatedDateKey),
    [currentDate, friendsWithColors, groupCreatedDateKey, monthStatsResponse, myTasks, zeroTaskDates]
  );

  const selectedMemberColor = selectedFriend.color;
  const selectedMemberColorSoft = hexToRgba(selectedMemberColor, 0.22);

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

    if (habitId && authToken) {
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
        return;
      } catch (error) {
        setPageError(getErrorMessage(error));
        return;
      }
    }

    setMemberColors(nextColors);
    setDraftMemberColors(nextColors);
  };

  const handleRequestRemoveMember = (member) => {
    if (!member || member.id === "me") return;

    setMemberRemoveConfirm(member);
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberRemoveConfirm || memberRemoveConfirm.id === "me") return;

    const memberId = memberRemoveConfirm.id;

    if (habitId && authToken && memberRemoveConfirm.backendMemberId) {
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
        return;
      } catch (error) {
        setPageError(getErrorMessage(error));
        return;
      }
    }

    setRemovedMemberIds((prev) => (prev.includes(memberId) ? prev : [...prev, memberId]));
    setMemberColors((prev) => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
    setDraftMemberColors((prev) => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });

    if (selectedFriendId === memberId) {
      setSelectedFriendId("me");
    }

    if (adminMemberId === memberId) {
      setAdminMemberId("me");
    }

    setMemberRemoveConfirm(null);
    setIsGroupSettingsOpen(false);
  };

  const handleOpenTaskEditor = () => {
    setIsGroupSettingsOpen(false);
    setIsTaskEditorOpen(true);
  };

  const handleSaveMyTasks = (nextTasks) => {
    setMyTasks(nextTasks);
    setIsTaskEditorOpen(false);
  };

  const handleOpenGroupInfoEditor = () => {
    setIsGroupSettingsOpen(false);
    setIsGroupInfoEditorOpen(true);
  };

  const handleOpenSelectedMemberInfo = () => {
    if (selectedFriendId === "me") return;

    setIsMemberInfoOpen(true);
  };

  const handleSaveGroupInfo = (nextInfo) => {
    setGroupInfo(nextInfo);
    setIsGroupInfoEditorOpen(false);
  };

  const handleRequestExitGroup = async () => {
    setIsGroupSettingsOpen(false);
    setIsExitConfirmOpen(true);
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
    } catch (error) {
      const message = getErrorMessage(error);

      setExitRequestError(message);
      setExitRequestStatus("error");
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

  const handleSpecialPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const src = URL.createObjectURL(file);
    const wasAlreadyDone = Boolean(specialTasks.me?.done);

    setSpecialTasks((prev) => ({
      ...prev,
      me: {
        done: true,
        photo: src,
        completedAt: getDateKey(currentDate),
      },
    }));

    if (!wasAlreadyDone) {
      setUserCoins((prevCoins) => prevCoins + SPECIAL_TASK_REWARD_COINS);
    }

    setIsSpecialUploadOpen(false);
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
    if (habitId && authToken) {
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
    } else {
      setNotes([]);
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

    if (habitId && authToken) {
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
        return;
      } catch (error) {
        setPageError(getErrorMessage(error));
        return;
      }
    }

    setNotes((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        x: nextX,
        y: nextY,
        pinXPercent: toPercent(nextX, boardWidth),
        pinYPercent: toPercent(nextY, boardHeight),
        text: content,
        authorId: "me",
      },
    ]);
    setNoteEditor(null);
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

    if (habitId && authToken && note?.backendNoteId) {
      try {
        await apiRequest(`/api/habits/${habitId}/notes/${note.backendNoteId}`, {
          method: "DELETE",
          token: authToken,
        });
        setActiveNoteMenu(null);
        await loadNotes();
        return;
      } catch (error) {
        setPageError(getErrorMessage(error));
        return;
      }
    }

    setNotes((prev) => prev.filter((item) => item.id !== activeNoteMenu.id));
    setActiveNoteMenu(null);
  };

  const onDrag = useCallback((event) => {
    if (!dragRef.current) return;

    const { id, rect, offsetX, offsetY, lastClientX, lastClientY } = dragRef.current;
    const noteWidth = window.innerWidth <= 760 ? 150 : 200;
    const noteMinHeight = 26;
    const nextX = Math.max(10, Math.min(rect.width - noteWidth + 160, event.clientX - rect.left - offsetX));
    const nextY = Math.max(10, Math.min(rect.height - noteMinHeight - 10, event.clientY - rect.top - offsetY));
    const pinXPercent = toPercent(nextX, rect.width);
    const pinYPercent = toPercent(nextY, rect.height);

    dragRef.current.pinXPercent = pinXPercent;
    dragRef.current.pinYPercent = pinYPercent;

    const movementX = event.clientX - lastClientX;
    const movementY = event.clientY - lastClientY;
    const movementPower = Math.min(1, Math.hypot(movementX, movementY) / 10);

    const currentTilt = dragRef.current.currentTilt || 0;
    const currentPeelX = dragRef.current.currentPeelX || 0;
    const currentPeelY = dragRef.current.currentPeelY || 0;

    const targetTilt =
      Math.abs(movementX) < 0.15
        ? currentTilt * 0.9
        : Math.max(-8, Math.min(8, Math.sign(movementX) * (2.2 + movementPower * 5.8)));

    const targetPeelX = Math.max(-5, Math.min(5, movementX * 0.18));
    const targetPeelY = Math.max(-5, Math.min(5, movementY * 0.18));

    const tilt = currentTilt + (targetTilt - currentTilt) * 0.22;
    const peelX = currentPeelX + (targetPeelX - currentPeelX) * 0.2;
    const peelY = currentPeelY + (targetPeelY - currentPeelY) * 0.2;

    dragRef.current.currentTilt = tilt;
    dragRef.current.currentPeelX = peelX;
    dragRef.current.currentPeelY = peelY;
    dragRef.current.lastClientX = event.clientX;
    dragRef.current.lastClientY = event.clientY;

    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? { ...note, x: nextX, y: nextY, pinXPercent, pinYPercent, dragging: true, tilt, peelX, peelY }
          : note
      )
    );
  }, []);

  const stopDrag = useCallback(async () => {
    if (!dragRef.current) return;

    const { id, backendNoteId, pinXPercent, pinYPercent } = dragRef.current;

    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? { ...note, dragging: false, tilt: 0, peelX: 0, peelY: 0 }
          : note
      )
    );

    dragRef.current = null;
    window.removeEventListener("mousemove", onDrag);

    if (habitId && authToken && backendNoteId && typeof pinXPercent === "number" && typeof pinYPercent === "number") {
      try {
        await apiRequest(`/api/habits/${habitId}/notes/${backendNoteId}`, {
          method: "PATCH",
          token: authToken,
          body: { pinXPercent, pinYPercent, bringToFront: true },
        });
        await loadNotes();
      } catch (error) {
        setPageError(getErrorMessage(error));
      }
    }
  }, [authToken, habitId, loadNotes, onDrag]);

  const startDrag = (event, noteId) => {
    if (event.button !== 0) return;

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
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      pinXPercent: Number(note.pinXPercent || 0),
      pinYPercent: Number(note.pinYPercent || 0),
      currentTilt: -2,
      currentPeelX: 0,
      currentPeelY: -2,
    };

    setActiveNoteMenu(null);
    setNotes((prev) =>
      prev.map((item) =>
        item.id === noteId
          ? { ...item, dragging: true, tilt: -2, peelX: 0, peelY: -2 }
          : item
      )
    );
    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", stopDrag, { once: true });
  };

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onDrag);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, [onDrag, stopDrag]);

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

          {(pageError || pageStatus === "loading") && (
            <div className="group-form-error-card" style={{ marginTop: 14 }}>
              {pageError || "Загружаю данные группы..."}
            </div>
          )}

          <div className="group-title-ribbon" aria-label={`Группа ${groupInfo.name}`}>
            <div className="group-title-ribbon__shape" />
            <div className="group-title-ribbon__content">
              <div className="group-title-ribbon__name">{groupInfo.name}</div>
              <div className="group-title-ribbon__streak">
                Серия: {streakDays} {streakDays === 1 ? "день" : "дней"} без пропуска
              </div>
            </div>
          </div>

          <main className="group-main">
            <AnimatedContent distance={80} duration={0.8} delay={0.08}>
              <section className="group-overview-section">
                <BorderGlow>
                  <div className="group-panel group-panel--overview">
                    <div className="group-overview-grid">
                      <aside
                        className="group-character-space group-character-space--clickable"
                        style={{ backgroundColor: bunnyShopState.backgroundColor }}
                        role="button"
                        tabIndex={0}
                        onClick={handleOpenBunnyShop}
                        onKeyDown={handleBunnyShopKeyDown}
                        aria-label={shouldShowCryBunny ? "Открыть магазин грустного зайца" : "Открыть магазин зайца"}
                      >
                        <Live2DBunny
                          modelUrl={activeBunnyModelUrl}
                          animationMode={activeBunnyAnimationMode}
                          isHappy={shouldShowHappyBunny}
                          accessoryParams={activeBunnyAccessoryParams}
                          isPaused={isBunnyShopOpen}
                        />
                        <div className="group-character-space__name" aria-label="Имя персонажа">
                          {bunnyShopState.name}
                        </div>
                      </aside>

                      <div className="group-task-board">
                        <div className="group-progress">
                          <div className="group-progress__track">
                            <div
                              className="group-progress__fill"
                              style={{ width: `${groupStats.percent}%` }}
                            />
                          </div>
                          <div className="group-progress__value">{groupStats.percent}%</div>
                        </div>

                        <div className="group-task-board__header">
                          <div className="member-heading">
                            {selectedFriendId === "me" ? (
                              <div
                                className="member-heading__avatar"
                                style={{ backgroundColor: selectedFriend.avatar?.color || selectedFriend.avatarColor }}
                                aria-label={`Твой аватар: ${selectedFriend.name}`}
                              >
                                {renderMemberAvatar(selectedFriend.avatar, selectedFriend.initials)}
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="member-heading__avatar member-heading__avatar--button"
                                style={{ backgroundColor: selectedFriend.avatar?.color || selectedFriend.avatarColor }}
                                onClick={handleOpenSelectedMemberInfo}
                                aria-label={`Открыть информацию участника: ${selectedFriend.name}`}
                              >
                                {renderMemberAvatar(selectedFriend.avatar, selectedFriend.initials)}
                              </button>
                            )}

                            <div>
                              <div className="member-heading__name">{selectedFriend.name}</div>
                              <div className="member-heading__status">
                                {selectedFriendId === "me" ? "твои задания" : "прогресс участника"} · {selectedMemberStats.completed}/{selectedMemberStats.total}
                              </div>
                            </div>
                          </div>

                          <div className="group-task-board__counter">
                            {groupStats.completed}/{groupStats.total} заданий группы
                          </div>
                        </div>

                        <AnimatedScrollList className="task-list" showGradients={false}>
                          {visibleTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              disabled={selectedFriendId !== "me"}
                              onToggle={() => handleToggleTask(task.id)}
                            />
                          ))}

                          <SpecialTaskCard
                            taskState={selectedSpecialTask}
                            disabled={selectedFriendId !== "me"}
                            isOwnTask={selectedFriendId === "me"}
                            rewardCoins={SPECIAL_TASK_REWARD_COINS}
                            onOpenUpload={() => setIsSpecialUploadOpen(true)}
                          />
                        </AnimatedScrollList>

                        <div className="group-task-board__footer">
                          <div
                            className="friend-stack"
                            onMouseEnter={() => setIsFriendsExpanded(true)}
                            onMouseLeave={() => setIsFriendsExpanded(false)}
                          >
                            <div className="friend-stack__inner">
                              {friendsWithColors.map((friend, index) => (
                                <button
                                  key={friend.id}
                                  type="button"
                                  className={`friend-stack__avatar ${
                                    selectedFriendId === friend.id ? "friend-stack__avatar--active" : ""
                                  }`}
                                  style={{
                                    backgroundColor: friend.avatar?.color || friend.avatarColor,
                                    left: isFriendsExpanded ? `${index * 46}px` : `${index * 22}px`,
                                    zIndex: 20 - index,
                                  }}
                                  onClick={() => setSelectedFriendId(friend.id)}
                                  aria-label={`Показать задания: ${friend.name}`}
                                >
                                  {renderMemberAvatar(friend.avatar, friend.initials)}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div
                            className={`group-settings ${isGroupSettingsOpen ? "group-settings--open" : ""}`}
                            ref={settingsRef}
                            data-note-ui="true"
                          >
                            <button
                              type="button"
                              className={`group-settings__trigger ${isGroupSettingsOpen ? "group-settings__trigger--active" : ""}`}
                              onClick={handleToggleGroupSettings}
                              aria-expanded={isGroupSettingsOpen}
                              aria-label="Открыть настройки группы"
                            >
                              <img className="group-settings__gear-icon" src={gearIcon} alt="" aria-hidden="true" />
                            </button>

                            {isGroupSettingsOpen && (
                              <GroupSettingsPanel
                                members={settingsMembers}
                                savedMemberColors={memberColors}
                                hasChanges={hasUnsavedMemberColors}
                                onColorChange={handleMemberColorChange}
                                onSave={handleSaveMemberColors}
                                onEditTasks={handleOpenTaskEditor}
                                onEditGroupInfo={handleOpenGroupInfoEditor}
                                onRequestRemoveMember={handleRequestRemoveMember}
                                onRequestExit={handleRequestExitGroup}
                                adminMemberId={adminMemberId}
                                groupCode={groupCode}
                                isOwner={isOwner}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </BorderGlow>
              </section>
            </AnimatedContent>

            <section className="group-content-grid">
              <AnimatedContent distance={80} duration={0.8} delay={0.15}>
                <BorderGlow>
                  <div className="group-panel group-panel--calendar">
                    <div className="group-panel__heading">
                      <div className="section-label">Календарь и аналитика</div>
                      <h2 className="section-title">Ритм группы</h2>
                      <p className="section-description">
                        Календарь рассчитывается по состоянию дня с backend: зелёный — good,
                        красный — bad, нейтральный — ok или null. Особое задание
                        в календарь и общий прогресс не входит.
                      </p>
                    </div>

                    <div className="rhythm-grid">
                      <CalendarBlock
                        calendarMode={calendarMode}
                        setCalendarMode={setCalendarMode}
                        viewedDate={viewedDate}
                        setViewedDate={setViewedDate}
                        currentDate={currentDate}
                        zeroTaskDates={zeroTaskDates}
                        groupStats={groupStats}
                        calendarDays={calendarDays}
                      />

                      <div className="analytics-list">
                        <AnalyticsAccordion
                          title="Аналитика недели"
                          isOpen={analyticsOpen.week}
                          onToggle={() =>
                            setAnalyticsOpen((prev) => ({ ...prev, week: !prev.week }))
                          }
                          data={weekAnalyticsData}
                          />

                        <AnalyticsAccordion
                          title="Аналитика месяца"
                          isOpen={analyticsOpen.month}
                          onToggle={() =>
                            setAnalyticsOpen((prev) => ({ ...prev, month: !prev.month }))
                          }
                          data={monthAnalyticsData}
                          />
                      </div>
                    </div>
                  </div>
                </BorderGlow>
              </AnimatedContent>

              <div
                ref={notesRevealRef}
                className={`group-notes-reveal ${isNotesPanelVisible ? "group-notes-reveal--visible" : ""}`}
              >
                <BorderGlow>
                  <div
                    ref={notesPanelRef}
                    className="group-panel group-panel--notes"
                    onContextMenu={handleNotesBoardContextMenu}
                    aria-label="Поле заметок группы"
                  >
                    <div className="section-label">Записки</div>
                    <h2 className="section-title">Общее поле заметок</h2>
                    <p className="section-description">
                      Щёлкни правой кнопкой мыши по этой панели, чтобы открыть меню записки. После
                      создания записку можно перетаскивать только внутри этого блока.
                    </p>

                    <div className="group-notes-layer">
                      {notes.map((note) => {
                        const noteAuthor =
                          friendsWithColors.find((friend) => String(friend.backendMemberId) === String(note.authorMemberId)) ||
                          friendsWithColors.find((friend) => friend.id === note.authorId) ||
                          friendsWithColors[0];

                        return (
                          <button
                            key={note.id}
                            type="button"
                            data-note-item="true"
                            className={`sticky-note ${note.dragging ? "sticky-note--dragging" : ""}`}
                            style={{
                              left: typeof note.x === "number" ? note.x : `${note.pinXPercent || 0}%`,
                              top: typeof note.y === "number" ? note.y : `${note.pinYPercent || 0}%`,
                              zIndex: note.dragging ? 200 : note.zIndex,
                              minHeight: Math.max(96, 96 + Math.floor(note.text.length / 42) * 22),
                              "--note-accent": noteAuthor.color,
                              "--note-accent-soft": hexToRgba(noteAuthor.color, 0.22),
                              "--note-tilt": `${note.tilt || 0}deg`,
                              "--note-peel-x": `${note.peelX || 0}px`,
                              "--note-peel-y": `${note.peelY || 0}px`,
                            }}
                            onMouseDown={(event) => startDrag(event, note.id)}
                            onContextMenu={(event) => openNoteActions(event, note.id)}
                            aria-label={`Записка от ${noteAuthor.name}: ${note.text}`}
                            title={`Автор: ${noteAuthor.name}`}
                          >
                            {!note.dragging && <span className="sticky-note__pin" aria-hidden="true" />}
                            <span className="sticky-note__text">{note.text}</span>
                            <span className="sticky-note__fold" aria-hidden="true" />
                          </button>
                        );
                      })}
                    </div>

                    {notesMenu && (
                      <FloatingMenu x={notesMenu.x} y={notesMenu.y}>
                        <button type="button" data-note-ui="true" onClick={openNoteEditor} className="menu-item">
                          Написать записку
                        </button>
                        {notes.length > 0 && (
                          <button
                            type="button"
                            data-note-ui="true"
                            onClick={requestClearNotes}
                            className="menu-item menu-item--danger"
                          >
                            Очистить поле
                          </button>
                        )}
                      </FloatingMenu>
                    )}

                    {activeNoteMenu && (
                      <FloatingMenu x={activeNoteMenu.x} y={activeNoteMenu.y}>
                        <button
                          type="button"
                          data-note-ui="true"
                          onClick={deleteNote}
                          className="menu-item menu-item--danger"
                        >
                          Удалить записку
                        </button>
                      </FloatingMenu>
                    )}
                  </div>
                </BorderGlow>
              </div>
            </section>
          </main>
        </div>

        {isTaskEditorOpen && (
          <TaskEditorModal
            tasks={myTasks}
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
            groupInfo={groupInfo}
            onClose={() => setIsGroupInfoEditorOpen(false)}
            onSave={handleSaveGroupInfo}
          />
        )}

        {isMemberInfoOpen && (
          <MemberInfoModal
            member={selectedFriend}
            memberStats={selectedMemberStats}
            groupInfo={groupInfo}
            categoryName="Чтение"
            streakDays={streakDays}
            isAdmin={selectedFriend.id === adminMemberId}
            onClose={() => setIsMemberInfoOpen(false)}
          />
        )}

        {isSpecialUploadOpen && (
          <div
            className="modal-backdrop"
            data-note-ui="true"
            onClick={() => setIsSpecialUploadOpen(false)}
          >
            <div className="modal-card" onClick={(event) => event.stopPropagation()}>
              <div className="modal-card__title">Прикрепить фото</div>
              <div className="modal-card__text">
                Особое задание выполняется лично и не влияет на общий прогресс группы.
                После первого выполнения начислится {SPECIAL_TASK_REWARD_COINS} монет.
              </div>

              <label className="upload-field">
                <span>Выбрать фото</span>
                <input type="file" accept="image/*" onChange={handleSpecialPhoto} />
              </label>
            </div>
          </div>
        )}

        {isExitConfirmOpen && (
          <div
            className="modal-backdrop"
            data-note-ui="true"
            onClick={closeExitConfirm}
          >
            <div className="modal-card" onClick={(event) => event.stopPropagation()}>
              {exitRequestStatus === "loading" ? (
                <>
                  <div className="modal-card__title">Проверка выхода</div>
                  <div className="modal-card__text">
                    Проверяем, можно ли выйти из группы без передачи прав или удаления привычки.
                  </div>
                </>
              ) : exitRequestStatus === "error" ? (
                <>
                  <div className="modal-card__title">Не удалось выйти из группы</div>
                  <div className="modal-card__text modal-card__text--warning">
                    {exitRequestError || pageError || "Ошибка запроса к серверу"}
                  </div>

                  <div className="modal-card__actions">
                    <button
                      type="button"
                      className="modal-card__button modal-card__button--ghost"
                      onClick={closeExitConfirm}
                    >
                      Закрыть
                    </button>
                  </div>
                </>
              ) : exitModalStep === "confirm" ? (
                <>
                  <div className="modal-card__title">
                    {exitPreview?.mode === "delete_habit_on_leave" ? "Удалить группу при выходе?" : "Выйти из группы?"}
                  </div>
                  <div
                    className={`modal-card__text ${
                      exitPreview?.mode === "delete_habit_on_leave" ? "modal-card__text--warning" : ""
                    }`}
                  >
                    {exitPreview?.mode === "delete_habit_on_leave"
                      ? "Если Вы покинете привычку, она будет удалена вместе с прогрессом. Восстановлению группа не подлежит."
                      : "Вы уверены, что хотите выйти из группы? Вы сможете вернуться в течение 48 часов без потери прогресса."}
                  </div>

                  {exitRequestError && (
                    <div className="modal-card__text modal-card__text--warning">
                      {exitRequestError}
                    </div>
                  )}

                  <div className="modal-card__actions">
                    <button
                      type="button"
                      className="modal-card__button modal-card__button--ghost"
                      onClick={closeExitConfirm}
                      disabled={exitRequestStatus === "submitting"}
                    >
                      Остаться
                    </button>
                    <button
                      type="button"
                      className="modal-card__button modal-card__button--danger"
                      onClick={handleConfirmExitGroup}
                      disabled={exitRequestStatus === "submitting"}
                    >
                      {exitRequestStatus === "submitting"
                        ? "Выход..."
                        : exitPreview?.mode === "delete_habit_on_leave"
                          ? "Выйти и удалить"
                          : "Выйти"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="modal-card__title">Передать права администратора</div>
                  <div className="modal-card__text">
                    Перед выходом нужно выбрать нового владельца группы.
                  </div>

                  {exitTransferMembers.length > 0 ? (
                    <div className="admin-transfer-list">
                      {exitTransferMembers.map((member) => (
                        <label
                          key={member.id}
                          className={`admin-transfer-option ${
                            activeAdminTransferMemberId === member.id ? "admin-transfer-option--active" : ""
                          }`}
                        >
                          <input
                            type="radio"
                            name="admin-transfer-member"
                            value={member.id}
                            checked={activeAdminTransferMemberId === member.id}
                            onChange={() => setAdminTransferMemberId(member.id)}
                          />
                          <span
                            className="admin-transfer-option__avatar"
                            style={{ backgroundColor: member.avatar?.color || member.avatarColor }}
                            aria-hidden="true"
                          >
                            {renderMemberAvatar(member.avatar, member.initials)}
                          </span>
                          <span className="admin-transfer-option__text">
                            <strong>{member.name}</strong>
                            <small>{member.login || member.email}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="modal-card__text modal-card__text--warning">
                      Сервер не вернул участников, которым можно передать права владельца.
                    </div>
                  )}

                  {exitRequestError && (
                    <div className="modal-card__text modal-card__text--warning">
                      {exitRequestError}
                    </div>
                  )}

                  <div className="modal-card__actions">
                    <button
                      type="button"
                      className="modal-card__button modal-card__button--ghost"
                      onClick={closeExitConfirm}
                      disabled={exitRequestStatus === "submitting"}
                    >
                      Остаться
                    </button>
                    <button
                      type="button"
                      className="modal-card__button modal-card__button--danger"
                      onClick={handleConfirmExitGroup}
                      disabled={exitTransferMembers.length === 0 || exitRequestStatus === "submitting"}
                    >
                      {exitRequestStatus === "submitting" ? "Выход..." : "Передать и выйти"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {memberRemoveConfirm && (
          <div
            className="modal-backdrop"
            data-note-ui="true"
            onClick={() => setMemberRemoveConfirm(null)}
          >
            <div className="modal-card" onClick={(event) => event.stopPropagation()}>
              <div className="modal-card__title">Исключить участника?</div>
              <div className="modal-card__text">
                Пользователь {memberRemoveConfirm.name} будет исключён из группы и не сможет присоединиться повторно по коду приглашения.
                Его задания, прогресс и заметки в этой привычке будут удалены.
              </div>

              <div className="modal-card__actions">
                <button
                  type="button"
                  className="modal-card__button modal-card__button--ghost"
                  onClick={() => setMemberRemoveConfirm(null)}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="modal-card__button modal-card__button--danger"
                  onClick={handleConfirmRemoveMember}
                >
                  Исключить
                </button>
              </div>
            </div>
          </div>
        )}

        {isClearNotesConfirmOpen && (
          <div
            className="modal-backdrop"
            data-note-ui="true"
            onClick={() => setIsClearNotesConfirmOpen(false)}
          >
            <div className="modal-card" onClick={(event) => event.stopPropagation()}>
              <div className="modal-card__title">Очистить поле?</div>
              <div className="modal-card__text">
                Вы точно хотите удалить все записки с поля? Это действие очистит только записки на текущей странице группы.
              </div>

              <div className="modal-card__actions">
                <button
                  type="button"
                  className="modal-card__button modal-card__button--ghost"
                  onClick={() => setIsClearNotesConfirmOpen(false)}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="modal-card__button modal-card__button--danger"
                  onClick={confirmClearNotes}
                >
                  Очистить
                </button>
              </div>
            </div>
          </div>
        )}

        {noteEditor && (
          <div className="modal-backdrop modal-backdrop--note" data-note-ui="true" onClick={() => setNoteEditor(null)}>
            <div className="note-editor" onClick={(event) => event.stopPropagation()}>
              <div className="note-editor__title">Новая записка</div>

              <textarea
                autoFocus
                maxLength={200}
                value={noteEditor.text}
                onChange={(event) =>
                  setNoteEditor((prev) => ({ ...prev, text: event.target.value }))
                }
                placeholder="Напиши, что хочешь сохранить для группы..."
                className="note-editor__textarea"
              />

              <div className="note-editor__footer">
                <div className="note-editor__count">{noteEditor.text.length}/200</div>
                <button type="button" data-note-ui="true" onClick={saveNote} className="note-editor__button">
                  Готово
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClickSpark>
  );
}


const MEMBER_ACHIEVEMENT_TITLES = {
  me: ["Книжный старт", "Тихий читатель", "Верность группе"],
  anna: ["Стабильный темп", "Командный вклад", "Две отметки подряд"],
  mira: ["Первый шаг", "Возвращение к ритму"],
  sofia: ["Идеальный день", "Серия без пауз", "Командный пример"],
};

function getMemberAchievements(member, memberStats) {
  const preset = MEMBER_ACHIEVEMENT_TITLES[member?.id] || ["Участник группы"];
  const donePercent = memberStats?.total > 0 ? Math.round((memberStats.completed / memberStats.total) * 100) : 0;

  return preset.map((title, index) => ({
    id: `${member?.id || "member"}-achievement-${index}`,
    title,
    desc:
      index === 0
        ? `Сегодня выполнено ${memberStats?.completed || 0}/${memberStats?.total || 0} обычных заданий.`
        : donePercent === 100
          ? "Участник закрыл все обычные задания за день."
          : "Достижение участника внутри этой группы.",
  }));
}

function MemberInfoModal({ member, memberStats, groupInfo, categoryName, streakDays, isAdmin, onClose }) {
  const achievements = getMemberAchievements(member, memberStats);

  return (
    <div className="modal-backdrop member-info-backdrop" data-note-ui="true" onClick={onClose}>
      <div className="member-info-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="task-editor-modal__close" onClick={onClose} aria-label="Закрыть окно">
          ×
        </button>

        <div className="member-info-modal__header">
          <div className="member-info-modal__identity">
            <div className="section-label">Информация участника</div>
            <h2 className="member-info-modal__name">{member.name}</h2>
            {isAdmin && <div className="member-info-modal__role">Администратор группы</div>}
          </div>
        </div>

        <div className="member-info-modal__content">
          <div className="member-info-record-row">
            <div
              className="member-info-record-avatar"
              style={{ backgroundColor: member.avatar?.color || member.avatarColor }}
              aria-hidden="true"
            >
              {renderMemberAvatar(member.avatar, member.initials)}
            </div>

            <section className="member-info-record record-streak">
              <div className="record-streak__inner member-info-record__inner">
                <div className="record-streak__days member-info-record__days">
                  <span className="record-streak__card-label">Дней</span>
                  <strong className="record-streak__value member-info-record__value">{streakDays}</strong>
                </div>

                <div className="record-streak__details member-info-record__details">
                  <div className="record-streak__meta-card member-info-record__meta-card">
                    <span className="record-streak__card-label">Категория</span>
                    <strong className="record-streak__meta-value member-info-record__meta-value">{categoryName}</strong>
                  </div>

                  <div className="record-streak__meta-card member-info-record__meta-card">
                    <span className="record-streak__card-label">Группа</span>
                    <strong className="record-streak__meta-value member-info-record__meta-value">{groupInfo.name}</strong>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="member-info-achievements">
            <div className="member-info-achievements__title">Достижения</div>
            <div className="member-info-achievements__list">
              {achievements.map((achievement) => (
                <div key={achievement.id} className="member-info-achievement achievement-card">
                  <div className="achievement-card__content">
                    <div className="achievement-card__icon member-info-achievement__icon" aria-hidden="true">
                      <img src={achievementIcon} alt="" className="achievement-card__icon-image member-info-achievement__icon-image" />
                    </div>
                    <div className="member-info-achievement__text">
                      <strong>{achievement.title}</strong>
                      <small>{achievement.desc}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


function GroupInfoEditorModal({ groupInfo, onClose, onSave }) {
  const [draftName, setDraftName] = useState(groupInfo.name || "");
  const [draftDescription, setDraftDescription] = useState(groupInfo.description || "");
  const [errors, setErrors] = useState({});

  const handleSave = () => {
    const nextName = draftName.trim();
    const nextDescription = draftDescription.trim();
    const nextErrors = {};

    if (!nextName) {
      nextErrors.name = "Введите название группы";
    } else if (nextName.length < 2) {
      nextErrors.name = "Название должно быть не короче 2 символов";
    } else if (nextName.length > 80) {
      nextErrors.name = "Название должно быть не длиннее 80 символов";
    }

    if (nextDescription.length > 500) {
      nextErrors.description = "Описание должно быть не длиннее 500 символов";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    onSave({
      name: nextName,
      description: nextDescription,
    });
  };

  return (
    <div className="modal-backdrop task-editor-backdrop" data-note-ui="true" onClick={onClose}>
      <div className="task-editor-modal group-info-editor-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="task-editor-modal__close" onClick={onClose} aria-label="Закрыть окно">
          ×
        </button>

        <div className="task-editor-modal__header">
          <div className="section-label">Настройки группы</div>
          <h2 className="task-editor-modal__title">Изменить название и описание</h2>
          <p className="task-editor-modal__text">
            Эти данные отображаются на странице группы. Потом этот же блок можно будет связать с PATCH-запросом к бэкенду.
          </p>
        </div>

        <div className="group-info-editor__body">
          <label className={`group-info-editor__field ${errors.name ? "group-info-editor__field--error" : ""}`}>
            <span>Название группы</span>
            <input
              type="text"
              value={draftName}
              maxLength={80}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Например, Quiet Pages"
            />
            {errors.name && <small className="group-form-error">{errors.name}</small>}
          </label>

          <label className={`group-info-editor__field ${errors.description ? "group-info-editor__field--error" : ""}`}>
            <span>Описание группы</span>
            <textarea
              value={draftDescription}
              maxLength={500}
              onChange={(event) => setDraftDescription(event.target.value)}
              placeholder="Коротко опиши цель группы"
            />
            <small className="group-info-editor__counter">{draftDescription.length}/500</small>
            {errors.description && <small className="group-form-error">{errors.description}</small>}
          </label>
        </div>

        <div className="task-editor-modal__footer">
          <button type="button" className="modal-card__button task-editor-modal__save" onClick={handleSave}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskEditorModal({ tasks, onClose, onSave }) {
  const [draft, setDraft] = useState(() => createTaskEditorDraft(tasks));
  const [errors, setErrors] = useState({ templates: {}, customTasks: {}, common: "" });

  const toggleTemplate = (templateId) => {
    const template = PERSONAL_TASK_TEMPLATES.find((item) => item.id === templateId);

    setDraft((prev) => {
      const currentIds = prev.selectedTaskIds || [];
      const isSelected = currentIds.includes(templateId);
      const nextIds = isSelected
        ? currentIds.filter((id) => id !== templateId)
        : [...currentIds, templateId];

      return {
        ...prev,
        selectedTaskIds: nextIds,
        templateValues: {
          ...prev.templateValues,
          ...(template?.valueType === "none" && !isSelected ? { [templateId]: "" } : {}),
        },
      };
    });
  };

  const toggleCustomTask = (taskId) => {
    setDraft((prev) => {
      const currentIds = prev.customTaskIds || [];
      const nextIds = currentIds.includes(taskId)
        ? currentIds.filter((id) => id !== taskId)
        : [...currentIds, taskId];

      return {
        ...prev,
        customTaskIds: nextIds,
      };
    });
  };

  const updateTemplateValue = (template, value) => {
    setDraft((prev) => ({
      ...prev,
      templateValues: {
        ...prev.templateValues,
        [template.id]: sanitizeTaskEditorTemplateValue(template, value),
      },
    }));
  };

  const updateCustomTask = (taskId, value) => {
    setDraft((prev) => ({
      ...prev,
      customTasks: {
        ...prev.customTasks,
        [taskId]: value,
      },
    }));
  };

  const handleSave = () => {
    const nextErrors = validateTaskEditorDraft(draft);
    setErrors(nextErrors);

    if (hasTaskEditorErrors(nextErrors)) return;

    onSave(buildTasksFromEditorDraft(draft, tasks));
  };

  return (
    <div className="modal-backdrop task-editor-backdrop" data-note-ui="true" onClick={onClose}>
      <div className="task-editor-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="task-editor-modal__close" onClick={onClose} aria-label="Закрыть окно">
          ×
        </button>

        <div className="task-editor-modal__header">
          <div className="section-label">Личные задания</div>
          <h2 className="task-editor-modal__title">Изменить мои задания</h2>
          <p className="task-editor-modal__text">
            Эти изменения применяются только к твоему списку. Особое задание не меняется и продолжает жить отдельно.
          </p>
        </div>

        <div className="task-editor-scroll">
          {errors.common && <div className="group-form-error-card">{errors.common}</div>}

          <div className="task-editor-template-list">
            {PERSONAL_TASK_TEMPLATES.map((template) => {
              const isChecked = (draft.selectedTaskIds || []).includes(template.id);
              const errorMessage = errors.templates?.[template.id];
              const hasError = Boolean(errorMessage);
              const currentValue = draft.templateValues?.[template.id] || "";
              const inputProps = getTaskEditorInputProps(template);
              const { before } = splitTemplateText(template.templateText);
              const tail = getTaskEditorTemplateTail(template, currentValue);
              const choices = getTaskEditorChoices(template);

              return (
                <div
                  key={template.id}
                  className={`task-editor-template ${isChecked ? "task-editor-template--checked" : ""} ${hasError ? "task-editor-template--error" : ""}`}
                >
                  <label className="task-editor-template__main">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleTemplate(template.id)}
                    />
                    <span className="task-editor-template__dot" />
                    <span className="task-editor-template__text">
                      {template.valueType === "none" ? (
                        <span>{template.templateText}</span>
                      ) : (
                        <>
                          {before && <span>{before}</span>}
                          {template.valueType === "choice" ? (
                            <span className="group-form-choice-list" aria-label="Выберите значение задания">
                              {choices.map((choice) => (
                                <button
                                  key={choice}
                                  type="button"
                                  className={`group-form-choice-chip ${currentValue === choice ? "group-form-choice-chip--active" : ""}`}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    if (!isChecked) toggleTemplate(template.id);
                                    updateTemplateValue(template, choice);
                                  }}
                                >
                                  {choice}
                                </button>
                              ))}
                            </span>
                          ) : (
                            <input
                              {...inputProps}
                              value={currentValue}
                              onChange={(event) => updateTemplateValue(template, event.target.value)}
                              aria-invalid={hasError}
                            />
                          )}
                          {tail && <span>{tail}</span>}
                        </>
                      )}
                    </span>
                  </label>

                  {hasError && <small className="group-form-error task-editor-template__error">{errorMessage}</small>}
                </div>
              );
            })}
          </div>

          <div className="task-editor-custom-head group-form-custom-head">
            <span>Вписать своё задание</span>
            <span className="group-form-info" tabIndex={0} aria-label="Информация о своих заданиях">
              !
              <span className="group-form-info__tooltip">За выполнение данных заданий нельзя получить достижение</span>
            </span>
          </div>

          <div className="task-editor-custom-list">
            {PERSONAL_CUSTOM_TASK_IDS.map((id, index) => {
              const isChecked = (draft.customTaskIds || []).includes(id);
              const customError = errors.customTasks?.[id];
              const hasError = Boolean(customError);

              return (
                <label
                  key={id}
                  className={`task-editor-custom-task ${isChecked ? "task-editor-custom-task--checked" : ""} ${hasError ? "task-editor-custom-task--error" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCustomTask(id)}
                  />
                  <span className="task-editor-template__dot" />
                  <span className="task-editor-custom-task__body">
                    <input
                      value={draft.customTasks?.[id] || ""}
                      onChange={(event) => updateCustomTask(id, event.target.value)}
                      placeholder={`Своё задание ${index + 1}`}
                      maxLength={160}
                      aria-invalid={hasError}
                    />
                    {hasError && <small className="group-form-error">{customError}</small>}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="task-editor-modal__footer">
          <button type="button" className="modal-card__button task-editor-modal__save" onClick={handleSave}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupSettingsPanel({
  members,
  savedMemberColors,
  hasChanges,
  onColorChange,
  onSave,
  onEditTasks,
  onEditGroupInfo,
  onRequestRemoveMember,
  onRequestExit,
  adminMemberId,
  groupCode,
  isOwner,
}) {
  const [isCodeCopied, setIsCodeCopied] = useState(false);

  const handleCopyGroupCode = useCallback(async () => {
    if (!groupCode) return;

    try {
      await navigator.clipboard.writeText(groupCode);
      setIsCodeCopied(true);
    } catch {
      setIsCodeCopied(false);
    }
  }, [groupCode]);

  return (
    <div
      className={`group-settings__panel ${hasChanges ? "group-settings__panel--unsaved" : ""}`}
      onClick={(event) => event.stopPropagation()}
    >
      {hasChanges && (
        <button
          type="button"
          className="group-settings__save"
          onClick={onSave}
        >
          Сохранить
        </button>
      )}

      <div className="group-settings__title">Настройки группы</div>

      <div className="group-settings__scroll">
        <div className="group-settings__subtitle">Изменить цвет участника. Цвет применится после сохранения.</div>

        <div className="group-color-list">
          {members.map((member) => {
          const isOwnProfile = member.id === "me";
          const label = isOwnProfile ? "Вы" : member.name;
          const savedColor = normalizeHexColor(savedMemberColors[member.id], member.color);
          const hasRowChanges = normalizeHexColor(member.color, savedColor) !== savedColor;

          return (
            <div
              key={member.id}
              className={`group-color-row ${hasRowChanges ? "group-color-row--unsaved" : ""}`}
            >
              <div className="group-color-row__person">
                <span
                  className="group-color-row__avatar"
                  style={{ backgroundColor: member.avatar?.color || member.avatarColor }}
                  aria-hidden="true"
                >
                  {renderMemberAvatar(member.avatar, member.initials)}
                </span>
                <span className="group-color-row__text">
                  <span className="group-color-row__name">{label}</span>
                  {member.id === adminMemberId && (
                    <span className="group-color-row__role">Администратор</span>
                  )}
                </span>
              </div>

              {hasRowChanges && (
                <span className="group-color-row__unsaved">Цвет ещё не сохранён</span>
              )}

              <div className="group-color-row__controls">
                <input
                  type="color"
                  value={member.color}
                  onChange={(event) => onColorChange(member.id, event.target.value)}
                  className="group-color-swatch"
                  style={{ backgroundColor: member.color }}
                  aria-label={`Изменить цвет: ${label}`}
                  title={member.color}
                />

                {!isOwnProfile && isOwner && (
                  <button
                    type="button"
                    className="group-color-row__remove"
                    onClick={() => onRequestRemoveMember(member)}
                    aria-label={`Удалить из группы: ${member.name}`}
                    title="Удалить из группы"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className="group-settings__tasks" onClick={onEditTasks}>
        Изменить задания
      </button>

      <button type="button" className="group-settings__tasks" onClick={onEditGroupInfo}>
        Изменить название и описание
      </button>

      <div className="group-settings-code-card">
        <span className="group-settings-code-card__label">Код группы</span>
        <button type="button" className="group-settings-code-card__value" onClick={handleCopyGroupCode}>
          {groupCode}
        </button>
        <small className="group-settings-code-card__hint">
          {isCodeCopied ? "Код скопирован" : "Нажми на код, чтобы скопировать"}
        </small>
      </div>

        <button type="button" className="group-settings__exit" onClick={onRequestExit}>
          Выйти из группы
        </button>
      </div>
    </div>
  );
}

function TaskCard({ task, disabled, onToggle }) {
  return (
    <div className={`task-card ${task.done ? "task-card--done" : ""}`}>
      <div className="task-card__content">
        <button
          type="button"
          disabled={disabled}
          onClick={onToggle}
          className={`task-card__check ${task.done ? "task-card__check--done" : ""}`}
          aria-label={task.done ? "Отменить выполнение" : "Отметить выполненным"}
        >
          <AnimatedCheckMark visible={task.done} />
        </button>

        <div className="task-card__body">
          <div className="task-card__title">
            <TaskDoneAnimation done={task.done}>{task.title}</TaskDoneAnimation>
          </div>
          {task.desc && <div className="task-card__desc">{task.desc}</div>}
        </div>
      </div>
    </div>
  );
}

function SpecialTaskCard({ taskState, disabled, isOwnTask, rewardCoins, onOpenUpload }) {
  const done = Boolean(taskState?.done);
  const photo = taskState?.photo;

  return (
    <div className={`special-task-card ${done ? "special-task-card--done" : ""}`}>
      <div className="special-task-card__content">
        <button
          type="button"
          disabled={disabled}
          onClick={onOpenUpload}
          className={`special-task-card__button ${done ? "special-task-card__button--done" : ""}`}
          aria-label={done ? "Особое задание выполнено" : "Прикрепить фото к особому заданию"}
        >
          <AnimatedCheckMark visible={done} />
        </button>

        <div className="special-task-card__body">
          <div className="special-task-card__title">
            <TaskDoneAnimation done={done} variant="special">
              {uniqueTaskBase.title}
            </TaskDoneAnimation>
          </div>
          <div className="special-task-card__desc">{uniqueTaskBase.desc}</div>
          <div className="special-task-card__meta">
            Личное задание · не входит в прогресс группы · +{rewardCoins} монет
          </div>
          {!isOwnTask && (
            <div className="special-task-card__meta special-task-card__meta--muted">
              У каждого участника это задание отмечается только в его личном профиле.
            </div>
          )}
          {photo && (
            <div className="special-task-card__image-frame">
              <img src={photo} alt="Подтверждение задания" className="special-task-card__image" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CalendarBlock({
  calendarMode,
  setCalendarMode,
  viewedDate,
  setViewedDate,
  currentDate,
  zeroTaskDates,
  groupStats,
  calendarDays,
}) {
  const daysGridRef = useRef(null);
  const [calendarMeasurements, setCalendarMeasurements] = useState({
    fullHeight: null,
    weekHeight: null,
    weekOffset: 0,
  });
  const monthCells = useMemo(() => buildMonthCells(viewedDate), [viewedDate]);
  const monthRows = useMemo(() => chunkCalendarRows(monthCells), [monthCells]);
  const calendarDayByDate = useMemo(
    () => new Map((calendarDays || []).map((day) => [day.date, day])),
    [calendarDays]
  );
  const activeRowIndex = useMemo(
    () => getActiveMonthRowIndex(monthRows, viewedDate),
    [monthRows, viewedDate]
  );
  const monthTitle = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(viewedDate);
  const viewportHeight =
    calendarMode === "week" ? calendarMeasurements.weekHeight : calendarMeasurements.fullHeight;
  const gridTranslateY = calendarMode === "week" ? -calendarMeasurements.weekOffset : 0;

  useLayoutEffect(() => {
    if (!daysGridRef.current) return;

    const grid = daysGridRef.current;
    const updateMeasurements = () => {
      const rows = grid.querySelectorAll(".calendar-row");
      const activeRow = rows[activeRowIndex];

      setCalendarMeasurements({
        fullHeight: grid.scrollHeight,
        weekHeight: activeRow?.offsetHeight || null,
        weekOffset: activeRow?.offsetTop || 0,
      });
    };

    updateMeasurements();

    if (typeof ResizeObserver === "undefined") return undefined;

    const resizeObserver = new ResizeObserver(updateMeasurements);
    resizeObserver.observe(grid);

    return () => resizeObserver.disconnect();
  }, [activeRowIndex, monthRows.length, groupStats.completed, groupStats.total]);

  const shiftDate = (direction) => {
    setViewedDate((prev) => {
      const next = new Date(prev);

      if (calendarMode === "week") {
        next.setDate(prev.getDate() + direction * 7);
      } else {
        next.setMonth(prev.getMonth() + direction);
      }

      return next;
    });
  };

  return (
    <div className="calendar-card">
      <div className="calendar-card__header">
        <div>
          <div className="calendar-card__month">{monthTitle}</div>
          <div className="calendar-card__mode">
            {calendarMode === "week" ? "Просмотр по неделям" : "Просмотр по месяцам"}
          </div>
        </div>

        <div className="calendar-card__controls">
          <button type="button" className="round-control" onClick={() => shiftDate(-1)} aria-label="Назад">
            <span className="round-control__arrow round-control__arrow--prev" />
          </button>
          <button
            type="button"
            className="calendar-card__toggle"
            onClick={() => setCalendarMode((prev) => (prev === "week" ? "month" : "week"))}
          >
            {calendarMode === "week" ? "Неделя" : "Месяц"}
          </button>
          <button type="button" className="round-control" onClick={() => shiftDate(1)} aria-label="Вперёд">
            <span className="round-control__arrow" />
          </button>
        </div>
      </div>

      <div className="calendar-grid calendar-grid--labels">
        {weekDayLabels.map((day) => (
          <div key={day} className="calendar-grid__label">
            {day}
          </div>
        ))}
      </div>

      <div
        className={`calendar-days-viewport calendar-days-viewport--${calendarMode}`}
        style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}
      >
        <div
          ref={daysGridRef}
          className="calendar-month-stack"
          style={{ transform: `translateY(${gridTranslateY}px)` }}
        >
          {monthRows.map((row, rowIndex) => (
            <div
              key={`calendar-row-${row[0]?.id || rowIndex}`}
              className={`calendar-grid calendar-grid--days calendar-row ${
                rowIndex === activeRowIndex ? "calendar-row--active" : ""
              }`}
            >
              {row.map((cell) => {
                const isToday = isSameDay(cell.date, currentDate);
                const isFuture = isFutureDay(cell.date, currentDate);
                const canColorDay = !cell.outOfMonth;
                const apiDay = calendarDayByDate.get(cell.id);
                const progress = apiDay
                  ? {
                      completed: Number(
                        apiDay.fullyCompletedMembersCount ??
                        apiDay.completedMembersCount ??
                        0
                      ),
                      total: Number(apiDay.totalMembersCount || 0),
                    }
                  : isFuture
                    ? { completed: 0, total: groupStats.members.length }
                    : getDayGroupProgress(cell.date, currentDate, zeroTaskDates, {
                        ...groupStats,
                        completed: groupStats.members.filter(
                          (member) => member.total > 0 && member.completed === member.total
                        ).length,
                        total: groupStats.members.length,
                      });
                const dayState = apiDay?.state ?? null;
                const hasZeroMember = apiDay
                  ? canColorDay && dayState === "bad"
                  : canColorDay && !isFuture && (isToday
                    ? groupStats.members.some((member) => member.completed === 0)
                    : zeroTaskDates.has(getDateKey(cell.date)));
                const isComplete = apiDay
                  ? canColorDay && dayState === "good"
                  : canColorDay &&
                    !isFuture &&
                    progress.total > 0 &&
                    progress.completed === progress.total &&
                    !hasZeroMember;

                return (
                  <div
                    key={cell.id}
                    className={`calendar-day ${cell.outOfMonth ? "calendar-day--muted" : ""} ${
                      isComplete ? "calendar-day--complete" : ""
                    } ${hasZeroMember ? "calendar-day--broken" : ""} ${
                      isToday ? "calendar-day--today" : ""
                    }`}
                  >
                    <span className="calendar-day__number">{cell.number}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticsAccordion({ title, isOpen, onToggle, data }) {
  const dates = data?.dates || [];
  const datasets = data?.datasets || [];
  const maxTasks = Math.max(1, data?.maxTasks || 1);
  const [focusedMemberId, setFocusedMemberId] = useState(null);
  const pointsCount = dates.length;
  const chartHeight = 260;
  const chartWidth = Math.max(640, pointsCount * (pointsCount > 7 ? 34 : 74) + 92);
  const padding = { top: 24, right: 28, bottom: 52, left: 48 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const defaultFocusedMemberId = datasets.some((dataset) => dataset.id === "me")
    ? "me"
    : datasets[0]?.id || null;
  const activeFocusedMemberId = focusedMemberId || defaultFocusedMemberId;
  const orderedDatasets = activeFocusedMemberId
    ? [
        ...datasets.filter((dataset) => dataset.id !== activeFocusedMemberId),
        ...datasets.filter((dataset) => dataset.id === activeFocusedMemberId),
      ]
    : datasets;
  const getX = (index) =>
    pointsCount > 1
      ? padding.left + (index / (pointsCount - 1)) * plotWidth
      : padding.left + plotWidth / 2;
  const getY = (value) => padding.top + plotHeight - (value / maxTasks) * plotHeight;
  const yTicks = Array.from({ length: maxTasks }, (_, index) => maxTasks - index);

  useEffect(() => {
    if (!focusedMemberId) return undefined;

    const clearFocusOutsidePicker = (event) => {
      if (event.target.closest("[data-analytics-member-picker='true']")) return;
      setFocusedMemberId(null);
    };

    document.addEventListener("mousedown", clearFocusOutsidePicker);

    return () => {
      document.removeEventListener("mousedown", clearFocusOutsidePicker);
    };
  }, [focusedMemberId]);

  const handleMemberIconClick = (event, memberId) => {
    event.stopPropagation();
    setFocusedMemberId((prev) => (prev === memberId ? null : memberId));
  };

  const buildVisibleSegments = (points = []) => {
    const segments = [];
    let currentSegment = [];

    points.forEach((point, index) => {
      if (point.hasData === false) {
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
          currentSegment = [];
        }

        return;
      }

      currentSegment.push({ ...point, index });
    });

    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return segments;
  };

  return (
    <div className={`analytics-card ${isOpen ? "analytics-card--open" : ""}`}>
      <button
        type="button"
        className="analytics-card__button"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="analytics-card__title">{title}</span>
        <span className={`analytics-card__arrow ${isOpen ? "analytics-card__arrow--open" : ""}`}>
          <span className="analytics-card__arrow-shape" />
        </span>
      </button>

      <div className={`analytics-card__content ${isOpen ? "analytics-card__content--open" : ""}`}>
        <div className="analytics-card__content-inner">
          <div className="analytics-line-chart">
            <div className="analytics-line-chart__body">
              <div className="analytics-line-chart__scroll">
                <svg
                  className="analytics-line-chart__svg"
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  role="img"
                  aria-label={`${title}: график выполненных заданий по датам`}
                >
                  {yTicks.map((tick) => {
                    const y = getY(tick);

                    return (
                      <g key={`y-${tick}`}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={chartWidth - padding.right}
                          y2={y}
                          className="analytics-line-chart__grid"
                        />
                        <text
                          x={padding.left - 12}
                          y={y + 4}
                          textAnchor="end"
                          className="analytics-line-chart__label"
                        >
                          {tick}
                        </text>
                      </g>
                    );
                  })}

                  <line
                    x1={padding.left}
                    y1={padding.top}
                    x2={padding.left}
                    y2={chartHeight - padding.bottom}
                    className="analytics-line-chart__axis"
                  />
                  <line
                    x1={padding.left}
                    y1={chartHeight - padding.bottom}
                    x2={chartWidth - padding.right}
                    y2={chartHeight - padding.bottom}
                    className="analytics-line-chart__axis"
                  />

                  {dates.map((date, index) => {
                    const x = getX(index);

                    return (
                      <g key={`x-${getDateKey(date)}`}>
                        <line
                          x1={x}
                          y1={padding.top}
                          x2={x}
                          y2={chartHeight - padding.bottom}
                          className="analytics-line-chart__grid analytics-line-chart__grid--vertical"
                        />
                        <text
                          x={x}
                          y={chartHeight - 18}
                          textAnchor="middle"
                          className="analytics-line-chart__label"
                        >
                          {formatAnalyticsDateLabel(date)}
                        </text>
                      </g>
                    );
                  })}

                  {orderedDatasets.map((dataset) => {
                    const isFocused = activeFocusedMemberId === dataset.id;
                    const isDimmed = Boolean(activeFocusedMemberId) && !isFocused;
                    const visibleSegments = buildVisibleSegments(dataset.points);

                    return (
                      <g
                        key={dataset.id}
                        className={`analytics-line-chart__series ${isFocused ? "analytics-line-chart__series--focused" : ""} ${
                          isDimmed ? "analytics-line-chart__series--dimmed" : ""
                        }`}
                      >
                        {visibleSegments.map((segment, segmentIndex) => {
                          if (segment.length < 2) return null;

                          const path = segment
                            .map((point, pointIndex) =>
                              `${pointIndex === 0 ? "M" : "L"} ${getX(point.index)} ${getY(point.value)}`
                            )
                            .join(" ");

                          return (
                            <path
                              key={`${dataset.id}-segment-${segmentIndex}`}
                              d={path}
                              className="analytics-line-chart__line"
                              style={{ stroke: dataset.color }}
                            />
                          );
                        })}

                        {dataset.points.map((point, index) => {
                          if (point.hasData === false) return null;

                          return (
                            <circle
                              key={point.id}
                              cx={getX(index)}
                              cy={getY(point.value)}
                              r={isFocused ? "6" : "5"}
                              className="analytics-line-chart__point"
                              style={{ fill: dataset.color }}
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div
                className="analytics-line-chart__members"
                data-analytics-member-picker="true"
                aria-label="Выбор линии участника"
              >
                {datasets.map((dataset) => (
                  <button
                    key={dataset.id}
                    type="button"
                    className={`analytics-line-chart__member ${
                      activeFocusedMemberId === dataset.id ? "analytics-line-chart__member--active" : ""
                    }`}
                    style={{ backgroundColor: dataset.avatar?.color || dataset.avatarColor || dataset.color }}
                    onClick={(event) => handleMemberIconClick(event, dataset.id)}
                    aria-pressed={activeFocusedMemberId === dataset.id}
                    aria-label={`Выделить линию: ${dataset.name}`}
                    title={dataset.name}
                  >
                    {renderMemberAvatar(dataset.avatar, dataset.initials)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingMenu({ x, y, children }) {
  return (
    <div
      data-note-ui="true"
      className="floating-menu"
      style={{ left: x, top: y }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="floating-menu__inner">{children}</div>
    </div>
  );
}
