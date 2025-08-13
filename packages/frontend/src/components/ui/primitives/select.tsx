// src/components/ui/primitives/select.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, MagnifyingGlassIcon, CheckIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Button } from './button';

const selectVariants = cva(
  // Base trigger styles
  "flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-base transition-all duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: [
          "border-gray-200 text-[var(--dark)]",
          "hover:border-gray-300",
          "focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
        ].join(" "),
        error: [
          "border-[var(--error)] ring-2 ring-[var(--error)]/20",
          "focus:border-[var(--error)] focus:ring-[var(--error)]/30"
        ].join(" "),
        success: [
          "border-[var(--success)] ring-2 ring-[var(--success)]/20",
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
  maxSelections?: number;
  onValueChange?: (value: string | string[]) => void;
  onCreateOption?: (value: string) => void;
  onSearch?: (query: string) => void;
  className?: string;
  id?: string;
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({
    options,
    value,
    defaultValue,
    placeholder = "Select an option...",
    multiple = false,
    searchable = true,
    creatable = false,
    clearable = false,
    disabled = false,
    error,
    success,
    label,
    description,
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
    
    const handleClear = () => {
      const newValue = multiple ? [] : '';
      setPendingValue(newValue);
      setInternalValue(newValue);
      onValueChange?.(newValue);
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
          {...props}
        >
          <span className={cn(
            "truncate text-left",
            (!currentValue || (Array.isArray(currentValue) && currentValue.length === 0)) && "text-[var(--muted)]"
          )}>
            {getDisplayText()}
          </span>
          
          <div className="flex items-center space-x-2">
            {clearable && currentValue && (Array.isArray(currentValue) ? currentValue.length > 0 : currentValue) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="text-[var(--muted)] hover:text-[var(--error)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <ChevronDownIcon className={cn(
              "w-4 h-4 text-[var(--muted)] transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </div>
        </button>
        
        {/* Dropdown Panel */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-2">
            {/* Search Input */}
            {searchable && (
              <div className="px-3 pb-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:outline-none"
                  />
                </div>
              </div>
            )}
            
            {/* Options List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleOptionSelect(option.value)}
                  disabled={option.disabled}
                  className={cn(
                    "w-full flex items-center space-x-3 px-4 py-2 text-left text-sm transition-colors",
                    "hover:bg-gray-50",
                    isOptionSelected(option.value) && "bg-[var(--accent)]/10 text-[var(--accent)]",
                    option.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {/* Checkbox for multiple selection */}
                  {multiple && (
                    <div className={cn(
                      "w-4 h-4 border-2 rounded flex items-center justify-center",
                      isOptionSelected(option.value)
                        ? "border-[var(--accent)] bg-[var(--accent)]"
                        : "border-gray-300"
                    )}>
                      {isOptionSelected(option.value) && (
                        <CheckIcon className="w-3 h-3 text-white stroke-[3]" />
                      )}
                    </div>
                  )}
                  
                  {/* Option Icon */}
                  {option.icon && (
                    <div className="w-4 h-4 text-[var(--muted)]">
                      {option.icon}
                    </div>
                  )}
                  
                  {/* Option Content */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-[var(--muted)] truncate">
                        {option.description}
                      </div>
                    )}
                  </div>
                  
                  {/* Selection indicator for single select */}
                  {!multiple && isOptionSelected(option.value) && (
                    <CheckIcon className="w-4 h-4 text-[var(--accent)] stroke-[3]" />
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
                  className="w-full flex items-center space-x-3 px-4 py-2 text-left text-sm text-[var(--accent)] hover:bg-gray-50 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Create new</span>
                </button>
              )}
              
              {/* No results */}
              {filteredOptions.length === 0 && !creatable && (
                <div className="px-4 py-6 text-center text-sm text-[var(--muted)]">
                  No options found
                </div>
              )}
            </div>
            
            {/* Action Buttons - Only show for multiple selection */}
            {multiple && (
              <div className="flex items-center justify-between px-3 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-sm text-[var(--muted)] hover:text-[var(--dark)] transition-colors"
                >
                  Clear All
                </button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  className="min-w-[60px]"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
    
    // If no label, error, success, or description, return just the select
    if (!label && !error && !success && !description) {
      return selectElement;
    }
    
    return (
      <div className="space-y-2">
        {/* Label */}
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-[var(--dark)] block">
            {label}
          </label>
        )}
        
        {/* Description */}
        {description && (
          <p className="text-sm text-[var(--muted)]">
            {description}
          </p>
        )}
        
        {/* Select */}
        {selectElement}
        
        {/* Error Message */}
        {error && (
          <p className="text-sm text-[var(--error)] flex items-center gap-1">
            <span className="w-4 h-4">⚠</span>
            {error}
          </p>
        )}
        
        {/* Success Message */}
        {success && (
          <p className="text-sm text-[var(--success)] flex items-center gap-1">
            <span className="w-4 h-4">✓</span>
            {success}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select, selectVariants };