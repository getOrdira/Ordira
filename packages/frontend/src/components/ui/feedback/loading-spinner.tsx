// src/components/ui/feedback/loading-spinner.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const spinnerVariants = cva(
  // Base spinner styles - circular border with spinning animation
  "inline-block rounded-full border-solid animate-spin",
  {
    variants: {
      size: {
        xs: "w-4 h-4 border-2",
        sm: "w-5 h-5 border-2", 
        md: "w-6 h-6 border-2",
        lg: "w-8 h-8 border-[3px]",
        xl: "w-12 h-12 border-[3px]",
        "2xl": "w-16 h-16 border-4"
      },
      variant: {
        // Primary spinner (blue)
        primary: [
          "border-[var(--accent)]/20",
          "border-t-[var(--accent)]"
        ].join(" "),
        
        // Secondary spinner (gray)
        secondary: [
          "border-gray-200",
          "border-t-[var(--muted)]"
        ].join(" "),
        
        // Success spinner (green)
        success: [
          "border-[var(--success)]/20",
          "border-t-[var(--success)]"
        ].join(" "),
        
        // Warning spinner (yellow)
        warning: [
          "border-[var(--warning)]/20",
          "border-t-[var(--warning)]"
        ].join(" "),
        
        // Error spinner (red)
        error: [
          "border-[var(--error)]/20",
          "border-t-[var(--error)]"
        ].join(" "),
        
        // White spinner (for dark backgrounds)
        white: [
          "border-white/20",
          "border-t-white"
        ].join(" "),
        
        // Current color spinner (inherits parent color)
        current: [
          "border-current/20",
          "border-t-current"
        ].join(" ")
      },
      speed: {
        slow: "animate-spin-slow",
        normal: "animate-spin",
        fast: "animate-spin-fast"
      }
    },
    defaultVariants: {
      size: "md",
      variant: "primary",
      speed: "normal"
    }
  }
);

export interface LoadingSpinnerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
  center?: boolean;
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ 
    className, 
    size, 
    variant, 
    speed, 
    label = "Loading...", 
    center = false,
    ...props 
  }, ref) => {
    const spinner = (
      <div
        ref={ref}
        className={cn(spinnerVariants({ size, variant, speed }), className)}
        role="status"
        aria-label={label}
        {...props}
      >
        <span className="sr-only">{label}</span>
      </div>
    );

    if (center) {
      return (
        <div className="flex items-center justify-center">
          {spinner}
        </div>
      );
    }

    return spinner;
  }
);

LoadingSpinner.displayName = "LoadingSpinner";

// Spinner with text label
export interface SpinnerWithLabelProps extends LoadingSpinnerProps {
  text?: string;
  description?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const SpinnerWithLabel = React.forwardRef<HTMLDivElement, SpinnerWithLabelProps>(
  ({ 
    text = "Loading...", 
    description,
    position = 'bottom',
    className,
    ...spinnerProps 
  }, ref) => {
    const isVertical = position === 'top' || position === 'bottom';
    const isReversed = position === 'top' || position === 'left';

    return (
      <div 
        ref={ref}
        className={cn(
          "flex items-center",
          isVertical ? "flex-col" : "flex-row",
          isReversed && "flex-col-reverse",
          isVertical ? "space-y-3" : "space-x-3",
          className
        )}
      >
        <LoadingSpinner {...spinnerProps} />
        <div className={cn("text-center", !isVertical && "text-left")}>
          <div className="text-sm font-medium text-[var(--dark)]">
            {text}
          </div>
          {description && (
            <div className="text-xs text-[var(--muted)] mt-1">
              {description}
            </div>
          )}
        </div>
      </div>
    );
  }
);

SpinnerWithLabel.displayName = "SpinnerWithLabel";

// Full page loading overlay
export interface LoadingOverlayProps {
  show: boolean;
  text?: string;
  description?: string;
  backdrop?: boolean;
  spinnerSize?: VariantProps<typeof spinnerVariants>['size'];
  className?: string;
}

const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ 
    show, 
    text = "Loading...", 
    description,
    backdrop = true,
    spinnerSize = "xl",
    className 
  }, ref) => {
    if (!show) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center",
          backdrop && "bg-black/50 backdrop-blur-sm",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label={text}
      >
        <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-2xl shadow-lg">
          <LoadingSpinner size={spinnerSize} />
          <div className="text-center">
            <div className="text-lg font-medium text-[var(--dark)]">
              {text}
            </div>
            {description && (
              <div className="text-sm text-[var(--muted)] mt-1">
                {description}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

LoadingOverlay.displayName = "LoadingOverlay";

// Inline loading state for buttons/components
export interface InlineSpinnerProps extends Omit<LoadingSpinnerProps, 'center'> {
  loading: boolean;
  children: React.ReactNode;
  spinnerPosition?: 'left' | 'right' | 'replace';
}

const InlineSpinner = React.forwardRef<HTMLDivElement, InlineSpinnerProps>(
  ({ 
    loading, 
    children, 
    spinnerPosition = 'left',
    size = 'sm',
    className,
    ...spinnerProps 
  }, ref) => {
    if (spinnerPosition === 'replace') {
      return (
        <div ref={ref} className={cn("inline-flex items-center", className)}>
          {loading ? (
            <LoadingSpinner size={size} {...spinnerProps} />
          ) : (
            children
          )}
        </div>
      );
    }

    return (
      <div 
        ref={ref} 
        className={cn("inline-flex items-center space-x-2", className)}
      >
        {loading && spinnerPosition === 'left' && (
          <LoadingSpinner size={size} {...spinnerProps} />
        )}
        <div className={cn(loading && "opacity-70")}>
          {children}
        </div>
        {loading && spinnerPosition === 'right' && (
          <LoadingSpinner size={size} {...spinnerProps} />
        )}
      </div>
    );
  }
);

InlineSpinner.displayName = "InlineSpinner";

// Skeleton loader with spinner
export interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
  showSpinner?: boolean;
  spinnerSize?: VariantProps<typeof spinnerVariants>['size'];
}

const LoadingSkeleton = React.forwardRef<HTMLDivElement, LoadingSkeletonProps>(
  ({ lines = 3, className, showSpinner = true, spinnerSize = 'md' }, ref) => (
    <div ref={ref} className={cn("space-y-3", className)}>
      {showSpinner && (
        <div className="flex items-center space-x-2 mb-4">
          <LoadingSpinner size={spinnerSize} />
          <span className="text-sm text-[var(--muted)]">Loading content...</span>
        </div>
      )}
      
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-4 bg-gray-200 rounded animate-pulse",
              i === lines - 1 && "w-3/4" // Last line shorter
            )}
          />
        ))}
      </div>
    </div>
  )
);

LoadingSkeleton.displayName = "LoadingSkeleton";

// Dots spinner (alternative style)
export interface DotsSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  className?: string;
}

const DotsSpinner = React.forwardRef<HTMLDivElement, DotsSpinnerProps>(
  ({ size = 'md', variant = 'primary', className }, ref) => {
    const sizeClasses = {
      sm: 'w-1 h-1',
      md: 'w-2 h-2',
      lg: 'w-3 h-3'
    };

    const colorClasses = {
      primary: 'bg-[var(--accent)]',
      secondary: 'bg-[var(--muted)]',
      success: 'bg-[var(--success)]',
      warning: 'bg-[var(--warning)]',
      error: 'bg-[var(--error)]'
    };

    return (
      <div 
        ref={ref}
        className={cn("flex items-center space-x-1", className)}
        role="status"
        aria-label="Loading"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "rounded-full animate-pulse",
              sizeClasses[size],
              colorClasses[variant]
            )}
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: '1s'
            }}
          />
        ))}
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);

DotsSpinner.displayName = "DotsSpinner";

// Custom CSS for additional animation speeds
const spinnerStyles = `
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes spin-fast {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .animate-spin-slow {
    animation: spin-slow 2s linear infinite;
  }
  
  .animate-spin-fast {
    animation: spin-fast 0.5s linear infinite;
  }
`;

// Add styles to document if not already present
if (typeof document !== 'undefined' && !document.getElementById('spinner-styles')) {
  const style = document.createElement('style');
  style.id = 'spinner-styles';
  style.textContent = spinnerStyles;
  document.head.appendChild(style);
}

export { 
  LoadingSpinner, 
  SpinnerWithLabel, 
  LoadingOverlay, 
  InlineSpinner, 
  LoadingSkeleton, 
  DotsSpinner,
  spinnerVariants 
};