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
          padding-top: 80px;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          animation: fadeIn 0.15s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .date-picker-popover {
          background: rgba(18, 20, 26, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          padding: 1rem;
          min-width: 320px;
          max-width: 360px;
          backdrop-filter: blur(20px) saturate(140%);
          -webkit-backdrop-filter: blur(20px) saturate(140%);
          box-shadow: 
            0 24px 48px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.05) inset;
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .date-picker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .date-picker-title {
          font-weight: 600;
          font-size: 1rem;
          color: var(--text);
        }

        .date-picker-nav {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: var(--text);
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          padding: 0;
        }

        .date-picker-nav:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.16);
        }

        .date-picker-nav:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .date-picker-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 4px;
        }

        .date-picker-weekday {
          text-align: center;
          font-size: 0.7rem;
          font-weight: 500;
          color: var(--muted);
          padding: 4px 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .date-picker-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }

        .date-picker-cell {
          position: relative;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          color: var(--text);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          padding: 0;
        }

        .date-picker-cell.empty {
          cursor: default;
        }

        .date-picker-cell.is-available:hover:not(:disabled) {
          background: rgba(124, 77, 255, 0.2);
          border-color: rgba(124, 77, 255, 0.4);
        }

        .date-picker-cell.is-today {
          border: 2px dashed var(--accent);
        }

        .date-picker-cell.is-selected {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }

        .date-picker-cell.is-unavailable {
          opacity: 0.25;
          cursor: not-allowed;
        }

        .date-picker-cell.is-future {
          opacity: 0.15;
          cursor: not-allowed;
        }

        .date-picker-cell.is-completed {
          background: rgba(34, 197, 94, 0.15);
        }

        .date-picker-cell.is-completed:hover:not(:disabled) {
          background: rgba(34, 197, 94, 0.25);
        }

        .date-picker-check {
          position: absolute;
          top: 2px;
          right: 2px;
          font-size: 0.6rem;
          color: var(--success);
        }

        .date-picker-day {
          position: relative;
          z-index: 1;
        }

        .date-picker-legend {
          display: flex;
          gap: 1rem;
          margin-top: 0.875rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.7rem;
          color: var(--muted);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 2px;
        }

        .legend-today {
          border: 1.5px dashed var(--accent);
        }

        .legend-completed {
          background: rgba(34, 197, 94, 0.4);
        }

        .legend-available {
          background: rgba(255, 255, 255, 0.2);
        }

        .date-picker-loading {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0;
          font-size: 0.8rem;
          color: var(--muted);
        }

        .date-picker-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: var(--accent);
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
