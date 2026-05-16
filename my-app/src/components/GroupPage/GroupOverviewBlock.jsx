import AnimatedContent from "../Animation/AnimatedContent";
import AnimatedScrollList from "../Animation/AnimatedScrollList";
import BorderGlow from "../Animation/BorderGlow";
import Live2DBunny from "../Bunny/Live2DBunny";
import { TaskDoneAnimation, AnimatedCheckMark } from "../Animation/TaskDoneAnimation";
import { LockedFeatureOverlay, renderMemberAvatar, uniqueTaskBase } from "../../utils/groupPageUtils.jsx";
import { GroupSettingsArea } from "./GroupSettings";

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

export function TaskCard({ task, disabled, onToggle }) {
  const isCompletionHidden = Boolean(task.isCompletionHidden);

  return (
    <div className={`task-card ${task.done ? "task-card--done" : ""} ${isCompletionHidden ? "task-card--hidden-state" : ""}`}>
      <div className="task-card__content">
        <button
          type="button"
          disabled={disabled || isCompletionHidden}
          onClick={onToggle}
          className={`task-card__check ${task.done ? "task-card__check--done" : ""} ${isCompletionHidden ? "task-card__check--hidden" : ""}`}
          aria-label={isCompletionHidden ? "Состояние выполнения скрыто" : task.done ? "Отменить выполнение" : "Отметить выполненным"}
          title={isCompletionHidden ? "Состояние выполнения скрыто" : undefined}
        >
          {!isCompletionHidden && <AnimatedCheckMark visible={task.done} />}
          {isCompletionHidden && <span className="task-card__hidden-mark" aria-hidden="true">?</span>}
        </button>

        <div className="task-card__body">
          <div className="task-card__title">
            <TaskDoneAnimation done={!isCompletionHidden && task.done}>{task.title}</TaskDoneAnimation>
          </div>
          {task.desc && <div className="task-card__desc">{task.desc}</div>}
        </div>
      </div>
    </div>
  );
}

export function SpecialTaskCard({ taskState, disabled, isOwnTask, uploadStatus, awardedCoins, onOpenUpload }) {
  const done = Boolean(taskState?.done);
  const photo = taskState?.photo;
  const buttonText = done ? "Заменить фото" : "Отметить";

  return (
    <div className={`special-task-card ${done ? "special-task-card--done" : ""}`}>
      <div className="special-task-card__content">
        <button
          type="button"
          disabled={disabled}
          onClick={onOpenUpload}
          className={`special-task-card__button ${done ? "special-task-card__button--done" : ""}`}
          aria-label={buttonText}
          title={buttonText}
        >
          <AnimatedCheckMark visible={done} />
        </button>

        <div className="special-task-card__body">
          <div className="special-task-card__title">
            <TaskDoneAnimation done={done} variant="special">
              {taskState?.title || uniqueTaskBase.title}
            </TaskDoneAnimation>
          </div>
          <div className="special-task-card__desc">{taskState?.description || uniqueTaskBase.desc}</div>
          {isOwnTask && (
            <div className="special-task-card__meta special-task-card__meta--muted">
              {uploadStatus === "submitting"
                ? "Фото загружается..."
                : done
                  ? "Нажми на отметку, чтобы заменить фото."
                  : "Нажми на отметку, чтобы загрузить фото."}
            </div>
          )}
          {isOwnTask && awardedCoins > 0 && (
            <div className="special-task-card__meta special-task-card__meta--muted">
              +{awardedCoins} монет начислено
            </div>
          )}
          {!isOwnTask && (
            <div className="special-task-card__meta special-task-card__meta--muted">
              {done
                ? `${taskState?.submission?.userName || "Участник"} уже прикрепил фото.`
                : "Этот участник пока не прикрепил фото к особому заданию."}
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

function LockedSpecialTaskCard({ reason }) {
  return (
    <div className="special-task-card special-task-card--locked locked-feature locked-feature--locked">
      <div className="locked-feature__content special-task-card__content">
        <button
          type="button"
          disabled
          className="special-task-card__button"
          aria-label="Особое задание закрыто"
        />

        <div className="special-task-card__body">
          <div className="special-task-card__title">{uniqueTaskBase.title}</div>
          <div className="special-task-card__desc">Блок особого задания откроется после выполнения условия доступа.</div>
        </div>
      </div>
      <LockedFeatureOverlay reason={reason || "Особое задание пока закрыто."} label="Особое задание закрыто" />
    </div>
  );
}

export default function GroupOverviewBlock({
  overviewTitle,
  overviewDescription,
  bunnyShopState,
  shouldShowCryBunny,
  shouldShowHappyBunny,
  activeBunnyModelUrl,
  activeBunnyAnimationMode,
  activeBunnyAccessoryParams,
  isBunnyShopOpen,
  onOpenBunnyShop,
  onBunnyShopKeyDown,
  groupStats,
  selectedFriendId,
  selectedFriend,
  selectedMemberStats,
  visibleTasks,
  selectedSpecialTask,
  isSpecialTasksLocked,
  specialTasksLockedReason,
  otherTasksLockedReason,
  specialUploadStatus,
  specialAwardedCoins,
  onOpenSelectedMemberInfo,
  onToggleTask,
  onOpenSpecialUpload,
  friendsWithColors,
  isFriendsExpanded,
  onFriendsExpandedChange,
  onSelectFriend,
  groupSettings,
}) {
  const areVisibleTasksLocked =
    selectedFriendId !== "me" && visibleTasks.some((task) => task.isCompletionHidden);
  const visibleTasksForRender = areVisibleTasksLocked
    ? visibleTasks.map((task) => ({ ...task, isCompletionHidden: false }))
    : visibleTasks;

  return (
    <AnimatedContent distance={80} duration={0.8} delay={0.08}>
      <section className="group-overview-section">
        <BorderGlow>
          <div className="group-panel group-panel--overview">
            <div className="group-panel__heading group-panel__heading--overview">
              <h2 className="section-title">{overviewTitle}</h2>
              <p className="section-description">{overviewDescription}</p>
            </div>

            <div className="group-overview-grid">
              <aside
                className="group-character-space group-character-space--clickable"
                style={{ backgroundColor: bunnyShopState?.backgroundColor || "#f7eadf" }}
                role="button"
                tabIndex={0}
                onClick={onOpenBunnyShop}
                onKeyDown={onBunnyShopKeyDown}
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
                  {bunnyShopState?.name || "Банни"}
                </div>
              </aside>

              <div className="group-task-board">
                <div className="group-progress">
                  <div className="group-progress__track">
                    <div className="group-progress__fill" style={{ width: `${groupStats.percent}%` }} />
                  </div>
                  <div className="group-progress__value">{groupStats.percent}%</div>
                </div>

                <div className="group-task-board__header">
                  <div className="member-heading">
                    {selectedFriendId === "me" ? (
                      <div
                        className="member-heading__avatar"
                        style={getAvatarStyle(selectedFriend.avatar, selectedFriend.avatarColor)}
                        aria-label={`Твой аватар: ${selectedFriend.name}`}
                      >
                        {renderMemberAvatar(selectedFriend.avatar, selectedFriend.initials)}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="member-heading__avatar member-heading__avatar--button"
                        style={getAvatarStyle(selectedFriend.avatar, selectedFriend.avatarColor)}
                        onClick={onOpenSelectedMemberInfo}
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
                    {groupStats.completed}/{groupStats.total} всех заданий
                  </div>
                </div>

                <AnimatedScrollList className="task-list" showGradients={false}>
                  {visibleTasksForRender.length > 0 && (
                    <div
                      className={`task-list-lock-shell locked-feature ${
                        areVisibleTasksLocked ? "locked-feature--locked task-list-lock-shell--locked" : ""
                      }`}
                    >
                      <div className="locked-feature__content task-list-lock-shell__content">
                        {visibleTasksForRender.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            disabled={selectedFriendId !== "me"}
                            onToggle={() => onToggleTask(task.id)}
                          />
                        ))}
                      </div>

                      {areVisibleTasksLocked && (
                        <LockedFeatureOverlay
                          reason={otherTasksLockedReason || "Просмотр выполнения чужих заданий пока закрыт."}
                          label="Задания участника закрыты"
                        />
                      )}
                    </div>
                  )}

                  {isSpecialTasksLocked && <LockedSpecialTaskCard reason={specialTasksLockedReason} />}

                  {!isSpecialTasksLocked && selectedSpecialTask && (
                    <SpecialTaskCard
                      taskState={selectedSpecialTask}
                      disabled={selectedFriendId !== "me" || specialUploadStatus === "submitting"}
                      isOwnTask={selectedFriendId === "me"}
                      uploadStatus={specialUploadStatus}
                      awardedCoins={specialAwardedCoins}
                      onOpenUpload={onOpenSpecialUpload}
                    />
                  )}
                </AnimatedScrollList>

                <div className="group-task-board__footer">
                  <div
                    className="friend-stack"
                    onMouseEnter={() => onFriendsExpandedChange(true)}
                    onMouseLeave={() => onFriendsExpandedChange(false)}
                  >
                    <div className="friend-stack__inner">
                      {friendsWithColors.map((friend, index) => (
                        <button
                          key={friend.id}
                          type="button"
                          className={`friend-stack__avatar ${selectedFriendId === friend.id ? "friend-stack__avatar--active" : ""}`}
                          style={getAvatarStyle(friend.avatar, friend.avatarColor, {
                            left: isFriendsExpanded ? index * 58 : index * 18,
                            zIndex: friendsWithColors.length - index,
                          })}
                          onClick={() => onSelectFriend(friend.id)}
                          aria-label={`Показать задания: ${friend.name}`}
                          title={friend.name}
                        >
                          {renderMemberAvatar(friend.avatar, friend.initials)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <GroupSettingsArea {...groupSettings} />
                </div>
              </div>
            </div>
          </div>
        </BorderGlow>
      </section>
    </AnimatedContent>
  );
}
