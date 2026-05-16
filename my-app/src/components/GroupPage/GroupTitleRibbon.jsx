export default function GroupTitleRibbon({ groupName, streakDays }) {
  return (
    <div className="group-title-ribbon" aria-label={`Группа ${groupName}`}>
      <div className="group-title-ribbon__shape" />
      <div className="group-title-ribbon__content">
        <div className="group-title-ribbon__name">{groupName}</div>
        <div className="group-title-ribbon__streak">
          Серия: {streakDays} {streakDays === 1 ? "день" : "дней"} без пропуска
        </div>
      </div>
    </div>
  );
}
