import { useCallback, useState } from "react";

import gearIcon from "../../assets/icons/gear.png";
import achievementIcon from "../../assets/icons/achievement.svg";
import {
  ModalInnerLoader,
  PERSONAL_TASK_TEMPLATES,
  USER,
  buildTaskEditorRequestBody,
  createTaskEditorDraftFromOptions,
  getHabitTypeName,
  getInitial,
  getTaskEditorChoices,
  getTaskEditorInputProps,
  getTaskEditorTemplateTail,
  hasTaskEditorErrors,
  normalizeHexColor,
  renderMemberAvatar,
  sanitizeTaskEditorTemplateValue,
  splitTemplateText,
  validateTaskEditorDraftWithTemplates,
} from "../../utils/groupPageUtils.jsx";

const DEFAULT_AVATAR_TEXT_COLOR = "#3f352e";
const LIGHT_AVATAR_TEXT_COLOR = "#fffaf3";
const DARK_AVATAR_TEXT_COLOR = "#3f352e";

function getAvatarBgColor(avatar, fallbackColor) {
  return avatar?.color || avatar?.bgColor || avatar?.bg_color || avatar?.backgroundColor || fallbackColor;
}

function getReadableAvatarTextColor(color) {
  if (!color || typeof color !== "string") return DEFAULT_AVATAR_TEXT_COLOR;

  const normalized = color.trim();
  const shortHexMatch = normalized.match(/^#([0-9a-f]{3})$/i);
  const fullHexMatch = normalized.match(/^#([0-9a-f]{6})$/i);

  let hex;

  if (fullHexMatch) {
    hex = fullHexMatch[1];
  } else if (shortHexMatch) {
    hex = shortHexMatch[1]
      .split("")
      .map((char) => char + char)
      .join("");
  } else {
    return DEFAULT_AVATAR_TEXT_COLOR;
  }

  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness < 145 ? LIGHT_AVATAR_TEXT_COLOR : DARK_AVATAR_TEXT_COLOR;
}

function getAvatarStyle(avatar, fallbackColor, extraStyles = {}) {
  const avatarBgColor = getAvatarBgColor(avatar, fallbackColor);
  const avatarTextColor = getReadableAvatarTextColor(avatarBgColor);

  return {
    backgroundColor: avatarBgColor,
    color: avatarTextColor,
    "--avatar-symbol-color": avatarTextColor,
    ...extraStyles,
  };
}

export function MemberInfoModal({ profileState, isAdmin, onClose }) {
  const isLoading = profileState?.status === "loading";
  const hasError = profileState?.status === "error";
  const profile = profileState?.data || null;
  const fallbackMember = profileState?.fallbackMember || {};
  const member = profile?.member || fallbackMember;
  const record = profile?.record || {};
  const achievements = profile?.achievements || [];
  const memberName = member?.name || "Участник";
  const memberAvatar = member?.avatar || fallbackMember?.avatar;
  const memberInitials = member?.initials || fallbackMember?.initials || getInitial(memberName);
  const memberAvatarColor = memberAvatar?.color || member?.avatarColor || fallbackMember?.avatarColor || USER.avatarColor;
  const recordDays = Number(record.days || 0);
  const categoryName = getHabitTypeName(record.habitTypeCode);
  const habitTitle = record.habitTitle || "—";

  return (
    <div className="modal-backdrop member-info-backdrop" data-note-ui="true" onClick={onClose}>
      <div className="member-info-modal" style={{ position: "relative", overflow: "hidden" }} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="task-editor-modal__close" onClick={onClose} aria-label="Закрыть окно">
          ×
        </button>

        <div className="member-info-modal__header">
          <div className="member-info-modal__identity">
            <h2 className="task-editor-modal__title">Информация участника</h2>
            <h2 className="member-info-modal__name">{memberName}</h2>
            {isAdmin && <div className="member-info-modal__role">Администратор группы</div>}
          </div>
        </div>

        <div className="member-info-modal__content">
          {isLoading && <ModalInnerLoader />}
          {hasError && <div className="group-form-error-card">{profileState.error}</div>}

          <div className="member-info-record-row">
            <div
              className="member-info-record-avatar"
              style={getAvatarStyle(memberAvatar, memberAvatarColor)}
              aria-hidden="true"
            >
              {renderMemberAvatar(memberAvatar, memberInitials)}
            </div>

            <section className="member-info-record record-streak">
              <div className="record-streak__inner member-info-record__inner">
                <div className="record-streak__days member-info-record__days">
                  <span className="record-streak__card-label">Дней</span>
                  <strong className="record-streak__value member-info-record__value">{isLoading ? "—" : recordDays}</strong>
                </div>

                <div className="record-streak__details member-info-record__details">
                  <div className="record-streak__meta-card member-info-record__meta-card">
                    <span className="record-streak__card-label">Категория</span>
                    <strong className="record-streak__meta-value member-info-record__meta-value">
                      {isLoading ? "—" : categoryName}
                    </strong>
                  </div>

                  <div className="record-streak__meta-card member-info-record__meta-card">
                    <span className="record-streak__card-label">Группа</span>
                    <strong className="record-streak__meta-value member-info-record__meta-value">
                      {isLoading ? "—" : habitTitle}
                    </strong>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="member-info-achievements">
            <div className="member-info-achievements__title">Достижения</div>
            <div className="member-info-achievements__list">
              {!isLoading && !hasError && achievements.length === 0 && (
                <div className="member-info-achievement achievement-card">
                  <div className="achievement-card__content">
                    <div className="achievement-card__icon member-info-achievement__icon" aria-hidden="true">
                      <img src={achievementIcon} alt="" className="achievement-card__icon-image member-info-achievement__icon-image" />
                    </div>
                    <div className="member-info-achievement__text">
                      <strong>Пока нет достижений</strong>
                      <small>Когда участник получит достижение, оно появится здесь.</small>
                    </div>
                  </div>
                </div>
              )}

              {!isLoading && !hasError && achievements.map((achievement) => (
                <div key={achievement.id} className="member-info-achievement achievement-card">
                  <div className="achievement-card__content">
                    <div className="achievement-card__icon member-info-achievement__icon" aria-hidden="true">
                      <img src={achievementIcon} alt="" className="achievement-card__icon-image member-info-achievement__icon-image" />
                    </div>
                    <div className="member-info-achievement__text">
                      <strong>{achievement.title}</strong>
                      <small>{achievement.description || "Описание достижения не указано."}</small>
                      {achievement.rewardCoins > 0 && <small>Награда: {achievement.rewardCoins} монет</small>}
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

export function GroupInfoEditorModal({ habit, fallbackGroupInfo, status, requestError, onClose, onSave }) {
  const sourceTitle = habit?.title ?? fallbackGroupInfo?.name ?? "";
  const sourceDescription = habit?.description ?? fallbackGroupInfo?.description ?? "";
  const [draftName, setDraftName] = useState(sourceTitle);
  const [draftDescription, setDraftDescription] = useState(sourceDescription || "");
  const [errors, setErrors] = useState({});


  const isBusy = status === "loading" || status === "saving";

  const handleSave = () => {
    const nextTitle = draftName.trim();
    const nextDescription = draftDescription.trim();
    const nextErrors = {};

    if (!nextTitle) {
      nextErrors.name = "Нужно указать название группы";
    } else if (nextTitle.length < 2) {
      nextErrors.name = "Название группы должно быть не короче 2 символов";
    } else if (nextTitle.length > 80) {
      nextErrors.name = "Название группы должно быть не длиннее 80 символов";
    }

    if (nextDescription.length > 500) {
      nextErrors.description = "Описание группы должно быть не длиннее 500 символов";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    onSave({
      title: nextTitle,
      description: nextDescription || null,
    });
  };

  return (
    <div className="modal-backdrop task-editor-backdrop" data-note-ui="true" onClick={isBusy ? undefined : onClose}>
      <div className="task-editor-modal group-info-editor-modal" style={{ position: "relative", overflow: "hidden" }} onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="task-editor-modal__close"
          onClick={onClose}
          disabled={isBusy}
          aria-label="Закрыть окно"
        >
          ×
        </button>

        {status === "loading" && <ModalInnerLoader />}

        <div className="task-editor-modal__header">
          <h2 className="task-editor-modal__title">Изменить название и описание</h2>
          <p className="task-editor-modal__text">
            Здесь можно изменить название и описание привычки. Эти данные будут видны всем участникам.
          </p>
        </div>

        <div className="group-info-editor__body">
          {requestError && <div className="group-form-error-card">{requestError}</div>}

          <label className={`group-info-editor__field ${errors.name ? "group-info-editor__field--error" : ""}`}>
            <span>Название группы</span>
            <input
              type="text"
              value={draftName}
              maxLength={80}
              disabled={isBusy || status === "error"}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Например: Чистый дом"
            />
            {errors.name && <small className="group-form-error">{errors.name}</small>}
          </label>

          <label className={`group-info-editor__field ${errors.description ? "group-info-editor__field--error" : ""}`}>
            <span>Описание группы</span>
            <textarea
              value={draftDescription}
              maxLength={500}
              disabled={isBusy || status === "error"}
              onChange={(event) => setDraftDescription(event.target.value)}
              placeholder="Коротко опиши цель группы"
            />
            <small className="group-info-editor__counter">{draftDescription.length}/500</small>
            {errors.description && <small className="group-form-error">{errors.description}</small>}
          </label>
        </div>

        <div className="task-editor-modal__footer">
          <button
            type="button"
            className="modal-card__button task-editor-modal__save"
            onClick={handleSave}
            disabled={isBusy || status === "error"}
          >
            {status === "saving" ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TaskEditorModal({ editOptions, status, requestError, onClose, onSave }) {
  const templates = editOptions?.taskTemplates?.length ? editOptions.taskTemplates : PERSONAL_TASK_TEMPLATES;
  const [draft, setDraft] = useState(() => createTaskEditorDraftFromOptions(editOptions));
  const [errors, setErrors] = useState({ templates: {}, customTasks: {}, common: "" });


  const isBusy = status === "loading" || status === "saving";

  const toggleTemplate = (templateId) => {
    const template = templates.find((item) => item.id === templateId || item.code === templateId);

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

  const toggleCustomSlot = (slotId) => {
    setDraft((prev) => ({
      ...prev,
      customSlots: (prev.customSlots || []).map((slot) =>
        slot.id === slotId ? { ...slot, selected: !slot.selected } : slot
      ),
    }));
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

  const updateCustomSlot = (slotId, value) => {
    setDraft((prev) => ({
      ...prev,
      customSlots: (prev.customSlots || []).map((slot) =>
        slot.id === slotId ? { ...slot, finalText: value } : slot
      ),
    }));
  };

  const handleSave = () => {
    const nextErrors = validateTaskEditorDraftWithTemplates(draft, templates);
    setErrors(nextErrors);

    if (hasTaskEditorErrors(nextErrors)) return;

    onSave(buildTaskEditorRequestBody(draft, templates));
  };

  return (
    <div className="modal-backdrop task-editor-backdrop" data-note-ui="true" onClick={isBusy ? undefined : onClose}>
      <div className="task-editor-modal" style={{ position: "relative", overflow: "hidden" }} onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="task-editor-modal__close"
          onClick={onClose}
          disabled={isBusy}
          aria-label="Закрыть окно"
        >
          ×
        </button>

        {status === "loading" && <ModalInnerLoader />}

        <div className="task-editor-modal__header">
          <h2 className="task-editor-modal__title">Изменить задания</h2>
          <p className="task-editor-modal__text">
            Здесь можно отредактировать свои задания.
          </p>
        </div>

        <div className="task-editor-scroll">
          {requestError && <div className="group-form-error-card">{requestError}</div>}
          {errors.common && <div className="group-form-error-card">{errors.common}</div>}

          {status !== "error" && (
            <>
              <div className="task-editor-template-list">
                {templates.map((template) => {
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
                          disabled={isBusy}
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
                                      disabled={isBusy}
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
                                  disabled={isBusy}
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
                {(draft.customSlots || []).map((slot) => {
                  const customError = errors.customTasks?.[slot.id];
                  const hasError = Boolean(customError);

                  return (
                    <label
                      key={slot.id}
                      className={`task-editor-custom-task ${slot.selected ? "task-editor-custom-task--checked" : ""} ${hasError ? "task-editor-custom-task--error" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={slot.selected}
                        disabled={isBusy}
                        onChange={() => toggleCustomSlot(slot.id)}
                      />
                      <span className="task-editor-template__dot" />
                      <span className="task-editor-custom-task__body">
                        <input
                          value={slot.finalText || ""}
                          disabled={isBusy}
                          onChange={(event) => updateCustomSlot(slot.id, event.target.value)}
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
            </>
          )}
        </div>

        <div className="task-editor-modal__footer">
          <button
            type="button"
            className="modal-card__button task-editor-modal__save"
            onClick={handleSave}
            disabled={isBusy || status === "error"}
          >
            {status === "saving" ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function GroupSettingsPanel({
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

      <div className="group-settings__title">Настройки</div>

      <div className="group-settings__scroll">
        <div className="group-settings__subtitle">Меняй цвета на любимые, редактируй задания, название или описание привычки.</div>

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
                  style={getAvatarStyle(member.avatar, member.avatarColor)}
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

      {isOwner && (
        <button type="button" className="group-settings__tasks" onClick={onEditGroupInfo}>
          Изменить название и описание
        </button>
      )}

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

export function GroupSettingsArea({
  isOpen,
  settingsRef,
  onToggle,
  panelProps,
}) {
  return (
    <div
      className={`group-settings ${isOpen ? "group-settings--open" : ""}`}
      ref={settingsRef}
      data-note-ui="true"
    >
      <button
        type="button"
        className={`group-settings__trigger ${isOpen ? "group-settings__trigger--active" : ""}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label="Открыть настройки группы"
      >
        <img className="group-settings__gear-icon" src={gearIcon} alt="" aria-hidden="true" />
      </button>

      {isOpen && <GroupSettingsPanel {...panelProps} />}
    </div>
  );
}

export function SpecialUploadModal({
  specialTask,
  specialUploadStatus,
  specialUploadError,
  onClose,
  onPhotoChange,
}) {
  if (!specialTask) return null;

  return (
    <div className="modal-backdrop" data-note-ui="true" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-card__title">
          {specialTask.isSubmittedByMe ? "Заменить фото" : "Прикрепить фото"}
        </div>
        <div className="group-form-error-card special-upload-warning">
          {specialTask.isSubmittedByMe
            ? "Фото уже загружено. Можно заменить его без повторного начисления монет."
            : `Особое задание выполняется лично и не влияет на общий прогресс группы. После первого выполнения начислится ${specialTask.rewardValue} монет.`}
        </div>

        {specialUploadError && (
          <div className="modal-card__text modal-card__text--warning">
            {specialUploadError}
          </div>
        )}

        <label className="upload-field">
          <span>{specialUploadStatus === "submitting" ? "Загрузка..." : "Выбрать фото"}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPhotoChange}
            disabled={specialUploadStatus === "submitting"}
          />
        </label>
      </div>
    </div>
  );
}

export function ExitGroupModal({
  exitRequestStatus,
  exitRequestError,
  pageError,
  exitModalStep,
  exitPreview,
  exitTransferMembers,
  activeAdminTransferMemberId,
  onAdminTransferMemberChange,
  onClose,
  onConfirmExit,
}) {
  return (
    <div className="modal-backdrop" data-note-ui="true" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        {exitRequestStatus === "error" ? (
          <>
            <div className="modal-card__title">Не удалось выйти из группы</div>
            <div className="modal-card__text modal-card__text--warning">
              {exitRequestError || pageError || "Ошибка запроса к серверу"}
            </div>

            <div className="modal-card__actions">
              <button type="button" className="modal-card__button modal-card__button--ghost" onClick={onClose}>
                Закрыть
              </button>
            </div>
          </>
        ) : exitModalStep === "confirm" ? (
          <>
            <div className="modal-card__title">
              {exitPreview?.mode === "delete_habit_on_leave" ? "Удалить группу при выходе?" : "Выйти из группы?"}
            </div>
            <div className="modal-card__text">
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
                onClick={onClose}
                disabled={exitRequestStatus === "submitting"}
              >
                Остаться
              </button>
              <button
                type="button"
                className="modal-card__button modal-card__button--danger"
                onClick={onConfirmExit}
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
            <div className="modal-card__text">Перед выходом нужно выбрать нового владельца группы.</div>

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
                      onChange={() => onAdminTransferMemberChange(member.id)}
                    />
                    <span
                      className="admin-transfer-option__avatar"
                      style={getAvatarStyle(member.avatar, member.avatarColor)}
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
                onClick={onClose}
                disabled={exitRequestStatus === "submitting"}
              >
                Остаться
              </button>
              <button
                type="button"
                className="modal-card__button modal-card__button--danger"
                onClick={onConfirmExit}
                disabled={exitTransferMembers.length === 0 || exitRequestStatus === "submitting"}
              >
                {exitRequestStatus === "submitting" ? "Выход..." : "Передать и выйти"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function MemberRemoveConfirmModal({ member, onCancel, onConfirm }) {
  if (!member) return null;

  return (
    <div className="modal-backdrop" data-note-ui="true" onClick={onCancel}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-card__title">Исключить участника?</div>
        <div className="modal-card__text">
          Пользователь {member.name} будет исключён из группы и не сможет присоединиться повторно по коду приглашения.
          Его задания, прогресс и заметки в этой привычке будут удалены.
        </div>

        <div className="modal-card__actions">
          <button type="button" className="modal-card__button modal-card__button--ghost" onClick={onCancel}>
            Отмена
          </button>
          <button type="button" className="modal-card__button modal-card__button--danger" onClick={onConfirm}>
            Исключить
          </button>
        </div>
      </div>
    </div>
  );
}
