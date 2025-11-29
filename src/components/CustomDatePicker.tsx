import { useState, useEffect, useRef } from 'react';

interface CustomDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
  className?: string;
}

export default function CustomDatePicker({ 
  value, 
  onChange, 
  placeholder = "Pick a date — click to open",
  className = ""
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(value);
  const calendarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  const today = new Date();

  useEffect(() => {
    setSelected(value);
    setViewDate(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const friendly = (date: Date | null) => {
    if (!date) return 'No date selected';
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isSameDay = (a: Date, b: Date) => {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() && 
           a.getMonth() === b.getMonth() && 
           a.getDate() === b.getDate();
  };

  const handleDateSelect = (date: Date) => {
    setSelected(date);
    onChange(date);
    setIsOpen(false);
  };

  const handleToday = () => {
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    handleDateSelect(todayDate);
  };

  const handleClear = () => {
    setSelected(null);
    onChange(new Date());
    setIsOpen(false);
  };

  const handleConfirm = () => {
    if (selected) {
      onChange(selected);
    }
    setIsOpen(false);
  };

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const renderDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    // Previous month tail
    const prevDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevDays - i);
      days.push(
        <button
          key={`prev-${i}`}
          className="day inactive"
          onClick={() => handleDateSelect(date)}
          type="button"
        >
          {date.getDate()}
        </button>
      );
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const isToday = isSameDay(date, today);
      const isSelected = selected && isSameDay(date, selected);
      
      let dayClass = 'day';
      if (isToday) dayClass += ' today';
      if (isSelected) dayClass += ' selected';

      days.push(
        <button
          key={`current-${i}`}
          className={dayClass}
          onClick={() => handleDateSelect(date)}
          type="button"
        >
          {i}
        </button>
      );
    }

    // Next month tail
    const total = days.length;
    const needed = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let i = 1; i <= needed; i++) {
      const date = new Date(year, month + 1, i);
      days.push(
        <button
          key={`next-${i}`}
          className="day inactive"
          onClick={() => handleDateSelect(date)}
          type="button"
        >
          {date.getDate()}
        </button>
      );
    }

    return days;
  };

  return (
    <div className={`datepicker-wrap ${className}`}>
      <div className="calendar">
        <div 
          ref={inputRef}
          className="input" 
          role="button" 
          tabIndex={0}
          aria-haspopup="dialog" 
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
        >
          <input 
            value={selected ? friendly(selected) : ''}
            readOnly 
            placeholder={placeholder}
            aria-label="Selected date"
            className="bg-transparent border-0 outline-none text-inherit w-full text-sm"
          />
          <div className="icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
        </div>

        {isOpen && (
          <div 
            ref={calendarRef}
            className="popup open" 
            role="dialog" 
            aria-modal="true" 
            aria-label="Date picker"
          >
            <div className="header">
              <div className="month">
                {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </div>
              <div className="controls">
                <button 
                  className="btn" 
                  onClick={prevMonth}
                  aria-label="Previous month"
                  type="button"
                >
                  ◀
                </button>
                <button 
                  className="btn" 
                  onClick={nextMonth}
                  aria-label="Next month"
                  type="button"
                >
                  ▶
                </button>
              </div>
            </div>

            <div className="weekdays" aria-hidden="true">
              <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div className="days">
              {renderDays()}
            </div>

            <div className="footer">
              <div className="small">
                {selected ? friendly(selected) : 'No date selected'}
              </div>
              <div className="actions">
                <button className="ghost" onClick={handleToday} type="button">
                  Today
                </button>
                <button className="ghost" onClick={handleClear} type="button">
                  Clear
                </button>
                <button className="primary" onClick={handleConfirm} type="button">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .datepicker-wrap .input {
            display: flex;
            align-items: center;
            gap: 10px;
            background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.08));
            padding: 12px 14px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.15);
            backdrop-filter: blur(12px);
            box-shadow: 0 10px 30px rgba(2,6,23,0.6);
            cursor: pointer;
          }

          .datepicker-wrap .input input {
            background: transparent;
            border: 0;
            outline: none;
            color: inherit;
            width: 100%;
            font-size: 15px;
          }

          .datepicker-wrap .input .icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: grid;
            place-items: center;
            background: linear-gradient(135deg, #7c5cff, #3ec7ff);
            box-shadow: 0 6px 18px rgba(124,92,255,0.14);
          }

          .datepicker-wrap .input .icon svg {
            filter: drop-shadow(0 6px 18px rgba(0,0,0,0.35));
          }

          .datepicker-wrap .calendar {
            position: relative;
          }

          .datepicker-wrap .popup {
            position: absolute;
            top: calc(100% + 12px);
            left: 0;
            width: 340px;
            background: linear-gradient(180deg, rgba(15,23,42,0.95), rgba(15,23,42,0.90));
            border-radius: 14px;
            padding: 14px;
            border: 1px solid rgba(255,255,255,0.15);
            backdrop-filter: blur(20px);
            box-shadow: 0 20px 60px rgba(2,6,23,0.7), inset 0 1px 0 rgba(255,255,255,0.1);
            transform-origin: top center;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-6px) scale(.98);
            transition: all 220ms cubic-bezier(.2,.9,.3,1);
            z-index: 50;
          }

          .datepicker-wrap .popup.open {
            opacity: 1;
            visibility: visible;
            transform: translateY(0) scale(1);
          }

          .datepicker-wrap .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
          }

          .datepicker-wrap .month {
            font-weight: 600;
            color: #e6eef8;
          }

          .datepicker-wrap .controls {
            display: flex;
            gap: 8px;
          }

          .datepicker-wrap .btn {
            background: transparent;
            border: 0;
            padding: 8px;
            border-radius: 10px;
            color: #98a0b3;
            cursor: pointer;
          }

          .datepicker-wrap .btn:hover {
            color: #7c5cff;
            background: rgba(124,92,255,0.06);
          }

          .datepicker-wrap .weekdays {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 6px;
            margin-bottom: 8px;
            font-size: 12px;
            color: #98a0b3;
            text-align: center;
          }

          .datepicker-wrap .days {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 6px;
          }

          .datepicker-wrap .day {
            padding: 10px;
            border-radius: 10px;
            text-align: center;
            cursor: pointer;
            user-select: none;
            border: none;
            background: transparent;
            color: #e6eef8;
            font-size: 14px;
            font-weight: 500;
          }

          .datepicker-wrap .day:hover {
            background: rgba(255,255,255,0.08);
            transform: translateY(-2px);
            transition: all 120ms;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }

          .datepicker-wrap .day.inactive {
            color: rgba(255,255,255,0.35);
            font-weight: 400;
          }

          .datepicker-wrap .day.today {
            border: 1px solid rgba(124,92,255,0.3);
            background: rgba(124,92,255,0.1);
            box-shadow: inset 0 0 10px rgba(124,92,255,0.1);
            font-weight: 600;
          }

          .datepicker-wrap .day.selected {
            background: linear-gradient(135deg, #7c5cff, #3ec7ff);
            color: #041026;
            font-weight: 700;
            box-shadow: 0 10px 28px rgba(124,92,255,0.18);
          }

          .datepicker-wrap .footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 10px;
          }

          .datepicker-wrap .small {
            font-size: 13px;
            color: #98a0b3;
          }

          .datepicker-wrap .actions {
            display: flex;
            gap: 8px;
          }

          .datepicker-wrap .ghost {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 8px 10px;
            border-radius: 10px;
            color: #98a0b3;
            cursor: pointer;
            font-size: 12px;
            backdrop-filter: blur(8px);
          }

          .datepicker-wrap .ghost:hover {
            background: rgba(255,255,255,0.1);
            border-color: rgba(255,255,255,0.2);
          }

          .datepicker-wrap .primary {
            background: linear-gradient(90deg, #7c5cff, #3ec7ff);
            padding: 8px 12px;
            border-radius: 10px;
            border: 0;
            color: #041026;
            font-weight: 600;
            cursor: pointer;
            font-size: 12px;
            box-shadow: 0 4px 12px rgba(124,92,255,0.3);
          }

          .datepicker-wrap .primary:hover {
            box-shadow: 0 6px 16px rgba(124,92,255,0.4);
            transform: translateY(-1px);
          }

          .datepicker-wrap .day:focus {
            outline: 2px solid rgba(124,92,255,0.18);
          }

          @media (max-width: 420px) {
            .datepicker-wrap .popup {
              left: -10px;
              width: calc(100% + 20px);
            }
          }
        `
      }} />
    </div>
  );
}
