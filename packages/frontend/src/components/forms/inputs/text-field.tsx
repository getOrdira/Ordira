// src/components/forms/inputs/text-field.tsx

import React, { forwardRef } from 'react';
import { FieldWrapper, type FieldWrapperProps } from '../elements/field-wrapper';
import { Input, type InputProps } from '@/components/ui/primitives/input';
import { useFieldState, type BaseFieldProps } from '../adapters/rhf/field';

export interface TextFieldProps 
  extends Omit<InputProps, 'error' | 'success' | 'label' | 'helper'>,
    Omit<FieldWrapperProps, 'children'>,
    BaseFieldProps {
  // Text-specific options
  maxLength?: number;
  showCharCount?: boolean;
  trim?: boolean;
  transform?: 'none' | 'lowercase' | 'uppercase' | 'capitalize';
  // Validation
  pattern?: RegExp;
  patternMessage?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(({
  name,
  control,
  label,
  help,
  tooltip,
  required,
  optional,
  error,
  maxLength,
  showCharCount = false,
  trim = true,
  transform = 'none',
  pattern,
  patternMessage,
  transformError,
  className,
  ...props
}, ref) => {
  const {
    field,
    error: fieldError,
    isLoading
  } = useFieldState(name, control);

  const currentValue = field.value || '';
  const characterCount = currentValue.length;
  const displayError = error || fieldError;

  // Handle value transformation
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Apply text transformations
    switch (transform) {
      case 'lowercase':
        value = value.toLowerCase();
        break;
      case 'uppercase':
        value = value.toUpperCase();
        break;
      case 'capitalize':
        value = value.replace(/\b\w/g, l => l.toUpperCase());
        break;
    }
    
    // Apply max length
    if (maxLength && value.length > maxLength) {
      value = value.slice(0, maxLength);
    }
    
    field.onChange(value);
  };

  // Handle blur for trimming
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (trim && field.value) {
      field.onChange(field.value.trim());
    }
    props.onBlur?.(e);
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
      htmlFor={field.name}
    >
      <Input
        {...props}
        ref={ref}
        name={field.name}
        value={field.value || ''}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={props.disabled || isLoading}
        maxLength={maxLength}
      />
      
      {showCharCount && maxLength && (
        <div className="flex justify-end mt-1">
          <span className={`text-xs font-satoshi ${
            characterCount > maxLength * 0.9 
              ? 'text-[var(--warning)]' 
              : 'text-[var(--caption-color)]'
          }`}>
            {characterCount}/{maxLength}
          </span>
        </div>
      )}
    </FieldWrapper>
  );
});

TextField.displayName = 'TextField';