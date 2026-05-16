function getDayWord(count) {
  const number = Math.abs(Number(count || 0));
  const lastTwoDigits = number % 100;
  const lastDigit = number % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "дней";
  if (lastDigit === 1) return "день";
  if (lastDigit >= 2 && lastDigit <= 4) return "дня";
  return "дней";
}

export default function GroupTitleRibbon({ groupName, streakDays }) {
  const days = Number(streakDays || 0);

  return (
    <div className="group-title-ribbon" aria-label={`Группа ${groupName}`}>
      <div className="group-title-ribbon__shape" />
      <div className="group-title-ribbon__content">
        <div className="group-title-ribbon__name">{groupName}</div>
        <div className="group-title-ribbon__streak">
          Серия: {days} {getDayWord(days)} без пропуска
        </div>
      </div>
    </div>
  );
}
