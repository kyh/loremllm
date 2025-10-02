"use client";

import * as React from "react";

type DatePickerProps = {
  year?: number;
  month?: number;
};

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MAX_CELLS = 42;

const DatePicker: React.FC<DatePickerProps> = ({ year, month }) => {
  const today = new Date();
  const [currentYear, setYear] = React.useState(year || today.getFullYear());
  const [currentMonth, setMonth] = React.useState(
    month || today.getMonth() + 1,
  );

  const first = new Date(currentYear, currentMonth - 1, 1);
  const startingWeekday = first.getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  const cells: React.ReactNode[] = [];

  for (let i = 0; i < startingWeekday; i++) {
    cells.push(
      <div
        key={`empty-start-${i}`}
        className="px-[1ch] text-center outline-none"
      />,
    );
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const presentationDay = String(day).padStart(2, "0");
    cells.push(
      <div
        key={day}
        className="px-[1ch] text-center outline-none focus:bg-[var(--theme-focused-foreground)]"
        tabIndex={0}
        aria-label={`${currentYear}-${String(currentMonth).padStart(2, "0")}-${presentationDay}`}
      >
        {presentationDay}
      </div>,
    );
  }

  while (cells.length < MAX_CELLS) {
    cells.push(
      <div
        key={`empty-end-${cells.length}`}
        className="px-[1ch] text-center outline-none"
      />,
    );
  }

  const onSwitchPreviousMonth = () => {
    let newMonth = currentMonth - 1;
    let newYear = currentYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    setMonth(newMonth);
    setYear(newYear);
  };

  const onSwitchNextMonth = () => {
    let newMonth = currentMonth + 1;
    let newYear = currentYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    setMonth(newMonth);
    setYear(newYear);
  };

  return (
    <div className="inline-block select-none">
      <div className="flex items-center justify-between bg-[var(--theme-border)]">
        <button
          type="button"
          className="m-0 inline-block cursor-pointer self-stretch border-none bg-none px-[1ch] leading-[calc(var(--theme-line-height-base)*1em)] text-[var(--theme-text)] outline-0 focus:bg-[var(--theme-focused-foreground)] focus:outline-0"
          onClick={onSwitchPreviousMonth}
          aria-label="Previous month"
        >
          ▲
        </button>
        <div className="w-full min-w-[10%] px-[1ch] text-left">
          {currentYear} {MONTH_NAMES[currentMonth - 1]?.toUpperCase()}
        </div>
        <button
          type="button"
          className="m-0 inline-block cursor-pointer self-stretch border-none bg-none px-[1ch] leading-[calc(var(--theme-line-height-base)*1em)] text-[var(--theme-text)] outline-0 focus:bg-[var(--theme-focused-foreground)] focus:outline-0"
          onClick={onSwitchNextMonth}
          aria-label="Next month"
        >
          ▼
        </button>
      </div>
      <div className="grid grid-cols-7 bg-[var(--theme-border)] text-center">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-[1ch] text-center outline-none focus:bg-[var(--theme-focused-foreground)]"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid min-h-[calc(var(--theme-line-height-base)*6em)] grid-cols-7 grid-rows-[repeat(6,min-content)] items-start bg-[var(--theme-border-subdued)]">
        {cells}
      </div>
    </div>
  );
};

export { DatePicker };
