import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, isValid, parse, isSameDay, isSameMonth, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface DatePickerProps {
  value: string; // yyyy-MM-dd
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  maxDate?: string; // yyyy-MM-dd
  minDate?: string; // yyyy-MM-dd
}

export function DatePicker({ value, onChange, className = '', placeholder = 'DD/MM/AAAA', maxDate, minDate }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0, position: 'bottom' as 'top' | 'bottom' });

  // Sincronizar valor interno con prop 'value'
  useEffect(() => {
    if (value) {
      const date = parse(value, 'yyyy-MM-dd', new Date());
      if (isValid(date)) {
        setInputValue(format(date, 'dd/MM/yyyy'));
        setViewDate(date);
      }
    } else {
      setInputValue('');
    }
  }, [value]);

  const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : null;
  const [viewDate, setViewDate] = useState(selectedDate || new Date());
  
  const parsedMaxDate = maxDate ? parse(maxDate, 'yyyy-MM-dd', new Date()) : null;
  const parsedMinDate = minDate ? parse(minDate, 'yyyy-MM-dd', new Date()) : null;

  // Calcular posición del popover
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const hasSpaceBelow = spaceBelow > 350;
      
      setPopoverCoords({
        top: hasSpaceBelow ? rect.bottom + 5 : rect.top - 340,
        left: Math.min(rect.left, window.innerWidth - 300),
        position: hasSpaceBelow ? 'bottom' : 'top'
      });
    }
  }, [isOpen]);

  const isInvalid = inputValue.length === 10 && (() => {
    const parsedDate = parse(inputValue, 'dd/MM/yyyy', new Date());
    if (!isValid(parsedDate)) return true;
    if (parsedMaxDate && parsedDate > parsedMaxDate) return true;
    if (parsedMinDate && parsedDate < parsedMinDate) return true;
    return false;
  })();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 8) val = val.substring(0, 8);
    
    // Auto-formateo DD/MM/AAAA
    let formatted = val;
    if (val.length > 2) formatted = val.substring(0, 2) + '/' + val.substring(2);
    if (val.length > 4) formatted = formatted.substring(0, 5) + '/' + formatted.substring(5);
    
    setInputValue(formatted);

    if (val.length === 8) {
      const parsedDate = parse(formatted, 'dd/MM/yyyy', new Date());
      if (isValid(parsedDate)) {
        // Validar contra max/min
        if (parsedMaxDate && parsedDate > parsedMaxDate) return;
        if (parsedMinDate && parsedDate < parsedMinDate) return;
        
        onChange(format(parsedDate, 'yyyy-MM-dd'));
        setViewDate(parsedDate);
      }
    }
  };

  const selectDate = (date: Date) => {
    if (parsedMaxDate && date > parsedMaxDate) return;
    if (parsedMinDate && date < parsedMinDate) return;
    onChange(format(date, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const currentYearLimit = parsedMaxDate ? parsedMaxDate.getFullYear() : new Date().getFullYear() + 10;
  const minYearLimit = parsedMinDate ? parsedMinDate.getFullYear() : 1920;

  const years = Array.from({ length: currentYearLimit - minYearLimit + 1 }, (_, i) => {
    return currentYearLimit - i;
  });

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative group">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-3 py-2.5 bg-gray-50 border rounded-xl text-sm font-bold outline-none transition-all placeholder:text-gray-300 ${
            isInvalid 
              ? 'border-red-500 text-red-600 focus:ring-red-500 bg-red-50' 
              : 'border-gray-200 text-[#004975] focus:ring-2 focus:ring-[#00C288] focus:bg-white'
          }`}
        />
        <CalendarIcon className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
          isInvalid ? 'text-red-400' : 'text-gray-400 group-focus-within:text-[#00C288]'
        }`} />
        {inputValue && (
          <button 
            type="button" 
            onClick={() => { onChange(''); setInputValue(''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <div 
          ref={popoverRef}
          style={{ 
            position: 'fixed', 
            top: popoverCoords.top - window.scrollY, 
            left: popoverCoords.left,
            zIndex: 9999 
          }}
          className="w-[280px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 animate-in zoom-in-95 fade-in duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-1">
              <select 
                value={viewDate.getMonth()} 
                onChange={(e) => {
                  const d = new Date(viewDate);
                  d.setMonth(Number(e.target.value));
                  setViewDate(d);
                }}
                className="text-xs font-black text-[#004975] bg-transparent border-none p-0 focus:ring-0 cursor-pointer capitalize"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>{format(new Date(2024, i, 1), 'MMMM', { locale: es })}</option>
                ))}
              </select>
              <select 
                value={viewDate.getFullYear()} 
                onChange={(e) => {
                  const d = new Date(viewDate);
                  d.setFullYear(Number(e.target.value));
                  setViewDate(d);
                }}
                className="text-xs font-black text-[#004975] bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button type="button" onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 mb-2">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-gray-300 uppercase">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const isCurrMonth = isSameMonth(day, viewDate);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isDisabled = (parsedMaxDate && day > parsedMaxDate) || (parsedMinDate && day < parsedMinDate);
              
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => selectDate(day)}
                  className={`h-8 w-full rounded-lg text-xs font-bold transition-all ${
                    isSelected 
                      ? 'bg-[#00C288] text-white shadow-lg shadow-[#00C288]/30' 
                      : isDisabled
                        ? 'opacity-20 cursor-not-allowed'
                        : isCurrMonth ? 'text-[#004975] hover:bg-gray-50' : 'text-gray-200'
                  }`}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => selectDate(new Date())}
            className="mt-4 w-full py-2 bg-[#00C288]/10 text-[#00C288] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#00C288]/20 transition-colors"
          >
            Hoy
          </button>
        </div>
      )}
    </div>
  );
}
