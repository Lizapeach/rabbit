import AnimatedContent from "../Animation/AnimatedContent";
import AnimatedScrollList from "../Animation/AnimatedScrollList";
import BorderGlow from "../Animation/BorderGlow";

import appleIcon from "../../assets/icons/apple.svg";
import booksIcon from "../../assets/icons/books.svg";
import cleanIcon from "../../assets/icons/clean.svg";
import dumbbellsIcon from "../../assets/icons/dumbbells.svg";

import {
  getGroupWord,
  getInitial,
  getStreakText,
} from "../../utils/lobbyPageUtils";

const CATEGORY_ICON_BY_ID = {
  sport: dumbbellsIcon,
  nutrition: appleIcon,
  cleaning: cleanIcon,
  reading: booksIcon,
};

export default function LobbyCategoriesBlock({
  categories,
  expandedCategories,
  habitsLoadError,
  hasGroups,
  onGroupKeyDown,
  onOpenGroup,
  onOpenGroupForm,
  onToggleCategory,
}) {
  return (
    <div className="content-grid__main">
      <AnimatedContent distance={80} duration={0.8} delay={0.15}>
        <BorderGlow>
          <div className="panel-card panel-card--categories">
            <div>
              <h2 className="section-title">Категории привычек</h2>
              <p className="section-description">
                {hasGroups
                  ? "Здесь собраны твои привычки по категориям. Открывай карточки, чтобы смотреть созданные привычки, участников и ежедневный прогресс."
                  : "Здесь будут отображаться все твои привычки собранные по категориям. Пока тут пусто, поэтому предлагаю нажать на плюс, создать первую привычку или присоединиться по коду"}
              </p>
            </div>

            {habitsLoadError && (
              <p className="section-description">{habitsLoadError}</p>
            )}

            <AnimatedScrollList className="category-list">
              {categories.map((category) => {
                const isOpen = !!expandedCategories[category.id];
                const categoryIcon = CATEGORY_ICON_BY_ID[category.id];

                return (
                  <div
                    key={category.id}
                    className={`category-card category-card--${category.id}`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleCategory(category.id)}
                      className="category-card__button"
                    >
                      <div className="category-card__left">
                        <div className="category-card__icon" aria-hidden="true">
                          {categoryIcon ? (
                            <img
                              src={categoryIcon}
                              alt=""
                              className="category-card__icon-image"
                            />
                          ) : (
                            <span className="category-card__icon-empty">
                              {getInitial(category.title)}
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="category-card__title">{category.title}</div>
                          <div className="category-card__subtitle">
                            {category.groups.length} {getGroupWord(category.groups.length)} в категории
                          </div>
                        </div>
                      </div>

                      <div
                        className={`category-card__arrow ${
                          isOpen ? "category-card__arrow--open" : ""
                        }`}
                        aria-hidden="true"
                      >
                        <span className="category-card__arrow-shape" />
                      </div>
                    </button>

                    <div
                      className={`category-card__content ${
                        isOpen ? "category-card__content--open" : ""
                      }`}
                    >
                      <div className="category-card__content-inner">
                        <div className="group-list">
                          {category.groups.map((group) => (
                            <div
                              key={group.id}
                              className="group-card"
                              role="button"
                              tabIndex={0}
                              onClick={() => onOpenGroup(category, group)}
                              onKeyDown={(event) =>
                                onGroupKeyDown(event, category, group)
                              }
                              aria-label={`Открыть привычку ${group.name}`}
                            >
                              <div className="group-card__top">
                                <div>
                                  <div className="group-card__title">{group.name}</div>
                                  <div className="group-card__note">{group.note}</div>
                                  <div className="group-card__members">
                                    <span className="group-card__members-line">
                                      Состав: {group.membersText}
                                    </span>
                                    <span className="group-card__members-line">
                                      Роль: {group.roleLabel}
                                    </span>
                                  </div>
                                </div>

                                <div className="group-card__progress">
                                  {getStreakText(group.displayedCurrentStreak ?? group.currentStreak)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </AnimatedScrollList>

            <div className="add-category">
              <button
                type="button"
                onClick={onOpenGroupForm}
                className="add-category__button"
              >
                <span className="add-category__plus" />
              </button>
            </div>
          </div>
        </BorderGlow>
      </AnimatedContent>
    </div>
  );
}
