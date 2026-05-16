/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from "react";

export const USER = {
  name: "Пользователь",
  email: "",
  initials: "П",
  avatarColor: "#d8cde3",
  coins: 0,
};

export const friendsData = [];

export const uniqueTaskBase = {
  id: "special",
  title: "Особое задание дня",
  desc: "Прикрепи фото своего уютного места для чтения или процесса выполнения задания.",
};

export const SPECIAL_TASK_REWARD_COINS = 15;
export const MAX_SPECIAL_TASK_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MEMBER_COLOR_STORAGE_KEY = "quiet-pages-member-colors";
export const API_URL = import.meta.env.VITE_API_URL || "https://habbit-backend-k33d.onrender.com";
export const NOTES_POLL_INTERVAL_MS = 5000;
export const AUTH_TOKEN_STORAGE_KEYS = ["token", "authToken", "habbitToken", "habbit-auth-token"];
export const TODAY_STREAK_PREVIEW_STORAGE_KEY = "habbit-today-streak-preview";

export const PERSONAL_TASK_TEMPLATES = [];

export const PERSONAL_CUSTOM_TASK_IDS = ["custom-1", "custom-2", "custom-3", "custom-4"];

export const getDefaultMemberColors = (members = friendsData) =>
  members.reduce((colors, friend) => {
    colors[friend.id] = friend.color;
    return colors;
  }, {});

export function sortCurrentMemberFirst(items = []) {
  return [...items].sort((first, second) => {
    if (first?.id === "me" && second?.id !== "me") return -1;
    if (first?.id !== "me" && second?.id === "me") return 1;
    return 0;
  });
}

export function getStoredAuthToken() {
  if (typeof window === "undefined") return "";

  for (const key of AUTH_TOKEN_STORAGE_KEYS) {
    const token = window.localStorage.getItem(key);
    if (token) return token;
  }

  return "";
}

export function getIsMobileViewport(query = "(max-width: 760px)") {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(query).matches;
}

export function useIsMobileViewport(query = "(max-width: 760px)") {
  const [isMobileViewport, setIsMobileViewport] = useState(() => getIsMobileViewport(query));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;

    const mediaQueryList = window.matchMedia(query);
    const handleChange = () => setIsMobileViewport(mediaQueryList.matches);

    handleChange();

    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", handleChange);
      return () => mediaQueryList.removeEventListener("change", handleChange);
    }

    mediaQueryList.addListener(handleChange);
    return () => mediaQueryList.removeListener(handleChange);
  }, [query]);

  return isMobileViewport;
}

export function getHabitIdFromLocation() {
  if (typeof window === "undefined") return "";

  const stateHabitId = window.history.state?.habitId || window.history.state?.groupId;
  if (stateHabitId) return String(stateHabitId);

  const params = new URLSearchParams(window.location.search);
  const queryHabitId = params.get("habitId") || params.get("groupId");
  if (queryHabitId) return queryHabitId;

  const match = window.location.pathname.match(/(?:habits|groups|group)\/(\d+)/i);
  return match?.[1] || "";
}

export function getErrorMessage(error, fallback = "Ошибка запроса к серверу") {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function ModalInnerLoader({ text = "Загрузка..." }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        minHeight: "100%",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        borderRadius: "inherit",
        background: "var(--surface-page-gradient, #f8efe9)",
        color: "var(--text-primary, #3a2f2a)",
        fontFamily: "var(--font-main, inherit)",
        fontSize: "18px",
        fontWeight: 700,
        textAlign: "center",
      }}
      aria-live="polite"
      aria-busy="true"
    >
      {text}
    </div>
  );
}

export function getBackendFileUrl(file) {
  if (!file) return "";

  return (
    file.url ||
    file.publicUrl ||
    file.public_url ||
    file.signedUrl ||
    file.signed_url ||
    file.downloadUrl ||
    file.download_url ||
    file.src ||
    ""
  );
}

export const HABIT_TYPE_NAMES = {
  cleaning: "Уборка",
  sport: "Спорт",
  nutrition: "Питание",
  reading: "Чтение",
};

export function getHabitTypeName(typeCode) {
  if (!typeCode) return "—";

  return HABIT_TYPE_NAMES[typeCode] || typeCode;
}

export async function apiRequest(path, { method = "GET", token, body } = {}) {
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

export async function apiUploadFile(path, { token, file } = {}) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
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

export function normalizeBackendAvatar(avatar, member) {
  const fallbackColor =
    member?.displayColor ||
    member?.display_color ||
    member?.avatar?.bgColor ||
    member?.avatar?.bg_color ||
    USER.avatarColor;
  const fallbackLabel = getInitial(member?.name || member?.login || USER.name);
  const avatarSrc = avatar?.src || avatar?.url || getBackendFileUrl(avatar?.file);
  const avatarColor = avatar?.bgColor || avatar?.bg_color || avatar?.color || fallbackColor;

  if ((avatar?.type === "picture" || avatar?.type === "photo") && avatarSrc) {
    return {
      id: avatar.id || `${member?.id || "member"}-photo`,
      type: "photo",
      label: avatar.label || fallbackLabel,
      color: avatarColor,
      src: avatarSrc,
    };
  }

  return {
    id: avatar?.id || `${member?.id || "member"}-avatar`,
    type: avatar?.type === "emoji" ? "emoji" : "monogram",
    label: avatar?.value || avatar?.label || fallbackLabel,
    color: avatarColor,
  };
}

export function normalizeBackendTask(task) {
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


export function normalizeChoiceOptions(choiceOptions) {
  if (!choiceOptions) return [];

  const rawOptions = Array.isArray(choiceOptions)
    ? choiceOptions
    : Array.isArray(choiceOptions.options)
      ? choiceOptions.options
      : [];

  return rawOptions
    .map((option) => {
      if (typeof option === "string" || typeof option === "number") return String(option);
      return String(option?.value || option?.code || option?.title || option?.label || "");
    })
    .filter(Boolean);
}

export function normalizeTaskTemplate(template) {
  const code = String(template?.code || template?.taskTemplateCode || template?.id || "");

  return {
    id: code,
    backendId: template?.id,
    habitTypeId: template?.habitTypeId,
    code,
    title: template?.title || "Задание",
    templateText: template?.templateText || template?.finalText || template?.title || "Задание",
    valueType: template?.valueType || "none",
    unitForms: template?.unitForms || null,
    minValue: template?.minValue ?? null,
    maxValue: template?.maxValue ?? null,
    choiceOptions: normalizeChoiceOptions(template?.choiceOptions),
  };
}

export function normalizeTaskEditOptions(data) {
  return {
    habit: data?.habit || null,
    currentMemberId: data?.currentMemberId || "",
    taskTemplates: Array.isArray(data?.taskTemplates) ? data.taskTemplates.map(normalizeTaskTemplate) : [],
    currentTasks: Array.isArray(data?.currentTasks) ? data.currentTasks : [],
    selectedTemplateTasks: Array.isArray(data?.selectedTemplateTasks) ? data.selectedTemplateTasks : [],
    customTasks: Array.isArray(data?.customTasks) ? data.customTasks : [],
  };
}

export function createTaskEditorDraftFromOptions(editOptions) {
  const selectedTaskIds = [];
  const templateValues = {};
  const templateTaskIds = {};

  (editOptions?.selectedTemplateTasks || []).forEach((task) => {
    const code = String(task.taskTemplateCode || "");
    if (!code) return;

    selectedTaskIds.push(code);
    templateValues[code] = task.customValue ?? "";
    if (task.taskId) templateTaskIds[code] = task.taskId;
  });

  const backendCustomTasks = editOptions?.customTasks || [];
  const customSlots = Array.from({ length: Math.max(4, backendCustomTasks.length) }, (_, index) => {
    const task = backendCustomTasks[index];
    const fallbackId = PERSONAL_CUSTOM_TASK_IDS[index] || `custom-${index + 1}`;

    return {
      id: task?.taskId ? String(task.taskId) : fallbackId,
      taskId: task?.taskId || null,
      finalText: task?.finalText || "",
      selected: Boolean(task?.taskId || task?.finalText),
    };
  });

  return {
    selectedTaskIds,
    templateValues,
    templateTaskIds,
    customSlots,
  };
}

export function validateTaskEditorDraftWithTemplates(draft, templates) {
  const errors = {
    templates: {},
    customTasks: {},
    common: "",
  };

  const selectedTemplateIds = draft.selectedTaskIds || [];
  const selectedCustomSlots = (draft.customSlots || []).filter((slot) => slot.selected);
  const hasAnyTask = selectedTemplateIds.length > 0 || selectedCustomSlots.length > 0;

  selectedTemplateIds.forEach((templateId) => {
    const template = templates.find((item) => item.id === templateId || item.code === templateId);
    const templateError = validateTaskEditorTemplateValue(template, draft.templateValues?.[templateId]);

    if (templateError) {
      errors.templates[templateId] = templateError;
    }
  });

  const usedCustomTexts = new Set();

  selectedCustomSlots.forEach((slot) => {
    const preparedText = String(slot.finalText || "").trim();
    const loweredText = preparedText.toLowerCase();

    if (!preparedText) {
      errors.customTasks[slot.id] = `Заполните поле`;
      return;
    }

    if (preparedText.length > 160) {
      errors.customTasks[slot.id] = `Данное задание должно быть не длиннее 160 символов`;
      return;
    }

    if (usedCustomTexts.has(loweredText)) {
      errors.customTasks[slot.id] = `Данное задание повторяется`;
      return;
    }

    usedCustomTexts.add(loweredText);
  });

  if (!hasAnyTask) {
    errors.common = "Нужно оставить хотя бы одно задание";
  }

  if (Object.keys(errors.templates).length > 0) {
    errors.common = "Заполните выбранные шаблоны заданий";
  }

  if (Object.keys(errors.customTasks).length > 0) {
    errors.common = "Заполните выбранные задания";
  }

  return errors;
}

export function buildTaskEditorRequestBody(draft, templates) {
  const templateTasks = (draft.selectedTaskIds || [])
    .map((templateId) => {
      const template = templates.find((item) => item.id === templateId || item.code === templateId);
      if (!template) return null;

      const task = {
        ...(draft.templateTaskIds?.[templateId] ? { taskId: draft.templateTaskIds[templateId] } : {}),
        taskTemplateCode: template.code,
      };

      if (template.valueType !== "none") {
        task.customValue = String(draft.templateValues?.[templateId] || "").trim();
      }

      return task;
    })
    .filter(Boolean);

  const customTasks = (draft.customSlots || [])
    .filter((slot) => slot.selected)
    .map((slot) => ({
      ...(slot.taskId ? { taskId: slot.taskId } : {}),
      finalText: String(slot.finalText || "").trim(),
    }));

  return { templateTasks, customTasks };
}

export function normalizeSpecialTaskFile(file) {
  if (!file) return null;

  return {
    id: file.id ? String(file.id) : "",
    storageKey: file.storageKey || file.storage_key || "",
    url: getBackendFileUrl(file),
    originalName: file.originalName || file.original_name || "",
    mimeType: file.mimeType || file.mime_type || "",
    sizeBytes: Number(file.sizeBytes ?? file.size_bytes ?? 0),
    createdAt: file.createdAt || file.created_at || "",
  };
}

export function normalizeSpecialTaskSubmission(submission) {
  if (!submission) return null;

  const file = normalizeSpecialTaskFile(submission.file);

  return {
    id: submission.id ? String(submission.id) : "",
    specialTaskOccurrenceId: submission.specialTaskOccurrenceId
      ? String(submission.specialTaskOccurrenceId)
      : submission.special_task_occurrence_id
        ? String(submission.special_task_occurrence_id)
        : "",
    habitMemberId: submission.habitMemberId
      ? String(submission.habitMemberId)
      : submission.habit_member_id
        ? String(submission.habit_member_id)
        : "",
    userId: submission.userId
      ? String(submission.userId)
      : submission.user_id
        ? String(submission.user_id)
        : "",
    userName: submission.userName || submission.user_name || submission.name || "Участник",
    fileId: submission.fileId
      ? String(submission.fileId)
      : submission.file_id
        ? String(submission.file_id)
        : file?.id || "",
    submittedAt: submission.submittedAt || submission.submitted_at || "",
    file,
  };
}

export function normalizeBackendSpecialTask(specialTask) {
  if (!specialTask) return null;

  const mySubmission = normalizeSpecialTaskSubmission(specialTask.mySubmission || specialTask.my_submission);

  return {
    id: specialTask.id ? String(specialTask.id) : "",
    habitId: specialTask.habitId ? String(specialTask.habitId) : specialTask.habit_id ? String(specialTask.habit_id) : "",
    specialTaskTemplateId: specialTask.specialTaskTemplateId
      ? String(specialTask.specialTaskTemplateId)
      : specialTask.special_task_template_id
        ? String(specialTask.special_task_template_id)
        : "",
    occurrenceDate: specialTask.occurrenceDate || specialTask.occurrence_date || "",
    code: specialTask.code || "",
    title: specialTask.title || uniqueTaskBase.title,
    description: specialTask.description || uniqueTaskBase.desc,
    rewardValue: Number(specialTask.rewardValue ?? specialTask.reward_value ?? SPECIAL_TASK_REWARD_COINS),
    isSubmittedByMe: Boolean(specialTask.isSubmittedByMe ?? specialTask.is_submitted_by_me ?? mySubmission),
    mySubmission,
    submissions: Array.isArray(specialTask.submissions)
      ? specialTask.submissions.map(normalizeSpecialTaskSubmission).filter(Boolean)
      : [],
  };
}

export function doesSpecialSubmissionBelongToMember(submission, member) {
  if (!submission || !member) return false;

  const sameHabitMember =
    submission.habitMemberId &&
    member.backendMemberId &&
    String(submission.habitMemberId) === String(member.backendMemberId);
  const sameUser = submission.userId && member.userId && String(submission.userId) === String(member.userId);

  return Boolean(sameHabitMember || sameUser);
}

export function normalizeBackendPage(pageData) {
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
    specialTask: normalizeBackendSpecialTask(pageData?.specialTask),
  };
}

export function normalizeMemberProfileResponse(profileData, fallbackMember, fallbackGroupInfo) {
  const backendMember = profileData?.member || {};
  const record = profileData?.record || {};
  const fallbackName = backendMember.name || fallbackMember?.name || "Участник";
  const avatar = normalizeBackendAvatar(backendMember.avatar, {
    ...fallbackMember,
    id: backendMember.id || fallbackMember?.backendMemberId || fallbackMember?.id,
    name: fallbackName,
    login: fallbackMember?.login,
    displayColor:
      backendMember?.avatar?.bgColor ||
      backendMember?.avatar?.bg_color ||
      fallbackMember?.avatar?.color ||
      fallbackMember?.avatarColor ||
      fallbackMember?.color,
  });
  const avatarColor = normalizeHexColor(
    avatar.color || fallbackMember?.avatarColor || fallbackMember?.color,
    USER.avatarColor
  );

  return {
    member: {
      id: String(backendMember.id || fallbackMember?.backendMemberId || fallbackMember?.id || ""),
      userId: String(backendMember.userId || fallbackMember?.userId || ""),
      habitId: String(backendMember.habitId || fallbackMember?.habitId || ""),
      name: fallbackName,
      initials: avatar.label || getInitial(fallbackName),
      avatarColor,
      avatar: {
        ...avatar,
        color: avatarColor,
      },
    },
    record: {
      days: Number(record.days || 0),
      habitId: record.habitId || fallbackMember?.habitId || "",
      habitTitle: record.habitTitle || fallbackGroupInfo?.name || "—",
      habitTypeCode: record.habitTypeCode || "",
      habitTypeName: getHabitTypeName(record.habitTypeCode),
    },
    achievements: Array.isArray(profileData?.achievements)
      ? profileData.achievements.map((achievement, index) => ({
          id: String(achievement.id || achievement.code || achievement.title || `achievement-${index}`),
          code: achievement.code || "",
          title: achievement.title || "Достижение",
          description: achievement.description || "",
          rewardCoins: Number(achievement.rewardCoins || 0),
          receivedAt: achievement.receivedAt || "",
        }))
      : [],
  };
}

export function normalizeLeaveOwnerCandidate(candidate) {
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

export function extractHabitCreatedDateKey(habit) {
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

export function normalizeBackendNote(note) {
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

export function getCalendarRange(viewedDate, mode) {
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

export function getAnalyticsRange(currentDate, mode, startDateKey = "") {
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

export function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);

  if (!year || !month || !day) return new Date();

  return new Date(year, month - 1, day);
}

export function buildDateKeysBetween(from, to) {
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

export function toPercent(value, total) {
  if (!total) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 10000) / 100));
}

export function normalizeHexColor(value, fallback = "#d8cde3") {
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

export function hexToRgba(hex, alpha = 0.18) {
  const safeHex = normalizeHexColor(hex).replace("#", "");
  const r = parseInt(safeHex.slice(0, 2), 16);
  const g = parseInt(safeHex.slice(2, 4), 16);
  const b = parseInt(safeHex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getInitial(name) {
  const trimmedName = String(name || "").trim();
  return (trimmedName[0] || "П").toUpperCase();
}

export function normalizeUserAvatar(avatar, fallbackName = USER.name) {
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

export function renderMemberAvatar(avatar, fallbackLabel = "") {
  if (avatar?.type === "photo" && avatar.src) {
    return <img src={avatar.src} alt="Фото профиля" className="group-member-avatar__image" />;
  }

  return <span className="group-member-avatar__symbol">{avatar?.label || fallbackLabel}</span>;
}

export function splitTemplateText(templateText = "") {
  const [before = "", after = ""] = String(templateText).split("__");

  return {
    before: before.trim(),
    after: after.trim(),
  };
}

export function getRussianNumberForm(numberValue) {
  const absValue = Math.abs(Number(numberValue));
  const lastTwoDigits = absValue % 100;
  const lastDigit = absValue % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "many";
  if (lastDigit === 1) return "one";
  if (lastDigit >= 2 && lastDigit <= 4) return "few";
  return "many";
}

export function getTaskEditorTemplateUnit(template, value = "") {
  if (!template?.unitForms) return "";

  const preparedValue = String(value || "").trim();

  if ((template.valueType === "number" || template.valueType === "choice") && /^\d+$/.test(preparedValue)) {
    return template.unitForms[getRussianNumberForm(Number(preparedValue))] || template.unitForms.many || "";
  }

  return template.unitForms.many || "";
}

export function getTaskEditorTemplateTail(template, value = "") {
  const { after } = splitTemplateText(template?.templateText);
  const unit = getTaskEditorTemplateUnit(template, value);

  return [unit, after]
    .filter((part) => String(part || "").trim().length > 0)
    .map((part) => String(part).trim())
    .join(" ");
}


export function getTaskEditorChoices(template) {
  return Array.isArray(template?.choiceOptions) ? template.choiceOptions : [];
}

export function sanitizeTaskEditorTemplateValue(template, value) {
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

export function validateTaskEditorTemplateValue(template, value) {
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

export function getTaskEditorInputProps(template) {
  if (template.valueType !== "number" && template.valueType !== "text") return {};

  return {
    type: template.valueType === "number" ? "number" : "text",
    placeholder: template.placeholder,
    min: template.minValue,
    max: template.maxValue,
    step: template.step || (template.valueType === "number" ? 1 : undefined),
    maxLength: template.maxLength,
    inputMode: template.valueType === "number" ? "numeric" : undefined,
  };
}

export function hasTaskEditorErrors(errors) {
  return Boolean(
    errors.common ||
    Object.keys(errors.templates || {}).length > 0 ||
    Object.keys(errors.customTasks || {}).length > 0
  );
}

export const BUNNY_MODEL_URL = "/live2d/bunny/bunny.json";
export const BUNNY_CRY_MODEL_URL = "/live2d/bunny/bunnycry.json";
export const BUNNY_NAME = "Банни";

export const weekDayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isSameDay(firstDate, secondDate) {
  return getDateKey(firstDate) === getDateKey(secondDate);
}

function getEmptyTodayStreakPreview(dateKey = getDateKey(new Date())) {
  return {
    dateKey,
    personalHabitIds: {},
    groupHabitIds: {},
  };
}

function normalizeTodayStreakPreview(rawPreview, dateKey = getDateKey(new Date())) {
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

export function writeTodayStreakPreview(
  habitId,
  { personalCompleted = false, groupCompleted = false } = {},
  date = new Date()
) {
  if (typeof window === "undefined" || !habitId) return;

  const dateKey = getDateKey(date);
  const preview = readTodayStreakPreview(date);
  const nextPreview = normalizeTodayStreakPreview(preview, dateKey);
  const normalizedHabitId = String(habitId);

  if (personalCompleted) {
    nextPreview.personalHabitIds[normalizedHabitId] = true;
  } else {
    delete nextPreview.personalHabitIds[normalizedHabitId];
  }

  if (groupCompleted) {
    nextPreview.groupHabitIds[normalizedHabitId] = true;
  } else {
    delete nextPreview.groupHabitIds[normalizedHabitId];
  }

  window.localStorage.setItem(TODAY_STREAK_PREVIEW_STORAGE_KEY, JSON.stringify(nextPreview));
}

export function isFutureDay(date, today) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  return day > currentDay;
}

export function getMonday(date) {
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayIndex = (current.getDay() + 6) % 7;
  current.setDate(current.getDate() - dayIndex);
  return current;
}

export function buildMonthCells(currentDate) {
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

export function chunkCalendarRows(cells) {
  const rows = [];

  for (let index = 0; index < cells.length; index += 7) {
    rows.push(cells.slice(index, index + 7));
  }

  return rows;
}

export function getActiveMonthRowIndex(rows, viewedDate) {
  const viewedDateKey = getDateKey(viewedDate);
  const rowIndex = rows.findIndex((row) => row.some((cell) => cell.id === viewedDateKey));

  return rowIndex >= 0 ? rowIndex : 0;
}

export function formatAnalyticsDateLabel(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}


export function buildPastDates(daysCount, currentDate) {
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

export function findStatsMember(statsMember, membersData = friendsData) {
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

export function normalizeStatsResponse(statsData, membersData = friendsData) {
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
