// src/components/forms/inputs/date-picker.tsx

import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { FieldWrapper, type FieldWrapperProps } from '../elements/field-wrapper';
import { useFieldState, type BaseFieldProps } from '../adapters/rhf/field';
import { cn } from '@/lib/utils';

export interface DatePickerProps
  extends Omit<FieldWrapperProps, 'children'>,
    BaseFieldProps {
  // Date options
  format?: string;
  minDate?: Date | string;
  maxDate?: Date | string;
  
  // Display
  showTime?: boolean;
  placeholder?: string;
  
  // Behavior
  closeOnSelect?: boolean;
  allowClear?: boolean;
  
  // Validation
  disabledDates?: (date: Date) => boolean;
  
  className?: string;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(({
  name,
  control,
  label,
  help,
  tooltip,
  required,
  optional,
  error,
  format = 'YYYY-MM-DD',
  minDate,
  maxDate,
  showTime = false,
  placeholder = 'Select date',
  closeOnSelect = true,
  allowClear = true,
  disabledDates,
  transformError,
  className,
  ...props
}, ref) => {
  const {
    field,
    error: fieldError,
    isLoading
  } = useFieldState(name, control);

  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const displayError = error || fieldError;
  const currentDate = field.value ? new Date(field.value) : null;

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...(showTime && {
        hour: '2-digit',
        minute: '2-digit'
      })
    });
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    if (disabledDates && disabledDates(date)) return;
    
    const dateValue = showTime ? date.toISOString() : date.toISOString().split('T')[0];
    field.onChange(dateValue);
    
    if (closeOnSelect && !showTime) {
      setIsOpen(false);
    }
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <FieldWrapper
      label={label}
      help={help}
      tooltip={tooltip}
      required={required}
      optional={optional}
      error={displayError}
      className={className}
    >
      <div ref={containerRef} className="relative">
        {/* Date Input */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className={cn(
            'flex items-center justify-between w-full p-3 border rounded-xl bg-[var(--background)] transition-all duration-200',
            'hover:border-[var(--primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20',
            displayError ? 'border-[var(--error)]' : 'border-[var(--border)]',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className={cn(
            'font-satoshi',
            currentDate ? 'text-[var(--foreground)]' : 'text-[var(--input-placeholder)]'
          )}>
            {currentDate ? formatDate(currentDate) : placeholder}
          </span>
          
          <div className="flex items-center gap-2">
            {allowClear && currentDate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  field.onChange(null);
                }}
                className="p-1 text-[var(--muted)] hover:text-[var(--error)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </button>

        {/* Calendar Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-lg z-50 min-w-[320px]">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}
                className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <h3 className="font-satoshi-medium text-[var(--heading-color)]">
                {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
              </h3>
              
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}
                className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="p-2 text-xs font-satoshi-medium text-[var(--caption-color)] text-center">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                const isCurrentMonth = date.getMonth() === viewDate.getMonth();
                const isSelected = currentDate && 
                  date.getDate() === currentDate.getDate() &&
                  date.getMonth() === currentDate.getMonth() &&
                  date.getFullYear() === currentDate.getFullYear();
                const isDisabled = disabledDates ? disabledDates(date) : false;
                const isToday = new Date().toDateString() === date.toDateString();

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleDateSelect(date)}
                    disabled={isDisabled}
                    className={cn(
                      'p-2 text-sm font-satoshi transition-all duration-200 rounded-lg',
                      'hover:bg-[var(--primary)]/10',
                      isCurrentMonth ? 'text-[var(--foreground)]' : 'text-[var(--muted)]',
                      isSelected && 'bg-[var(--primary)] text-white',
                      isToday && !isSelected && 'bg-[var(--primary)]/10 text-[var(--primary)] font-satoshi-medium',
                      isDisabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Time Picker (if enabled) */}
            {showTime && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    onChange={(e) => {
                      if (currentDate) {
                        const [hours, minutes] = e.target.value.split(':');
                        const newDate = new Date(currentDate);
                        newDate.setHours(parseInt(hours), parseInt(minutes));
                        handleDateSelect(newDate);
                      }
                    }}
                    className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm font-satoshi focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hidden input for form compatibility */}
        <input
          ref={ref}
          type="hidden"
          name={field.name}
          value={field.value || ''}
        />
      </div>
    </FieldWrapper>
  );
});

DatePicker.displayName = 'DatePicker';