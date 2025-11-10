// src/components/ui/primitives/checkbox.tsx
'use client';

import React, { useId } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/utils';
import { CheckIcon } from '@heroicons/react/24/outline';

const checkboxVariants = cva(
  // Base styles
  "peer inline-flex items-center justify-center rounded-lg border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        // Primary Ordira orange checkboxes
        default: [
          "border-[var(--primary)] text-white",
          "data-[state=checked]:bg-[var(--primary)] data-[state=checked]:border-[var(--primary)]",
          "data-[state=unchecked]:bg-white data-[state=unchecked]:border-[var(--primary)]",
          "hover:border-[var(--primary-dark)] hover:data-[state=checked]:bg-[var(--primary-dark)]",
          "focus-visible:ring-[var(--primary)]/30",
          "disabled:border-[var(--primary)]/40 disabled:bg-[var(--primary)]/20",
          "disabled:data-[state=checked]:bg-[var(--primary)]/40"
        ].join(" "),
        
        // Secondary dark variant using Ordira dark
        secondary: [
          "border-[var(--ordira-accent)] text-white",
          "data-[state=checked]:bg-[var(--ordira-accent)] data-[state=checked]:border-[var(--ordira-accent)]",
          "data-[state=unchecked]:bg-white data-[state=unchecked]:border-[var(--ordira-accent)]",
          "hover:border-[var(--ordira-black)] hover:data-[state=checked]:bg-[var(--ordira-black)]",
          "focus-visible:ring-[var(--ordira-accent)]/30",
          "disabled:border-[var(--ordira-accent)]/40 disabled:bg-[var(--ordira-accent)]/20",
          "disabled:data-[state=checked]:bg-[var(--ordira-accent)]/40"
        ].join(" "),
        
        // Success variant (keeping green for success states)
        success: [
          "border-[var(--success)] text-white",
          "data-[state=checked]:bg-[var(--success)] data-[state=checked]:border-[var(--success)]",
          "data-[state=unchecked]:bg-white data-[state=unchecked]:border-[var(--success)]",
          "hover:border-[var(--success-dark)] hover:data-[state=checked]:bg-[var(--success-dark)]",
          "focus-visible:ring-[var(--success)]/30",
          "disabled:border-[var(--success)]/40 disabled:bg-[var(--success)]/20",
          "disabled:data-[state=checked]:bg-[var(--success)]/40"
        ].join(" "),
        
        // Muted/subtle variant
        muted: [
          "border-[var(--muted)] text-white",
          "data-[state=checked]:bg-[var(--muted)] data-[state=checked]:border-[var(--muted)]",
          "data-[state=unchecked]:bg-white data-[state=unchecked]:border-[var(--muted)]",
          "hover:border-[var(--muted-dark)] hover:data-[state=checked]:bg-[var(--muted-dark)]",
          "focus-visible:ring-[var(--muted)]/30",
          "disabled:border-[var(--muted)]/40 disabled:bg-[var(--muted)]/20",
          "disabled:data-[state=checked]:bg-[var(--muted)]/40"
        ].join(" ")
      },
      size: {
        sm: "h-4 w-4",
        md: "h-5 w-5", 
        lg: "h-6 w-6",
        xl: "h-7 w-7"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

const labelVariants = cva(
  "font-satoshi-medium leading-none peer-disabled:cursor-not-allowed select-none",
  {
    variants: {
      size: {
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg",
        xl: "text-xl"
      },
      disabled: {
        true: "text-[var(--muted)] opacity-70",
        false: "text-[var(--heading-color)]"
      }
    },
    defaultVariants: {
      size: "md",
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
  labelSize?: 'sm' | 'md' | 'lg' | 'xl';
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
    labelSize,
    id,
    ...props 
  }, ref) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;
    
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
                  size === 'sm' && "w-2.5 h-2.5",
                  size === 'md' && "w-3.5 h-3.5", 
                  size === 'lg' && "w-4 h-4",
                  size === 'xl' && "w-5 h-5"
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
                  labelVariants({ 
                    size: labelSize || size, 
                    disabled 
                  }),
                  "cursor-pointer"
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className={cn(
                "text-xs leading-relaxed font-satoshi",
                disabled ? "text-[var(--muted)] opacity-70" : "text-[var(--caption-color)]"
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
  spacing?: 'sm' | 'md' | 'lg';
}

const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroupProps>(
  ({ 
    label, 
    description, 
    error, 
    children, 
    className, 
    orientation = 'vertical',
    spacing = 'md'
  }, ref) => {
    const spacingClasses = {
      sm: orientation === 'vertical' ? 'space-y-2' : 'gap-3',
      md: orientation === 'vertical' ? 'space-y-3' : 'gap-4',
      lg: orientation === 'vertical' ? 'space-y-4' : 'gap-6'
    };

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
          spacingClasses[spacing],
          orientation === 'horizontal' && "flex flex-wrap space-y-0"
        )}>
          {children}
        </div>
        
        {error && (
          <p className="text-sm text-[var(--error)] flex items-center gap-1 font-satoshi">
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
  price?: string;
  highlight?: boolean;
}

const CheckboxCard = React.forwardRef<HTMLInputElement, CheckboxCardProps>(
  ({ 
    title, 
    description, 
    icon, 
    badge, 
    price,
    highlight = false,
    className, 
    ...props 
  }, ref) => {
    const generatedId = useId();
    const checkboxId = `checkbox-card-${generatedId}`;
    
    return (
      <div className={cn(
        "relative rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer",
        "hover:bg-[var(--background-secondary)]",
        props.checked 
          ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm" 
          : "border-[var(--border)]",
        highlight && "ring-2 ring-[var(--primary)]/20",
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
                  <div className="text-[var(--primary)]">
                    {icon}
                  </div>
                )}
                <label 
                  htmlFor={checkboxId}
                  className="text-sm font-satoshi-medium text-[var(--heading-color)] cursor-pointer"
                >
                  {title}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                {price && (
                  <span className="text-sm font-satoshi-bold text-[var(--primary)]">
                    {price}
                  </span>
                )}
                {badge && (
                  <span className="text-xs font-satoshi-medium px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full">
                    {badge}
                  </span>
                )}
              </div>
            </div>
            {description && (
              <p className="mt-1 text-xs text-[var(--caption-color)] leading-relaxed font-satoshi">
                {description}
              </p>
            )}
          </div>
        </div>
        
        {/* Selection indicator */}
        {props.checked && (
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 bg-[var(--primary)] rounded-full" />
          </div>
        )}
      </div>
    );
  }
);

CheckboxCard.displayName = "CheckboxCard";

// Toggle Checkbox - More switch-like appearance
export interface ToggleCheckboxProps extends CheckboxProps {
  onText?: string;
  offText?: string;
}

const ToggleCheckbox = React.forwardRef<HTMLInputElement, ToggleCheckboxProps>(
  ({ 
    onText = "On", 
    offText = "Off", 
    className, 
    size = "md",
    ...props 
  }, ref) => {
    const generatedId = useId();
    const toggleId = `toggle-${generatedId}`;
    
    const sizeClasses = {
      sm: "h-6 w-11",
      md: "h-7 w-12", 
      lg: "h-8 w-14",
      xl: "h-9 w-16"
    };

    const thumbSizes = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6", 
      xl: "w-7 h-7"
    };

    return (
      <div className="flex items-center space-x-3">
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={toggleId}
            className="sr-only"
            {...props}
          />
          <div
            className={cn(
              "relative inline-flex items-center rounded-full border-2 transition-all duration-200 cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:ring-offset-2",
              sizeClasses[size || 'md'],
              props.checked
                ? "bg-[var(--primary)] border-[var(--primary)]"
                : "bg-gray-200 border-gray-300",
              props.disabled && "opacity-50 cursor-not-allowed",
              className
            )}
            onClick={() => !props.disabled && props.onCheckedChange?.(!props.checked)}
          >
            <div
              className={cn(
                "absolute bg-white rounded-full shadow-sm transition-transform duration-200",
                thumbSizes[size || 'md'],
                props.checked 
                  ? "translate-x-full transform" 
                  : "translate-x-0.5 transform"
              )}
            />
          </div>
        </div>
        
        <label
          htmlFor={toggleId}
          className={cn(
            "font-satoshi-medium cursor-pointer",
            props.disabled ? "text-[var(--muted)] opacity-70" : "text-[var(--heading-color)]"
          )}
        >
          {props.checked ? onText : offText}
        </label>
      </div>
    );
  }
);

ToggleCheckbox.displayName = "ToggleCheckbox";

export { 
  Checkbox, 
  CheckboxGroup, 
  CheckboxCard, 
  ToggleCheckbox,
  checkboxVariants 
};