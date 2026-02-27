import React, { useMemo } from 'react';
import styled from 'styled-components';

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS_ES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

const MiniCalendar = ({ month, year, selectedDay, onMonthChange, onDaySelect, transactionDays = [] }) => {
  
  const calendarDays = useMemo(() => {
    // First day of the month (0=Sun, 1=Mon, ...)
    const firstDay = new Date(year, month - 1, 1).getDay();
    // Convert to Mon=0 format
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();
    
    const days = [];
    
    // Previous month trailing days
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, current: false });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, current: true });
    }
    
    // Next month leading days (fill to 42 or at least complete the row)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({ day: i, current: false });
      }
    }
    
    return days;
  }, [month, year]);

  const today = new Date();
  const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;

  const handlePrev = () => {
    if (month === 1) {
      onMonthChange(12, year - 1);
    } else {
      onMonthChange(month - 1, year);
    }
  };

  const handleNext = () => {
    if (month === 12) {
      onMonthChange(1, year + 1);
    } else {
      onMonthChange(month + 1, year);
    }
  };

  const handleDayClick = (day, isCurrent) => {
    if (!isCurrent) return;
    // Toggle day selection: click again to deselect
    if (selectedDay === day) {
      onDaySelect(null);
    } else {
      onDaySelect(day);
    }
  };

  const handleTodayClick = () => {
    const now = new Date();
    onMonthChange(now.getMonth() + 1, now.getFullYear());
    onDaySelect(null);
  };

  // Set of days (numbers) that have transactions
  const txnDaySet = useMemo(() => new Set(transactionDays), [transactionDays]);

  return (
    <CalendarWrapper>
      <div className="cal-header">
        <button className="cal-nav" onClick={handlePrev}>&#8249;</button>
        <div className="cal-title">
          <span className="cal-month">{MONTHS_ES[month - 1]}</span>
          <span className="cal-year">{year}</span>
        </div>
        <button className="cal-nav" onClick={handleNext}>&#8250;</button>
      </div>

      <div className="cal-weekdays">
        {DAYS_ES.map(d => (
          <div key={d} className="cal-weekday">{d}</div>
        ))}
      </div>

      <div className="cal-grid">
        {calendarDays.map((item, idx) => {
          const isToday = isCurrentMonth && item.current && item.day === today.getDate();
          const isSelected = item.current && selectedDay === item.day;
          const hasTxn = item.current && txnDaySet.has(item.day);

          return (
            <button
              key={idx}
              className={[
                'cal-day',
                !item.current && 'other-month',
                isToday && 'today',
                isSelected && 'selected',
                hasTxn && 'has-txn',
              ].filter(Boolean).join(' ')}
              onClick={() => handleDayClick(item.day, item.current)}
              disabled={!item.current}
            >
              {item.day}
            </button>
          );
        })}
      </div>

      <div className="cal-footer">
        <button className="cal-today-btn" onClick={handleTodayClick}>Hoy</button>
        {selectedDay && (
          <span className="cal-selected-label">
            {selectedDay} de {MONTHS_ES[month - 1]}
          </span>
        )}
      </div>
    </CalendarWrapper>
  );
};

const CalendarWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  user-select: none;

  .cal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
  }

  .cal-nav {
    width: 28px;
    height: 28px;
    border: none;
    background: #f3f4f6;
    border-radius: 6px;
    font-size: 1.1rem;
    color: #374151;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    font-family: inherit;
    &:hover { background: #e5e7eb; color: #111827; }
  }

  .cal-title {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.1;
  }

  .cal-month {
    font-size: 0.85rem;
    font-weight: 700;
    color: #1f2937;
    text-transform: capitalize;
  }

  .cal-year {
    font-size: 0.7rem;
    color: #6b7280;
    font-weight: 500;
  }

  .cal-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .cal-weekday {
    text-align: center;
    font-size: 0.65rem;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2px 0;
  }

  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .cal-day {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    border: none;
    background: transparent;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.12s;
    font-family: inherit;
    padding: 0;

    &:hover:not(:disabled) {
      background: #eff6ff;
      color: #2563eb;
    }

    &.other-month {
      color: #d1d5db;
      cursor: default;
    }

    &.today {
      background: #dbeafe;
      color: #1d4ed8;
      font-weight: 700;
    }

    &.selected {
      background: #2563eb;
      color: white;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
    }

    &.has-txn::after {
      content: '';
      position: absolute;
      bottom: 3px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #10b981;
    }

    &.selected.has-txn::after {
      background: white;
    }
  }

  .cal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 4px;
    min-height: 26px;
  }

  .cal-today-btn {
    border: none;
    background: #f0fdf4;
    color: #059669;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 5px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    &:hover { background: #dcfce7; }
  }

  .cal-selected-label {
    font-size: 0.7rem;
    color: #2563eb;
    font-weight: 600;
  }
`;

export default MiniCalendar;
