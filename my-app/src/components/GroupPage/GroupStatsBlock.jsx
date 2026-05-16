import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import AnimatedContent from "../Animation/AnimatedContent";
import BorderGlow from "../Animation/BorderGlow";
import {
  buildMonthCells,
  chunkCalendarRows,
  formatAnalyticsDateLabel,
  getActiveMonthRowIndex,
  getDateKey,
  isFutureDay,
  isSameDay,
  renderMemberAvatar,
  useIsMobileViewport,
  weekDayLabels,
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

function getAvatarStyle(avatar, fallbackColor) {
  const avatarBgColor = getAvatarBgColor(avatar, fallbackColor);
  const avatarTextColor = getReadableAvatarTextColor(avatarBgColor);

  return {
    backgroundColor: avatarBgColor,
    color: avatarTextColor,
    "--avatar-symbol-color": avatarTextColor,
  };
}

export function CalendarBlock({
  calendarMode,
  setCalendarMode,
  viewedDate,
  setViewedDate,
  currentDate,
  groupStats,
  calendarDays,
}) {
  const daysGridRef = useRef(null);
  const isMobileViewport = useIsMobileViewport();
  const [isMobileCalendarOpen, setIsMobileCalendarOpen] = useState(false);
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
  const groupStatsMembers = groupStats?.members;
  const groupStatsCompleted = groupStats?.completed;
  const groupStatsTotal = groupStats?.total;
  const liveTodayState = useMemo(() => {
    const members = Array.isArray(groupStatsMembers) ? groupStatsMembers : [];
    const membersWithTasks = members.filter((member) => Number(member.total || 0) > 0);

    if (membersWithTasks.length === 0) return null;

    const hasMemberWithoutProgress = membersWithTasks.some(
      (member) => Number(member.completed || 0) === 0
    );

    if (hasMemberWithoutProgress) return "bad";

    const isFullyCompleted = membersWithTasks.every(
      (member) => Number(member.completed || 0) >= Number(member.total || 0)
    );

    return isFullyCompleted ? "good" : "ok";
  }, [groupStatsMembers]);
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
    if (!daysGridRef.current) return undefined;

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
  }, [activeRowIndex, monthRows.length, groupStatsCompleted, groupStatsTotal]);


  const shiftDate = (direction, mode = calendarMode) => {
    setViewedDate((prev) => {
      const next = new Date(prev);

      if (mode === "week") {
        next.setDate(prev.getDate() + direction * 7);
      } else {
        next.setMonth(prev.getMonth() + direction);
      }

      return next;
    });
  };

  const getCalendarDayClassName = (cell) => {
    const isToday = isSameDay(cell.date, currentDate);
    const isFuture = isFutureDay(cell.date, currentDate);
    const canColorDay = !cell.outOfMonth;
    const apiDay = calendarDayByDate.get(cell.id);
    const dayState =
      isToday && canColorDay && !isFuture ? liveTodayState ?? apiDay?.state ?? null : apiDay?.state ?? null;
    const hasZeroMember = canColorDay && dayState === "bad";
    const isComplete = canColorDay && dayState === "good";

    return `calendar-day ${cell.outOfMonth ? "calendar-day--muted" : ""} ${
      isComplete ? "calendar-day--complete" : ""
    } ${hasZeroMember ? "calendar-day--broken" : ""} ${isToday ? "calendar-day--today" : ""}`;
  };

  const renderCalendarLabels = () => (
    <div className="calendar-grid calendar-grid--labels">
      {weekDayLabels.map((day) => (
        <div key={day} className="calendar-grid__label">
          {day}
        </div>
      ))}
    </div>
  );

  const renderCalendarRows = ({ fullscreen = false } = {}) => (
    <div
      className={`calendar-days-viewport ${
        fullscreen ? "calendar-days-viewport--full" : `calendar-days-viewport--${calendarMode}`
      }`}
      style={!fullscreen && viewportHeight ? { height: `${viewportHeight}px` } : undefined}
    >
      <div
        ref={fullscreen ? undefined : daysGridRef}
        className="calendar-month-stack"
        style={!fullscreen ? { transform: `translateY(${gridTranslateY}px)` } : undefined}
      >
        {monthRows.map((row, rowIndex) => (
          <div
            key={`calendar-row-${row[0]?.id || rowIndex}`}
            className={`calendar-grid calendar-grid--days calendar-row ${
              rowIndex === activeRowIndex ? "calendar-row--active" : ""
            }`}
          >
            {row.map((cell) => (
              <div key={cell.id} className={getCalendarDayClassName(cell)}>
                <span className="calendar-day__number">{cell.number}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  const desktopCalendar = (
    <>
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

      {renderCalendarLabels()}
      {renderCalendarRows()}
    </>
  );

  return (
    <>
      <div className={`calendar-card ${isMobileViewport ? "calendar-card--mobile-summary" : ""}`}>
        {isMobileViewport ? (
          <button
            type="button"
            className="analytics-card__button calendar-card__mobile-button"
            onClick={() => {
              if (isMobileViewport) setIsMobileCalendarOpen(true);
            }}
            aria-expanded={isMobileViewport && isMobileCalendarOpen}
          >
            <span>
              <span className="analytics-card__title">Календарь</span>
              <span className="calendar-card__mobile-subtitle">Открыть месяц на весь блок</span>
            </span>
            <span className="analytics-card__arrow">
              <span className="analytics-card__arrow-shape" />
            </span>
          </button>
        ) : (
          desktopCalendar
        )}
      </div>

      {isMobileViewport && isMobileCalendarOpen && (
        <div className="mobile-visual-modal mobile-calendar-modal" role="dialog" aria-modal="true" aria-label="Календарь месяца">
          <button
            type="button"
            className="mobile-visual-modal__close"
            onClick={() => setIsMobileCalendarOpen(false)}
            aria-label="Закрыть календарь"
          >
            ×
          </button>

          <div className="mobile-calendar-modal__panel">
            <div className="mobile-visual-modal__header">
              <div>
                <h3 className="mobile-visual-modal__title">Календарь</h3>
                <p className="mobile-visual-modal__subtitle">{monthTitle}</p>
              </div>
            </div>

            <div className="calendar-card__controls mobile-calendar-modal__controls">
              <button type="button" className="round-control" onClick={() => shiftDate(-1, "month")} aria-label="Предыдущий месяц">
                <span className="round-control__arrow round-control__arrow--prev" />
              </button>
              <span className="mobile-calendar-modal__mode">Месяц</span>
              <button type="button" className="round-control" onClick={() => shiftDate(1, "month")} aria-label="Следующий месяц">
                <span className="round-control__arrow" />
              </button>
            </div>

            {renderCalendarLabels()}
            {renderCalendarRows({ fullscreen: true })}
          </div>
        </div>
      )}
    </>
  );
}

export function AnalyticsAccordion({ title, isOpen, onToggle, data }) {
  const dates = data?.dates || [];
  const datasets = data?.datasets || [];
  const maxTasks = Math.max(1, data?.maxTasks || 1);
  const isMobileViewport = useIsMobileViewport();
  const [focusedMemberId, setFocusedMemberId] = useState(null);
  const [isMobileChartOpen, setIsMobileChartOpen] = useState(false);
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
  const inlineOpen = !isMobileViewport && isOpen;
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


  const handleCardClick = () => {
    if (isMobileViewport) {
      setIsMobileChartOpen(true);
      return;
    }

    onToggle();
  };

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

  const renderChart = (variant = "inline") => (
    <div className={`analytics-line-chart ${variant === "fullscreen" ? "analytics-line-chart--fullscreen" : ""}`}>
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
              style={getAvatarStyle(dataset.avatar, dataset.avatarColor || dataset.color)}
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
  );

  return (
    <>
      <div className={`analytics-card ${inlineOpen ? "analytics-card--open" : ""} ${isMobileViewport ? "analytics-card--mobile-summary" : ""}`}>
        <button
          type="button"
          className="analytics-card__button"
          onClick={handleCardClick}
          aria-expanded={inlineOpen || (isMobileViewport && isMobileChartOpen)}
        >
          <span>
            <span className="analytics-card__title">{title}</span>
            {isMobileViewport && <span className="analytics-card__mobile-subtitle">Открыть график на весь блок</span>}
          </span>
          <span className={`analytics-card__arrow ${inlineOpen ? "analytics-card__arrow--open" : ""}`}>
            <span className="analytics-card__arrow-shape" />
          </span>
        </button>

        {!isMobileViewport && (
          <div className={`analytics-card__content ${inlineOpen ? "analytics-card__content--open" : ""}`}>
            <div className="analytics-card__content-inner">{renderChart()}</div>
          </div>
        )}
      </div>

      {isMobileViewport && isMobileChartOpen && (
        <div className="mobile-visual-modal mobile-chart-modal" role="dialog" aria-modal="true" aria-label={title}>
          <button
            type="button"
            className="mobile-visual-modal__close"
            onClick={() => setIsMobileChartOpen(false)}
            aria-label="Закрыть график"
          >
            ×
          </button>

          <div className="mobile-chart-modal__rotated">
            <div className="mobile-visual-modal__header mobile-chart-modal__header">
              <div>
                <h3 className="mobile-visual-modal__title">{title}</h3>
                <p className="mobile-visual-modal__subtitle">Повернутый просмотр для телефона</p>
              </div>
            </div>

            {renderChart("fullscreen")}
          </div>
        </div>
      )}
    </>
  );
}

export default function GroupStatsBlock({
  rhythmTitle,
  rhythmDescription,
  calendarMode,
  setCalendarMode,
  viewedDate,
  setViewedDate,
  currentDate,
  groupStats,
  calendarDays,
  analyticsOpen,
  setAnalyticsOpen,
  weekAnalyticsData,
  monthAnalyticsData,
}) {
  return (
    <AnimatedContent distance={80} duration={0.8} delay={0.15}>
        <BorderGlow>
          <div className="group-panel group-panel--calendar">
            <div className="group-panel__heading">
              <h2 className="section-title">{rhythmTitle}</h2>
              <p className="section-description">{rhythmDescription}</p>
            </div>

            <div className="rhythm-grid">
              <CalendarBlock
                calendarMode={calendarMode}
                setCalendarMode={setCalendarMode}
                viewedDate={viewedDate}
                setViewedDate={setViewedDate}
                currentDate={currentDate}
                groupStats={groupStats}
                calendarDays={calendarDays}
              />

              <div className="analytics-list">
                <AnalyticsAccordion
                  title="Статистика недели"
                  isOpen={analyticsOpen.week}
                  onToggle={() => setAnalyticsOpen((prev) => ({ ...prev, week: !prev.week }))}
                  data={weekAnalyticsData}
                />

                <AnalyticsAccordion
                  title="Статистика месяца"
                  isOpen={analyticsOpen.month}
                  onToggle={() => setAnalyticsOpen((prev) => ({ ...prev, month: !prev.month }))}
                  data={monthAnalyticsData}
                />
              </div>
            </div>
          </div>
        </BorderGlow>
    </AnimatedContent>
  );
}
