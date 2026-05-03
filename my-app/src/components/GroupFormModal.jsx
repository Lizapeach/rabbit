import { Children, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import "../styles/group-form-modal.css";

const CATEGORY_OPTIONS = [
  { id: "sport", title: "Спорт" },
  { id: "cleaning", title: "Уборка" },
  { id: "reading", title: "Чтение" },
  { id: "nutrition", title: "Питание" },
];

const CATEGORY_ACCENTS = {
  sport: "var(--color-category-sport, #d9edff)",
  cleaning: "var(--color-category-cleaning)",
  reading: "var(--color-category-reading)",
  nutrition: "var(--color-category-nutrition)",
};

const TASK_TEMPLATES = {
  sport: [
    { id: "sport-sets", before: "Выполнить", after: "подходов" },
    { id: "sport-minutes", before: "Тренироваться", after: "минут" },
    { id: "sport-steps", before: "Пройти", after: "шагов" },
    { id: "sport-stretch", before: "Сделать растяжку", after: "минут" },
  ],
  cleaning: [
    { id: "cleaning-zone", before: "Убрать", after: "" },
    { id: "cleaning-minutes", before: "Наводить порядок", after: "минут" },
    { id: "cleaning-items", before: "Разобрать", after: "вещей" },
    { id: "cleaning-reset", before: "Сделать", after: "мини-уборку" },
  ],
  reading: [
    { id: "reading-pages", before: "Прочитать", after: "страниц" },
    { id: "reading-minutes", before: "Читать", after: "минут" },
    { id: "reading-chapter", before: "Прочитать", after: "главу" },
    { id: "reading-notes", before: "Выписать", after: "мысли из книги" },
  ],
  nutrition: [
    { id: "nutrition-water", before: "Выпить", after: "стаканов воды" },
    { id: "nutrition-breakfast", before: "Сделать", after: "полезный завтрак" },
    { id: "nutrition-fruit", before: "Съесть", after: "порций овощей или фруктов" },
    { id: "nutrition-plan", before: "Запланировать", after: "приём пищи" },
  ],
};

const CUSTOM_TASK_IDS = ["custom-1", "custom-2", "custom-3", "custom-4"];
const MOCK_JOINED_GROUP = {
  name: "Quiet Pages",
  categoryId: "reading",
};

function createInviteCode() {
  return `HAB-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function createInitialForm() {
  return {
    categoryId: "sport",
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

export default function GroupFormModal({ isOpen, onClose, onSubmit }) {
  if (!isOpen) return null;

  return <GroupFormModalContent onClose={onClose} onSubmit={onSubmit} />;
}

function GroupFormModalContent({ onClose, onSubmit }) {
  const [flow, setFlow] = useState("create");
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState(createInitialForm);
  const [groupCode] = useState(createInviteCode);
  const dialogRef = useRef(null);

  const totalSteps = flow === "create" ? 4 : 3;
  const isLastStep = currentStep === totalSteps;
  const activeCategoryId = flow === "create" ? form.categoryId : MOCK_JOINED_GROUP.categoryId;
  const activeTemplates = TASK_TEMPLATES[activeCategoryId] || TASK_TEMPLATES.sport;


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

  const handleCopyCode = useCallback(async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, []);

  const steps = useMemo(() => {
    if (flow === "create") {
      return [
        <ChoiceStep key="choice" flow={flow} onFlowChange={setFlow} />,
        <CreateGroupDetailsStep key="details" form={form} setForm={setForm} />,
        <TasksStep
          key="tasks"
          templates={activeTemplates}
          form={form}
          setForm={setForm}
        />,
        <InviteCodeStep key="code" code={groupCode} copied={copied} onCopy={() => handleCopyCode(groupCode)} />,
      ];
    }

    return [
      <ChoiceStep key="choice" flow={flow} onFlowChange={setFlow} />,
      <JoinGroupCodeStep key="join" form={form} setForm={setForm} joinedGroup={MOCK_JOINED_GROUP} />,
      <TasksStep
        key="tasks"
        templates={activeTemplates}
        form={form}
        setForm={setForm}
      />,
    ];
  }, [activeTemplates, copied, flow, form, groupCode, handleCopyCode]);

  const updateStep = (nextStep) => {
    setCurrentStep(nextStep);
  };

  const goBack = () => {
    if (currentStep <= 1) return;
    setDirection(-1);
    updateStep(currentStep - 1);
  };

  const goNext = () => {
    if (isLastStep) {
      onSubmit?.({
        mode: flow,
        ...form,
        groupCode: flow === "create" ? groupCode : form.inviteCode,
        categoryId: activeCategoryId,
      });
      onClose?.();
      return;
    }

    setDirection(1);
    updateStep(currentStep + 1);
  };

  const handleIndicatorClick = (step) => {
    setDirection(step > currentStep ? 1 : -1);
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
          <div className="section-label">Новая группа</div>
          <h2 id="group-form-title" className="group-form-modal__title">
            Создание или вход в группу
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

          <button type="button" className="group-form-modal__button group-form-modal__button--main" onClick={goNext}>
            {isLastStep ? "Готово" : "Далее"}
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
    <StepShell title="Что нужно сделать?">
      <div className="group-form-options">
        <RadioCard
          checked={flow === "create"}
          title="Создать новую группу"
          text="Ты выбираешь категорию, описание, задания и получаешь код для друзей."
          onChange={() => onFlowChange("create")}
        />
        <RadioCard
          checked={flow === "join"}
          title="Присоединиться к существующей группе"
          text="Ты вводишь код группы и выбираешь личные задания внутри её категории."
          onChange={() => onFlowChange("join")}
        />
      </div>
    </StepShell>
  );
}

function CreateGroupDetailsStep({ form, setForm }) {
  const handleCategoryChange = (categoryId) => {
    setForm((prev) => ({
      ...prev,
      categoryId,
      selectedTaskId: "",
      selectedTaskIds: [],
      customTaskId: "",
      customTaskIds: [],
    }));
  };

  return (
    <StepShell title="Данные группы" className="group-form-step--details">
      <CategoryDropdown value={form.categoryId} onChange={handleCategoryChange} />

      <label className="group-form-field">
        <span>Впишите название группы</span>
        <input
          value={form.groupName}
          onChange={(event) => setForm((prev) => ({ ...prev, groupName: event.target.value }))}
          placeholder="Например: Daily Chapter"
        />
      </label>

      <label className="group-form-field group-form-field--description">
        <span>Впишите описание группы</span>
        <textarea
          value={form.groupDescription}
          onChange={(event) => setForm((prev) => ({ ...prev, groupDescription: event.target.value }))}
          placeholder="Коротко опиши цель группы"
          rows={2}
        />
      </label>
    </StepShell>
  );
}

function CategoryDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const activeCategory = CATEGORY_OPTIONS.find((category) => category.id === value) || CATEGORY_OPTIONS[0];

  const handleSelect = (categoryId) => {
    onChange(categoryId);
    setIsOpen(false);
  };

  return (
    <div className={`group-form-category-select ${isOpen ? "group-form-category-select--open" : ""}`}>
      <span className="group-form-category-select__label">Выберите категорию</span>

      <button
        type="button"
        className={`group-form-category-select__button group-form-category-select__button--${activeCategory.id}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className="group-form-category-select__left">
          <span
            className="group-form-category-select__icon"
            style={{ background: CATEGORY_ACCENTS[activeCategory.id] }}
          >
            {activeCategory.title.slice(0, 1)}
          </span>
          <span className="group-form-category-select__title">{activeCategory.title}</span>
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
          {CATEGORY_OPTIONS.map((category) => {
            const isActive = category.id === value;

            return (
              <button
                key={category.id}
                type="button"
                className={`group-form-category-select__option ${isActive ? "group-form-category-select__option--active" : ""}`}
                onClick={() => handleSelect(category.id)}
              >
                <span
                  className="group-form-category-select__option-icon"
                  style={{ background: CATEGORY_ACCENTS[category.id] }}
                >
                  {category.title.slice(0, 1)}
                </span>
                <span>{category.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function JoinGroupCodeStep({ form, setForm, joinedGroup }) {
  return (
    <StepShell title="Код группы" text="Код находится в настройках группы у её создателя.">
      <label className="group-form-field">
        <span>Впишите код группы</span>
        <input
          value={form.inviteCode}
          onChange={(event) => setForm((prev) => ({ ...prev, inviteCode: event.target.value.toUpperCase() }))}
          placeholder="Например: HAB-A12B-C34D"
        />
      </label>

      <div className="group-form-hint-card">
        После подключения категория будет взята из группы создателя. Сейчас для макета используется пример: {joinedGroup.name} · Чтение.
      </div>
    </StepShell>
  );
}

function TasksStep({ templates, form, setForm }) {
  const toggleTemplate = (templateId) => {
    setForm((prev) => {
      const currentIds = prev.selectedTaskIds || [];
      const nextIds = currentIds.includes(templateId)
        ? currentIds.filter((id) => id !== templateId)
        : [...currentIds, templateId];

      return {
        ...prev,
        selectedTaskIds: nextIds,
        selectedTaskId: nextIds[0] || "",
      };
    });
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
      <div className="group-form-task-scroll">
        <div className="group-form-template-list">
          {templates.map((template) => (
            <label key={template.id} className="group-form-template">
              <input
                type="checkbox"
                checked={(form.selectedTaskIds || []).includes(template.id)}
                onChange={() => toggleTemplate(template.id)}
              />
              <span className="group-form-template__dot" />
              <span className="group-form-template__text">
                {template.before}
                <input
                  value={form.templateValues[template.id] || ""}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      templateValues: { ...prev.templateValues, [template.id]: event.target.value },
                    }))
                  }
                  placeholder="___"
                />
                {template.after}
              </span>
            </label>
          ))}
        </div>

        <div className="group-form-custom-head">
          <span>Вписать своё задание</span>
          <span className="group-form-info" tabIndex={0} aria-label="Информация о своих заданиях">
            !
            <span className="group-form-info__tooltip">За выполнение данных заданий нельзя получить достижение</span>
          </span>
        </div>

        <div className="group-form-custom-list">
          {CUSTOM_TASK_IDS.map((id, index) => (
            <label key={id} className="group-form-custom-task">
              <input
                type="checkbox"
                checked={(form.customTaskIds || []).includes(id)}
                onChange={() => toggleCustomTask(id)}
              />
              <span className="group-form-template__dot" />
              <input
                value={form.customTasks[id] || ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    customTasks: { ...prev.customTasks, [id]: event.target.value },
                  }))
                }
                placeholder={`Своё задание ${index + 1}`}
              />
            </label>
          ))}
        </div>
      </div>
    </StepShell>
  );
}

function InviteCodeStep({ code, copied, onCopy }) {
  return (
    <StepShell title="Код приглашения">
      <div className="group-form-code-card">
        <button type="button" onClick={onCopy}>
          {code}
        </button>
        <small>{copied ? "Код скопирован" : "Нажми на код, чтобы скопировать"}</small>
      </div>
    </StepShell>
  );
}

function StepShell({ title, text, children, className = "" }) {
  return (
    <div className={`group-form-step ${className}`.trim()}>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      <div className="group-form-step__body">{children}</div>
    </div>
  );
}

function RadioCard({ checked, title, text, onChange }) {
  return (
    <label className={`group-form-radio-card ${checked ? "group-form-radio-card--checked" : ""}`}>
      <input type="radio" checked={checked} onChange={onChange} />
      <span className="group-form-radio-card__dot" />
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
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
