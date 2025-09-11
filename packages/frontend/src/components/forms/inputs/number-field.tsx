// src/components/forms/inputs/number-field.tsx

import React, { forwardRef } from 'react';
import { FieldWrapper, type FieldWrapperProps } from '../elements/field-wrapper';
import { Input, type InputProps } from '@/components/ui/primitives/input';
import { useFieldState, type BaseFieldProps } from '../adapters/rhf/field';

export interface NumberFieldProps 
  extends Omit<InputProps, 'type' | 'error' | 'success' | 'label' | 'helper'>,
    Omit<FieldWrapperProps, 'children'>,
    BaseFieldProps {
  // Number-specific options
  min?: number;
  max?: number;
  step?: number;
  precision?: number; // Decimal places
  format?: 'number' | 'currency' | 'percentage';
  currency?: string;
  // Display options
  showStepper?: boolean;
  allowNegative?: boolean;
  thousandSeparator?: boolean;
}

export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(({
  name,
  control,
  label,
  help,
  tooltip,
  required,
  optional,
  error,
  min,
  max,
  step = 1,
  precision = 0,
  format = 'number',
  currency = 'USD',
  showStepper = true,
  allowNegative = true,
  thousandSeparator = false,
  transformError,
  className,
  ...props
}, ref) => {
  const {
    field,
    error: fieldError,
    isLoading
  } = useFieldState(name, control);

  const displayError = error || fieldError;

  // Format number for display
  const formatNumber = (value: number): string => {
    if (isNaN(value)) return '';
    
    const formattedValue = precision > 0 
      ? value.toFixed(precision)
      : value.toString();
    
    if (thousandSeparator) {
      return Number(formattedValue).toLocaleString();
    }
    
    return formattedValue;
  };

  // Parse display value back to number
  const parseNumber = (value: string): number => {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Handle value change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty string for clearing
    if (value === '') {
      field.onChange(null);
      return;
    }
    
    const numericValue = parseNumber(value);
    
    // Apply constraints
    let constrainedValue = numericValue;
    
    if (!allowNegative && constrainedValue < 0) {
      constrainedValue = 0;
    }
    
    if (min !== undefined && constrainedValue < min) {
      constrainedValue = min;
    }
    
    if (max !== undefined && constrainedValue > max) {
      constrainedValue = max;
    }
    
    field.onChange(constrainedValue);
  };

  // Stepper functions
  const increment = () => {
    const currentValue = field.value || 0;
    const newValue = currentValue + step;
    if (max === undefined || newValue <= max) {
      field.onChange(newValue);
    }
  };

  const decrement = () => {
    const currentValue = field.value || 0;
    const newValue = currentValue - step;
    if ((allowNegative || newValue >= 0) && (min === undefined || newValue >= min)) {
      field.onChange(newValue);
    }
  };

  // Display value
  const displayValue = field.value !== null && field.value !== undefined 
    ? formatNumber(Number(field.value))
    : '';

  return (
    <FieldWrapper
      label={label}
      help={help}
      tooltip={tooltip}
      required={required}
      optional={optional}
      error={displayError}
      className={className}
      htmlFor={field.name}
    >
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          type="text"
          inputMode="numeric"
          name={field.name}
          value={displayValue}
          onChange={handleChange}
          disabled={props.disabled || isLoading}
          min={min}
          max={max}
          step={step}
        />
        
        {showStepper && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col">
            <button
              type="button"
              onClick={increment}
              disabled={props.disabled || isLoading || (max !== undefined && (field.value || 0) >= max)}
              className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
            >
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              type="button"
              onClick={decrement}
              disabled={props.disabled || isLoading || (min !== undefined && (field.value || 0) <= min)}
              className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
            >
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
        
        {format === 'currency' && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--muted)] font-satoshi text-sm">
            {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency}
          </div>
        )}
        
        {format === 'percentage' && (
          <div className="absolute right-12 top-1/2 transform -translate-y-1/2 text-[var(--muted)] font-satoshi text-sm">
            %
          </div>
        )}
      </div>
    </FieldWrapper>
  );
});

NumberField.displayName = 'NumberField';