// src/components/forms/controls/slider.tsx

import React, { forwardRef } from 'react';
import { FieldValues } from 'react-hook-form';
import { cn } from '@/lib/utils';

// Import your base slider primitives
import { 
  Slider, 
  RangeSlider,
  type SliderProps as BaseSliderProps,
  type RangeSliderProps as BaseRangeSliderProps
} from '@/components/ui/primitives/slider';

// Import field utilities from your RHF adapters
import { 
  useFieldState, 
  formatFieldError,
  type BaseFieldProps 
} from '@/components/forms/adapters/rhf/field';

/**
 * RHF Slider Component - Single value slider with form integration
 * Aligns with backend number validation patterns
 */
export interface RHFSliderProps<TFieldValues extends FieldValues = FieldValues>
  extends Omit<BaseSliderProps, 'value' | 'onValueChange' | 'name'>,
    BaseFieldProps<TFieldValues> {
  // Value transformation options
  transformValue?: (value: number) => any; // Transform before sending to form
  parseValue?: (value: any) => number; // Parse from form value
}

export const RHFSlider = forwardRef<
  HTMLInputElement,
  RHFSliderProps
>(({ 
  name, 
  control, 
  transformValue,
  parseValue,
  transformError,
  className,
  min = 0,
  max = 100,
  step = 1,
  ...props 
}, ref) => {
  const {
    field,
    error,
    isLoading
  } = useFieldState(name, control);

  const errorMessage = formatFieldError(error, transformError);
  
  // Parse current value from form state
  const currentValue = parseValue ? parseValue(field.value) : Number(field.value || min);
  
  // Handle value change
  const handleValueChange = (value: number) => {
    const transformedValue = transformValue ? transformValue(value) : value;
    field.onChange(transformedValue);
  };

  return (
    <div className="space-y-3">
      <Slider
        {...props}
        ref={ref}
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onValueChange={handleValueChange}
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

RHFSlider.displayName = 'RHFSlider';

/**
 * RHF Range Slider Component - Dual value range slider
 * Perfect for price ranges, date ranges, etc.
 */
export interface RHFRangeSliderProps<TFieldValues extends FieldValues = FieldValues>
  extends Omit<BaseRangeSliderProps, 'value' | 'onValueChange' | 'name'>,
    BaseFieldProps<TFieldValues> {
  // Value transformation options
  transformValue?: (value: [number, number]) => any;
  parseValue?: (value: any) => [number, number];
}

export const RHFRangeSlider = forwardRef<
  HTMLDivElement,
  RHFRangeSliderProps
>(({ 
  name, 
  control, 
  transformValue,
  parseValue,
  transformError,
  className,
  min = 0,
  max = 100,
  step = 1,
  minDistance = 0,
  ...props 
}, ref) => {
  const {
    field,
    error,
    isLoading
  } = useFieldState(name, control);

  const errorMessage = formatFieldError(error, transformError);
  
  // Parse current value from form state
  const currentValue = parseValue ? 
    parseValue(field.value) : 
    (Array.isArray(field.value) ? field.value : [min, max]) as [number, number];
  
  // Handle value change
  const handleValueChange = (value: [number, number]) => {
    const transformedValue = transformValue ? transformValue(value) : value;
    field.onChange(transformedValue);
  };

  return (
    <div className="space-y-3">
      <RangeSlider
        {...props}
        ref={ref}
        min={min}
        max={max}
        step={step}
        minDistance={minDistance}
        value={currentValue}
        onValueChange={handleValueChange}
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

RHFRangeSlider.displayName = 'RHFRangeSlider';

/**
 * Specialized slider for MOQ (Minimum Order Quantity)
 * Aligns with your backend MOQ validation patterns
 */
export interface RHFMOQSliderProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  maxMOQ?: number;
  step?: number;
  unit?: string; // e.g., "units", "pieces", "items"
}

export const RHFMOQSlider = forwardRef<
  HTMLInputElement,
  RHFMOQSliderProps
>(({ 
  name, 
  control, 
  maxMOQ = 10000,
  step = 100,
  unit = 'units',
  transformError,
  className,
  ...props 
}, ref) => {
  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M ${unit}`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K ${unit}`;
    }
    return `${value.toLocaleString()} ${unit}`;
  };

  return (
    <RHFSlider
      {...props}
      ref={ref}
      name={name}
      control={control}
      min={step}
      max={maxMOQ}
      step={step}
      label="Minimum Order Quantity (MOQ)"
      description="Set the minimum quantity customers must order"
      showValue={true}
      formatValue={formatValue}
      color="primary"
      transformError={transformError}
      className={className}
    />
  );
});

RHFMOQSlider.displayName = 'RHFMOQSlider';

/**
 * Specialized range slider for price ranges
 * Perfect for filtering or setting price boundaries
 */
export interface RHFPriceRangeSliderProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  currency?: string;
  maxPrice?: number;
  step?: number;
}

export const RHFPriceRangeSlider = forwardRef<
  HTMLDivElement,
  RHFPriceRangeSliderProps
>(({ 
  name, 
  control, 
  currency = 'USD',
  maxPrice = 10000,
  step = 10,
  transformError,
  className,
  ...props 
}, ref) => {
  const currencySymbol = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    AUD: 'A$'
  }[currency] || '$';

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${currencySymbol}${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${currencySymbol}${(value / 1000).toFixed(0)}K`;
    }
    return `${currencySymbol}${value.toLocaleString()}`;
  };

  // Transform range to object for backend compatibility
  const transformValue = (value: [number, number]) => ({
    min: value[0],
    max: value[1],
    currency
  });

  // Parse object back to range
  const parseValue = (value: any) => {
    if (value && typeof value === 'object' && 'min' in value && 'max' in value) {
      return [value.min, value.max] as [number, number];
    }
    return [0, maxPrice] as [number, number];
  };

  return (
    <RHFRangeSlider
      {...props}
      ref={ref}
      name={name}
      control={control}
      min={0}
      max={maxPrice}
      step={step}
      minDistance={step}
      label="Price Range"
      description="Set your minimum and maximum price range"
      showValue={true}
      formatValue={formatValue}
      color="primary"
      transformValue={transformValue}
      parseValue={parseValue}
      transformError={transformError}
      className={className}
    />
  );
});

RHFPriceRangeSlider.displayName = 'RHFPriceRangeSlider';

/**
 * Specialized slider for percentage values
 * Great for discounts, completion rates, etc.
 */
export interface RHFPercentageSliderProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  precision?: number; // Decimal places for percentage
}

export const RHFPercentageSlider = forwardRef<
  HTMLInputElement,
  RHFPercentageSliderProps
>(({ 
  name, 
  control, 
  precision = 0,
  transformError,
  className,
  ...props 
}, ref) => {
  const formatValue = (value: number) => {
    return `${value.toFixed(precision)}%`;
  };

  // Transform percentage to decimal for backend (0.1 instead of 10)
  const transformValue = (value: number) => value / 100;

  // Parse decimal back to percentage for display
  const parseValue = (value: any) => {
    const numValue = Number(value || 0);
    return numValue <= 1 ? numValue * 100 : numValue;
  };

  return (
    <RHFSlider
      {...props}
      ref={ref}
      name={name}
      control={control}
      min={0}
      max={100}
      step={precision > 0 ? 1 / Math.pow(10, precision) : 1}
      showValue={true}
      formatValue={formatValue}
      color="primary"
      transformValue={transformValue}
      parseValue={parseValue}
      transformError={transformError}
      className={className}
    />
  );
});

RHFPercentageSlider.displayName = 'RHFPercentageSlider';

/**
 * Specialized slider for time/duration values
 * Perfect for delivery times, lead times, etc.
 */
export interface RHFTimeSliderProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  unit?: 'hours' | 'days' | 'weeks' | 'months';
  maxTime?: number;
  step?: number;
}

export const RHFTimeSlider = forwardRef<
  HTMLInputElement,
  RHFTimeSliderProps
>(({ 
  name, 
  control, 
  unit = 'days',
  maxTime = 30,
  step = 1,
  transformError,
  className,
  ...props 
}, ref) => {
  const formatValue = (value: number) => {
    const unitLabel = value === 1 ? unit.slice(0, -1) : unit; // Remove 's' for singular
    return `${value} ${unitLabel}`;
  };

  // Transform to backend format with unit specification
  const transformValue = (value: number) => ({
    value,
    unit,
    // Convert to standardized format (days) for backend calculations
    days: unit === 'hours' ? value / 24 :
          unit === 'weeks' ? value * 7 :
          unit === 'months' ? value * 30 :
          value
  });

  // Parse from backend format
  const parseValue = (value: any) => {
    if (value && typeof value === 'object' && 'value' in value) {
      return value.value;
    }
    return Number(value || 1);
  };

  const maxValue = unit === 'hours' ? 24 * maxTime :
                   unit === 'weeks' ? Math.ceil(maxTime / 7) :
                   unit === 'months' ? Math.ceil(maxTime / 30) :
                   maxTime;

  return (
    <RHFSlider
      {...props}
      ref={ref}
      name={name}
      control={control}
      min={step}
      max={maxValue}
      step={step}
      showValue={true}
      formatValue={formatValue}
      color="primary"
      transformValue={transformValue}
      parseValue={parseValue}
      transformError={transformError}
      className={className}
    />
  );
});

RHFTimeSlider.displayName = 'RHFTimeSlider';

/**
 * Specialized range slider for date ranges
 * Perfect for filtering by date ranges
 */
export interface RHFDateRangeSliderProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  startDate?: Date;
  endDate?: Date;
  step?: number; // Days
}

export const RHFDateRangeSlider = forwardRef<
  HTMLDivElement,
  RHFDateRangeSliderProps
>(({ 
  name, 
  control, 
  startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
  endDate = new Date(),
  step = 1,
  transformError,
  className,
  ...props 
}, ref) => {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const totalDays = Math.ceil((endTime - startTime) / (24 * 60 * 60 * 1000));

  const formatValue = (dayOffset: number) => {
    const date = new Date(startTime + dayOffset * 24 * 60 * 60 * 1000);
    return date.toLocaleDateString();
  };

  // Transform day offsets to actual dates for backend
  const transformValue = (value: [number, number]) => ({
    startDate: new Date(startTime + value[0] * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(startTime + value[1] * 24 * 60 * 60 * 1000).toISOString()
  });

  // Parse dates back to day offsets
  const parseValue = (value: any) => {
    if (value && typeof value === 'object' && 'startDate' in value && 'endDate' in value) {
      const start = new Date(value.startDate).getTime();
      const end = new Date(value.endDate).getTime();
      return [
        Math.ceil((start - startTime) / (24 * 60 * 60 * 1000)),
        Math.ceil((end - startTime) / (24 * 60 * 60 * 1000))
      ] as [number, number];
    }
    return [0, totalDays] as [number, number];
  };

  return (
    <RHFRangeSlider
      {...props}
      ref={ref}
      name={name}
      control={control}
      min={0}
      max={totalDays}
      step={step}
      minDistance={step}
      label="Date Range"
      description="Select the date range for filtering"
      showValue={true}
      formatValue={formatValue}
      color="primary"
      transformValue={transformValue}
      parseValue={parseValue}
      transformError={transformError}
      className={className}
    />
  );
});

RHFDateRangeSlider.displayName = 'RHFDateRangeSlider';

/**
 * Specialized slider for rating/score values
 * Perfect for product ratings, quality scores, etc.
 */
export interface RHFRatingSliderProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  maxRating?: number;
  showStars?: boolean;
  precision?: number;
}

export const RHFRatingSlider = forwardRef<
  HTMLInputElement,
  RHFRatingSliderProps
>(({ 
  name, 
  control, 
  maxRating = 5,
  showStars = true,
  precision = 1,
  transformError,
  className,
  ...props 
}, ref) => {
  const step = 1 / precision;

  const formatValue = (value: number) => {
    const rating = (value / 100) * maxRating;
    const stars = showStars ? '★'.repeat(Math.floor(rating)) + '☆'.repeat(maxRating - Math.floor(rating)) : '';
    return `${rating.toFixed(precision === 1 ? 0 : 1)}/${maxRating} ${stars}`;
  };

  // Transform percentage to actual rating value
  const transformValue = (value: number) => {
    const rating = (value / 100) * maxRating;
    return Number(rating.toFixed(precision === 1 ? 0 : 1));
  };

  // Parse rating back to percentage
  const parseValue = (value: any) => {
    const rating = Number(value || 0);
    return (rating / maxRating) * 100;
  };

  return (
    <RHFSlider
      {...props}
      ref={ref}
      name={name}
      control={control}
      min={0}
      max={100}
      step={step}
      showValue={true}
      formatValue={formatValue}
      color="warning" // Yellow/orange for ratings
      transformValue={transformValue}
      parseValue={parseValue}
      transformError={transformError}
      className={className}
    />
  );
});

RHFRatingSlider.displayName = 'RHFRatingSlider';

/**
 * Specialized slider for budget/cost values
 * Perfect for project budgets, cost estimates, etc.
 */
export interface RHFBudgetSliderProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  currency?: string;
  maxBudget?: number;
  step?: number;
  tiers?: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
}

export const RHFBudgetSlider = forwardRef<
  HTMLInputElement,
  RHFBudgetSliderProps
>(({ 
  name, 
  control, 
  currency = 'USD',
  maxBudget = 100000,
  step = 500,
  tiers,
  transformError,
  className,
  ...props 
}, ref) => {
  const currencySymbol = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    AUD: 'A$'
  }[currency] || '$';

  const defaultTiers = [
    { label: 'Startup', value: 5000, color: 'text-[var(--info)]' },
    { label: 'Small Business', value: 25000, color: 'text-[var(--success)]' },
    { label: 'Enterprise', value: 75000, color: 'text-[var(--primary)]' },
    { label: 'Enterprise+', value: maxBudget, color: 'text-[var(--warning)]' }
  ];

  const budgetTiers = tiers || defaultTiers;

  const formatValue = (value: number) => {
    // Find which tier this budget falls into
    const tier = budgetTiers.find(t => value <= t.value);
    const tierLabel = tier ? ` (${tier.label})` : '';

    if (value >= 1000000) {
      return `${currencySymbol}${(value / 1000000).toFixed(1)}M${tierLabel}`;
    } else if (value >= 1000) {
      return `${currencySymbol}${(value / 1000).toFixed(0)}K${tierLabel}`;
    }
    return `${currencySymbol}${value.toLocaleString()}${tierLabel}`;
  };

  // Transform to backend format with currency and tier info
  const transformValue = (value: number) => {
    const tier = budgetTiers.find(t => value <= t.value);
    return {
      amount: value,
      currency,
      tier: tier?.label || 'Custom'
    };
  };

  // Parse from backend format
  const parseValue = (value: any) => {
    if (value && typeof value === 'object' && 'amount' in value) {
      return value.amount;
    }
    return Number(value || step);
  };

  return (
    <div className="space-y-4">
      <RHFSlider
        {...props}
        ref={ref}
        name={name}
        control={control}
        min={step}
        max={maxBudget}
        step={step}
        label="Project Budget"
        description="Set your project budget range"
        showValue={true}
        formatValue={formatValue}
        color="success"
        transformValue={transformValue}
        parseValue={parseValue}
        transformError={transformError}
        className={className}
      />
      
      {/* Budget tier indicators */}
      <div className="flex justify-between text-xs text-[var(--caption-color)] font-satoshi">
        {budgetTiers.map((tier, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className={cn("w-2 h-2 rounded-full", tier.color?.replace('text-', 'bg-') || 'bg-gray-400')} />
            <span className="mt-1">{tier.label}</span>
            <span className="text-[var(--muted)]">
              {currencySymbol}{tier.value >= 1000 ? `${(tier.value / 1000).toFixed(0)}K` : tier.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

RHFBudgetSlider.displayName = 'RHFBudgetSlider';