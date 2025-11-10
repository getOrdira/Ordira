// src/components/forms/controls/toggle-group.tsx

import React, { forwardRef } from 'react';
import { FieldValues } from 'react-hook-form';
import { cn } from '@/lib/utils/utils';

// Import field utilities from your RHF adapters
import { 
  useFieldState, 
  formatFieldError,
  type BaseFieldProps 
} from '@/components/forms/adapters/rhf/field';

/**
 * Toggle Button Component - Individual toggle button for groups
 * Similar to radio buttons but with button styling
 */
export interface ToggleButtonProps {
  value: any;
  children: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  onClick?: () => void;
  className?: string;
}

const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(({
  value,
  children,
  selected = false,
  disabled = false,
  size = 'md',
  variant = 'default',
  onClick,
  className,
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const variantClasses = {
    default: selected 
      ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
      : 'bg-white text-[var(--ordira-accent)] border-[var(--border)] hover:bg-[var(--background-secondary)]',
    outline: selected
      ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
      : 'bg-transparent text-[var(--ordira-accent)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]',
    ghost: selected
      ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-transparent'
      : 'bg-transparent text-[var(--ordira-accent)] border-transparent hover:bg-[var(--background-secondary)]'
  };

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center font-satoshi-medium border transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'first:rounded-l-lg last:rounded-r-lg',
        '[&:not(:first-child)]:border-l-0',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

ToggleButton.displayName = 'ToggleButton';

/**
 * RHF Toggle Group - Button group with single or multiple selection
 * Perfect for filter buttons, view modes, status selection, etc.
 */
export interface RHFToggleGroupProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  options: Array<{
    label: string;
    value: any;
    icon?: React.ReactNode;
    disabled?: boolean;
    description?: string;
  }>;
  // Selection mode
  multiple?: boolean; // Allow multiple selections (default: single)
  // Display options
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  fullWidth?: boolean;
  // Layout
  orientation?: 'horizontal' | 'vertical';
  // Group styling
  label?: string;
  description?: string;
  helper?: string;
  required?: boolean;
}

export const RHFToggleGroup = forwardRef<
  HTMLDivElement,
  RHFToggleGroupProps
>(({ 
  name, 
  control, 
  options,
  multiple = false,
  size = 'md',
  variant = 'default',
  fullWidth = false,
  orientation = 'horizontal',
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

  const errorMessage = formatFieldError(error, transformError);

  // Handle current selection state
  const currentValue = multiple ? 
    (Array.isArray(field.value) ? field.value : []) : 
    field.value;

  // Handle toggle selection
  const handleToggle = (optionValue: any) => {
    if (multiple) {
      const newValue = currentValue.includes(optionValue)
        ? currentValue.filter((v: any) => v !== optionValue)
        : [...currentValue, optionValue];
      field.onChange(newValue);
    } else {
      // Single selection - toggle off if same value selected
      const newValue = currentValue === optionValue ? null : optionValue;
      field.onChange(newValue);
    }
  };

  // Check if option is selected
  const isSelected = (optionValue: any) => {
    return multiple ? 
      currentValue.includes(optionValue) : 
      currentValue === optionValue;
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

      {/* Toggle Buttons */}
      <div 
        className={cn(
          'inline-flex',
          orientation === 'vertical' && 'flex-col',
          fullWidth && 'w-full',
          fullWidth && orientation === 'horizontal' && '[&>button]:flex-1'
        )}
        role={multiple ? 'group' : 'radiogroup'}
        aria-label={label}
      >
        {options.map((option, index) => {
          const selected = isSelected(option.value);
          const disabled = option.disabled || isLoading;

          return (
            <ToggleButton
              key={String(option.value)}
              value={option.value}
              selected={selected}
              disabled={disabled}
              size={size}
              variant={variant}
              onClick={() => !disabled && handleToggle(option.value)}
              className={cn(
                orientation === 'vertical' && 'rounded-none',
                orientation === 'vertical' && index === 0 && 'rounded-t-lg',
                orientation === 'vertical' && index === options.length - 1 && 'rounded-b-lg',
                orientation === 'vertical' && '[&:not(:first-child)]:border-t-0 [&:not(:first-child)]:border-l'
              )}
            >
              <div className="flex items-center space-x-2">
                {option.icon && (
                  <div className={cn(
                    'transition-colors',
                    selected ? 'text-current' : 'text-[var(--muted)]'
                  )}>
                    {option.icon}
                  </div>
                )}
                <span>{option.label}</span>
              </div>
            </ToggleButton>
          );
        })}
      </div>

      {/* Helper Text */}
      {helper && !errorMessage && (
        <p className="text-xs text-[var(--caption-color)] font-satoshi">
          {helper}
          {multiple && (
            <span className="ml-2 text-[var(--muted)]">
              ({Array.isArray(currentValue) ? currentValue.length : 0} selected)
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
    </div>
  );
});

RHFToggleGroup.displayName = 'RHFToggleGroup';

/**
 * Specialized toggle group for view modes
 * Perfect for list/grid views, sorting options, etc.
 * 
 * Common view modes:
 * - list: Traditional list view with rows
 * - grid: Card-based grid layout
 * - table: Tabular data view
 * - kanban: Kanban board layout
 */
export interface RHFViewModeToggleProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  modes?: Array<{
    value: string;
    label: string;
    icon: React.ReactNode;
  }>;
}

export const RHFViewModeToggle = forwardRef<
  HTMLDivElement,
  RHFViewModeToggleProps
>(({ 
  name, 
  control, 
  modes,
  transformError,
  className,
  ...props 
}, ref) => {
  const defaultModes = [
    {
      value: 'list',
      label: 'List View',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
        </svg>
      )
    },
    {
      value: 'grid',
      label: 'Grid View',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    }
  ];

  const viewModes = modes || defaultModes;

  return (
    <RHFToggleGroup
      {...props}
      ref={ref}
      name={name}
      control={control}
      options={viewModes}
      multiple={false}
      size="sm"
      variant="outline"
      transformError={transformError}
      className={className}
    />
  );
});

RHFViewModeToggle.displayName = 'RHFViewModeToggle';

/**
 * Specialized toggle group for status filters
 * Aligns with your backend status validation patterns
 * 
 * Backend status values supported:
 * - active: Active users/entities
 * - inactive: Inactive users/entities  
 * - pending: Pending approval/verification
 * - suspended: Temporarily suspended
 * - draft: Draft content (for products/content)
 * - published: Published content
 */
export interface RHFStatusToggleProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  statuses?: Array<{
    value: 'active' | 'inactive' | 'pending' | 'suspended' | 'draft' | 'published';
    label: string;
    color?: string;
  }>;
  allowMultiple?: boolean;
}

export const RHFStatusToggle = forwardRef<
  HTMLDivElement,
  RHFStatusToggleProps
>(({ 
  name, 
  control, 
  statuses,
  allowMultiple = true,
  transformError,
  className,
  ...props 
}, ref) => {
  const defaultStatuses = [
    { value: 'active' as const, label: 'Active', color: 'text-[var(--success)]' },
    { value: 'inactive' as const, label: 'Inactive', color: 'text-[var(--muted)]' },
    { value: 'pending' as const, label: 'Pending', color: 'text-[var(--warning)]' },
    { value: 'suspended' as const, label: 'Suspended', color: 'text-[var(--error)]' }
  ];

  const statusOptions = (statuses || defaultStatuses).map(status => ({
    label: status.label,
    value: status.value,
    icon: (
      <div className={cn('w-2 h-2 rounded-full', status.color?.replace('text-', 'bg-') || 'bg-gray-400')} />
    )
  }));

  return (
    <RHFToggleGroup
      {...props}
      ref={ref}
      name={name}
      control={control}
      options={statusOptions}
      multiple={allowMultiple}
      size="sm"
      variant="outline"
      label="Filter by Status"
      transformError={transformError}
      className={className}
    />
  );
});

RHFStatusToggle.displayName = 'RHFStatusToggle';

/**
 * Specialized toggle group for plan tiers
 * Aligns with your backend plan validation patterns
 * 
 * Backend plan values supported:
 * - foundation: Basic plan with core features
 * - growth: Mid-tier plan with additional features
 * - premium: Advanced plan with premium features
 * - enterprise: Enterprise plan with full features
 * 
 * Used in: BrandUser.plan, ManufacturerUser.planType, etc.
 */
export interface RHFPlanToggleProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  allowMultiple?: boolean;
}

export const RHFPlanToggle = forwardRef<
  HTMLDivElement,
  RHFPlanToggleProps
>(({ 
  name, 
  control, 
  allowMultiple = false,
  transformError,
  className,
  ...props 
}, ref) => {
  const planOptions = [
    {
      label: 'Foundation',
      value: 'foundation',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'Growth',
      value: 'growth',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      label: 'Premium',
      value: 'premium',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      )
    },
    {
      label: 'Enterprise',
      value: 'enterprise',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    }
  ];

  return (
    <RHFToggleGroup
      {...props}
      ref={ref}
      name={name}
      control={control}
      options={planOptions}
      multiple={allowMultiple}
      size="md"
      variant="outline"
      fullWidth={true}
      label="Select Plan Tier"
      transformError={transformError}
      className={className}
    />
  );
});

RHFPlanToggle.displayName = 'RHFPlanToggle';