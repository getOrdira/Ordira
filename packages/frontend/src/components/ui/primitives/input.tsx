// src/components/ui/primitives/input.tsx
'use client';

import React, { useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const inputVariants = cva(
  // Base styles
  "flex w-full rounded-xl border bg-white px-4 py-3 font-satoshi transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--input-placeholder)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // Default input style with Ordira accent
        default: [
          "border-[var(--input-border)] text-[var(--foreground)]",
          "focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20",
          "hover:border-[var(--primary)]/60"
        ].join(" "),
        
        // Error state with red border
        error: [
          "border-[var(--error)] ring-2 ring-[var(--error)]/20 text-[var(--foreground)]",
          "focus:border-[var(--error)] focus:ring-[var(--error)]/30"
        ].join(" "),
        
        // Success state with green border
        success: [
          "border-[var(--success)] ring-2 ring-[var(--success)]/20 text-[var(--foreground)]",
          "focus:border-[var(--success)] focus:ring-[var(--success)]/30"
        ].join(" "),
        
        // Ghost variant with minimal styling
        ghost: [
          "border-transparent bg-[var(--background-secondary)] text-[var(--foreground)]",
          "focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20",
          "hover:bg-[var(--background-tertiary)]"
        ].join(" "),
        
        // Filled variant
        filled: [
          "border-transparent bg-[var(--background-secondary)] text-[var(--foreground)]",
          "focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20",
          "hover:bg-[var(--background-tertiary)]"
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

const labelVariants = cva(
  "font-satoshi-medium block mb-2",
  {
    variants: {
      size: {
        sm: "text-sm",
        md: "text-sm", 
        lg: "text-base"
      },
      required: {
        true: "after:content-['*'] after:text-[var(--error)] after:ml-1",
        false: ""
      }
    },
    defaultVariants: {
      size: "md",
      required: false
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
  onRightIconClick?: () => void;
  inputSize?: 'sm' | 'md' | 'lg';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant, 
    size,
    inputSize,
    type,
    leftIcon,
    rightIcon,
    error,
    success,
    label,
    helper,
    required,
    onIconClick,
    onRightIconClick,
    ...props 
  }, ref) => {
    const actualSize = inputSize || size;
    // Determine variant based on error/success state
    const currentVariant = error ? 'error' : success ? 'success' : variant;
    
    const inputElement = (
      <div className="relative w-full">
        {/* Left Icon */}
        {leftIcon && (
          <div 
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 text-[var(--input-placeholder)]",
              onIconClick && "cursor-pointer hover:text-[var(--primary)] transition-colors"
            )}
            onClick={onIconClick}
          >
            <div className="w-5 h-5">
              {leftIcon}
            </div>
          </div>
        )}
        
        {/* Input Field */}
        <input
          type={type}
          className={cn(
            inputVariants({ variant: currentVariant, size: actualSize, className }),
            leftIcon && "pl-12",
            rightIcon && "pr-12"
          )}
          ref={ref}
          required={required}
          {...props}
        />
        
        {/* Right Icon */}
        {rightIcon && (
          <div 
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 text-[var(--input-placeholder)]",
              (onRightIconClick || onIconClick) && "cursor-pointer hover:text-[var(--primary)] transition-colors"
            )}
            onClick={onRightIconClick || onIconClick}
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
          <label className={cn(
            labelVariants({ size: actualSize, required }),
            "text-[var(--heading-color)]"
          )}>
            {label}
          </label>
        )}
        
        {/* Input */}
        {inputElement}
        
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
        leftIcon={
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M8 7a3 3 0 016 0v1h1a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2h1V7zm6 2V7a1 1 0 00-2 0v2h2z" clipRule="evenodd" />
          </svg>
        }
        rightIcon={isPasswordVisible ? <EyeSlashIcon /> : <EyeIcon />}
        onRightIconClick={handleToggle}
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
  ({ onSearch, onClear, showClearButton = true, value, placeholder = "Search anything...", ...props }, ref) => {
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
        placeholder={placeholder}
        leftIcon={
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
        }
        rightIcon={showClearButton && currentValue ? (
          <svg 
            viewBox="0 0 20 20" 
            fill="currentColor" 
            className="w-5 h-5"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        ) : undefined}
        onRightIconClick={showClearButton && currentValue ? handleClear : undefined}
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

// Phone Input Component
export interface PhoneInputProps extends Omit<InputProps, 'type' | 'leftIcon'> {
  countryCode?: string;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ countryCode = "+1", ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="tel"
        leftIcon={
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z" clipRule="evenodd" />
          </svg>
        }
        {...props}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";

// URL Input Component
export interface URLInputProps extends Omit<InputProps, 'type' | 'leftIcon'> {}

const URLInput = React.forwardRef<HTMLInputElement, URLInputProps>(
  (props, ref) => {
    return (
      <Input
        ref={ref}
        type="url"
        leftIcon={
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
            <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
          </svg>
        }
        {...props}
      />
    );
  }
);

URLInput.displayName = "URLInput";

// Textarea Component
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof inputVariants> {
  error?: string;
  success?: string;
  label?: string;
  helper?: string;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  inputSize?: 'sm' | 'md' | 'lg';
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    variant, 
    size,
    inputSize,
    error, 
    success, 
    label, 
    helper, 
    required,
    resize = 'vertical',
    ...props 
  }, ref) => {
    const actualSize = inputSize || size;
    const currentVariant = error ? 'error' : success ? 'success' : variant;
    
    const textareaElement = (
      <textarea
        className={cn(
          inputVariants({ variant: currentVariant, size: actualSize, className }),
          "min-h-[120px] py-3",
          resize === 'none' && 'resize-none',
          resize === 'vertical' && 'resize-y',
          resize === 'horizontal' && 'resize-x',
          resize === 'both' && 'resize'
        )}
        ref={ref}
        required={required}
        {...props}
      />
    );

    if (!label && !error && !success && !helper) {
      return textareaElement;
    }

    return (
      <div className="space-y-2">
        {label && (
          <label className={cn(
            labelVariants({ size: actualSize, required }),
            "text-[var(--heading-color)]"
          )}>
            {label}
          </label>
        )}
        
        {textareaElement}
        
        {error && (
          <p className="text-sm text-[var(--error)] flex items-center gap-1 font-satoshi">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {success && (
          <p className="text-sm text-[var(--success)] flex items-center gap-1 font-satoshi">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.07a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            {success}
          </p>
        )}
        
        {helper && !error && !success && (
          <p className="text-sm text-[var(--caption-color)] font-satoshi">
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

// Input Group for multiple related inputs
export interface InputGroupProps {
  children: React.ReactNode;
  label?: string;
  description?: string;
  error?: string;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ children, label, description, error, className, orientation = 'vertical' }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-3", className)}>
        {(label || description) && (
          <div className="space-y-1">
            {label && (
              <label className="text-sm font-satoshi-medium text-[var(--heading-color)]">
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-[var(--caption-color)] font-satoshi">
                {description}
              </p>
            )}
          </div>
        )}
        
        <div className={cn(
          orientation === 'vertical' ? "space-y-3" : "flex gap-3"
        )}>
          {children}
        </div>
        
        {error && (
          <p className="text-sm text-[var(--error)] flex items-center gap-1 font-satoshi">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

InputGroup.displayName = "InputGroup";

export { 
  Input, 
  PasswordInput, 
  SearchInput, 
  EmailInput, 
  PhoneInput,
  URLInput,
  Textarea,
  InputGroup,
  inputVariants 
};