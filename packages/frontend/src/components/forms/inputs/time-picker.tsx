// src/components/forms/inputs/time-picker.tsx

import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { FieldWrapper, type FieldWrapperProps } from '../elements/field-wrapper';
import { useFieldState, type BaseFieldProps } from '../adapters/rhf/field';
import { cn } from '@/lib/utils';

export interface TimePickerProps
  extends Omit<FieldWrapperProps, 'children'>,
    BaseFieldProps {
  // Time options
  format?: '12h' | '24h';
  step?: number; // Minutes step (5, 10, 15, 30)
  
  // Display
  placeholder?: string;
  showSeconds?: boolean;
  
  // Behavior
  allowClear?: boolean;
  
  className?: string;
}

export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(({
  name,
  control,
  label,
  help,
  tooltip,
  required,
  optional,
  error,
  format = '24h',
  step = 15,
  placeholder = 'Select time',
  showSeconds = false,
  allowClear = true,
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
  const containerRef = useRef<HTMLDivElement>(null);

  const displayError = error || fieldError;
  const currentTime = field.value;

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

  // Generate time options
  const generateTimeOptions = () => {
    const options = [];
    const totalMinutes = 24 * 60;
    
    for (let i = 0; i < totalMinutes; i += step) {
      const hours = Math.floor(i / 60);
      const minutes = i % 60;
      
      const time24 = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      let display = time24;
      if (format === '12h') {
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        display = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      }
      
      options.push({ value: time24, display });
    }
    
    return options;
  };

  // Format time for display
  const formatTime = (time: string): string => {
    if (!time) return '';
    
    const [hours, minutes] = time.split(':');
    
    if (format === '12h') {
      const hour = parseInt(hours);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${period}`;
    }
    
    return `${hours}:${minutes}`;
  };

  const timeOptions = generateTimeOptions();

  return (
    <FieldWrapper
      label={label}
      help={help}
      tooltip={tooltip}
      required={required}
      optional={optional}
      error={typeof displayError === 'string' ? displayError : Array.isArray(displayError) ? displayError.join(', ') : displayError?.message}
      className={className}
    >
      <div ref={containerRef} className="relative">
        {/* Time Input */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className={cn(
            'flex items-center justify-between w-full p-3 border rounded-xl bg-white transition-all duration-200',
            'hover:border-[var(--primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20',
            displayError ? 'border-[var(--error)]' : 'border-[var(--border)]',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className={cn(
            'font-satoshi',
            currentTime ? 'text-[var(--foreground)]' : 'text-[var(--input-placeholder)]'
          )}>
            {currentTime ? formatTime(currentTime) : placeholder}
          </span>
          
          <div className="flex items-center gap-2">
            {allowClear && currentTime && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  field.onChange('');
                }}
                className="p-1 text-[var(--muted)] hover:text-[var(--error)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </button>

        {/* Time Options Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-full bg-white border border-[var(--border)] rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto">
            <div className="p-2">
              {timeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    field.onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm font-satoshi transition-colors rounded-lg',
                    'hover:bg-[var(--background-secondary)]',
                    currentTime === option.value && 'bg-[var(--primary)]/10 text-[var(--primary)]'
                  )}
                >
                  {option.display}
                </button>
              ))}
            </div>
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

TimePicker.displayName = 'TimePicker';