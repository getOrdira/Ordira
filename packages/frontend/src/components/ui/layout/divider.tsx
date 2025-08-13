// src/components/ui/layout/divider.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const dividerVariants = cva(
  // Base divider styles
  "border-0",
  {
    variants: {
      orientation: {
        horizontal: "w-full h-px",
        vertical: "h-full w-px"
      },
      variant: {
        // Subtle divider for light separation
        default: "bg-gray-200",
        // Strong divider for clear separation
        strong: "bg-gray-300",
        // Accent divider for emphasis
        accent: "bg-[var(--accent)]",
        // Gradient divider for modern look
        gradient: "bg-gradient-to-r from-transparent via-gray-200 to-transparent",
        // Dashed divider for visual variety
        dashed: "border-t border-dashed border-gray-300 bg-transparent",
        // Dotted divider
        dotted: "border-t border-dotted border-gray-300 bg-transparent"
      },
      size: {
        sm: "",
        md: "",
        lg: ""
      },
      spacing: {
        none: "",
        sm: "",
        md: "",
        lg: "",
        xl: ""
      }
    },
    compoundVariants: [
      // Horizontal spacing variants
      {
        orientation: "horizontal",
        spacing: "sm",
        class: "my-2"
      },
      {
        orientation: "horizontal", 
        spacing: "md",
        class: "my-4"
      },
      {
        orientation: "horizontal",
        spacing: "lg", 
        class: "my-6"
      },
      {
        orientation: "horizontal",
        spacing: "xl",
        class: "my-8"
      },
      // Vertical spacing variants
      {
        orientation: "vertical",
        spacing: "sm",
        class: "mx-2"
      },
      {
        orientation: "vertical",
        spacing: "md", 
        class: "mx-4"
      },
      {
        orientation: "vertical",
        spacing: "lg",
        class: "mx-6"
      },
      {
        orientation: "vertical",
        spacing: "xl",
        class: "mx-8"
      },
      // Size variants for horizontal
      {
        orientation: "horizontal",
        size: "sm",
        class: "h-px"
      },
      {
        orientation: "horizontal",
        size: "md", 
        class: "h-0.5"
      },
      {
        orientation: "horizontal",
        size: "lg",
        class: "h-1"
      },
      // Size variants for vertical
      {
        orientation: "vertical",
        size: "sm",
        class: "w-px"
      },
      {
        orientation: "vertical",
        size: "md",
        class: "w-0.5" 
      },
      {
        orientation: "vertical",
        size: "lg",
        class: "w-1"
      }
    ],
    defaultVariants: {
      orientation: "horizontal",
      variant: "default",
      size: "sm",
      spacing: "md"
    }
  }
);

export interface DividerProps
  extends React.HTMLAttributes<HTMLHRElement>,
    VariantProps<typeof dividerVariants> {
  label?: string;
  labelPosition?: 'left' | 'center' | 'right';
}

const Divider = React.forwardRef<HTMLHRElement, DividerProps>(
  ({ 
    className, 
    orientation, 
    variant, 
    size, 
    spacing, 
    label, 
    labelPosition = 'center',
    ...props 
  }, ref) => {
    // If there's a label, render a labeled divider
    if (label && orientation === 'horizontal') {
      return (
        <div 
          className={cn(
            "relative flex items-center",
            spacing === 'sm' && "my-2",
            spacing === 'md' && "my-4", 
            spacing === 'lg' && "my-6",
            spacing === 'xl' && "my-8"
          )}
        >
          <div 
            className={cn(
              dividerVariants({ orientation, variant, size, spacing: 'none' }),
              labelPosition === 'center' && "flex-1",
              labelPosition === 'left' && "w-12",
              labelPosition === 'right' && "flex-1"
            )}
          />
          
          <div className={cn(
            "px-3 text-sm text-[var(--muted)] bg-[var(--background)]",
            labelPosition === 'center' && "flex-shrink-0"
          )}>
            {label}
          </div>
          
          <div 
            className={cn(
              dividerVariants({ orientation, variant, size, spacing: 'none' }),
              labelPosition === 'center' && "flex-1",
              labelPosition === 'left' && "flex-1", 
              labelPosition === 'right' && "w-12"
            )}
          />
        </div>
      );
    }

    return (
      <hr
        ref={ref}
        className={cn(dividerVariants({ orientation, variant, size, spacing }), className)}
        {...props}
      />
    );
  }
);

Divider.displayName = "Divider";

// Section Divider - For separating major sections
export interface SectionDividerProps extends Omit<DividerProps, 'orientation'> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

const SectionDivider = React.forwardRef<HTMLHRElement, SectionDividerProps>(
  ({ title, description, actions, className, spacing = 'xl', ...props }, ref) => {
    if (title || description || actions) {
      return (
        <div className={cn(
          "relative",
          spacing === 'sm' && "my-4",
          spacing === 'md' && "my-6",
          spacing === 'lg' && "my-8",
          spacing === 'xl' && "my-12",
          className
        )}>
          <div className="flex items-center justify-between mb-4">
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-[var(--dark)]">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-[var(--muted)] mt-1">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center space-x-2">
                {actions}
              </div>
            )}
          </div>
          
          <Divider ref={ref} spacing="none" {...props} />
        </div>
      );
    }

    return <Divider ref={ref} spacing={spacing} className={className} {...props} />;
  }
);

SectionDivider.displayName = "SectionDivider";

// Breadcrumb Divider - Specific for breadcrumb separators
const BreadcrumbDivider = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("text-[var(--muted)] select-none", className)}
      aria-hidden="true"
      {...props}
    >
      {children || '/'}
    </span>
  )
);

BreadcrumbDivider.displayName = "BreadcrumbDivider";

// Menu Divider - For dropdown and navigation menus
const MenuDivider = React.forwardRef<HTMLHRElement, Omit<DividerProps, 'orientation' | 'spacing'>>(
  ({ className, ...props }, ref) => (
    <hr
      ref={ref}
      className={cn(
        "border-t border-gray-100 my-1 mx-0",
        className
      )}
      {...props}
    />
  )
);

MenuDivider.displayName = "MenuDivider";

// Card Divider - For separating content within cards
const CardDivider = React.forwardRef<HTMLHRElement, Omit<DividerProps, 'orientation' | 'spacing'>>(
  ({ className, ...props }, ref) => (
    <hr
      ref={ref}
      className={cn(
        "border-t border-gray-100 my-4 mx-0",
        className
      )}
      {...props}
    />
  )
);

CardDivider.displayName = "CardDivider";

// Stat Divider - For dashboard stats with visual separation
export interface StatDividerProps {
  value: string | number;
  label: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const StatDivider = React.forwardRef<HTMLDivElement, StatDividerProps>(
  ({ value, label, change, className }, ref) => (
    <div ref={ref} className={cn("text-center", className)}>
      <div className="text-2xl font-bold text-[var(--dark)]">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-sm text-[var(--muted)]">{label}</div>
      {change && (
        <div className={cn(
          "text-xs font-medium mt-1",
          change.isPositive ? "text-[var(--success)]" : "text-[var(--error)]"
        )}>
          {change.isPositive ? '+' : ''}{change.value}%
        </div>
      )}
    </div>
  )
);

StatDivider.displayName = "StatDivider";

export { 
  Divider, 
  SectionDivider, 
  BreadcrumbDivider, 
  MenuDivider, 
  CardDivider, 
  StatDivider,
  dividerVariants 
};