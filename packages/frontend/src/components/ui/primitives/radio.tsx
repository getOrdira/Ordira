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
        // Default radio using Ordira orange
        default: [
          "border-gray-300",
          "data-[state=checked]:border-[var(--primary)] data-[state=checked]:bg-white",
          "hover:border-[var(--primary)]/60",
          "focus-visible:ring-[var(--primary)]/30"
        ].join(" "),
        
        // Secondary variant using dark accent
        secondary: [
          "border-gray-300",
          "data-[state=checked]:border-[var(--ordira-accent)] data-[state=checked]:bg-white",
          "hover:border-[var(--ordira-accent)]/60",
          "focus-visible:ring-[var(--ordira-accent)]/30"
        ].join(" "),
        
        // Success variant
        success: [
          "border-gray-300",
          "data-[state=checked]:border-[var(--success)] data-[state=checked]:bg-white",
          "hover:border-[var(--success)]/60",
          "focus-visible:ring-[var(--success)]/30"
        ].join(" "),
        
        // Error variant
        error: [
          "border-gray-300",
          "data-[state=checked]:border-[var(--error)] data-[state=checked]:bg-white",
          "hover:border-[var(--error)]/60",
          "focus-visible:ring-[var(--error)]/30"
        ].join(" "),
        
        // Warning variant
        warning: [
          "border-gray-300",
          "data-[state=checked]:border-[var(--warning)] data-[state=checked]:bg-white",
          "hover:border-[var(--warning)]/60",
          "focus-visible:ring-[var(--warning)]/30"
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

const radioDotVariants = cva(
  // Inner dot/circle
  "rounded-full bg-current transition-all duration-200",
  {
    variants: {
      variant: {
        default: "text-[var(--primary)]",
        secondary: "text-[var(--ordira-accent)]",
        success: "text-[var(--success)]",
        error: "text-[var(--error)]",
        warning: "text-[var(--warning)]"
      },
      size: {
        sm: "h-1.5 w-1.5",
        md: "h-2.5 w-2.5",
        lg: "h-3 w-3",
        xl: "h-3.5 w-3.5"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

const labelVariants = cva(
  "font-satoshi-medium leading-none cursor-pointer select-none",
  {
    variants: {
      size: {
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg",
        xl: "text-xl"
      },
      disabled: {
        true: "text-[var(--muted)] opacity-70 cursor-not-allowed",
        false: "text-[var(--heading-color)]"
      }
    },
    defaultVariants: {
      size: "md",
      disabled: false
    }
  }
);

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof radioVariants> {
  label?: string;
  description?: string;
  onValueChange?: (value: string) => void;
  labelSize?: 'sm' | 'md' | 'lg' | 'xl';
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
    labelSize,
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
                className={cn(labelVariants({ 
                  size: labelSize || size, 
                  disabled: !!disabled 
                }))}
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
  spacing?: 'sm' | 'md' | 'lg';
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
    orientation = 'vertical',
    spacing = 'md'
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || '');
    const currentValue = value !== undefined ? value : internalValue;
    
    const handleValueChange = (newValue: string) => {
      setInternalValue(newValue);
      onValueChange?.(newValue);
    };

    const spacingClasses = {
      sm: orientation === 'vertical' ? 'space-y-2' : 'gap-3',
      md: orientation === 'vertical' ? 'space-y-4' : 'gap-4',
      lg: orientation === 'vertical' ? 'space-y-6' : 'gap-6'
    };

    // Clone children and add necessary props
    const enhancedChildren = React.Children.map(children, (child) => {
      if (React.isValidElement(child) && (child.type === Radio || child.type === RadioCard)) {
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
      <div ref={ref} className={cn("space-y-4", className)}>
        {(label || description) && (
          <div className="space-y-1">
            {label && (
              <label className="text-lg font-satoshi-bold text-[var(--heading-color)]">
                {label}
              </label>
            )}
            {description && (
              <p className="text-sm text-[var(--caption-color)] font-satoshi">
                {description}
              </p>
            )}
          </div>
        )}
        
        <div 
          className={cn(
            spacingClasses[spacing],
            orientation === 'horizontal' && "flex flex-wrap space-y-0"
          )}
          role="radiogroup"
          aria-label={label}
        >
          {enhancedChildren}
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

RadioGroup.displayName = "RadioGroup";

// Radio Card - Card-style radio option (matches your image)
export interface RadioCardProps extends RadioProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  illustration?: React.ReactNode;
  badge?: string;
  price?: string;
  selected?: boolean;
  onClick?: () => void;
  highlight?: boolean;
}

const RadioCard = React.forwardRef<HTMLInputElement, RadioCardProps>(
  ({ 
    title, 
    description, 
    icon, 
    illustration,
    badge, 
    price,
    selected,
    onClick,
    highlight = false,
    className,
    size = "lg",
    ...props 
  }, ref) => {
    const cardId = `radio-card-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <div 
        className={cn(
          "relative rounded-2xl border-2 p-6 transition-all duration-200 cursor-pointer group",
          "hover:bg-[var(--background-secondary)] hover:border-[var(--primary)]/40",
          selected || props.checked
            ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm" 
            : "border-[var(--border)]",
          highlight && "ring-2 ring-[var(--primary)]/20",
          props.disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={!props.disabled ? onClick : undefined}
      >
        {/* Radio Button */}
        <div className="absolute top-6 left-6">
          <Radio
            ref={ref}
            id={cardId}
            checked={selected || props.checked}
            size={size}
            {...props}
          />
        </div>
        
        {/* Badge */}
        {badge && (
          <div className="absolute top-6 right-6">
            <span className="text-xs font-satoshi-medium px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full">
              {badge}
            </span>
          </div>
        )}
        
        {/* Content */}
        <div className="flex items-center space-x-6 ml-12">
          {/* Icon/Illustration */}
          {(icon || illustration) && (
            <div className="flex-shrink-0">
              {illustration ? (
                <div className="w-20 h-16 text-[var(--caption-color)] group-hover:text-[var(--primary)] transition-colors">
                  {illustration}
                </div>
              ) : (
                <div className="w-8 h-8 text-[var(--primary)]">
                  {icon}
                </div>
              )}
            </div>
          )}
          
          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <label 
                htmlFor={cardId}
                className="text-lg font-satoshi-bold text-[var(--heading-color)] cursor-pointer group-hover:text-[var(--primary)] transition-colors"
              >
                {title}
              </label>
              {price && (
                <span className="text-lg font-satoshi-bold text-[var(--primary)]">
                  {price}
                </span>
              )}
            </div>
            {description && (
              <p className="text-sm text-[var(--caption-color)] leading-relaxed font-satoshi">
                {description}
              </p>
            )}
          </div>
        </div>
        
        {/* Selection indicator */}
        {(selected || props.checked) && (
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 bg-[var(--primary)] rounded-full" />
          </div>
        )}
      </div>
    );
  }
);

RadioCard.displayName = "RadioCard";

// Option Card - Simplified card without radio (for simple selection)
export interface OptionCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  illustration?: React.ReactNode;
  badge?: string;
  price?: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const OptionCard = React.forwardRef<HTMLDivElement, OptionCardProps>(
  ({ 
    title, 
    description, 
    icon, 
    illustration,
    badge, 
    price,
    selected = false,
    onClick,
    disabled = false,
    className
  }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(
          "relative rounded-2xl border-2 p-6 transition-all duration-200 cursor-pointer group",
          "hover:bg-[var(--background-secondary)] hover:border-[var(--primary)]/40",
          selected
            ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm" 
            : "border-[var(--border)]",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={!disabled ? onClick : undefined}
      >
        {/* Badge */}
        {badge && (
          <div className="absolute top-6 right-6">
            <span className="text-xs font-satoshi-medium px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full">
              {badge}
            </span>
          </div>
        )}
        
        {/* Content */}
        <div className="flex items-center space-x-6">
          {/* Icon/Illustration */}
          {(icon || illustration) && (
            <div className="flex-shrink-0">
              {illustration ? (
                <div className="w-20 h-16 text-[var(--caption-color)] group-hover:text-[var(--primary)] transition-colors">
                  {illustration}
                </div>
              ) : (
                <div className="w-8 h-8 text-[var(--primary)]">
                  {icon}
                </div>
              )}
            </div>
          )}
          
          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-satoshi-bold text-[var(--heading-color)] group-hover:text-[var(--primary)] transition-colors">
                {title}
              </h3>
              {price && (
                <span className="text-lg font-satoshi-bold text-[var(--primary)]">
                  {price}
                </span>
              )}
            </div>
            {description && (
              <p className="text-sm text-[var(--caption-color)] leading-relaxed font-satoshi">
                {description}
              </p>
            )}
          </div>
        </div>
        
        {/* Selection indicator */}
        {selected && (
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 bg-[var(--primary)] rounded-full" />
          </div>
        )}
      </div>
    );
  }
);

OptionCard.displayName = "OptionCard";

export { 
  Radio, 
  RadioGroup, 
  RadioCard,
  OptionCard,
  radioVariants 
};