// src/components/ui/primitives/select.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, MagnifyingGlassIcon, CheckIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Button } from './button';

const selectVariants = cva(
  // Base trigger styles
  "flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 font-satoshi transition-all duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: [
          "border-[var(--input-border)] text-[var(--foreground)]",
          "hover:border-[var(--primary)]/60",
          "focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        ].join(" "),
        error: [
          "border-[var(--error)] ring-2 ring-[var(--error)]/20 text-[var(--foreground)]",
          "focus:border-[var(--error)] focus:ring-[var(--error)]/30"
        ].join(" "),
        success: [
          "border-[var(--success)] ring-2 ring-[var(--success)]/20 text-[var(--foreground)]",
          "focus:border-[var(--success)] focus:ring-[var(--success)]/30"
        ].join(" ")
      },
      size: {
        sm: "h-10 px-3 py-2 text-sm",
        md: "h-12 px-4 py-3 text-base",
        lg: "h-14 px-5 py-4 text-lg"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

const dropdownVariants = cva(
  // Dropdown panel styles
  "absolute top-full left-0 right-0 mt-2 bg-white border border-[var(--border)] rounded-xl shadow-lg z-50 py-3",
  {
    variants: {
      size: {
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg"
      }
    },
    defaultVariants: {
      size: "md"
    }
  }
);

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
  icon?: React.ReactNode;
}

export interface SelectProps extends VariantProps<typeof selectVariants> {
  options: SelectOption[];
  value?: string | string[];
  defaultValue?: string | string[];
  placeholder?: string;
  multiple?: boolean;
  searchable?: boolean;
  creatable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  error?: string;
  success?: string;
  label?: string;
  description?: string;
  helper?: string;
  maxSelections?: number;
  onValueChange?: (value: string | string[]) => void;
  onCreateOption?: (value: string) => void;
  onSearch?: (query: string) => void;
  className?: string;
  id?: string;
  required?: boolean;
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({
    options,
    value,
    defaultValue,
    placeholder = "Choose a job title or create a new one",
    multiple = false,
    searchable = true,
    creatable = false,
    clearable = false,
    disabled = false,
    error,
    success,
    label,
    description,
    helper,
    required,
    maxSelections,
    onValueChange,
    onCreateOption,
    onSearch,
    variant,
    size,
    className,
    id,
    ...props
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [internalValue, setInternalValue] = useState<string | string[]>(
      defaultValue || (multiple ? [] : '')
    );
    const [pendingValue, setPendingValue] = useState<string | string[]>(
      value || internalValue
    );
    
    const selectRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    
    const currentValue = value !== undefined ? value : internalValue;
    const currentVariant = error ? 'error' : success ? 'success' : variant;
    
    // Filter options based on search
    const filteredOptions = options.filter(option =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      option.value.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Handle clicking outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
          setPendingValue(currentValue); // Reset pending changes
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [currentValue]);
    
    // Focus search input when dropdown opens
    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen, searchable]);
    
    const handleToggle = () => {
      if (!disabled) {
        setIsOpen(!isOpen);
        if (!isOpen) {
          setPendingValue(currentValue);
        }
      }
    };
    
    const handleOptionSelect = (optionValue: string) => {
      if (multiple) {
        const currentArray = Array.isArray(pendingValue) ? pendingValue : [];
        const newValue = currentArray.includes(optionValue)
          ? currentArray.filter(v => v !== optionValue)
          : maxSelections && currentArray.length >= maxSelections
            ? currentArray
            : [...currentArray, optionValue];
        setPendingValue(newValue);
      } else {
        setPendingValue(optionValue);
        if (!multiple) {
          // Auto-apply for single selection
          setInternalValue(optionValue);
          onValueChange?.(optionValue);
          setIsOpen(false);
          setSearchQuery('');
        }
      }
    };
    
    const handleApply = () => {
      setInternalValue(pendingValue);
      onValueChange?.(pendingValue);
      setIsOpen(false);
      setSearchQuery('');
    };
    
    const handleClearAll = () => {
      const newValue = multiple ? [] : '';
      setPendingValue(newValue);
    };
    
    const handleCreateNew = () => {
      if (searchQuery.trim() && onCreateOption) {
        onCreateOption(searchQuery.trim());
        setSearchQuery('');
      }
    };
    
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      onSearch?.(query);
    };
    
    // Get display text for selected values
    const getDisplayText = () => {
      if (multiple && Array.isArray(currentValue)) {
        if (currentValue.length === 0) return placeholder;
        const selectedOptions = options.filter(opt => currentValue.includes(opt.value));
        if (selectedOptions.length === 1) return selectedOptions[0].label;
        return `${selectedOptions.length} selected`;
      } else {
        const selectedOption = options.find(opt => opt.value === currentValue);
        return selectedOption ? selectedOption.label : placeholder;
      }
    };
    
    const isOptionSelected = (optionValue: string) => {
      if (multiple && Array.isArray(pendingValue)) {
        return pendingValue.includes(optionValue);
      }
      return pendingValue === optionValue;
    };
    
    const getPendingCount = () => {
      if (multiple && Array.isArray(pendingValue)) {
        return pendingValue.length;
      }
      return pendingValue ? 1 : 0;
    };
    
    const selectElement = (
      <div ref={selectRef} className="relative w-full">
        {/* Trigger Button */}
        <button
          ref={ref}
          type="button"
          id={selectId}
          className={cn(selectVariants({ variant: currentVariant, size, className }))}
          onClick={handleToggle}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-required={required}
          {...props}
        >
          <span className={cn(
            "truncate text-left font-satoshi",
            (!currentValue || (Array.isArray(currentValue) && currentValue.length === 0)) && "text-[var(--input-placeholder)]"
          )}>
            {getDisplayText()}
          </span>
          
          <div className="flex items-center space-x-2">
            {clearable && currentValue && (Array.isArray(currentValue) ? currentValue.length > 0 : currentValue) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const newValue = multiple ? [] : '';
                  setInternalValue(newValue);
                  setPendingValue(newValue);
                  onValueChange?.(newValue);
                }}
                className="text-[var(--input-placeholder)] hover:text-[var(--error)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <ChevronDownIcon className={cn(
              "w-4 h-4 text-[var(--input-placeholder)] transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </div>
        </button>
        
        {/* Dropdown Panel */}
        {isOpen && (
          <div className={cn(dropdownVariants({ size }))}>
            {/* Search Input */}
            {searchable && (
              <div className="px-4 pb-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--input-placeholder)]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-[var(--input-border)] rounded-lg focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 focus:outline-none font-satoshi"
                  />
                </div>
              </div>
            )}
            
            {/* Options List */}
            <div className="max-h-64 overflow-y-auto">
              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleOptionSelect(option.value)}
                  disabled={option.disabled}
                  className={cn(
                    "w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors",
                    "hover:bg-[var(--background-secondary)]",
                    isOptionSelected(option.value) && "bg-[var(--primary)]/5",
                    option.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {/* Checkbox for multiple selection */}
                  {multiple && (
                    <div className={cn(
                      "w-4 h-4 border-2 rounded flex items-center justify-center transition-colors",
                      isOptionSelected(option.value)
                        ? "border-[var(--primary)] bg-[var(--primary)]"
                        : "border-gray-300"
                    )}>
                      {isOptionSelected(option.value) && (
                        <CheckIcon className="w-3 h-3 text-white stroke-[3]" />
                      )}
                    </div>
                  )}
                  
                  {/* Option Icon */}
                  {option.icon && (
                    <div className="w-4 h-4 text-[var(--input-placeholder)]">
                      {option.icon}
                    </div>
                  )}
                  
                  {/* Option Content */}
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-satoshi-medium truncate",
                      isOptionSelected(option.value) ? "text-[var(--primary)]" : "text-[var(--heading-color)]"
                    )}>
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-xs text-[var(--caption-color)] truncate font-satoshi">
                        {option.description}
                      </div>
                    )}
                  </div>
                  
                  {/* Selection indicator for single select */}
                  {!multiple && isOptionSelected(option.value) && (
                    <CheckIcon className="w-4 h-4 text-[var(--primary)] stroke-[3]" />
                  )}
                </button>
              ))}
              
              {/* Create New Option */}
              {creatable && searchQuery && !filteredOptions.some(opt => 
                opt.label.toLowerCase() === searchQuery.toLowerCase()
              ) && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-left text-[var(--primary)] hover:bg-[var(--background-secondary)] transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span className="font-satoshi-medium">Create new</span>
                </button>
              )}
              
              {/* No results */}
              {filteredOptions.length === 0 && !creatable && (
                <div className="px-4 py-8 text-center text-sm text-[var(--caption-color)] font-satoshi">
                  No options found
                </div>
              )}
            </div>
            
            {/* Action Buttons - Only show for multiple selection */}
            {multiple && (
              <div className="flex items-center justify-between px-4 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-sm text-[var(--caption-color)] hover:text-[var(--heading-color)] transition-colors font-satoshi"
                >
                  Clear All
                </button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  className="min-w-[80px]"
                  variant="primary"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
    
    // If no label, error, success, helper, or description, return just the select
    if (!label && !error && !success && !description && !helper) {
      return selectElement;
    }
    
    return (
      <div className="space-y-2">
        {/* Label */}
        {label && (
          <label 
            htmlFor={selectId} 
            className={cn(
              "font-satoshi-medium block text-[var(--heading-color)]",
              size === 'sm' && "text-sm",
              size === 'md' && "text-sm", 
              size === 'lg' && "text-base",
              required && "after:content-['*'] after:text-[var(--error)] after:ml-1"
            )}
          >
            {label}
          </label>
        )}
        
        {/* Description */}
        {description && (
          <p className="text-sm text-[var(--caption-color)] font-satoshi">
            {description}
          </p>
        )}
        
        {/* Select */}
        {selectElement}
        
        {/* Error Message */}
        {error && (
          <p className="text-sm text-[var(--error)] flex items-center gap-1 font-satoshi">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {/* Success Message */}
        {success && (
          <p className="text-sm text-[var(--success)] flex items-center gap-1 font-satoshi">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.07a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            {success}
          </p>
        )}
        
        {/* Helper Text */}
        {helper && !error && !success && (
          <p className="text-sm text-[var(--caption-color)] font-satoshi">
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

// Multi-Select Component with enhanced features
export interface MultiSelectProps extends Omit<SelectProps, 'multiple'> {
  showSelectedCount?: boolean;
  collapseTags?: boolean;
  maxTagsToShow?: number;
}

const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
  ({ showSelectedCount = true, collapseTags = true, maxTagsToShow = 3, ...props }, ref) => {
    return (
      <Select
        ref={ref}
        multiple={true}
        {...props}
      />
    );
  }
);

MultiSelect.displayName = "MultiSelect";

// Async Select Component for dynamic options loading
export interface AsyncSelectProps extends SelectProps {
  loadOptions?: (query: string) => Promise<SelectOption[]>;
  isLoading?: boolean;
  loadingMessage?: string;
  noOptionsMessage?: string;
}

const AsyncSelect = React.forwardRef<HTMLButtonElement, AsyncSelectProps>(
  ({ 
    loadOptions, 
    isLoading = false, 
    loadingMessage = "Loading...",
    noOptionsMessage = "No options found",
    ...props 
  }, ref) => {
    const [asyncOptions, setAsyncOptions] = useState<SelectOption[]>(props.options || []);
    const [loading, setLoading] = useState(false);
    
    const handleSearch = async (query: string) => {
      if (loadOptions && query.length > 0) {
        setLoading(true);
        try {
          const newOptions = await loadOptions(query);
          setAsyncOptions(newOptions);
        } catch (error) {
          console.error('Error loading options:', error);
        } finally {
          setLoading(false);
        }
      }
      props.onSearch?.(query);
    };
    
    return (
      <Select
        ref={ref}
        {...props}
        options={asyncOptions}
        onSearch={handleSearch}
        searchable={true}
      />
    );
  }
);

AsyncSelect.displayName = "AsyncSelect";

export { Select, MultiSelect, AsyncSelect, selectVariants };