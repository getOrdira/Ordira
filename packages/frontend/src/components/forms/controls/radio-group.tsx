// src/components/forms/controls/radio-group.tsx

import React, { forwardRef } from 'react';
import { FieldValues } from 'react-hook-form';
import { cn } from '@/lib/utils';

// Import your base radio primitives
import { 
  Radio, 
  RadioCard,
  type RadioProps as BaseRadioProps,
  type RadioCardProps as BaseRadioCardProps
} from '@/components/ui/primitives/radio';

// Import field utilities from your RHF adapters
import { 
  useFieldState, 
  formatFieldError,
  type BaseFieldProps 
} from '@/components/forms/adapters/rhf/field';

/**
 * RHF Radio Group Component - Single selection from multiple options
 * Aligns with backend enum/choice validation patterns
 */
export interface RHFRadioGroupProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  options: Array<{
    label: string;
    value: any;
    description?: string;
    disabled?: boolean;
    icon?: React.ReactNode;
    illustration?: React.ReactNode;
    badge?: string;
    price?: string;
  }>;
  // Group layout options
  orientation?: 'horizontal' | 'vertical' | 'grid';
  columns?: number; // For grid layout
  spacing?: 'sm' | 'md' | 'lg';
  // Display options
  variant?: 'default' | 'card' | 'compact';
  label?: string;
  description?: string;
  helper?: string;
  required?: boolean;
  // Validation
  allowEmpty?: boolean; // Allow deselection
}

export const RHFRadioGroup = forwardRef<
  HTMLDivElement,
  RHFRadioGroupProps
>(({ 
  name, 
  control, 
  options,
  orientation = 'vertical',
  columns = 2,
  spacing = 'md',
  variant = 'default',
  label,
  description,
  helper,
  required,
  allowEmpty = false,
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

  // Handle radio selection
  const handleValueChange = (optionValue: any) => {
    if (allowEmpty && field.value === optionValue) {
      // Allow deselection if allowEmpty is true
      field.onChange(null);
    } else {
      field.onChange(optionValue);
    }
  };

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

      {/* Radio Options */}
      <div className={cn(
        layoutClasses[orientation],
        spacingClasses[spacing]
      )}>
        {options.map((option) => {
          const isSelected = field.value === option.value;
          const isDisabled = option.disabled || isLoading;

          if (variant === 'card') {
            return (
              <RadioCard
                key={String(option.value)}
                title={option.label}
                description={option.description}
                icon={option.icon}
                illustration={option.illustration}
                badge={option.badge}
                price={option.price}
                selected={isSelected}
                disabled={isDisabled}
                onClick={() => !isDisabled && handleValueChange(option.value)}
                name={name}
                value={option.value}
              />
            );
          }

          return (
            <Radio
              key={String(option.value)}
              label={option.label}
              description={option.description}
              checked={isSelected}
              disabled={isDisabled}
              value={option.value}
              name={name}
              onValueChange={handleValueChange}
              size={variant === 'compact' ? 'sm' : 'md'}
            />
          );
        })}
      </div>

      {/* Helper Text */}
      {helper && !errorMessage && (
        <p className="text-xs text-[var(--caption-color)] font-satoshi">
          {helper}
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

RHFRadioGroup.displayName = 'RHFRadioGroup';

/**
 * Specialized radio group for user types
 * Aligns with your backend auth user type validation
 */
export interface RHFUserTypeRadioProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  showDescriptions?: boolean;
  variant?: 'default' | 'card';
}

export const RHFUserTypeRadio = forwardRef<
  HTMLDivElement,
  RHFUserTypeRadioProps
>(({ 
  name, 
  control, 
  showDescriptions = true,
  variant = 'card',
  transformError,
  className,
  ...props 
}, ref) => {
  const userTypeOptions = [
    {
      label: 'Brand/Business',
      value: 'brand',
      description: showDescriptions ? 'I represent a brand looking to work with manufacturers' : undefined,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7v10c0 5.55 3.84 10 9 11 1.16-.21 2.31-.48 3.38-.86-.83-.67-1.69-1.41-2.63-2.23-2.13-1.86-4.6-4.03-6.65-6.08C3.45 17.16 2.95 15.31 2.95 13.5V7.5L12 3.5 21.05 7.5v6c0 1.81-.5 3.66-2.15 5.33-2.05 2.05-4.52 4.22-6.65 6.08-.94.82-1.8 1.56-2.63 2.23C16.84 22 21 17.55 21 12V7l-9-5z"/>
        </svg>
      ),
      badge: 'Business'
    },
    {
      label: 'Manufacturer',
      value: 'manufacturer',
      description: showDescriptions ? 'I am a manufacturer offering services to brands' : undefined,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ),
      badge: 'Creator'
    }
  ];

  return (
    <RHFRadioGroup
      {...props}
      ref={ref}
      name={name}
      control={control}
      options={userTypeOptions}
      variant={variant}
      orientation="grid"
      columns={2}
      transformError={transformError}
      className={className}
    />
  );
});

RHFUserTypeRadio.displayName = 'RHFUserTypeRadio';

/**
 * Specialized radio group for plan selection
 * Aligns with your backend plan validation (foundation, growth, premium, enterprise)
 */
export interface RHFPlanRadioProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  plans?: Array<{
    id: 'foundation' | 'growth' | 'premium' | 'enterprise';
    name: string;
    price: string;
    description: string;
    features: string[];
    recommended?: boolean;
    badge?: string;
  }>;
  showFeatures?: boolean;
}

export const RHFPlanRadio = forwardRef<
  HTMLDivElement,
  RHFPlanRadioProps
>(({ 
  name, 
  control, 
  plans,
  showFeatures = false,
  transformError,
  className,
  ...props 
}, ref) => {
  const defaultPlans = [
    {
      id: 'foundation' as const,
      name: 'Foundation',
      price: 'Free',
      description: 'Perfect for getting started',
      features: ['Basic features', 'Community support'],
      badge: 'Free'
    },
    {
      id: 'growth' as const,
      name: 'Growth',
      price: '$29/mo',
      description: 'For growing businesses',
      features: ['Advanced features', 'Priority support'],
      recommended: true,
      badge: 'Popular'
    },
    {
      id: 'premium' as const,
      name: 'Premium',
      price: '$99/mo',
      description: 'For established businesses',
      features: ['All features', 'Premium support']
    },
    {
      id: 'enterprise' as const,
      name: 'Enterprise',
      price: 'Custom',
      description: 'For large organizations',
      features: ['Custom solutions', 'Dedicated support']
    }
  ];

  const planOptions = (plans || defaultPlans).map(plan => ({
    label: plan.name,
    value: plan.id,
    description: showFeatures ? 
      `${plan.description} • ${plan.features.join(', ')}` : 
      plan.description,
    price: plan.price,
    badge: plan.badge || (plan.recommended ? 'Recommended' : undefined)
  }));

  return (
    <RHFRadioGroup
      {...props}
      ref={ref}
      name={name}
      control={control}
      options={planOptions}
      variant="card"
      orientation="grid"
      columns={2}
      transformError={transformError}
      className={className}
    />
  );
});

RHFPlanRadio.displayName = 'RHFPlanRadio';

/**
 * Specialized radio group for industry selection
 * Aligns with your backend industry validation
 */
export interface RHFIndustryRadioProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  industries?: Array<{
    name: string;
    value: string;
    description?: string;
    icon?: React.ReactNode;
  }>;
  variant?: 'default' | 'card' | 'compact';
}

export const RHFIndustryRadio = forwardRef<
  HTMLDivElement,
  RHFIndustryRadioProps
>(({ 
  name, 
  control, 
  industries,
  variant = 'default',
  transformError,
  className,
  ...props 
}, ref) => {
  const defaultIndustries = [
    { name: 'Technology', value: 'technology', description: 'Software, hardware, and tech services' },
    { name: 'Healthcare', value: 'healthcare', description: 'Medical devices, pharmaceuticals, and health services' },
    { name: 'Manufacturing', value: 'manufacturing', description: 'Industrial production and manufacturing' },
    { name: 'Retail', value: 'retail', description: 'Consumer goods and retail services' },
    { name: 'Food & Beverage', value: 'food_beverage', description: 'Food production and beverage manufacturing' },
    { name: 'Fashion', value: 'fashion', description: 'Apparel, accessories, and fashion goods' },
    { name: 'Automotive', value: 'automotive', description: 'Vehicle manufacturing and automotive parts' },
    { name: 'Other', value: 'other', description: 'Other industries not listed above' }
  ];

  const industryOptions = (industries || defaultIndustries).map(industry => ({
    label: industry.name,
    value: industry.value,
    description: industry.description,
    icon: industry.icon
  }));

  return (
    <RHFRadioGroup
      {...props}
      ref={ref}
      name={name}
      control={control}
      options={industryOptions}
      variant={variant}
      orientation={variant === 'card' ? 'grid' : 'vertical'}
      columns={variant === 'card' ? 2 : undefined}
      transformError={transformError}
      className={className}
    />
  );
});

RHFIndustryRadio.displayName = 'RHFIndustryRadio';