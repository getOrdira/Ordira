// src/components/ui/primitives/slider.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const sliderVariants = cva(
  // Base track styles
  "relative flex w-full touch-none select-none items-center",
  {
    variants: {
      size: {
        sm: "h-4",
        md: "h-5", 
        lg: "h-6"
      }
    },
    defaultVariants: {
      size: "md"
    }
  }
);

const trackVariants = cva(
  // Base track styles - gray background track
  "relative h-2 w-full grow overflow-hidden rounded-full",
  {
    variants: {
      variant: {
        default: "bg-gray-200",
        muted: "bg-gray-100"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

const rangeVariants = cva(
  // Progress/filled portion of track - using Ordira orange
  "absolute h-full rounded-full transition-all duration-200",
  {
    variants: {
      color: {
        primary: "bg-[var(--primary)]", // Ordira orange
        success: "bg-[var(--success)]", 
        warning: "bg-[var(--warning)]",
        error: "bg-[var(--error)]"
      }
    },
    defaultVariants: {
      color: "primary"
    }
  }
);

const thumbVariants = cva(
  // Slider thumb/handle - matches the 4-dot design from image
  "absolute block h-6 w-6 rounded-full border-2 border-white shadow-lg ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing",
  {
    variants: {
      color: {
        primary: [
          "bg-[var(--primary)]", // Orange background
          "shadow-[var(--primary)]/20",
          "focus-visible:ring-[var(--primary)]",
          "hover:shadow-[var(--primary)]/30 hover:scale-110",
          // Add the 4-dot pattern using pseudo-elements
          "relative",
          "before:content-[''] before:absolute before:inset-0 before:rounded-full",
          "before:bg-[radial-gradient(circle_at_30%_30%,white_1.5px,transparent_1.5px,transparent_50%,white_1.5px,transparent_1.5px),radial-gradient(circle_at_70%_30%,white_1.5px,transparent_1.5px,transparent_50%,white_1.5px,transparent_1.5px),radial-gradient(circle_at_30%_70%,white_1.5px,transparent_1.5px,transparent_50%,white_1.5px,transparent_1.5px),radial-gradient(circle_at_70%_70%,white_1.5px,transparent_1.5px,transparent_50%,white_1.5px,transparent_1.5px)]",
          "before:bg-size-[8px_8px,8px_8px,8px_8px,8px_8px]",
          "before:bg-position-[4px_4px,12px_4px,4px_12px,12px_12px]"
        ].join(" "),
        success: [
          "bg-[var(--success)]",
          "shadow-[var(--success)]/20", 
          "focus-visible:ring-[var(--success)]",
          "hover:shadow-[var(--success)]/30 hover:scale-110"
        ].join(" "),
        warning: [
          "bg-[var(--warning)]",
          "shadow-[var(--warning)]/20",
          "focus-visible:ring-[var(--warning)]", 
          "hover:shadow-[var(--warning)]/30 hover:scale-110"
        ].join(" "),
        error: [
          "bg-[var(--error)]",
          "shadow-[var(--error)]/20",
          "focus-visible:ring-[var(--error)]",
          "hover:shadow-[var(--error)]/30 hover:scale-110"
        ].join(" ")
      },
      size: {
        sm: "h-5 w-5",
        md: "h-6 w-6",
        lg: "h-7 w-7"
      }
    },
    defaultVariants: {
      color: "primary",
      size: "md"
    }
  }
);

// Thumb dots component for better control over the 4-dot pattern
const ThumbDots = ({ color }: { color: string }) => (
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="grid grid-cols-2 gap-1">
      <div className="w-1 h-1 bg-white rounded-full"></div>
      <div className="w-1 h-1 bg-white rounded-full"></div>
      <div className="w-1 h-1 bg-white rounded-full"></div>
      <div className="w-1 h-1 bg-white rounded-full"></div>
    </div>
  </div>
);

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof sliderVariants> {
  label?: string;
  description?: string;
  showValue?: boolean;
  showPercentage?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'error';
  formatValue?: (value: number) => string;
  onValueChange?: (value: number) => void;
  trackVariant?: 'default' | 'muted';
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ 
    className, 
    size,
    label,
    description,
    showValue = false,
    showPercentage = false,
    color = 'primary',
    formatValue,
    min = 0,
    max = 100,
    step = 1,
    value,
    defaultValue,
    onValueChange,
    onChange,
    trackVariant = 'default',
    disabled,
    id,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = useState(
      Number(defaultValue || value || min)
    );
    
    const currentValue = value !== undefined ? Number(value) : internalValue;
    const sliderId = id || `slider-${Math.random().toString(36).substr(2, 9)}`;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value);
      setInternalValue(newValue);
      onValueChange?.(newValue);
      onChange?.(e);
    };

    // Calculate percentage for styling
    const percentage = ((currentValue - Number(min)) / (Number(max) - Number(min))) * 100;
    
    // Format display value
    const displayValue = formatValue 
      ? formatValue(currentValue)
      : showPercentage 
        ? `${Math.round(percentage)}%`
        : currentValue.toString();

    const sliderElement = (
      <div className={cn(sliderVariants({ size, className }))}>
        {/* Hidden input for accessibility and form integration */}
        <input
          ref={ref}
          type="range"
          id={sliderId}
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        
        {/* Custom slider track */}
        <div className={cn(trackVariants({ variant: trackVariant }))}>
          {/* Filled portion */}
          <div 
            className={cn(rangeVariants({ color }))}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* Slider thumb with 4-dot pattern */}
        <div 
          className={cn(thumbVariants({ color, size }))}
          style={{ 
            left: `${percentage}%`,
            transform: 'translateX(-50%)',
          }}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={`Slider thumb, value ${displayValue}`}
        >
          <ThumbDots color={color} />
        </div>
      </div>
    );

    // If no label, description, or value display, return just the slider
    if (!label && !description && !showValue && !showPercentage) {
      return sliderElement;
    }

    return (
      <div className="space-y-3">
        {/* Header with label and value */}
        {(label || showValue || showPercentage) && (
          <div className="flex items-center justify-between">
            {label && (
              <label 
                htmlFor={sliderId}
                className="text-sm font-satoshi-medium text-[var(--ordira-accent)]"
              >
                {label}
              </label>
            )}
            {(showValue || showPercentage) && (
              <span className="text-sm font-satoshi-medium text-[var(--ordira-accent)]">
                {displayValue}
              </span>
            )}
          </div>
        )}
        
        {/* Slider */}
        {sliderElement}
        
        {/* Description */}
        {description && (
          <p className="text-xs font-satoshi-regular text-[var(--muted)]">
            {description}
          </p>
        )}
      </div>
    );
  }
);

Slider.displayName = "Slider";

// Range Slider Component (dual thumb)
export interface RangeSliderProps 
  extends Omit<SliderProps, 'value' | 'defaultValue' | 'onValueChange'> {
  value?: [number, number];
  defaultValue?: [number, number];
  onValueChange?: (value: [number, number]) => void;
  minDistance?: number;
}

const RangeSlider = React.forwardRef<HTMLDivElement, RangeSliderProps>(
  ({ 
    className, 
    size,
    label,
    description,
    showValue = false,
    showPercentage = false,
    color = 'primary',
    formatValue,
    min = 0,
    max = 100,
    step = 1,
    value,
    defaultValue,
    onValueChange,
    trackVariant = 'default',
    disabled,
    minDistance = 0,
    id,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = useState<[number, number]>(
      defaultValue || value || [Number(min), Number(max)]
    );
    
    const currentValue = value || internalValue;
    const [minVal, maxVal] = currentValue;
    const rangerId = id || `range-slider-${Math.random().toString(36).substr(2, 9)}`;
    
    const handleMinChange = (newMin: number) => {
      const constrainedMin = Math.min(newMin, maxVal - minDistance);
      const newValue: [number, number] = [constrainedMin, maxVal];
      setInternalValue(newValue);
      onValueChange?.(newValue);
    };
    
    const handleMaxChange = (newMax: number) => {
      const constrainedMax = Math.max(newMax, minVal + minDistance);
      const newValue: [number, number] = [minVal, constrainedMax];
      setInternalValue(newValue);
      onValueChange?.(newValue);
    };

    // Calculate percentages for styling
    const minPercentage = ((minVal - Number(min)) / (Number(max) - Number(min))) * 100;
    const maxPercentage = ((maxVal - Number(min)) / (Number(max) - Number(min))) * 100;
    
    // Format display values
    const displayMinValue = formatValue 
      ? formatValue(minVal)
      : showPercentage 
        ? `${Math.round(minPercentage)}%`
        : minVal.toString();
        
    const displayMaxValue = formatValue 
      ? formatValue(maxVal)
      : showPercentage 
        ? `${Math.round(maxPercentage)}%`
        : maxVal.toString();

    return (
      <div ref={ref} className="space-y-3">
        {/* Header with label and values */}
        {(label || showValue || showPercentage) && (
          <div className="flex items-center justify-between">
            {label && (
              <label className="text-sm font-satoshi-medium text-[var(--ordira-accent)]">
                {label}
              </label>
            )}
            {(showValue || showPercentage) && (
              <div className="flex items-center space-x-2 text-sm font-satoshi-medium text-[var(--ordira-accent)]">
                <span>{displayMinValue}</span>
                <span className="text-[var(--muted)]">-</span>
                <span>{displayMaxValue}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Range Slider */}
        <div className={cn(sliderVariants({ size, className }))}>
          {/* Hidden inputs for accessibility */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={minVal}
            onChange={(e) => handleMinChange(Number(e.target.value))}
            disabled={disabled}
            className="sr-only"
            aria-label={`Minimum value: ${displayMinValue}`}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={maxVal}
            onChange={(e) => handleMaxChange(Number(e.target.value))}
            disabled={disabled}
            className="sr-only"
            aria-label={`Maximum value: ${displayMaxValue}`}
          />
          
          {/* Custom track */}
          <div className={cn(trackVariants({ variant: trackVariant }))}>
            {/* Filled portion between thumbs */}
            <div 
              className={cn(rangeVariants({ color }))}
              style={{ 
                left: `${minPercentage}%`,
                width: `${maxPercentage - minPercentage}%`
              }}
            />
          </div>
          
          {/* Min thumb */}
          <div 
            className={cn(thumbVariants({ color, size }))}
            style={{ 
              left: `${minPercentage}%`,
              transform: 'translateX(-50%)',
              zIndex: minVal > maxVal - (Number(max) - Number(min)) * 0.1 ? 2 : 1
            }}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`Minimum slider thumb, value ${displayMinValue}`}
          >
            <ThumbDots color={color} />
          </div>
          
          {/* Max thumb */}
          <div 
            className={cn(thumbVariants({ color, size }))}
            style={{ 
              left: `${maxPercentage}%`,
              transform: 'translateX(-50%)',
              zIndex: 1
            }}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`Maximum slider thumb, value ${displayMaxValue}`}
          >
            <ThumbDots color={color} />
          </div>
        </div>
        
        {/* Description */}
        {description && (
          <p className="text-xs font-satoshi-regular text-[var(--muted)]">
            {description}
          </p>
        )}
      </div>
    );
  }
);

RangeSlider.displayName = "RangeSlider";

export { 
  Slider, 
  RangeSlider, 
  sliderVariants 
};