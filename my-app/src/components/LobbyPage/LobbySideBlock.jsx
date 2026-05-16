import AnimatedContent from "../Animation/AnimatedContent";
import AnimatedScrollList from "../Animation/AnimatedScrollList";
import BorderGlow from "../Animation/BorderGlow";

import achievementIcon from "../../assets/icons/achievement.svg";

export default function LobbySideBlock({ achievements, recordStreak }) {
  const hasRecord = Boolean(recordStreak?.hasRecord || Number(recordStreak?.days || 0) > 0);

  return (
    <aside className="content-grid__side">
      <div className="record-panel">
        <AnimatedContent distance={80} duration={0.8} delay={0.22}>
          <BorderGlow>
            <div className="panel-card panel-card--record">
              <h2 className="section-title">Рекордная серия</h2>
              <p className="section-description">
                Самое большое количество дней подряд без пропусков.
              </p>

              {hasRecord ? (
                <div className="record-streak">
                  <div className="record-streak__inner">
                    <div className="record-streak__days">
                      <div className="record-streak__card-label">Дней</div>
                      <div className="record-streak__value">{recordStreak.days}</div>
                    </div>

                    <div className="record-streak__details">
                      <div className="record-streak__meta-card">
                        <div className="record-streak__card-label">Категория</div>
                        <div className="record-streak__meta-value">
                          {recordStreak.category || "—"}
                        </div>
                      </div>

                      <div className="record-streak__meta-card">
                        <div className="record-streak__card-label">Группа</div>
                        <div className="record-streak__meta-value">
                          {recordStreak.group || "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="record-streak">
                  <div className="record-streak__inner">
                    <div className="record-streak__meta-card">
                      <div className="record-streak__meta-value">
                        Рекорд пока не установлен
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </BorderGlow>
        </AnimatedContent>
      </div>

      <div className="achievements-panel">
        <AnimatedContent distance={80} duration={0.8} delay={0.3}>
          <BorderGlow>
            <div className="panel-card panel-card--achievements">
              <h2 className="section-title">Личные достижения</h2>
              <AnimatedScrollList className="achievement-list">
                {achievements.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="achievement-card">
                    <div className="achievement-card__content">
                      <div className="achievement-card__icon">
                        <img
                          src={achievementIcon}
                          alt="Иконка достижения"
                          className="achievement-card__icon-image"
                        />
                      </div>
                      <div>
                        <div className="achievement-card__title">{item.title}</div>
                        <div className="achievement-card__desc">{item.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </AnimatedScrollList>
            </div>
          </BorderGlow>
        </AnimatedContent>
      </div>
    </aside>
  );
}
