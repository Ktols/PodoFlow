<<<<<<< HEAD
import React, { useState, useEffect, useRef } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, isValid, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  maxDate?: string;
  minDate?: string;
}

export function DatePicker({ value, onChange, placeholder = "DD/MM/AAAA", className = "", maxDate, minDate }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverCoords, setPopoverCoords] = useState<{ position: 'top' | 'bottom' }>({ position: 'bottom' });
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : null;
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

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

  const parsedMaxDate = maxDate ? parse(maxDate, 'yyyy-MM-dd', new Date()) : null;
  const parsedMinDate = minDate ? parse(minDate, 'yyyy-MM-dd', new Date()) : null;

  const calculateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setPopoverCoords({ position: spaceBelow > 350 ? 'bottom' : 'top' });
    }
  };

  const openPicker = () => {
    calculateCoords();
    setIsOpen(true);
  };

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
    
    let formatted = val;
    if (val.length > 2) formatted = val.substring(0, 2) + '/' + val.substring(2);
    if (val.length > 4) formatted = formatted.substring(0, 5) + '/' + formatted.substring(5);
    
    setInputValue(formatted);

    if (val.length === 8) {
      const parsedDate = parse(formatted, 'dd/MM/yyyy', new Date());
      if (isValid(parsedDate)) {
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
    setShowYearPicker(false);
    setShowMonthPicker(false);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowYearPicker(false);
        setShowMonthPicker(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

=======
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

>>>>>>> origin/main
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

<<<<<<< HEAD
  const currentYearLimit = parsedMaxDate ? parsedMaxDate.getFullYear() : new Date().getFullYear() + 10;
  const minYearLimit = parsedMinDate ? parsedMinDate.getFullYear() : 1920;
  const years = Array.from({ length: currentYearLimit - minYearLimit + 1 }, (_, i) => currentYearLimit - i);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative group">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={openPicker}
          onClick={openPicker}
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
          className={`absolute left-0 w-[280px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 animate-in zoom-in-95 fade-in duration-200 z-[30000] ${
            popoverCoords.position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-1 relative">
              <button 
                type="button"
                onClick={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false); }}
                className={`text-xs font-black px-2 py-1 rounded-lg capitalize transition-colors ${showMonthPicker ? 'bg-[#00C288] text-white' : 'text-[#004975] hover:bg-gray-50'}`}
              >
                {format(viewDate, 'MMMM', { locale: es })}
              </button>
              <button 
                type="button"
                onClick={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false); }}
                className={`text-xs font-black px-2 py-1 rounded-lg transition-colors ${showYearPicker ? 'bg-[#00C288] text-white' : 'text-[#004975] hover:bg-gray-50'}`}
              >
                {viewDate.getFullYear()}
              </button>

              {showYearPicker && (
                <div className="absolute top-full left-0 mt-1 w-28 max-h-48 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-2xl z-[30001] p-1 scrollbar-thin scrollbar-thumb-gray-200">
                  {years.map(y => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        const d = new Date(viewDate);
                        d.setFullYear(y);
                        setViewDate(d);
                        setShowYearPicker(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-[11px] font-bold rounded-lg transition-colors ${y === viewDate.getFullYear() ? 'text-white bg-[#00C288]' : 'text-[#004975] hover:bg-gray-50'}`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              )}

              {showMonthPicker && (
                <div className="absolute top-full left-0 mt-1 w-32 max-h-48 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-2xl z-[30001] p-1 scrollbar-thin scrollbar-thumb-gray-200">
                  {Array.from({ length: 12 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        const d = new Date(viewDate);
                        d.setMonth(i);
                        setViewDate(d);
                        setShowMonthPicker(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-[11px] font-bold rounded-lg transition-colors capitalize ${i === viewDate.getMonth() ? 'text-white bg-[#00C288]' : 'text-[#004975] hover:bg-gray-50'}`}
                    >
                      {format(new Date(2024, i, 1), 'MMMM', { locale: es })}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="button" onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
=======
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
>>>>>>> origin/main
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

<<<<<<< HEAD
          <div className="grid grid-cols-7 mb-2">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-gray-300 uppercase">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const isCurrMonth = isSameMonth(day, viewDate);
              const isSelected = !!selectedDate && isSameDay(day, selectedDate);
              const isDisabled = !!((parsedMaxDate && day > parsedMaxDate) || (parsedMinDate && day < parsedMinDate));
              
=======
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

>>>>>>> origin/main
              return (
                <button
                  key={day.toISOString()}
                  type="button"
<<<<<<< HEAD
                  disabled={isDisabled}
                  onClick={() => selectDate(day)}
                  className={`h-8 w-full rounded-lg text-xs font-bold transition-all ${
                    isSelected 
                      ? 'bg-[#00C288] text-white shadow-lg shadow-[#00C288]/30' 
                      : isDisabled
                        ? 'opacity-20 cursor-not-allowed'
                        : isCurrMonth ? 'text-[#004975] hover:bg-gray-50' : 'text-gray-200'
=======
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
>>>>>>> origin/main
                  }`}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

<<<<<<< HEAD
          <button
            type="button"
            onClick={() => selectDate(new Date())}
            className="mt-4 w-full py-2 bg-[#00C288]/10 text-[#00C288] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#00C288]/20 transition-colors"
          >
            Hoy
          </button>
=======
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
              className="w-[70px] text-[11px] font-bold text-gray-600 bg-gray-50 border border-gray-200 px-1.5 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-[#00C288]"
            >
              {Array.from({ length: 11 }, (_, i) => {
                const year = new Date().getFullYear() - 5 + i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>
>>>>>>> origin/main
        </div>
      )}
    </div>
  );
}
