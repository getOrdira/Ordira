// src/components/forms/inputs/textarea-field.tsx

import React, { forwardRef } from 'react';
import { FieldWrapper, type FieldWrapperProps } from '../elements/field-wrapper';
import { Textarea, type TextareaProps } from '@/components/ui/primitives/input';
import { useFieldState, type BaseFieldProps } from '../adapters/rhf/field';

export interface TextareaFieldProps 
  extends Omit<TextareaProps, 'error' | 'success' | 'label' | 'helper' | 'name'>,
    Omit<FieldWrapperProps, 'children'>,
    BaseFieldProps {
  // Textarea-specific options
  maxLength?: number;
  showCharCount?: boolean;
  autoResize?: boolean;
  trim?: boolean;
  // Validation
  minWords?: number;
  maxWords?: number;
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(({
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
  autoResize = false,
  trim = true,
  minWords,
  maxWords,
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
  const wordCount = currentValue.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
  const displayError = error || fieldError;

  // Handle auto-resize
  React.useEffect(() => {
    if (autoResize && ref && 'current' in ref && ref.current) {
      const textarea = ref.current;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [currentValue, autoResize, ref]);

  // Handle change with validations
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let value = e.target.value;
    
    // Apply max length
    if (maxLength && value.length > maxLength) {
      value = value.slice(0, maxLength);
    }
    
    field.onChange(value);
  };

  // Handle blur for trimming
  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
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
      error={typeof displayError === 'string' ? displayError : Array.isArray(displayError) ? displayError.join(', ') : displayError?.message}
      className={className}
      htmlFor={field.name}
    >
      <Textarea
        {...props}
        ref={ref}
        name={field.name}
        value={field.value || ''}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={props.disabled || isLoading}
        maxLength={maxLength}
      />
      
      {(showCharCount || minWords || maxWords) && (
        <div className="flex justify-between mt-1 text-xs font-satoshi">
          {(minWords || maxWords) && (
            <span className={`${
              (minWords && wordCount < minWords) || (maxWords && wordCount > maxWords)
                ? 'text-[var(--warning)]' 
                : 'text-[var(--caption-color)]'
            }`}>
              {wordCount} words
              {minWords && ` (min: ${minWords})`}
              {maxWords && ` (max: ${maxWords})`}
            </span>
          )}
          
          {showCharCount && maxLength && (
            <span className={`${
              characterCount > maxLength * 0.9 
                ? 'text-[var(--warning)]' 
                : 'text-[var(--caption-color)]'
            }`}>
              {characterCount}/{maxLength}
            </span>
          )}
        </div>
      )}
    </FieldWrapper>
  );
});

TextareaField.displayName = 'TextareaField';