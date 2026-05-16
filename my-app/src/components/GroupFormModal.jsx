import { Children, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import appleIcon from "../assets/icons/apple.svg";
import booksIcon from "../assets/icons/books.svg";
import cleanIcon from "../assets/icons/clean.svg";
import dumbbellsIcon from "../assets/icons/dumbbells.svg";

import "../styles/components/group-form-modal.css";

const CATEGORY_OPTIONS = [
  { id: "sport", title: "Спорт" },
  { id: "cleaning", title: "Уборка" },
  { id: "reading", title: "Чтение" },
  { id: "nutrition", title: "Питание" },
];

const CATEGORY_ICON_BY_ID = {
  sport: dumbbellsIcon,
  cleaning: cleanIcon,
  reading: booksIcon,
  nutrition: appleIcon,
};

const CATEGORY_TITLE_BY_CODE = {
  sport: "Спорт",
  cleaning: "Уборка",
  reading: "Чтение",
  nutrition: "Питание",
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://habbit-backend-k33d.onrender.com";


const LOCAL_TASK_TEMPLATES = {
  reading: [
    {
      id: 1,
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
      id: 2,
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
      id: 3,
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
      id: 4,
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
  ],
  sport: [
    {
      id: 5,
      code: "sport_minutes",
      title: "Сделать тренировку",
      templateText: "Тренироваться __",
      valueType: "number",
      unitForms: { one: "минуту", few: "минуты", many: "минут" },
      minValue: 1,
      maxValue: 300,
      step: 1,
      choiceOptions: null,
    },
    {
      id: 6,
      code: "sport_sets",
      title: "Выполнить упражнения",
      templateText: "Сделать __",
      valueType: "number",
      unitForms: { one: "подход на каждое упражнение", few: "подхода на каждое упражнение", many: "подходов на каждое упражнение" },
      minValue: 1,
      maxValue: 10,
      step: 1,
      choiceOptions: null,
    },
    {
      id: 7,
      code: "sport_steps",
      title: "Сделать норму шагов",
      templateText: "Пройти __",
      valueType: "number",
      unitForms: { one: "шаг", few: "шага", many: "шагов" },
      minValue: 100,
      maxValue: 50000,
      step: 100,
      choiceOptions: null,
    },
    {
      id: 8,
      code: "sport_stretch",
      title: "Сделать растяжку",
      templateText: "Выполнять растяжку __",
      valueType: "number",
      unitForms: { one: "минуту", few: "минуты", many: "минут" },
      minValue: 1,
      maxValue: 300,
      step: 1,
      choiceOptions: null,
    },
  ],
  nutrition: [
    {
      id: 9,
      code: "nutrition_water",
      title: "Выпить воду",
      templateText: "Выпить __",
      valueType: "number",
      unitForms: { one: "стакан воды", few: "стакана воды", many: "стаканов воды" },
      minValue: 1,
      maxValue: 20,
      step: 1,
      choiceOptions: null,
    },
    {
      id: 10,
      code: "nutrition_no_sweets",
      title: "Не есть сладкое",
      templateText: "Не есть сладкое __",
      valueType: "number",
      unitForms: { one: "час", few: "часа", many: "часов" },
      minValue: 1,
      maxValue: 24,
      step: 1,
      choiceOptions: null,
    },
    {
      id: 11,
      code: "nutrition_calories",
      title: "Выдержать норму калорий",
      templateText: "Употребить не более __ ккал",
      valueType: "number",
      unitForms: null,
      minValue: 500,
      maxValue: 5000,
      step: 50,
      choiceOptions: null,
    },
    {
      id: 12,
      code: "nutrition_meals",
      title: "Регулярное питание",
      templateText: "Сделать __",
      valueType: "choice",
      unitForms: { one: "приём пищи", few: "приёма пищи", many: "приёмов пищи" },
      minValue: null,
      maxValue: null,
      choiceOptions: ["3", "4", "5"],
    },
  ],
  cleaning: [
    {
      id: 13,
      code: "cleaning_daily_minimum",
      title: "Ежедневный минимум",
      templateText: "Сделать минимальную ежедневную уборку",
      valueType: "none",
      unitForms: null,
      minValue: null,
      maxValue: null,
      choiceOptions: null,
    },
    {
      id: 14,
      code: "cleaning_minutes",
      title: "Время уборки",
      templateText: "Убираться __",
      valueType: "number",
      unitForms: { one: "минуту", few: "минуты", many: "минут" },
      minValue: 1,
      maxValue: 300,
      step: 1,
      choiceOptions: null,
    },
    {
      id: 15,
      code: "floor_cleaning",
      title: "Уборка пола",
      templateText: "Сделать __ уборку пола",
      valueType: "choice",
      unitForms: null,
      minValue: null,
      maxValue: null,
      choiceOptions: ["сухую", "влажную", "полную"],
    },
    {
      id: 16,
      code: "wash_dishes",
      title: "Мытьё посуды",
      templateText: "Помыть посуду",
      valueType: "none",
      unitForms: null,
      minValue: null,
      maxValue: null,
      choiceOptions: null,
    },
  ],
};

const CUSTOM_TASK_IDS = ["custom-1", "custom-2", "custom-3", "custom-4"];
const EMPTY_VALIDATION_ERRORS = {};

const TEMPLATE_NUMBER_HINT_BY_CODE = {
  reading_pages: "10",
  reading_minutes: "20",
  reading_chapters: "1",
  sport_minutes: "30",
  sport_sets: "3",
  sport_steps: "5000",
  sport_stretch: "10",
  nutrition_water: "8",
  nutrition_no_sweets: "24",
  nutrition_calories: "1800",
  cleaning_minutes: "15",
};

const TEMPLATE_TEXT_HINT_BY_CODE = {
  reading_note: "мысль",
};

const JOIN_PREVIEW_MODES = {
  NEW_MEMBER: "new_member",
  RETURN_EXISTING: "return_existing",
  REJOIN_NEW_DATA: "rejoin_new_data",
};

const JOIN_PREVIEW_MODE_TEXT = {
  [JOIN_PREVIEW_MODES.NEW_MEMBER]: "Вы новый участник. Нужно заполнить личные задания.",
  [JOIN_PREVIEW_MODES.RETURN_EXISTING]: "Можно вернуться в привычку без выбора заданий: прежние задания и прогресс сохраняются.",
  [JOIN_PREVIEW_MODES.REJOIN_NEW_DATA]: "Нужно выбрать задания заново: прошлые данные уже не восстанавливаются.",
};

function getJoinPreviewMode(joinPreview) {
  const rawMode =
    joinPreview?.joinPreviewStatus ||
    joinPreview?.joinStatus ||
    joinPreview?.joinMode ||
    joinPreview?.joinType ||
    joinPreview?.joinAction ||
    joinPreview?.membershipMode ||
    joinPreview?.membershipStatus ||
    joinPreview?.memberStatus ||
    joinPreview?.previewMode ||
    joinPreview?.result ||
    joinPreview?.mode ||
    joinPreview?.status ||
    joinPreview?.type ||
    "";
  const normalizedMode = String(rawMode).trim().toLowerCase();

  if (Object.values(JOIN_PREVIEW_MODES).includes(normalizedMode)) {
    return normalizedMode;
  }

  return "";
}

function shouldJoinSkipTaskSelection(joinPreview) {
  return getJoinPreviewMode(joinPreview) === JOIN_PREVIEW_MODES.RETURN_EXISTING;
}

function shouldJoinSendTaskSelection(joinPreview) {
  const mode = getJoinPreviewMode(joinPreview);
  return mode !== JOIN_PREVIEW_MODES.RETURN_EXISTING;
}

function getJoinPreviewModeText(joinPreview) {
  const mode = getJoinPreviewMode(joinPreview);
  return JOIN_PREVIEW_MODE_TEXT[mode] || "";
}

function createInviteCode() {
  return `HAB-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function createInitialForm() {
  return {
    categoryId: "",
    groupName: "",
    groupDescription: "",
    inviteCode: "",
    selectedTaskId: "",
    selectedTaskIds: [],
    templateValues: {},
    customTaskId: "",
    customTaskIds: [],
    customTasks: {},
  };
}

function isBlank(value) {
  return !String(value || "").trim();
}

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

async function requestHabbitApi(path, options = {}) {
  const token = getStoredAuthToken();

  if (!token) {
    throw new Error("Нет токена авторизации");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Не удалось получить данные с сервера");
  }

  return data;
}

async function requestJoinPreview(inviteCode) {
  const preparedCode = String(inviteCode || "").trim().toUpperCase();
  return requestHabbitApi(`/api/habits/join-preview?inviteCode=${encodeURIComponent(preparedCode)}`);
}

async function joinHabitOnServer(payload) {
  return requestHabbitApi("/api/habits/join", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function normalizeCategory(rawCategory) {
  const code = rawCategory?.code || rawCategory?.id || "";

  return {
    id: code,
    backendId: rawCategory?.id,
    title: CATEGORY_TITLE_BY_CODE[code] || code || "Категория",
  };
}

function normalizeTaskTemplate(rawTemplate) {
  const code = rawTemplate?.code || rawTemplate?.id || "";
  const valueType = rawTemplate?.valueType || "none";
  const choiceOptions = normalizeChoiceOptions(rawTemplate?.choiceOptions || rawTemplate?.choices);

  return {
    ...rawTemplate,
    id: code || String(rawTemplate?.id || ""),
    backendId: rawTemplate?.id,
    code,
    title: rawTemplate?.title || "Шаблон задания",
    templateText: rawTemplate?.templateText || rawTemplate?.text || [rawTemplate?.before, "__", rawTemplate?.after].filter(Boolean).join(" "),
    valueType,
    unitForms: rawTemplate?.unitForms || null,
    minValue: typeof rawTemplate?.minValue === "number" ? rawTemplate.minValue : rawTemplate?.min,
    maxValue: typeof rawTemplate?.maxValue === "number" ? rawTemplate.maxValue : rawTemplate?.max,
    step: rawTemplate?.step,
    maxLength: rawTemplate?.maxLength || (valueType === "text" ? 30 : undefined),
    choiceOptions,
    placeholder: rawTemplate?.placeholder,
  };
}

function normalizeChoiceOptions(rawOptions) {
  if (Array.isArray(rawOptions)) {
    return rawOptions
      .map((option) => {
        if (typeof option === "string") return option;
        return option?.value || option?.code || option?.title || option?.label || "";
      })
      .map((option) => String(option).trim())
      .filter(Boolean);
  }

  if (Array.isArray(rawOptions?.options)) {
    return normalizeChoiceOptions(rawOptions.options);
  }

  return null;
}

function normalizeTaskTemplates(rawTemplates = []) {
  return rawTemplates.map(normalizeTaskTemplate).filter((template) => template.id);
}

function getCategoryTitle(categoryId, categories = CATEGORY_OPTIONS) {
  return categories.find((category) => category.id === categoryId)?.title || CATEGORY_TITLE_BY_CODE[categoryId] || "—";
}

function getLocalTemplates(categoryId) {
  return normalizeTaskTemplates(LOCAL_TASK_TEMPLATES[categoryId] || LOCAL_TASK_TEMPLATES.sport);
}

function getTemplateById(templateId, templates) {
  return templates.find((item) => item.id === templateId || item.code === templateId);
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

function getTemplateUnit(template, value = "") {
  if (!template?.unitForms) return "";

  const preparedValue = String(value || "").trim();

  if (template.valueType === "number" && /^\d+$/.test(preparedValue)) {
    return template.unitForms[getRussianNumberForm(Number(preparedValue))] || template.unitForms.many || "";
  }

  if (template.valueType === "choice" && /^\d+$/.test(preparedValue)) {
    return template.unitForms[getRussianNumberForm(Number(preparedValue))] || template.unitForms.many || "";
  }

  return template.unitForms.many || "";
}

function getTemplateTail(template, value = "") {
  const { after } = splitTemplateText(template?.templateText);
  const unit = getTemplateUnit(template, value);

  return [unit, after]
    .filter((part) => String(part || "").trim().length > 0)
    .map((part) => String(part).trim())
    .join(" ");
}

function buildTemplateTaskText(template, value = "") {
  if (!template) return "";
  if (template.valueType === "none") return template.templateText || "";

  const { before } = splitTemplateText(template.templateText);
  const tail = getTemplateTail(template, value);

  return [before, value, tail]
    .filter((part) => String(part || "").trim().length > 0)
    .map((part) => String(part).trim())
    .join(" ");
}

function getSelectedTaskSummaries(form, templates) {
  const selectedTemplateIds = form.selectedTaskIds || [];
  const selectedCustomIds = form.customTaskIds || [];

  const templateTasks = selectedTemplateIds
    .map((templateId) => {
      const template = getTemplateById(templateId, templates);
      if (!template) return null;

      const value = String(form.templateValues?.[templateId] || "").trim();
      return buildTemplateTaskText(template, value);
    })
    .filter(Boolean);

  const customTasks = selectedCustomIds
    .map((taskId) => String(form.customTasks?.[taskId] || "").trim())
    .filter(Boolean);

  return [...templateTasks, ...customTasks];
}

function buildSelectedTemplatePayload(form, templates) {
  return (form.selectedTaskIds || [])
    .map((templateId) => {
      const template = getTemplateById(templateId, templates);
      if (!template) return null;

      const payload = {
        taskTemplateCode: template.code || template.id,
      };

      if (template.valueType !== "none") {
        payload.customValue = String(form.templateValues?.[templateId] || "").trim();
      }

      return payload;
    })
    .filter(Boolean);
}

function buildSelectedCustomPayload(form) {
  return (form.customTaskIds || [])
    .map((taskId) => String(form.customTasks?.[taskId] || "").trim())
    .filter(Boolean)
    .map((finalText) => ({ finalText }));
}

function getTemplateChoices(template) {
  return normalizeChoiceOptions(template?.choiceOptions) || [];
}

function sanitizeTemplateValue(template, value) {
  const rawValue = String(value || "");

  if (template.valueType === "number") {
    return rawValue.replace(/[^0-9]/g, "");
  }

  if (template.valueType === "text") {
    return rawValue.slice(0, template.maxLength || 30);
  }

  if (template.valueType === "choice") {
    return getTemplateChoices(template).includes(rawValue) ? rawValue : "";
  }

  return "";
}

function validateTemplateValue(template, value) {
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

    if (Number.isNaN(numberValue)) {
      return "Значение должно быть числом";
    }

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

  if (template.valueType === "choice" && !getTemplateChoices(template).includes(preparedValue)) {
    return "Некорректный вариант";
  }

  return null;
}

function getTemplatePlaceholder(template) {
  if (template?.placeholder) return template.placeholder;

  const templateCode = template?.code || template?.id || "";

  if (template?.valueType === "number") {
    return TEMPLATE_NUMBER_HINT_BY_CODE[templateCode] || String(template?.minValue || 1);
  }

  if (template?.valueType === "text") {
    return TEMPLATE_TEXT_HINT_BY_CODE[templateCode] || "слово";
  }

  return "";
}

function getTemplateInputProps(template) {
  if (template.valueType !== "number" && template.valueType !== "text") return {};

  return {
    type: template.valueType === "number" ? "number" : "text",
    placeholder: getTemplatePlaceholder(template),
    min: template.minValue,
    max: template.maxValue,
    step: template.step || (template.valueType === "number" ? 1 : undefined),
    maxLength: template.maxLength,
    inputMode: template.valueType === "number" ? "numeric" : undefined,
  };
}

function validateGroupFormStep(step, flow, form, templates = [], options = {}) {
  const errors = {};

  if (flow === "create" && step === 2) {
    const groupName = String(form.groupName || "").trim();
    const groupDescription = String(form.groupDescription || "").trim();

    if (isBlank(form.categoryId)) errors.categoryId = "Выберите категорию";
    if (!groupName) errors.groupName = "Нужно указать название привычки";
    else if (groupName.length < 2) errors.groupName = "Название привычки должно быть не короче 2 символов";
    else if (groupName.length > 80) errors.groupName = "Название привычки должно быть не длиннее 80 символов";

    if (groupDescription.length > 500) {
      errors.groupDescription = "Описание привычки должно быть не длиннее 500 символов";
    }
  }

  if (flow === "join" && step === 2) {
    const inviteCode = String(form.inviteCode || "").trim().toUpperCase();

    if (isBlank(inviteCode)) errors.inviteCode = "Впишите код привычки";
    else if (!/^HAB-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(inviteCode)) {
      errors.inviteCode = "Код должен быть в формате HAB-XXXX-XXXX";
    }
  }

  if (step === 3 && !options.skipTaskSelection) {
    const selectedTemplateIds = form.selectedTaskIds || [];
    const selectedCustomIds = form.customTaskIds || [];
    const hasSelectedTasks = selectedTemplateIds.length > 0 || selectedCustomIds.length > 0;
    const templateValueErrors = {};
    const customTaskErrors = {};

    selectedTemplateIds.forEach((templateId) => {
      const template = getTemplateById(templateId, templates);
      const templateError = validateTemplateValue(template, form.templateValues?.[templateId]);

      if (templateError) {
        templateValueErrors[templateId] = templateError;
      }
    });

    const usedCustomTexts = new Set();

    selectedCustomIds.forEach((taskId) => {
      const preparedText = String(form.customTasks?.[taskId] || "").trim();
      const loweredText = preparedText.toLowerCase();

      if (!preparedText) {
        customTaskErrors[taskId] = `Заполните поле`;
        return;
      }

      if (preparedText.length > 160) {
        customTaskErrors[taskId] = `Данное задание должно быть не длиннее 160 символов`;
        return;
      }

      if (usedCustomTexts.has(loweredText)) {
        customTaskErrors[taskId] = `Данное задание повторяется`;
        return;
      }

      usedCustomTexts.add(loweredText);
    });

    if (!hasSelectedTasks) {
      errors.tasks = "Выберите хотя бы одно задание";
    }

    if (Object.keys(templateValueErrors).length > 0) {
      errors.templateValues = templateValueErrors;
      errors.tasks = "Заполните выбранные шаблоны заданий";
    }

    if (Object.keys(customTaskErrors).length > 0) {
      errors.customTasks = customTaskErrors;
      errors.tasks = "Заполните выбранные свои задания";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export default function GroupFormModal({ isOpen, onClose, onSubmit }) {
  if (!isOpen) return null;

  return <GroupFormModalContent onClose={onClose} onSubmit={onSubmit} />;
}

function GroupFormModalContent({ onClose, onSubmit }) {
  const [flow, setFlow] = useState("create");
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [form, setForm] = useState(createInitialForm);
  const [visibleValidationKey, setVisibleValidationKey] = useState("");
  const [groupCode] = useState(createInviteCode);
  const [categories, setCategories] = useState(CATEGORY_OPTIONS);
  const [templatesByCategory, setTemplatesByCategory] = useState({});
  const [templateLoadErrorsByCategory, setTemplateLoadErrorsByCategory] = useState({});
  const [joinPreview, setJoinPreview] = useState(null);
  const [actionError, setActionError] = useState("");
  const [isActionPending, setIsActionPending] = useState(false);
  const dialogRef = useRef(null);

  const shouldSkipTaskSelection = flow === "join" && shouldJoinSkipTaskSelection(joinPreview);
  const totalSteps = flow === "join" && shouldSkipTaskSelection ? 3 : 4;
  const isLastStep = currentStep === totalSteps;
  const activeCategoryId = flow === "create" ? form.categoryId || "sport" : form.categoryId || joinPreview?.habit?.habitTypeCode || "";
  const activeTemplates = useMemo(() => {
    if (!activeCategoryId) return [];

    const loadedTemplates = templatesByCategory[activeCategoryId];
    if (loadedTemplates) return loadedTemplates;

    return flow === "create" ? getLocalTemplates(activeCategoryId) : [];
  }, [activeCategoryId, flow, templatesByCategory]);
  const isTemplatesLoading = Boolean(activeCategoryId && !templatesByCategory[activeCategoryId]);
  const templateLoadError = templateLoadErrorsByCategory[activeCategoryId] || "";
  const validationKey = `${flow}:${currentStep}`;
  const validationResult = useMemo(() => validateGroupFormStep(currentStep, flow, form, activeTemplates, { skipTaskSelection: shouldSkipTaskSelection }), [activeTemplates, currentStep, flow, form, shouldSkipTaskSelection]);
  const validationErrors = visibleValidationKey === validationKey ? validationResult.errors : EMPTY_VALIDATION_ERRORS;

  const handleFlowChange = useCallback((nextFlow) => {
    setFlow(nextFlow);
    setVisibleValidationKey("");
    setActionError("");
    setJoinPreview(null);
    setCurrentStep(1);
    setForm(createInitialForm());
  }, []);

  useEffect(() => {
    let isCancelled = false;

    requestHabbitApi("/api/habits/types")
      .then((data) => {
        if (isCancelled) return;

        const nextCategories = (data?.habitTypes || [])
          .map(normalizeCategory)
          .filter((category) => category.id && CATEGORY_TITLE_BY_CODE[category.id]);

        if (nextCategories.length > 0) {
          setCategories(nextCategories);
        }
      })
      .catch(() => {
        if (!isCancelled) setCategories(CATEGORY_OPTIONS);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (flow !== "create") return;
    if (!activeCategoryId || templatesByCategory[activeCategoryId]) return;

    let isCancelled = false;

    requestHabbitApi(`/api/habits/task-templates?habitTypeCode=${encodeURIComponent(activeCategoryId)}`)
      .then((data) => {
        if (isCancelled) return;

        const serverTemplates = normalizeTaskTemplates(data?.taskTemplates || []);
        setTemplateLoadErrorsByCategory((prev) => ({
          ...prev,
          [activeCategoryId]: "",
        }));
        setTemplatesByCategory((prev) => ({
          ...prev,
          [activeCategoryId]: serverTemplates.length > 0 ? serverTemplates : getLocalTemplates(activeCategoryId),
        }));
      })
      .catch((error) => {
        if (isCancelled) return;

        setTemplateLoadErrorsByCategory((prev) => ({
          ...prev,
          [activeCategoryId]: error?.message || "Не удалось загрузить шаблоны. Показан локальный список.",
        }));
        setTemplatesByCategory((prev) => ({
          ...prev,
          [activeCategoryId]: getLocalTemplates(activeCategoryId),
        }));
      })
      ;

    return () => {
      isCancelled = true;
    };
  }, [activeCategoryId, templatesByCategory, flow]);

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const steps = useMemo(() => {
    if (flow === "create") {
      return [
        <ChoiceStep key="choice" flow={flow} onFlowChange={handleFlowChange} />,
        <CreateGroupDetailsStep key="details" form={form} setForm={setForm} categories={categories} errors={validationErrors} />,
        <TasksStep
          key="tasks"
          templates={activeTemplates}
          form={form}
          setForm={setForm}
          errors={validationErrors}
          isLoading={isTemplatesLoading}
          loadError={templateLoadError}
        />,
        <ReviewStep
          key="review"
          flow={flow}
          form={form}
          templates={activeTemplates}
          categoryId={activeCategoryId}
          categories={categories}
          actionError={actionError}
        />,
      ];
    }

    const joinSteps = [
      <ChoiceStep key="choice" flow={flow} onFlowChange={handleFlowChange} />,
      <JoinGroupCodeStep key="join" form={form} setForm={setForm} joinPreview={joinPreview} errors={validationErrors} actionError={actionError} isLoading={isActionPending} onPreviewReset={() => { setJoinPreview(null); setActionError(""); }} />,
    ];

    if (!shouldSkipTaskSelection) {
      joinSteps.push(
        <TasksStep
          key="tasks"
          templates={activeTemplates}
          form={form}
          setForm={setForm}
          errors={validationErrors}
          isLoading={flow === "create" ? isTemplatesLoading : false}
          loadError={templateLoadError}
        />
      );
    }

    joinSteps.push(
      <ReviewStep
        key="review"
        flow={flow}
        form={form}
        templates={activeTemplates}
        categoryId={activeCategoryId}
        joinedGroup={joinPreview?.habit}
        categories={categories}
        joinPreview={joinPreview}
      />
    );

    return joinSteps;
  }, [activeCategoryId, activeTemplates, actionError, categories, flow, form, handleFlowChange, isActionPending, isTemplatesLoading, joinPreview, shouldSkipTaskSelection, templateLoadError, validationErrors]);

  const updateStep = (nextStep) => {
    setCurrentStep(nextStep);
  };

  const goBack = () => {
    if (currentStep <= 1) return;
    setActionError("");
    setDirection(-1);
    updateStep(currentStep - 1);
  };

  const loadJoinPreview = async () => {
    const preparedCode = String(form.inviteCode || "").trim().toUpperCase();
    setIsActionPending(true);
    setActionError("");

    try {
      const data = await requestJoinPreview(preparedCode);
      const habit = data?.habit || {};
      const habitTypeCode = habit?.habitTypeCode || "";
      const serverTemplates = normalizeTaskTemplates(data?.taskTemplates || []);

      setJoinPreview(data);
      setForm((prev) => ({
        ...prev,
        inviteCode: preparedCode,
        categoryId: habitTypeCode,
        groupName: habit?.title || "",
        groupDescription: habit?.description || "",
        selectedTaskId: "",
        selectedTaskIds: [],
        templateValues: {},
        customTaskId: "",
        customTaskIds: [],
        customTasks: {},
      }));

      if (habitTypeCode) {
        setTemplatesByCategory((prev) => ({
          ...prev,
          [habitTypeCode]: serverTemplates,
        }));
      }

      return data;
    } catch (error) {
      setJoinPreview(null);
      setActionError(error?.message || "Не удалось найти привычку по коду");
      return false;
    } finally {
      setIsActionPending(false);
    }
  };

  const submitJoin = async () => {
    setIsActionPending(true);
    setActionError("");

    const shouldSendTasks = shouldJoinSendTaskSelection(joinPreview);
    const templateTasks = shouldSendTasks ? buildSelectedTemplatePayload(form, activeTemplates) : [];
    const customTasks = shouldSendTasks ? buildSelectedCustomPayload(form) : [];

    try {
      const joinPayload = {
        inviteCode: String(form.inviteCode || "").trim().toUpperCase(),
      };

      if (shouldSendTasks) {
        joinPayload.templateTasks = templateTasks;
        joinPayload.customTasks = customTasks;
      }

      const data = await joinHabitOnServer(joinPayload);

      onSubmit?.({
        mode: "join",
        joinPreviewMode: getJoinPreviewMode(joinPreview),
        ...form,
        categoryId: data?.habit?.habitTypeCode || activeCategoryId,
        groupName: data?.habit?.title || form.groupName,
        groupDescription: data?.habit?.description || form.groupDescription,
        groupCode: data?.habit?.inviteCode || form.inviteCode,
        templateTasks,
        customTasks,
        serverResponse: data,
      });
      onClose?.();
    } catch (error) {
      setActionError(error?.message || "Не удалось присоединиться к привычке");
    } finally {
      setIsActionPending(false);
    }
  };

  const goNext = async () => {
    const validation = validateGroupFormStep(currentStep, flow, form, activeTemplates, { skipTaskSelection: shouldSkipTaskSelection });

    if (!validation.isValid) {
      setVisibleValidationKey(validationKey);
      return;
    }

    setVisibleValidationKey("");

    if (flow === "join" && currentStep === 2) {
      const previewData = await loadJoinPreview();

      if (!previewData) {
        setVisibleValidationKey(validationKey);
        return;
      }

      if (shouldJoinSkipTaskSelection(previewData)) {
        setDirection(1);
        updateStep(3);
        return;
      }
    }

    if (isLastStep) {
      if (flow === "join") {
        await submitJoin();
        return;
      }

      onSubmit?.({
        mode: flow,
        ...form,
        groupName: form.groupName,
        groupDescription: form.groupDescription,
        groupCode,
        categoryId: activeCategoryId,
        templateTasks: buildSelectedTemplatePayload(form, activeTemplates),
        customTasks: buildSelectedCustomPayload(form),
      });
      onClose?.();
      return;
    }

    setDirection(1);
    updateStep(currentStep + 1);
  };

  const handleIndicatorClick = (step) => {
    if (step > currentStep) return;

    setDirection(step > currentStep ? 1 : -1);
    setVisibleValidationKey("");
    updateStep(step);
  };

  return (
    <div className="group-form-modal" role="presentation">
      <motion.div
        className="group-form-modal__backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.section
        ref={dialogRef}
        className="group-form-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-form-title"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.25 }}
      >
        <button type="button" className="group-form-modal__close" onClick={onClose} aria-label="Закрыть форму">
          ×
        </button>

        <div className="group-form-modal__header">
          <h2 id="group-form-title" className="group-form-modal__title">
            Создание или вход в привычку
          </h2>
        </div>

        <Stepper currentStep={currentStep} direction={direction} onStepClick={handleIndicatorClick}>
          {steps}
        </Stepper>

        <div className={`group-form-modal__footer ${currentStep === 1 ? "group-form-modal__footer--end" : ""}`}>
          {currentStep !== 1 && (
            <button type="button" className="group-form-modal__button group-form-modal__button--ghost" onClick={goBack}>
              Назад
            </button>
          )}

          <button
            type="button"
            className="group-form-modal__button group-form-modal__button--main"
            onClick={goNext}
            disabled={isActionPending || (flow === "join" && isLastStep && !joinPreview)}
          >
            {isActionPending ? "Загрузка..." : isLastStep ? "Готово" : "Далее"}
          </button>
        </div>
      </motion.section>
    </div>
  );
}

function Stepper({ children, currentStep, direction, onStepClick }) {
  const stepsArray = Children.toArray(children);

  return (
    <div className="group-stepper">
      <div className="group-stepper__indicator-row">
        {stepsArray.map((_, index) => {
          const step = index + 1;
          const status = currentStep === step ? "active" : currentStep > step ? "complete" : "inactive";

          return (
            <div className="group-stepper__indicator-wrap" key={step}>
              <button
                type="button"
                className={`group-stepper__indicator group-stepper__indicator--${status}`}
                onClick={() => onStepClick(step)}
                aria-label={`Перейти к шагу ${step}`}
              >
                {status === "complete" ? <CheckIcon /> : status === "active" ? <span /> : step}
              </button>

              {index < stepsArray.length - 1 && (
                <span className={`group-stepper__connector ${currentStep > step ? "group-stepper__connector--complete" : ""}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="group-stepper__content">
        <AnimatePresence initial={false} mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28 }}
          >
            {stepsArray[currentStep - 1]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ChoiceStep({ flow, onFlowChange }) {
  return (
    <StepShell title="Выбери подходящий для себя вариант">
      <div className="group-form-options">
        <RadioCard
          checked={flow === "create"}
          title="Создать новую привычку"
          onChange={() => onFlowChange("create")}
        />
        <RadioCard
          checked={flow === "join"}
          title="Присоединиться к существующей привычке"
          onChange={() => onFlowChange("join")}
        />
      </div>
    </StepShell>
  );
}

function CreateGroupDetailsStep({ form, setForm, categories, errors = {} }) {
  const handleCategoryChange = (categoryId) => {
    setForm((prev) => ({
      ...prev,
      categoryId,
      selectedTaskId: "",
      selectedTaskIds: [],
      templateValues: {},
      customTaskId: "",
      customTaskIds: [],
    }));
  };

  return (
    <StepShell title="Данные Привычки" className="group-form-step--details">
      <CategoryDropdown categories={categories} value={form.categoryId} onChange={handleCategoryChange} error={errors.categoryId} />

      <label className={`group-form-field ${errors.groupName ? "group-form-field--error" : ""}`.trim()}>
        <span>Впишите название привычки</span>
        <input
          value={form.groupName}
          onChange={(event) => setForm((prev) => ({ ...prev, groupName: event.target.value }))}
          placeholder="Например: Чистый дом"
          maxLength={80}
          aria-invalid={Boolean(errors.groupName)}
        />
        {errors.groupName && <small className="group-form-error">{errors.groupName}</small>}
      </label>

      <label className={`group-form-field group-form-field--description ${errors.groupDescription ? "group-form-field--error" : ""}`.trim()}>
        <span>Впишите описание привычки</span>
        <textarea
          value={form.groupDescription}
          onChange={(event) => setForm((prev) => ({ ...prev, groupDescription: event.target.value }))}
          placeholder="Коротко опиши цель привычки"
          rows={2}
          maxLength={500}
          aria-invalid={Boolean(errors.groupDescription)}
        />
        {errors.groupDescription && <small className="group-form-error">{errors.groupDescription}</small>}
      </label>
    </StepShell>
  );
}

function CategoryDropdown({ categories = CATEGORY_OPTIONS, value, onChange, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const activeCategory = categories.find((category) => category.id === value);
  const hasValue = Boolean(activeCategory);

  const handleSelect = (categoryId) => {
    onChange(categoryId);
    setIsOpen(false);
  };

  return (
    <div className={`group-form-category-select ${isOpen ? "group-form-category-select--open" : ""} ${error ? "group-form-category-select--error" : ""}`.trim()}>
      <span className="group-form-category-select__label">Выберите категорию</span>

      <button
        type="button"
        className={`group-form-category-select__button ${hasValue ? `group-form-category-select__button--${activeCategory.id}` : "group-form-category-select__button--empty"}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-invalid={Boolean(error)}
      >
        <span className="group-form-category-select__left">
          <span className="group-form-category-select__icon">
            {hasValue ? (
              <img src={CATEGORY_ICON_BY_ID[activeCategory.id]} alt="" className="group-form-category-select__icon-image" />
            ) : (
              <span className="group-form-category-select__icon-empty">?</span>
            )}
          </span>
          <span className="group-form-category-select__title">{hasValue ? activeCategory.title : "Категория не выбрана"}</span>
        </span>

        <span
          className={`group-form-category-select__arrow ${
            isOpen ? "group-form-category-select__arrow--open" : ""
          }`}
          aria-hidden="true"
        >
          <span className="group-form-category-select__arrow-shape" />
        </span>
      </button>

      <div className={`group-form-category-select__content ${isOpen ? "group-form-category-select__content--open" : ""}`}>
        <div className="group-form-category-select__content-inner">
          {categories.map((category) => {
            const isActive = category.id === value;

            return (
              <button
                key={category.id}
                type="button"
                className={`group-form-category-select__option group-form-category-select__option--${category.id} ${isActive ? "group-form-category-select__option--active" : ""}`.trim()}
                onClick={() => handleSelect(category.id)}
              >
                <span className="group-form-category-select__option-icon">
                  <img src={CATEGORY_ICON_BY_ID[category.id]} alt="" className="group-form-category-select__option-icon-image" />
                </span>
                <span>{category.title}</span>
              </button>
            );
          })}
        </div>
      </div>
      {error && <small className="group-form-error">{error}</small>}
    </div>
  );
}

function JoinGroupCodeStep({ form, setForm, joinPreview, errors = {}, actionError = "", isLoading = false, onPreviewReset }) {
  const previewHabit = joinPreview?.habit;
  const previewModeText = getJoinPreviewModeText(joinPreview);

  const handleInviteCodeChange = (event) => {
    const rawValue = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const withoutPrefix = rawValue.startsWith("HAB") ? rawValue.slice(3) : rawValue;
    const firstPart = withoutPrefix.slice(0, 4);
    const secondPart = withoutPrefix.slice(4, 8);
    const preparedCode = ["HAB", firstPart, secondPart].filter(Boolean).join("-");

    onPreviewReset?.();

    setForm((prev) => ({
      ...prev,
      inviteCode: preparedCode,
    }));
  };

  return (
    <StepShell title="Код привычки" text="Введи код приглашения. После нажатия «Далее» форма проверит, можно ли войти в привычку и нужно ли выбирать задания.">
      <label className={`group-form-field ${errors.inviteCode ? "group-form-field--error" : ""}`.trim()}>
        <span>Впишите код привычки</span>
        <input
          value={form.inviteCode}
          onChange={handleInviteCodeChange}
          placeholder="HAB-XXXX-XXXX"
          maxLength={13}
          aria-invalid={Boolean(errors.inviteCode)}
        />
        {errors.inviteCode && <small className="group-form-error">{errors.inviteCode}</small>}
      </label>

      {actionError && <div className="group-form-error-card">{actionError}</div>}
      {isLoading && <div className="group-form-hint-card">Проверяю код и загружаю данные привычки...</div>}

      {previewHabit && (
        <div className="group-form-hint-card">
          Найдена привычка: <strong>{previewHabit.title}</strong> · {CATEGORY_TITLE_BY_CODE[previewHabit.habitTypeCode] || previewHabit.habitTypeCode}.
          Свободных мест: {joinPreview?.availablePlacesCount ?? "—"}.
          {previewModeText && <div className="group-form-hint-card__status">{previewModeText}</div>}
        </div>
      )}
    </StepShell>
  );
}

function TasksStep({ templates, form, setForm, errors = {}, isLoading = false, loadError = "" }) {
  const toggleTemplate = (templateId) => {
    const template = getTemplateById(templateId, templates);

    setForm((prev) => {
      const currentIds = prev.selectedTaskIds || [];
      const isSelected = currentIds.includes(templateId);
      const nextIds = isSelected
        ? currentIds.filter((id) => id !== templateId)
        : [...currentIds, templateId];

      return {
        ...prev,
        selectedTaskIds: nextIds,
        selectedTaskId: nextIds[0] || "",
        templateValues: {
          ...(prev.templateValues || {}),
          ...(template?.valueType === "none" && !isSelected ? { [templateId]: "" } : {}),
        },
      };
    });
  };

  const updateTemplateValue = (template, value) => {
    setForm((prev) => ({
      ...prev,
      templateValues: {
        ...(prev.templateValues || {}),
        [template.id]: sanitizeTemplateValue(template, value),
      },
    }));
  };

  const toggleCustomTask = (taskId) => {
    setForm((prev) => {
      const currentIds = prev.customTaskIds || [];
      const nextIds = currentIds.includes(taskId)
        ? currentIds.filter((id) => id !== taskId)
        : [...currentIds, taskId];

      return {
        ...prev,
        customTaskIds: nextIds,
        customTaskId: nextIds[0] || "",
      };
    });
  };

  return (
    <StepShell className="group-form-step--tasks" title="Личные задания">
      <div className={`group-form-task-scroll ${errors.tasks ? "group-form-task-scroll--error" : ""}`.trim()}>
        {isLoading && <div className="group-form-hint-card">Загружаю шаблоны заданий с сервера…</div>}
        {loadError && <div className="group-form-hint-card group-form-hint-card--warning">{loadError}</div>}
        {errors.tasks && <div className="group-form-error-card">{errors.tasks}</div>}

        <div className="group-form-template-list">
          {templates.map((template) => {
            const isChecked = (form.selectedTaskIds || []).includes(template.id);
            const errorMessage = errors.templateValues?.[template.id];
            const hasError = Boolean(errorMessage);
            const inputProps = getTemplateInputProps(template);
            const currentValue = form.templateValues?.[template.id] || "";
            const placeholderValue = getTemplatePlaceholder(template);
            const tailValue = currentValue || (template.valueType === "number" ? placeholderValue : "");
            const { before } = splitTemplateText(template.templateText);
            const tail = getTemplateTail(template, tailValue);
            const choices = getTemplateChoices(template);

            return (
              <div key={template.id} className={`group-form-template ${isChecked ? "group-form-template--checked" : ""} ${hasError ? "group-form-template--error" : ""}`.trim()}>
                <label className="group-form-template__main">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleTemplate(template.id)}
                  />
                  <span className="group-form-template__dot" />
                  <span className="group-form-template__text">
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

                {hasError && <small className="group-form-error group-form-template__error">{errorMessage}</small>}
              </div>
            );
          })}
        </div>

        <div className="group-form-custom-head">
          <span>Вписать своё задание</span>
          <span className="group-form-info" tabIndex={0} aria-label="Информация о своих заданиях">
            !
            <span className="group-form-info__tooltip">За выполнение данных заданий нельзя получить достижение</span>
          </span>
        </div>

        <div className="group-form-custom-list">
          {CUSTOM_TASK_IDS.map((id) => {
            const isChecked = (form.customTaskIds || []).includes(id);
            const customError = errors.customTasks?.[id];
            const hasError = Boolean(customError);

            return (
              <label key={id} className={`group-form-custom-task ${hasError ? "group-form-custom-task--error" : ""}`.trim()}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleCustomTask(id)}
                />
                <span className="group-form-template__dot" />
                <span className="group-form-custom-task__body">
                  <input
                    value={form.customTasks[id] || ""}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        customTasks: { ...(prev.customTasks || {}), [id]: event.target.value },
                      }))
                    }
                    placeholder={`Впиши сюда свое задание`}
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
    </StepShell>
  );
}

function ReviewStep({ flow, form, templates, categoryId, joinedGroup, categories = CATEGORY_OPTIONS, actionError = "", joinPreview = null }) {
  const selectedTasks = getSelectedTaskSummaries(form, templates);
  const isCreateFlow = flow === "create";
  const isReturnExisting = flow === "join" && shouldJoinSkipTaskSelection(joinPreview);
  const joinModeText = getJoinPreviewModeText(joinPreview);

  return (
    <StepShell
      title="Проверка данных"
      text="Проверь выбранные поля перед завершением."
      className="group-form-step--review"
    >
      <div className="group-form-review">
        <ReviewItem label="Действие" value={isCreateFlow ? "Создать новую привычку" : "Присоединиться к кривычке"} />
        <ReviewItem label="Категория" value={getCategoryTitle(categoryId, categories)} />
        <ReviewItem label={isCreateFlow ? "Название привычки" : "привычка"} value={isCreateFlow ? form.groupName : joinedGroup?.title || joinedGroup?.name} />

        {isCreateFlow ? (
          <ReviewItem label="Описание" value={form.groupDescription} />
        ) : (
          <ReviewItem label="Код привычки" value={form.inviteCode} />
        )}

        {actionError && <div className="group-form-error-card">{actionError}</div>}

        {isReturnExisting ? (
          <ReviewItem label="Возвращение" value={joinModeText || "Прежние задания и прогресс будут восстановлены."} />
        ) : (
          <div className="group-form-review__card group-form-review__card--tasks">
            <span className="group-form-review__label">Выбранные задания</span>
            {selectedTasks.length > 0 ? (
              <ul className="group-form-review__task-list">
                {selectedTasks.map((task, index) => (
                  <li key={`${task}-${index}`}>{task}</li>
                ))}
              </ul>
            ) : (
              <strong>Задания не выбраны</strong>
            )}
          </div>
        )}
      </div>
    </StepShell>
  );
}

function ReviewItem({ label, value }) {
  return (
    <div className="group-form-review__card">
      <span className="group-form-review__label">{label}</span>
      <strong>{String(value || "—")}</strong>
    </div>
  );
}

function StepShell({ title, text = "", children, className = "" }) {
  return (
    <div className={`group-form-step ${className}`.trim()}>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      <div className="group-form-step__body">{children}</div>
    </div>
  );
}

function RadioCard({ checked, title, text = "", onChange }) {
  return (
    <label className={`group-form-radio-card ${checked ? "group-form-radio-card--checked" : ""}`}>
      <input type="radio" checked={checked} onChange={onChange} />
      <span className="group-form-radio-card__dot" />
      <span className="group-form-radio-card__text">
        <strong>{title}</strong>
        {text && <small>{text}</small>}
      </span>
    </label>
  );
}

function CheckIcon() {
  return (
    <svg className="group-stepper__check" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

const stepVariants = {
  enter: (direction) => ({
    x: direction >= 0 ? 32 : -32,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction >= 0 ? -32 : 32,
    opacity: 0,
  }),
};
