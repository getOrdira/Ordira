// src/components/ui/primitives/checkbox.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { CheckIcon } from '@heroicons/react/24/outline';

const checkboxVariants = cva(
  // Base styles
  "peer inline-flex items-center justify-center rounded-md border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        // Default green checkboxes (matching your image)
        default: [
          "border-[var(--success)] text-white",
          "data-[state=checked]:bg-[var(--success)] data-[state=checked]:border-[var(--success)]",
          "data-[state=unchecked]:bg-white data-[state=unchecked]:border-[var(--success)]",
          "hover:border-[var(--success-dark)] hover:data-[state=checked]:bg-[var(--success-dark)]",
          "focus-visible:ring-[var(--success)]",
          "disabled:border-[var(--success)]/40 disabled:bg-[var(--success)]/20",
          "disabled:data-[state=checked]:bg-[var(--success)]/40"
        ].join(" "),
        
        // Primary blue variant
        primary: [
          "border-[var(--accent)] text-white",
          "data-[state=checked]:bg-[var(--accent)] data-[state=checked]:border-[var(--accent)]",
          "data-[state=unchecked]:bg-white data-[state=unchecked]:border-[var(--accent)]",
          "hover:border-[var(--accent-dark)] hover:data-[state=checked]:bg-[var(--accent-dark)]",
          "focus-visible:ring-[var(--accent)]",
          "disabled:border-[var(--accent)]/40 disabled:bg-[var(--accent)]/20",
          "disabled:data-[state=checked]:bg-[var(--accent)]/40"
        ].join(" "),
        
        // Secondary/muted variant
        secondary: [
          "border-[var(--muted)] text-white",
          "data-[state=checked]:bg-[var(--muted)] data-[state=checked]:border-[var(--muted)]",
          "data-[state=unchecked]:bg-white data-[state=unchecked]:border-[var(--muted)]",
          "hover:border-[var(--dark)] hover:data-[state=checked]:bg-[var(--dark)]",
          "focus-visible:ring-[var(--muted)]",
          "disabled:border-[var(--muted)]/40 disabled:bg-[var(--muted)]/20",
          "disabled:data-[state=checked]:bg-[var(--muted)]/40"
        ].join(" ")
      },
      size: {
        sm: "h-4 w-4",
        md: "h-5 w-5", 
        lg: "h-6 w-6"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed select-none",
  {
    variants: {
      disabled: {
        true: "text-[var(--muted)] opacity-70",
        false: "text-[var(--dark)]"
      }
    },
    defaultVariants: {
      disabled: false
    }
  }
);

export interface CheckboxProps 
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof checkboxVariants> {
  label?: string;
  description?: string;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ 
    className, 
    variant, 
    size, 
    label,
    description,
    indeterminate = false,
    checked,
    disabled,
    onCheckedChange,
    onChange,
    id,
    ...props 
  }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = e.target.checked;
      onCheckedChange?.(isChecked);
      onChange?.(e);
    };

    // Determine the state for styling
    const state = indeterminate ? 'indeterminate' : checked ? 'checked' : 'unchecked';

    const checkboxElement = (
      <div className="relative">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          {...props}
        />
        <div
          className={cn(
            checkboxVariants({ variant, size, className })
          )}
          data-state={state}
          role="checkbox"
          aria-checked={indeterminate ? 'mixed' : checked}
          aria-disabled={disabled}
        >
          {/* Checkmark Icon */}
          {(checked || indeterminate) && (
            <div className="flex items-center justify-center">
              {indeterminate ? (
                // Indeterminate state (horizontal line)
                <div className="w-3 h-0.5 bg-current rounded-full" />
              ) : (
                // Checked state (checkmark)
                <CheckIcon className={cn(
                  "stroke-current stroke-[3]",
                  size === 'sm' && "w-3 h-3",
                  size === 'md' && "w-3.5 h-3.5", 
                  size === 'lg' && "w-4 h-4"
                )} />
              )}
            </div>
          )}
        </div>
      </div>
    );

    // If no label or description, return just the checkbox
    if (!label && !description) {
      return checkboxElement;
    }

    return (
      <div className="flex items-start space-x-3">
        {checkboxElement}
        
        {(label || description) && (
          <div className="flex flex-col space-y-1">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  labelVariants({ disabled }),
                  "cursor-pointer"
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className={cn(
                "text-xs leading-relaxed",
                disabled ? "text-[var(--muted)] opacity-70" : "text-[var(--muted)]"
              )}>
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

// Checkbox Group Component for multiple related checkboxes
export interface CheckboxGroupProps {
  label?: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroupProps>(
  ({ label, description, error, children, className, orientation = 'vertical' }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-3", className)}>
        {(label || description) && (
          <div className="space-y-1">
            {label && (
              <label className="text-sm font-medium text-[var(--dark)]">
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-[var(--muted)]">
                {description}
              </p>
            )}
          </div>
        )}
        
        <div className={cn(
          "space-y-3",
          orientation === 'horizontal' && "flex flex-wrap gap-4 space-y-0"
        )}>
          {children}
        </div>
        
        {error && (
          <p className="text-sm text-[var(--error)] flex items-center gap-1">
            <span className="w-4 h-4">⚠</span>
            {error}
          </p>
        )}
      </div>
    );
  }
);

CheckboxGroup.displayName = "CheckboxGroup";

// Checkbox Card - Checkbox with card-like styling
export interface CheckboxCardProps extends CheckboxProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string;
}

const CheckboxCard = React.forwardRef<HTMLInputElement, CheckboxCardProps>(
  ({ title, description, icon, badge, className, ...props }, ref) => {
    const checkboxId = `checkbox-card-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <div className={cn(
        "relative rounded-lg border-2 p-4 transition-all duration-200",
        "hover:bg-gray-50",
        props.checked 
          ? "border-[var(--success)] bg-[var(--success)]/5" 
          : "border-gray-200",
        props.disabled && "opacity-50 cursor-not-allowed",
        className
      )}>
        <div className="flex items-start space-x-3">
          <Checkbox
            ref={ref}
            id={checkboxId}
            className="mt-0.5"
            {...props}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {icon && (
                  <div className="text-[var(--accent)]">
                    {icon}
                  </div>
                )}
                <label 
                  htmlFor={checkboxId}
                  className="text-sm font-medium text-[var(--dark)] cursor-pointer"
                >
                  {title}
                </label>
              </div>
              {badge && (
                <span className="text-xs font-medium px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
);

CheckboxCard.displayName = "CheckboxCard";

export { 
  Checkbox, 
  CheckboxGroup, 
  CheckboxCard, 
  checkboxVariants 
};