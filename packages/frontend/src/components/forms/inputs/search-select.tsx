// src/components/forms/inputs/search-select.tsx

import React, { forwardRef, useState, useCallback, useEffect, useRef } from 'react';
import { FieldWrapper, type FieldWrapperProps } from '../elements/field-wrapper';
import { useFieldState, type BaseFieldProps } from '../adapters/rhf/field';
import { cn } from '@/lib/utils';

export interface SearchSelectOption {
  label: string;
  value: any;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  group?: string;
}

export interface SearchSelectProps
  extends Omit<FieldWrapperProps, 'children'>,
    BaseFieldProps {
  // Options
  options?: SearchSelectOption[];
  loadOptions?: (query: string) => Promise<SearchSelectOption[]>;
  
  // Search behavior
  searchable?: boolean;
  searchPlaceholder?: string;
  minSearchLength?: number;
  searchDelay?: number;
  
  // Selection
  multiple?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  
  // Display
  showSearch?: boolean;
  showSelected?: boolean;
  maxDisplayedOptions?: number;
  
  // Loading states
  isLoading?: boolean;
  loadingMessage?: string;
  noOptionsMessage?: string;
  
  className?: string;
}

export const SearchSelect = forwardRef<HTMLInputElement, SearchSelectProps>(({
  name,
  control,
  label,
  help,
  tooltip,
  required,
  optional,
  error,
  options = [],
  loadOptions,
  searchable = true,
  searchPlaceholder = 'Search...',
  minSearchLength = 1,
  searchDelay = 300,
  multiple = false,
  placeholder = 'Select option',
  allowClear = true,
  showSearch = true,
  showSelected = true,
  maxDisplayedOptions = 100,
  isLoading: externalLoading = false,
  loadingMessage = 'Loading...',
  noOptionsMessage = 'No options found',
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<SearchSelectOption[]>(options);
  const [dynamicOptions, setDynamicOptions] = useState<SearchSelectOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const displayError = error || fieldError;
  const selectedValues = multiple 
    ? (Array.isArray(field.value) ? field.value : [])
    : (field.value !== null && field.value !== undefined ? [field.value] : []);

  // Close dropdown when clicking outside
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

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current && showSearch) {
      searchInputRef.current.focus();
    }
  }, [isOpen, showSearch]);

  // Load dynamic options
  const loadDynamicOptions = useCallback(async (query: string) => {
    if (!loadOptions || query.length < minSearchLength) return;

    setIsLoadingOptions(true);
    try {
      const results = await loadOptions(query);
      setDynamicOptions(results);
    } catch (error) {
      console.error('Failed to load options:', error);
      setDynamicOptions([]);
    } finally {
      setIsLoadingOptions(false);
    }
  }, [loadOptions, minSearchLength]);

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (loadOptions) {
        loadDynamicOptions(searchQuery);
      } else {
        // Filter static options
        const filtered = options.filter(option =>
          option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          option.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredOptions(filtered.slice(0, maxDisplayedOptions));
      }
    }, searchDelay);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, options, loadOptions, loadDynamicOptions, searchDelay, maxDisplayedOptions]);

  // Get current options to display
  const currentOptions = loadOptions ? dynamicOptions : filteredOptions;
  const displayOptions = currentOptions.slice(0, maxDisplayedOptions);

  // Handle option selection
  const handleOptionSelect = useCallback((option: SearchSelectOption) => {
    if (option.disabled) return;

    if (multiple) {
      const isSelected = selectedValues.some(val => val === option.value);
      const newValue = isSelected
        ? selectedValues.filter(val => val !== option.value)
        : [...selectedValues, option.value];
      field.onChange(newValue);
    } else {
      field.onChange(option.value);
      setIsOpen(false);
    }
    
    setSearchQuery('');
    setSelectedIndex(-1);
  }, [multiple, selectedValues, field]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < displayOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && displayOptions[selectedIndex]) {
          handleOptionSelect(displayOptions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }, [displayOptions, selectedIndex, handleOptionSelect]);

  // Get selected option labels for display
  const getSelectedLabels = () => {
    return selectedValues.map(value => {
      const option = [...options, ...dynamicOptions].find(opt => opt.value === value);
      return option?.label || String(value);
    });
  };

  const selectedLabels = getSelectedLabels();

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
        {/* Select Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={isLoading || externalLoading}
          className={cn(
            'flex items-center justify-between w-full p-3 border rounded-xl bg-[var(--background)] transition-all duration-200',
            'hover:border-[var(--primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20',
            displayError ? 'border-[var(--error)]' : 'border-[var(--border)]',
            (isLoading || externalLoading) && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="flex-1 min-w-0 text-left">
            {selectedLabels.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {multiple ? (
                  selectedLabels.map((label, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 text-xs bg-[var(--primary)]/10 text-[var(--primary)] rounded-full font-satoshi-medium"
                    >
                      {label}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newValue = selectedValues.filter((_, i) => i !== index);
                          field.onChange(newValue);
                        }}
                        className="ml-1 hover:text-[var(--error)]"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="font-satoshi text-[var(--foreground)]">
                    {selectedLabels[0]}
                  </span>
                )}
              </div>
            ) : (
              <span className="font-satoshi text-[var(--input-placeholder)]">
                {placeholder}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {allowClear && selectedValues.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  field.onChange(multiple ? [] : null);
                }}
                className="p-1 text-[var(--muted)] hover:text-[var(--error)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            <svg className={cn(
              'w-4 h-4 text-[var(--muted)] transition-transform duration-200',
              isOpen && 'rotate-180'
            )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-lg z-50 max-h-64 overflow-hidden">
            {/* Search Input */}
            {showSearch && searchable && (
              <div className="p-3 border-b border-[var(--border)]">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 font-satoshi"
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="max-h-48 overflow-y-auto">
              {isLoadingOptions || externalLoading ? (
                <div className="p-4 text-center text-sm text-[var(--muted)] font-satoshi">
                  {loadingMessage}
                </div>
              ) : displayOptions.length === 0 ? (
                <div className="p-4 text-center text-sm text-[var(--muted)] font-satoshi">
                  {noOptionsMessage}
                </div>
              ) : (
                displayOptions.map((option, index) => {
                  const isSelected = selectedValues.includes(option.value);
                  const isHighlighted = index === selectedIndex;

                  return (
                    <button
                      key={`${option.value}-${index}`}
                      type="button"
                      onClick={() => handleOptionSelect(option)}
                      disabled={option.disabled}
                      className={cn(
                        'w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors',
                        'hover:bg-[var(--background-secondary)]',
                        isSelected && 'bg-[var(--primary)]/5',
                        isHighlighted && 'bg-[var(--primary)]/10',
                        option.disabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {option.icon && (
                        <div className="flex-shrink-0 w-5 h-5 text-[var(--muted)]">
                          {option.icon}
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            'text-sm font-satoshi-medium truncate',
                            isSelected ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'
                          )}>
                            {option.label}
                          </span>
                          
                          {isSelected && (
                            <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        
                        {option.description && (
                          <p className="text-xs text-[var(--caption-color)] font-satoshi mt-1 truncate">
                            {option.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Hidden input for form compatibility */}
        <input
          ref={ref}
          type="hidden"
          name={field.name}
          value={multiple ? JSON.stringify(field.value || []) : (field.value || '')}
        />
      </div>
    </FieldWrapper>
  );
});
