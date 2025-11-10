// src/components/forms/inputs/color-picker.tsx

import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { FieldWrapper, type FieldWrapperProps } from '../elements/field-wrapper';
import { useFieldState, type BaseFieldProps } from '../adapters/rhf/field';
import { cn } from '@/lib/utils/utils';

export interface ColorPickerProps
  extends Omit<FieldWrapperProps, 'children'>,
    BaseFieldProps {
  // Color options
  preset?: string[];
  allowCustom?: boolean;
  format?: 'hex' | 'rgb' | 'hsl';
  
  // Display
  showPreview?: boolean;
  showInput?: boolean;
  size?: 'sm' | 'md' | 'lg';
  
  // Validation
  validateColor?: (color: string) => string | null;
  
  className?: string;
}

export const ColorPicker = forwardRef<HTMLInputElement, ColorPickerProps>(({
  name,
  control,
  label,
  help,
  tooltip,
  required,
  optional,
  error,
  preset = [
    '#FF6900', '#FCB900', '#7BDCB5', '#00D084', '#8ED1FC', '#0693E3',
    '#ABB8C3', '#EB144C', '#F78DA7', '#9900EF', '#FF6900', '#FCB900'
  ],
  allowCustom = true,
  format = 'hex',
  showPreview = true,
  showInput = true,
  size = 'md',
  validateColor,
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
  const [customColor, setCustomColor] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const displayError = error || fieldError;
  const currentColor = field.value || '#FF6900';

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

  // Convert color formats
  const formatColor = (color: string): string => {
    // Basic hex validation and formatting
    if (format === 'hex') {
      return color.startsWith('#') ? color : `#${color}`;
    }
    // Add RGB/HSL conversion logic here if needed
    return color;
  };

  // Handle color selection
  const handleColorSelect = (color: string) => {
    const formattedColor = formatColor(color);
    
    if (validateColor) {
      const error = validateColor(formattedColor);
      if (error) return;
    }
    
    field.onChange(formattedColor);
    setIsOpen(false);
  };

  // Handle custom color input
  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    if (color.length >= 6) {
      handleColorSelect(color);
    }
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

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
        {/* Color Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-3 p-3 border rounded-xl bg-[var(--background)] transition-all duration-200',
            'hover:border-[var(--primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20',
            displayError ? 'border-[var(--error)]' : 'border-[var(--border)]',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div
            className={cn(
              'rounded-lg border-2 border-white shadow-sm',
              sizeClasses[size]
            )}
            style={{ backgroundColor: currentColor }}
          />
          
          {showPreview && (
            <div className="flex-1 text-left">
              <div className="text-sm font-satoshi-medium text-[var(--heading-color)]">
                {currentColor.toUpperCase()}
              </div>
              <div className="text-xs text-[var(--caption-color)] font-satoshi">
                Click to change color
              </div>
            </div>
          )}
          
          <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Color Picker Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-lg z-50 min-w-[280px]">
            {/* Preset Colors */}
            <div className="space-y-3">
              <h4 className="text-sm font-satoshi-medium text-[var(--heading-color)]">
                Preset Colors
              </h4>
              
              <div className="grid grid-cols-6 gap-2">
                {preset.map((color, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleColorSelect(color)}
                    className={cn(
                      'w-8 h-8 rounded-lg border-2 transition-all duration-200',
                      'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30',
                      currentColor === color ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20' : 'border-white shadow-sm'
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Custom Color Input */}
            {allowCustom && showInput && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <h4 className="text-sm font-satoshi-medium text-[var(--heading-color)] mb-2">
                  Custom Color
                </h4>
                
                <div className="flex gap-2">
                  <input
                    ref={ref}
                    type="color"
                    value={currentColor}
                    onChange={(e) => handleColorSelect(e.target.value)}
                    className="w-12 h-10 border border-[var(--border)] rounded-lg cursor-pointer"
                  />
                  
                  <input
                    type="text"
                    value={customColor || currentColor}
                    onChange={handleCustomColorChange}
                    placeholder="#FF6900"
                    className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg text-sm font-mono focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </FieldWrapper>
  );
});

ColorPicker.displayName = 'ColorPicker';