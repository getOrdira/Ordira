// src/components/ui/primitives/input.tsx
'use client';

import React, { useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const inputVariants = cva(
  // Base styles
  "flex w-full rounded-xl border bg-white px-4 py-3 text-base transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--muted)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // Default input style
        default: [
          "border-gray-200",
          "focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20",
          "hover:border-gray-300"
        ].join(" "),
        
        // Error state with red border
        error: [
          "border-[var(--error)] ring-2 ring-[var(--error)]/20",
          "focus:border-[var(--error)] focus:ring-[var(--error)]/30"
        ].join(" "),
        
        // Success state with green border
        success: [
          "border-[var(--success)] ring-2 ring-[var(--success)]/20",
          "focus:border-[var(--success)] focus:ring-[var(--success)]/30"
        ].join(" "),
        
        // Ghost variant with minimal styling
        ghost: [
          "border-transparent bg-gray-50",
          "focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/20",
          "hover:bg-gray-100"
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

const inputGroupVariants = cva(
  "relative flex w-full",
  {
    variants: {
      hasLeftIcon: {
        true: "",
        false: ""
      },
      hasRightIcon: {
        true: "",
        false: ""
      }
    }
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  success?: string;
  label?: string;
  helper?: string;
  onIconClick?: () => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant, 
    size, 
    type,
    leftIcon,
    rightIcon,
    error,
    success,
    label,
    helper,
    onIconClick,
    ...props 
  }, ref) => {
    // Determine variant based on error/success state
    const currentVariant = error ? 'error' : success ? 'success' : variant;
    
    const inputElement = (
      <div className="relative w-full">
        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none">
            <div className="w-5 h-5">
              {leftIcon}
            </div>
          </div>
        )}
        
        {/* Input Field */}
        <input
          type={type}
          className={cn(
            inputVariants({ variant: currentVariant, size, className }),
            leftIcon && "pl-12",
            rightIcon && "pr-12"
          )}
          ref={ref}
          {...props}
        />
        
        {/* Right Icon */}
        {rightIcon && (
          <div 
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)]",
              onIconClick ? "cursor-pointer hover:text-[var(--accent)] transition-colors" : "pointer-events-none"
            )}
            onClick={onIconClick}
          >
            <div className="w-5 h-5">
              {rightIcon}
            </div>
          </div>
        )}
      </div>
    );

    // If no label, error, success, or helper text, return just the input
    if (!label && !error && !success && !helper) {
      return inputElement;
    }

    return (
      <div className="space-y-2">
        {/* Label */}
        {label && (
          <label className="text-sm font-medium text-[var(--dark)] block">
            {label}
          </label>
        )}
        
        {/* Input */}
        {inputElement}
        
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
        
        {/* Helper Text */}
        {helper && !error && !success && (
          <p className="text-sm text-[var(--muted)]">
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

// Password Input Component with toggle visibility
export interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {
  showPassword?: boolean;
  onTogglePassword?: (show: boolean) => void;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showPassword, onTogglePassword, ...props }, ref) => {
    const [internalShowPassword, setInternalShowPassword] = useState(false);
    
    const isPasswordVisible = showPassword ?? internalShowPassword;
    const togglePassword = onTogglePassword ?? setInternalShowPassword;
    
    const handleToggle = () => {
      togglePassword(!isPasswordVisible);
    };

    return (
      <Input
        ref={ref}
        type={isPasswordVisible ? "text" : "password"}
        rightIcon={isPasswordVisible ? <EyeSlashIcon /> : <EyeIcon />}
        onIconClick={handleToggle}
        {...props}
      />
    );
  }
);

PasswordInput.displayName = "PasswordInput";

// Search Input Component
export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  onSearch?: (value: string) => void;
  onClear?: () => void;
  showClearButton?: boolean;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, onClear, showClearButton = true, value, ...props }, ref) => {
    const [internalValue, setInternalValue] = useState('');
    const currentValue = value ?? internalValue;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInternalValue(newValue);
      onSearch?.(newValue);
      props.onChange?.(e);
    };
    
    const handleClear = () => {
      setInternalValue('');
      onClear?.();
      onSearch?.('');
    };

    return (
      <Input
        ref={ref}
        type="search"
        value={currentValue}
        onChange={handleChange}
        leftIcon={
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
        }
        rightIcon={showClearButton && currentValue ? (
          <svg 
            viewBox="0 0 20 20" 
            fill="currentColor" 
            className="w-5 h-5 cursor-pointer hover:text-[var(--error)] transition-colors"
            onClick={handleClear}
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        ) : undefined}
        {...props}
      />
    );
  }
);

SearchInput.displayName = "SearchInput";

// Email Input Component with validation
export interface EmailInputProps extends Omit<InputProps, 'type' | 'leftIcon'> {
  validateEmail?: boolean;
}

const EmailInput = React.forwardRef<HTMLInputElement, EmailInputProps>(
  ({ validateEmail = true, value, error, ...props }, ref) => {
    const [internalError, setInternalError] = useState<string>('');
    
    const validateEmailFormat = (email: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (validateEmail && e.target.value) {
        if (!validateEmailFormat(e.target.value)) {
          setInternalError('Please enter a valid email address');
        } else {
          setInternalError('');
        }
      }
      props.onBlur?.(e);
    };

    return (
      <Input
        ref={ref}
        type="email"
        value={value}
        error={error || internalError}
        onBlur={handleBlur}
        leftIcon={
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
            <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
          </svg>
        }
        {...props}
      />
    );
  }
);

EmailInput.displayName = "EmailInput";

// Textarea Component
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof inputVariants> {
  error?: string;
  success?: string;
  label?: string;
  helper?: string;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    variant, 
    error, 
    success, 
    label, 
    helper, 
    resize = 'vertical',
    ...props 
  }, ref) => {
    const currentVariant = error ? 'error' : success ? 'success' : variant;
    
    const textareaElement = (
      <textarea
        className={cn(
          inputVariants({ variant: currentVariant, className }),
          "min-h-[120px] py-3",
          resize === 'none' && 'resize-none',
          resize === 'vertical' && 'resize-y',
          resize === 'horizontal' && 'resize-x',
          resize === 'both' && 'resize'
        )}
        ref={ref}
        {...props}
      />
    );

    if (!label && !error && !success && !helper) {
      return textareaElement;
    }

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-[var(--dark)] block">
            {label}
          </label>
        )}
        
        {textareaElement}
        
        {error && (
          <p className="text-sm text-[var(--error)] flex items-center gap-1">
            <span className="w-4 h-4">⚠</span>
            {error}
          </p>
        )}
        
        {success && (
          <p className="text-sm text-[var(--success)] flex items-center gap-1">
            <span className="w-4 h-4">✓</span>
            {success}
          </p>
        )}
        
        {helper && !error && !success && (
          <p className="text-sm text-[var(--muted)]">
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { 
  Input, 
  PasswordInput, 
  SearchInput, 
  EmailInput, 
  Textarea, 
  inputVariants 
};