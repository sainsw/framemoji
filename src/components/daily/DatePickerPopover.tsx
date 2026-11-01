"use client";

import { useCallback, useMemo, useState } from "react";

export type DatePickerPopoverProps = {
  open: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  availableDates: Set<string>;
  completedDates: Set<string>;
  today: string;
  loading?: boolean;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function parseDate(dateKey: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day };
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  // 0 = Sunday, we want 0 = Monday
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export function DatePickerPopover({
  open,
  onClose,
  selectedDate,
  onSelectDate,
  availableDates,
  completedDates,
  today,
  loading = false,
}: DatePickerPopoverProps) {
  const { year: selectedYear, month: selectedMonth } = parseDate(selectedDate);
  const [viewYear, setViewYear] = useState(selectedYear);
  const [viewMonth, setViewMonth] = useState(selectedMonth);

  const { year: todayYear, month: todayMonth } = parseDate(today);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [daysInMonth, firstDay]);

  const canGoNext = viewYear < todayYear || (viewYear === todayYear && viewMonth < todayMonth);

  const goToPrevMonth = useCallback(() => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }, [viewMonth, viewYear]);

  const goToNextMonth = useCallback(() => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }, [viewMonth, viewYear]);

  const handleDateClick = useCallback((day: number) => {
    const dateKey = formatDateKey(viewYear, viewMonth, day);
    if (availableDates.has(dateKey) || dateKey === today) {
      onSelectDate(dateKey);
      onClose();
    }
  }, [viewYear, viewMonth, availableDates, today, onSelectDate, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="date-picker-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Select a date"
    >
      <div className="date-picker-popover">
        {/* Header with month navigation */}
        <div className="date-picker-header">
          <button
            type="button"
            className="date-picker-nav"
            onClick={goToPrevMonth}
            aria-label="Previous month"
          >
            ←
          </button>
          <div className="date-picker-title">
            {MONTH_NAMES[viewMonth - 1]} {viewYear}
          </div>
          <button
            type="button"
            className="date-picker-nav"
            onClick={goToNextMonth}
            disabled={!canGoNext}
            aria-label="Next month"
          >
            →
          </button>
        </div>

        {/* Weekday labels */}
        <div className="date-picker-weekdays">
          {WEEKDAYS.map((day) => (
            <div key={day} className="date-picker-weekday">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="date-picker-grid">
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="date-picker-cell empty" />;
            }

            const dateKey = formatDateKey(viewYear, viewMonth, day);
            const isToday = dateKey === today;
            const isSelected = dateKey === selectedDate;
            const isAvailable = availableDates.has(dateKey) || isToday;
            const isCompleted = completedDates.has(dateKey);
            const isFuture = dateKey > today;

            const classNames = [
              "date-picker-cell",
              isToday && "is-today",
              isSelected && "is-selected",
              isAvailable && "is-available",
              isCompleted && "is-completed",
              isFuture && "is-future",
              !isAvailable && !isFuture && "is-unavailable",
            ].filter(Boolean).join(" ");

            return (
              <button
                key={dateKey}
                type="button"
                className={classNames}
                onClick={() => handleDateClick(day)}
                disabled={!isAvailable || isFuture}
                aria-label={`${day} ${MONTH_NAMES[viewMonth - 1]} ${viewYear}${isToday ? " (today)" : ""}${isCompleted ? " (completed)" : ""}${!isAvailable ? " (unavailable)" : ""}`}
                aria-pressed={isSelected}
              >
                <span className="date-picker-day">{day}</span>
                {isCompleted && <span className="date-picker-check" aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="date-picker-loading">
            <span className="date-picker-spinner" />
            <span>Loading available dates…</span>
          </div>
        )}

        {/* Legend */}
        <div className="date-picker-legend">
          <span className="legend-item">
            <span className="legend-dot legend-today" /> Today
          </span>
          <span className="legend-item">
            <span className="legend-dot legend-completed" /> Completed
          </span>
          <span className="legend-item">
            <span className="legend-dot legend-available" /> Available
          </span>
        </div>
      </div>

      <style jsx>{`
        .date-picker-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 72px 16px 16px;
          background: rgba(0, 0, 0, 0.72);
          animation: fadeIn 0.15s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .date-picker-popover {
          width: 100%;
          max-width: 360px;
          padding: 18px;
          border-radius: 20px;
          background: #1a1a1a;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
          animation: slideIn 0.2s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: none; }
        }
        .date-picker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .date-picker-title { font-weight: 600; font-size: 16px; }
        .date-picker-nav {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: var(--raised);
          color: var(--text);
          font-size: 16px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .date-picker-nav:hover:not(:disabled) { background: #363636; }
        .date-picker-nav:disabled { opacity: 0.3; cursor: not-allowed; }
        .date-picker-weekdays,
        .date-picker-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }
        .date-picker-weekdays { margin-bottom: 4px; }
        .date-picker-weekday {
          padding: 4px 0;
          text-align: center;
          font-size: 12px;
          color: var(--faint);
        }
        .date-picker-cell {
          position: relative;
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: var(--text);
          font-size: 14px;
          font-variant-numeric: tabular-nums;
          cursor: pointer;
          transition: background 0.15s;
        }
        .date-picker-cell.empty { cursor: default; }
        .date-picker-cell.is-available:hover:not(:disabled) { background: var(--raised); }
        .date-picker-cell.is-today { box-shadow: inset 0 0 0 1.5px var(--text); }
        .date-picker-cell.is-completed { background: #222222; color: var(--muted); }
        .date-picker-cell.is-selected { background: var(--text); color: #000; }
        .date-picker-cell.is-unavailable { color: #4a4a4a; cursor: not-allowed; }
        .date-picker-cell.is-future { color: #333333; cursor: not-allowed; }
        .date-picker-check {
          position: absolute;
          bottom: 3px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          line-height: 1;
          color: var(--accent);
        }
        .date-picker-cell.is-selected .date-picker-check,
        .date-picker-cell.is-selected .date-picker-day { color: #000; }
        .date-picker-day { position: relative; }
        .date-picker-legend {
          display: flex;
          gap: 16px;
          margin-top: 14px;
          font-size: 12px;
          color: var(--muted);
        }
        .legend-item { display: flex; align-items: center; gap: 6px; }
        .legend-dot { width: 10px; height: 10px; border-radius: 999px; }
        .legend-today { box-shadow: inset 0 0 0 1.5px var(--text); }
        .legend-completed { background: var(--accent); }
        .legend-available { background: var(--raised); }
        .date-picker-loading {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          font-size: 12px;
          color: var(--muted);
        }
        .date-picker-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid var(--raised);
          border-top-color: var(--text);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
