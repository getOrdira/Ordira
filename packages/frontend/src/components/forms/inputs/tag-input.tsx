// src/components/forms/inputs/tag-input.tsx

import React, { forwardRef, useState, useCallback, KeyboardEvent } from 'react';
import { FieldWrapper, type FieldWrapperProps } from '../elements/field-wrapper';
import { useFieldState, type BaseFieldProps } from '../adapters/rhf/field';
import { cn } from '@/lib/utils';

export interface TagInputProps
  extends Omit<FieldWrapperProps, 'children'>,
    BaseFieldProps {
  // Tag options
  suggestions?: string[];
  allowCustom?: boolean;
  maxTags?: number;
  
  // Validation
  validateTag?: (tag: string) => string | null;
  duplicateMessage?: string;
  
  // Display
  placeholder?: string;
  separator?: string | RegExp;
  caseSensitive?: boolean;
  
  // Styling
  tagVariant?: 'default' | 'outline' | 'solid';
  size?: 'sm' | 'md' | 'lg';
  
  className?: string;
}

export const TagInput = forwardRef<HTMLInputElement, TagInputProps>(({
  name,
  control,
  label,
  help,
  tooltip,
  required,
  optional,
  error,
  suggestions = [],
  allowCustom = true,
  maxTags,
  validateTag,
  duplicateMessage = 'Tag already exists',
  placeholder = 'Type and press Enter to add tags',
  separator = /[,\n]/,
  caseSensitive = false,
  tagVariant = 'default',
  size = 'md',
  transformError,
  className,
  ...props
}, ref) => {
  const {
    field,
    error: fieldError,
    isLoading
  } = useFieldState(name, control);

  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const displayError = error || fieldError;
  const tags = Array.isArray(field.value) ? field.value : [];

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(suggestion => {
    const matchesInput = caseSensitive 
      ? suggestion.includes(inputValue)
      : suggestion.toLowerCase().includes(inputValue.toLowerCase());
    
    const notAlreadySelected = !tags.some((tag: string) => 
      caseSensitive ? tag === suggestion : tag.toLowerCase() === suggestion.toLowerCase()
    );
    
    return matchesInput && notAlreadySelected && inputValue.length > 0;
  });

  // Add tag
  const addTag = useCallback((tagValue: string) => {
    const trimmedTag = tagValue.trim();
    if (!trimmedTag) return;

    // Check for duplicates
    const isDuplicate = tags.some((tag: string) => 
      caseSensitive ? tag === trimmedTag : tag.toLowerCase() === trimmedTag.toLowerCase()
    );

    if (isDuplicate) {
      // Could show a toast or set a temporary error
      return;
    }

    // Validate tag
    if (validateTag) {
      const validationError = validateTag(trimmedTag);
      if (validationError) {
        // Could show validation error
        return;
      }
    }

    // Check max tags limit
    if (maxTags && tags.length >= maxTags) {
      return;
    }

    // Add tag
    field.onChange([...tags, trimmedTag]);
    setInputValue('');
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  }, [tags, field, caseSensitive, validateTag, maxTags]);

  // Remove tag
  const removeTag = useCallback((index: number) => {
    const newTags = tags.filter((_: any, i: number) => i !== index);
    field.onChange(newTags);
  }, [tags, field]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSuggestions(value.length > 0 && filteredSuggestions.length > 0);
    setSelectedSuggestionIndex(-1);
  }, [filteredSuggestions.length]);

  // Handle key events
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && filteredSuggestions[selectedSuggestionIndex]) {
          addTag(filteredSuggestions[selectedSuggestionIndex]);
        } else if (inputValue.trim() && allowCustom) {
          addTag(inputValue);
        }
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
        
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
        
      case 'Backspace':
        if (!inputValue && tags.length > 0) {
          removeTag(tags.length - 1);
        }
        break;
    }
  }, [inputValue, selectedSuggestionIndex, filteredSuggestions, addTag, allowCustom, tags, removeTag]);

  // Tag styling
  const tagVariantClasses = {
    default: 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20',
    outline: 'bg-transparent text-[var(--ordira-accent)] border border-[var(--border)]',
    solid: 'bg-[var(--primary)] text-white border border-[var(--primary)]'
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
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
      <div className="relative">
        <div className={cn(
          'flex flex-wrap gap-2 p-3 border rounded-xl bg-white transition-all duration-200',
          'focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20',
          displayError ? 'border-[var(--error)]' : 'border-[var(--border)]',
          isLoading && 'opacity-50'
        )}>
          {/* Existing Tags */}
          {tags.map((tag: string, index: number) => (
            <span
              key={index}
              className={cn(
                'inline-flex items-center gap-1 rounded-full font-satoshi-medium',
                tagVariantClasses[tagVariant],
                sizeClasses[size]
              )}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                disabled={isLoading}
                className="ml-1 hover:text-[var(--error)] transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          
          {/* Input */}
          <input
            ref={ref}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(inputValue.length > 0 && filteredSuggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={tags.length === 0 ? placeholder : ''}
            disabled={isLoading || (maxTags ? tags.length >= maxTags : false)}
            className="flex-1 min-w-[120px] outline-none bg-transparent font-satoshi"
          />
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--border)] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm font-satoshi transition-colors',
                  'hover:bg-[var(--background-secondary)]',
                  index === selectedSuggestionIndex && 'bg-[var(--primary)]/10'
                )}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Tag count info */}
      {maxTags && (
        <div className="flex justify-end mt-1">
          <span className={`text-xs font-satoshi ${
            tags.length >= maxTags * 0.9 
              ? 'text-[var(--warning)]' 
              : 'text-[var(--caption-color)]'
          }`}>
            {tags.length}/{maxTags} tags
          </span>
        </div>
      )}
    </FieldWrapper>
  );
});

TagInput.displayName = 'TagInput';