// src/components/forms/controls/checkbox.tsx

import React, { forwardRef } from 'react';
import { 
  useController, 
  useFormContext, 
  FieldValues, 
  FieldPath,
  Control 
} from 'react-hook-form';
import { cn } from '@/lib/utils';

// Import your base checkbox primitives
import { 
  Checkbox, 
  CheckboxCard, 
  ToggleCheckbox,
  type CheckboxProps as BaseCheckboxProps,
  type CheckboxCardProps as BaseCheckboxCardProps,
  type ToggleCheckboxProps as BaseToggleCheckboxProps
} from '@/components/ui/primitives/checkbox';

// Import field utilities from your RHF adapters
import { 
  useFieldState, 
  formatFieldError,
  type BaseFieldProps 
} from '@/components/forms/adapters/rhf/field';

/**
 * RHF Checkbox Component - Single checkbox with form integration
 */
export interface RHFCheckboxProps<TFieldValues extends FieldValues = FieldValues>
  extends Omit<BaseCheckboxProps, 'checked' | 'onCheckedChange'>,
    BaseFieldProps<TFieldValues> {
  // Checkbox-specific options
  checkValue?: any; // Value when checked (default: true)
  uncheckValue?: any; // Value when unchecked (default: false)
}

export const RHFCheckbox = forwardRef<
  HTMLInputElement,
  RHFCheckboxProps
>(({ 
  name, 
  control, 
  checkValue = true,
  uncheckValue = false,
  transformError,
  className,
  ...props 
}, ref) => {
  const {
    field,
    error,
    isLoading
  } = useFieldState(name, control);

  const errorMessage = formatFieldError(error, transformError);
  
  return (
    <Checkbox
      {...props}
      ref={ref}
      checked={field.value === checkValue}
      onCheckedChange={(checked) => {
        field.onChange(checked ? checkValue : uncheckValue);
      }}
      disabled={props.disabled || isLoading}
      error={errorMessage}
      className={cn(className, {
        'opacity-50 cursor-not-allowed': props.disabled || isLoading,
      })}
    />
  );
});

RHFCheckbox.displayName = 'RHFCheckbox';

/**
 * RHF Checkbox Group - Multiple checkboxes for array values
 * Aligns with backend array validation patterns
 */
export interface RHFCheckboxGroupProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  options: Array<{
    label: string;
    value: any;
    description?: string;
    disabled?: boolean;
    icon?: React.ReactNode;
    badge?: string;
  }>;
  // Group layout options
  orientation?: 'horizontal' | 'vertical' | 'grid';
  columns?: number; // For grid layout
  spacing?: 'sm' | 'md' | 'lg';
  // Validation options
  min?: number; // Minimum selections required
  max?: number; // Maximum selections allowed
  // Display options
  variant?: 'default' | 'card' | 'compact';
  label?: string;
  description?: string;
  helper?: string;
  required?: boolean;
}

export const RHFCheckboxGroup = forwardRef<
  HTMLDivElement,
  RHFCheckboxGroupProps
>(({ 
  name, 
  control, 
  options,
  orientation = 'vertical',
  columns = 2,
  spacing = 'md',
  min,
  max,
  variant = 'default',
  label,
  description,
  helper,
  required,
  transformError,
  className,
  ...props 
}, ref) => {
  const {
    field,
    error,
    isLoading
  } = useFieldState(name, control);

  const currentValue = Array.isArray(field.value) ? field.value : [];
  const errorMessage = formatFieldError(error, transformError);

  // Handle checkbox toggle
  const handleToggle = (optionValue: any) => {
    const newValue = currentValue.includes(optionValue)
      ? currentValue.filter((v: any) => v !== optionValue)
      : [...currentValue, optionValue];
    
    field.onChange(newValue);
  };

  // Validate selection limits
  const isMaxReached = max && currentValue.length >= max;
  const isMinRequired = min && currentValue.length < min;

  // Layout classes
  const layoutClasses = {
    horizontal: 'flex flex-wrap gap-4',
    vertical: 'space-y-3',
    grid: `grid gap-4 grid-cols-1 sm:grid-cols-${columns}`
  };

  const spacingClasses = {
    sm: orientation === 'grid' ? 'gap-2' : orientation === 'horizontal' ? 'gap-2' : 'space-y-2',
    md: orientation === 'grid' ? 'gap-4' : orientation === 'horizontal' ? 'gap-4' : 'space-y-3',
    lg: orientation === 'grid' ? 'gap-6' : orientation === 'horizontal' ? 'gap-6' : 'space-y-4'
  };

  return (
    <div className={cn('space-y-3', className)} ref={ref}>
      {/* Group Label */}
      {label && (
        <div className="space-y-1">
          <label className={cn(
            'text-sm font-satoshi-medium text-[var(--heading-color)]',
            required && "after:content-['*'] after:text-[var(--error)] after:ml-1"
          )}>
            {label}
          </label>
          {description && (
            <p className="text-xs text-[var(--caption-color)] font-satoshi">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Checkbox Options */}
      <div className={cn(
        layoutClasses[orientation],
        spacingClasses[spacing]
      )}>
        {options.map((option) => {
          const isChecked = currentValue.includes(option.value);
          const isDisabled = option.disabled || isLoading || 
            (!isChecked && isMaxReached);

          if (variant === 'card') {
            return (
              <CheckboxCard
                key={String(option.value)}
                title={option.label}
                description={option.description}
                icon={option.icon}
                badge={option.badge}
                checked={isChecked}
                disabled={isDisabled}
                onCheckedChange={() => !isDisabled && handleToggle(option.value)}
              />
            );
          }

          return (
            <Checkbox
              key={String(option.value)}
              label={option.label}
              description={option.description}
              checked={isChecked}
              disabled={isDisabled}
              onCheckedChange={() => !isDisabled && handleToggle(option.value)}
              variant={variant === 'compact' ? 'sm' : 'default'}
            />
          );
        })}
      </div>

      {/* Helper Text */}
      {helper && !errorMessage && (
        <p className="text-xs text-[var(--caption-color)] font-satoshi">
          {helper}
          {(min || max) && (
            <span className="ml-2 text-[var(--muted)]">
              ({currentValue.length}
              {min && ` / ${min} min`}
              {max && ` / ${max} max`})
            </span>
          )}
        </p>
      )}

      {/* Error Message */}
      {errorMessage && (
        <p className="text-sm text-[var(--error)] flex items-center gap-1 font-satoshi">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {errorMessage}
        </p>
      )}

      {/* Selection Count Validation */}
      {isMinRequired && (
        <p className="text-sm text-[var(--warning)] flex items-center gap-1 font-satoshi">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.19-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          Please select at least {min} option{min > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
});

RHFCheckboxGroup.displayName = 'RHFCheckboxGroup';

/**
 * RHF Toggle Checkbox - Switch-like checkbox
 */
export interface RHFToggleCheckboxProps<TFieldValues extends FieldValues = FieldValues>
  extends Omit<BaseToggleCheckboxProps, 'checked' | 'onCheckedChange'>,
    BaseFieldProps<TFieldValues> {
  checkValue?: any;
  uncheckValue?: any;
}

export const RHFToggleCheckbox = forwardRef<
  HTMLInputElement,
  RHFToggleCheckboxProps
>(({ 
  name, 
  control, 
  checkValue = true,
  uncheckValue = false,
  transformError,
  className,
  ...props 
}, ref) => {
  const {
    field,
    error,
    isLoading
  } = useFieldState(name, control);

  const errorMessage = formatFieldError(error, transformError);
  
  return (
    <div className="space-y-2">
      <ToggleCheckbox
        {...props}
        ref={ref}
        checked={field.value === checkValue}
        onCheckedChange={(checked) => {
          field.onChange(checked ? checkValue : uncheckValue);
        }}
        disabled={props.disabled || isLoading}
        className={cn(className, {
          'opacity-50 cursor-not-allowed': props.disabled || isLoading,
        })}
      />
      
      {errorMessage && (
        <p className="text-sm text-[var(--error)] flex items-center gap-1 font-satoshi">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {errorMessage}
        </p>
      )}
    </div>
  );
});

RHFToggleCheckbox.displayName = 'RHFToggleCheckbox';

/**
 * Specialized checkbox for plans/subscriptions
 * Aligns with your backend plan validation
 */
export interface RHFPlanCheckboxProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  plans: Array<{
    id: 'foundation' | 'growth' | 'premium' | 'enterprise';
    name: string;
    price: string;
    description: string;
    features: string[];
    recommended?: boolean;
    badge?: string;
  }>;
  multiple?: boolean; // Allow multiple plan selection
}

export const RHFPlanCheckbox = forwardRef<
  HTMLDivElement,
  RHFPlanCheckboxProps
>(({ 
  name, 
  control, 
  plans,
  multiple = false,
  transformError,
  className,
  ...props 
}, ref) => {
  const {
    field,
    error,
    isLoading
  } = useFieldState(name, control);

  const currentValue = multiple ? 
    (Array.isArray(field.value) ? field.value : []) : 
    field.value;
  
  const errorMessage = formatFieldError(error, transformError);

  const handlePlanToggle = (planId: string) => {
    if (multiple) {
      const newValue = currentValue.includes(planId)
        ? currentValue.filter((id: string) => id !== planId)
        : [...currentValue, planId];
      field.onChange(newValue);
    } else {
      field.onChange(planId);
    }
  };

  return (
    <div className={cn('space-y-4', className)} ref={ref}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {plans.map((plan) => {
          const isSelected = multiple ? 
            currentValue.includes(plan.id) : 
            currentValue === plan.id;

          return (
            <CheckboxCard
              key={plan.id}
              title={plan.name}
              description={plan.description}
              price={plan.price}
              badge={plan.badge || (plan.recommended ? 'Recommended' : undefined)}
              checked={isSelected}
              disabled={isLoading}
              highlight={plan.recommended}
              onCheckedChange={() => handlePlanToggle(plan.id)}
              className="p-6"
            />
          );
        })}
      </div>

      {errorMessage && (
        <p className="text-sm text-[var(--error)] flex items-center gap-1 font-satoshi">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {errorMessage}
        </p>
      )}
    </div>
  );
});

RHFPlanCheckbox.displayName = 'RHFPlanCheckbox';