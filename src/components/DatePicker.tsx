import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

interface DatePickerProps {
  value: string; // yyyy-MM-dd
  onChange: (value: string) => void;
  className?: string;
}

export function DatePicker({ value, onChange, className = '' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? (() => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  })() : new Date();

  const [viewDate, setViewDate] = useState(selectedDate);

  // Sync viewDate when value changes externally
  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      setViewDate(new Date(y, m - 1, d));
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const displayText = value
    ? format(selectedDate, "dd MMM yyyy", { locale: es })
    : 'Seleccionar';

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 border border-gray-200 rounded-lg px-2.5 py-2 text-sm font-bold text-[#004975] bg-gray-50 hover:bg-white focus:ring-2 focus:ring-[#00C288] outline-none transition-colors w-[140px]"
      >
        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="truncate capitalize">{displayText}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 p-3 w-[280px] animate-in zoom-in-95 fade-in duration-150">
          {/* Header: month/year nav */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewDate(subMonths(viewDate, 1))}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-[#004975]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-black text-[#004975] capitalize">
              {format(viewDate, "MMMM yyyy", { locale: es })}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(addMonths(viewDate, 1))}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-[#004975]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 mb-0.5">
            {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {days.map(day => {
              const isCurrentMonth = isSameMonth(day, viewDate);
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    onChange(format(day, 'yyyy-MM-dd'));
                    setIsOpen(false);
                  }}
                  className={`h-8 w-full rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-[#00C288] text-white shadow-sm'
                      : isToday
                        ? 'bg-[#00C288]/10 text-[#00C288] hover:bg-[#00C288]/20'
                        : isCurrentMonth
                          ? 'text-[#004975] hover:bg-gray-100'
                          : 'text-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Quick jump */}
          <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                const today = format(new Date(), 'yyyy-MM-dd');
                onChange(today);
                setIsOpen(false);
              }}
              className="text-[11px] font-black text-[#00C288] bg-[#00C288]/10 hover:bg-[#00C288]/20 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              Hoy
            </button>
            <select
              value={viewDate.getMonth()}
              onChange={(e) => {
                const d = new Date(viewDate);
                d.setMonth(Number(e.target.value));
                setViewDate(d);
              }}
              className="flex-1 text-[11px] font-bold text-gray-600 bg-gray-50 border border-gray-200 px-1.5 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-[#00C288] capitalize"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {format(new Date(2024, i, 1), 'MMM', { locale: es })}
                </option>
              ))}
            </select>
            <select
              value={viewDate.getFullYear()}
              onChange={(e) => {
                const d = new Date(viewDate);
                d.setFullYear(Number(e.target.value));
                setViewDate(d);
              }}
              className="w-[85px] text-[11px] font-bold text-gray-600 bg-gray-50 border border-gray-200 px-1.5 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-[#00C288] scrollbar-thin"
            >
              {Array.from({ length: new Date().getFullYear() - 1920 + 11 }, (_, i) => {
                const year = new Date().getFullYear() + 10 - i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
