// src/components/ui/primitives/switch.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/utils';

const switchVariants = cva(
  // Base styles - matches the rounded pill design from your image
  "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 shadow-inner",
  {
    variants: {
      variant: {
        // Default switch with Ordira orange
        default: [
          "data-[state=checked]:bg-[var(--primary)]",
          "data-[state=unchecked]:bg-gray-300",
          "focus-visible:ring-[var(--primary)]",
          "data-[state=checked]:shadow-[var(--primary)]/20",
          "data-[state=unchecked]:shadow-gray-400/20"
        ].join(" "),
        
        // Success variant
        success: [
          "data-[state=checked]:bg-[var(--success)]",
          "data-[state=unchecked]:bg-gray-300", 
          "focus-visible:ring-[var(--success)]",
          "data-[state=checked]:shadow-[var(--success)]/20"
        ].join(" "),
        
        // Warning variant
        warning: [
          "data-[state=checked]:bg-[var(--warning)]",
          "data-[state=unchecked]:bg-gray-300",
          "focus-visible:ring-[var(--warning)]",
          "data-[state=checked]:shadow-[var(--warning)]/20"
        ].join(" "),
        
        // Error variant
        error: [
          "data-[state=checked]:bg-[var(--error)]",
          "data-[state=unchecked]:bg-gray-300",
          "focus-visible:ring-[var(--error)]",
          "data-[state=checked]:shadow-[var(--error)]/20"
        ].join(" "),
        
        // Dark mode variant (left side of your image)
        dark: [
          "data-[state=checked]:bg-[var(--ordira-accent)]",
          "data-[state=unchecked]:bg-gray-700",
          "focus-visible:ring-[var(--ordira-accent)]",
          "data-[state=checked]:shadow-[var(--ordira-accent)]/20",
          "border-gray-600"
        ].join(" "),
        
        // Light mode variant (right side of your image)
        light: [
          "data-[state=checked]:bg-[var(--primary)]",
          "data-[state=unchecked]:bg-gray-200",
          "focus-visible:ring-[var(--primary)]",
          "data-[state=checked]:shadow-[var(--primary)]/20",
          "border-gray-300"
        ].join(" ")
      },
      size: {
        sm: "h-5 w-9",
        md: "h-6 w-11", 
        lg: "h-7 w-13",
        xl: "h-8 w-15"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

const thumbVariants = cva(
  // Switch thumb/circle - enhanced with proper shadows and transitions
  "pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-all duration-300 ease-in-out",
  {
    variants: {
      variant: {
        default: [
          "shadow-gray-400/40",
          "data-[state=checked]:shadow-[var(--primary)]/30"
        ].join(" "),
        success: [
          "shadow-gray-400/40",
          "data-[state=checked]:shadow-[var(--success)]/30"
        ].join(" "),
        warning: [
          "shadow-gray-400/40",
          "data-[state=checked]:shadow-[var(--warning)]/30"
        ].join(" "), 
        error: [
          "shadow-gray-400/40",
          "data-[state=checked]:shadow-[var(--error)]/30"
        ].join(" "),
        dark: [
          "bg-gray-100 shadow-gray-900/60",
          "data-[state=checked]:shadow-[var(--ordira-accent)]/40"
        ].join(" "),
        light: [
          "bg-white shadow-gray-400/50",
          "data-[state=checked]:shadow-[var(--primary)]/30"
        ].join(" ")
      },
      size: {
        sm: "h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5",
        md: "h-5 w-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5",
        lg: "h-6 w-6 data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-0.5", 
        xl: "h-7 w-7 data-[state=checked]:translate-x-7 data-[state=unchecked]:translate-x-0.5"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof switchVariants> {
  label?: string;
  description?: string;
  onCheckedChange?: (checked: boolean) => void;
  labelPosition?: 'left' | 'right';
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ 
    className, 
    variant, 
    size,
    label,
    description,
    checked,
    disabled,
    onCheckedChange,
    onChange,
    labelPosition = 'right',
    id,
    ...props 
  }, ref) => {
    const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = e.target.checked;
      onCheckedChange?.(isChecked);
      onChange?.(e);
    };

    // Determine the state for styling
    const state = checked ? 'checked' : 'unchecked';

    const switchElement = (
      <div className="relative">
        <input
          ref={ref}
          type="checkbox"
          id={switchId}
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          {...props}
        />
        <div
          className={cn(switchVariants({ variant, size, className }))}
          data-state={state}
          role="switch"
          aria-checked={checked}
          aria-disabled={disabled}
        >
          <div
            className={cn(thumbVariants({ variant, size }))}
            data-state={state}
          />
        </div>
      </div>
    );

    // If no label or description, return just the switch
    if (!label && !description) {
      return switchElement;
    }

    return (
      <div className={cn(
        "flex items-start gap-3",
        labelPosition === 'left' && "flex-row-reverse"
      )}>
        {switchElement}
        
        {(label || description) && (
          <div className="flex flex-col space-y-1">
            {label && (
              <label
                htmlFor={switchId}
                className={cn(
                  "text-sm font-satoshi-medium leading-none cursor-pointer",
                  disabled ? "text-[var(--muted)] opacity-70" : "text-[var(--ordira-accent)]"
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className={cn(
                "text-xs font-satoshi-regular leading-relaxed",
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

Switch.displayName = "Switch";

// Theme Switch Component - specifically for light/dark mode (matches your image design)
export interface ThemeSwitchProps extends Omit<SwitchProps, 'variant'> {
  theme?: 'light' | 'dark' | 'system';
  onThemeChange?: (theme: 'light' | 'dark') => void;
  showLabels?: boolean;
}

const ThemeSwitch = React.forwardRef<HTMLInputElement, ThemeSwitchProps>(
  ({ 
    theme = 'light',
    onThemeChange,
    showLabels = true,
    className,
    ...props 
  }, ref) => {
    const isDark = theme === 'dark';
    
    const handleChange = (checked: boolean) => {
      onThemeChange?.(checked ? 'dark' : 'light');
    };

    return (
      <div className="flex items-center space-x-3">
        {showLabels && (
          <span className={cn(
            "text-sm font-satoshi-medium transition-colors",
            !isDark ? "text-[var(--ordira-accent)]" : "text-[var(--muted)]"
          )}>
            ☀️ Light
          </span>
        )}
        
        <Switch
          ref={ref}
          variant={isDark ? "dark" : "light"}
          checked={isDark}
          onCheckedChange={handleChange}
          className={className}
          aria-label="Toggle theme"
          {...props}
        />
        
        {showLabels && (
          <span className={cn(
            "text-sm font-satoshi-medium transition-colors",
            isDark ? "text-[var(--ordira-accent)]" : "text-[var(--muted)]"
          )}>
            🌙 Dark
          </span>
        )}
      </div>
    );
  }
);

ThemeSwitch.displayName = "ThemeSwitch";

// Switch Group Component for multiple related switches
export interface SwitchGroupProps {
  label?: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

const SwitchGroup = React.forwardRef<HTMLDivElement, SwitchGroupProps>(
  ({ label, description, error, children, className, orientation = 'vertical' }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-3", className)}>
        {(label || description) && (
          <div className="space-y-1">
            {label && (
              <label className="text-sm font-satoshi-medium text-[var(--ordira-accent)]">
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs font-satoshi-regular text-[var(--muted)]">
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
          <p className="text-sm font-satoshi-regular text-[var(--error)] flex items-center gap-1">
            <span className="w-4 h-4">⚠</span>
            {error}
          </p>
        )}
      </div>
    );
  }
);

SwitchGroup.displayName = "SwitchGroup";

// Feature Switch - Switch with icon and enhanced styling
export interface FeatureSwitchProps extends SwitchProps {
  icon?: React.ReactNode;
  badge?: string;
  isNew?: boolean;
}

const FeatureSwitch = React.forwardRef<HTMLInputElement, FeatureSwitchProps>(
  ({ icon, badge, isNew, label, description, className, ...props }, ref) => {
    return (
      <div className={cn(
        "flex items-start space-x-3 p-4 rounded-xl border border-gray-200 transition-all duration-200",
        "hover:bg-gray-50 hover:border-gray-300",
        props.checked && "bg-[var(--primary)]/5 border-[var(--primary)]/30",
        className
      )}>
        {icon && (
          <div className={cn(
            "flex-shrink-0 p-2 rounded-lg transition-colors",
            props.checked 
              ? "bg-[var(--primary)]/10 text-[var(--primary)]" 
              : "bg-gray-100 text-[var(--muted)]"
          )}>
            {icon}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {label && (
                <span className="text-sm font-satoshi-medium text-[var(--ordira-accent)]">
                  {label}
                </span>
              )}
              {isNew && (
                <span className="text-xs font-satoshi-medium px-2 py-0.5 bg-[var(--success)]/10 text-[var(--success)] rounded-full">
                  New
                </span>
              )}
              {badge && (
                <span className="text-xs font-satoshi-medium px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full">
                  {badge}
                </span>
              )}
            </div>
            
            <Switch
              ref={ref}
              {...props}
            />
          </div>
          
          {description && (
            <p className="mt-1 text-xs font-satoshi-regular text-[var(--muted)] leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
    );
  }
);

FeatureSwitch.displayName = "FeatureSwitch";

export { 
  Switch, 
  ThemeSwitch, 
  SwitchGroup, 
  FeatureSwitch, 
  switchVariants 
};