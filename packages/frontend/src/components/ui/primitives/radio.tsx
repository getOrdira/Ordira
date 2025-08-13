// src/components/ui/primitives/radio.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const radioVariants = cva(
  // Base radio button styles
  "peer inline-flex items-center justify-center rounded-full border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // Default radio (matches your image)
        default: [
          "border-gray-300",
          "data-[state=checked]:border-[var(--accent)] data-[state=checked]:bg-white",
          "hover:border-gray-400",
          "focus-visible:ring-[var(--accent)]"
        ].join(" "),
        
        // Success variant
        success: [
          "border-gray-300",
          "data-[state=checked]:border-[var(--success)] data-[state=checked]:bg-white",
          "hover:border-gray-400",
          "focus-visible:ring-[var(--success)]"
        ].join(" "),
        
        // Error variant
        error: [
          "border-gray-300",
          "data-[state=checked]:border-[var(--error)] data-[state=checked]:bg-white",
          "hover:border-gray-400",
          "focus-visible:ring-[var(--error)]"
        ].join(" "),
        
        // Warning variant
        warning: [
          "border-gray-300",
          "data-[state=checked]:border-[var(--warning)] data-[state=checked]:bg-white",
          "hover:border-gray-400",
          "focus-visible:ring-[var(--warning)]"
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

const radioDotVariants = cva(
  // Inner dot/circle
  "rounded-full bg-current transition-all duration-200",
  {
    variants: {
      variant: {
        default: "text-[var(--accent)]",
        success: "text-[var(--success)]",
        error: "text-[var(--error)]",
        warning: "text-[var(--warning)]"
      },
      size: {
        sm: "h-2 w-2",
        md: "h-2.5 w-2.5",
        lg: "h-3 w-3"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof radioVariants> {
  label?: string;
  description?: string;
  onValueChange?: (value: string) => void;
}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ 
    className, 
    variant, 
    size,
    label,
    description,
    checked,
    disabled,
    value,
    onValueChange,
    onChange,
    id,
    ...props 
  }, ref) => {
    const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked && value) {
        onValueChange?.(value);
      }
      onChange?.(e);
    };

    // Determine the state for styling
    const state = checked ? 'checked' : 'unchecked';

    const radioElement = (
      <div className="relative">
        <input
          ref={ref}
          type="radio"
          id={radioId}
          className="sr-only"
          checked={checked}
          disabled={disabled}
          value={value}
          onChange={handleChange}
          {...props}
        />
        <div
          className={cn(radioVariants({ variant, size, className }))}
          data-state={state}
          role="radio"
          aria-checked={checked}
          aria-disabled={disabled}
        >
          {/* Inner dot - only visible when checked */}
          {checked && (
            <div className={cn(radioDotVariants({ variant, size }))} />
          )}
        </div>
      </div>
    );

    // If no label or description, return just the radio
    if (!label && !description) {
      return radioElement;
    }

    return (
      <div className="flex items-start space-x-3">
        {radioElement}
        
        {(label || description) && (
          <div className="flex flex-col space-y-1">
            {label && (
              <label
                htmlFor={radioId}
                className={cn(
                  "text-sm font-medium leading-none cursor-pointer",
                  disabled ? "text-[var(--muted)] opacity-70" : "text-[var(--dark)]"
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

Radio.displayName = "Radio";

// Radio Group Component
export interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  label?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ 
    value,
    defaultValue,
    onValueChange,
    children,
    label,
    description,
    error,
    disabled,
    className,
    orientation = 'vertical' 
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || '');
    const currentValue = value !== undefined ? value : internalValue;
    
    const handleValueChange = (newValue: string) => {
      setInternalValue(newValue);
      onValueChange?.(newValue);
    };

    // Clone children and add necessary props
    const enhancedChildren = React.Children.map(children, (child) => {
      if (React.isValidElement(child) && child.type === Radio) {
        return React.cloneElement(child as React.ReactElement<RadioProps>, {
          checked: child.props.value === currentValue,
          onValueChange: handleValueChange,
          disabled: disabled || child.props.disabled,
          name: 'radio-group'
        });
      }
      return child;
    });

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
        
        <div 
          className={cn(
            orientation === 'vertical' ? "space-y-3" : "flex flex-wrap gap-4"
          )}
          role="radiogroup"
          aria-label={label}
        >
          {enhancedChildren}
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

RadioGroup.displayName = "RadioGroup";

// Radio Card - Card-style radio option (matches your image)
export interface RadioCardProps extends RadioProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  illustration?: React.ReactNode;
  badge?: string;
  selected?: boolean;
  onClick?: () => void;
}

const RadioCard = React.forwardRef<HTMLInputElement, RadioCardProps>(
  ({ 
    title, 
    description, 
    icon, 
    illustration,
    badge, 
    selected,
    onClick,
    className, 
    ...props 
  }, ref) => {
    const cardId = `radio-card-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <div 
        className={cn(
          "relative rounded-2xl border-2 p-6 transition-all duration-200 cursor-pointer",
          "hover:bg-gray-50 hover:border-gray-300",
          selected 
            ? "border-[var(--accent)] bg-[var(--accent)]/5" 
            : "border-gray-200",
          props.disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={!props.disabled ? onClick : undefined}
      >
        {/* Radio Button */}
        <div className="absolute top-4 left-4">
          <Radio
            ref={ref}
            id={cardId}
            checked={selected}
            {...props}
          />
        </div>
        
        {/* Badge */}
        {badge && (
          <div className="absolute top-4 right-4">
            <span className="text-xs font-medium px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full">
              {badge}
            </span>
          </div>
        )}
        
        {/* Content */}
        <div className="flex items-start space-x-4 ml-8">
          {/* Icon/Illustration */}
          {(icon || illustration) && (
            <div className="flex-shrink-0 mt-1">
              {illustration ? (
                <div className="w-16 h-16 text-[var(--muted)]">
                  {illustration}
                </div>
              ) : (
                <div className="w-8 h-8 text-[var(--accent)]">
                  {icon}
                </div>
              )}
            </div>
          )}
          
          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <label 
              htmlFor={cardId}
              className="block text-lg font-semibold text-[var(--dark)] cursor-pointer mb-1"
            >
              {title}
            </label>
            {description && (
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
);

RadioCard.displayName = "RadioCard";

export { 
  Radio, 
  RadioGroup, 
  RadioCard, 
  radioVariants 
};