// src/components/ui/layout/divider.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const dividerVariants = cva(
  // Base divider styles with Ordira branding
  "border-0 font-satoshi",
  {
    variants: {
      orientation: {
        horizontal: "w-full h-px",
        vertical: "h-full w-px"
      },
      variant: {
        // Subtle divider using Ordira color system
        default: "bg-[var(--border)]",
        // Strong divider for clear separation
        strong: "bg-[var(--border-dark)]",
        // Primary accent divider using Ordira orange
        accent: "bg-[var(--primary)]",
        // Ordira gradient divider for modern look
        gradient: "ordira-gradient",
        // Subtle gradient for light separation
        "gradient-subtle": "bg-gradient-to-r from-transparent via-[var(--border)] to-transparent",
        // Dashed divider with Ordira colors
        dashed: "border-t border-dashed border-[var(--border-dark)] bg-transparent",
        // Dotted divider with Ordira colors
        dotted: "border-t border-dotted border-[var(--border-dark)] bg-transparent"
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
            "relative flex items-center font-satoshi",
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
            "px-3 text-sm text-[var(--caption-color)] bg-[var(--background)] font-satoshi-medium",
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

// Section Divider - For separating major sections with Ordira branding
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
          "relative font-satoshi",
          spacing === 'sm' && "my-4",
          spacing === 'md' && "my-6",
          spacing === 'lg' && "my-8",
          spacing === 'xl' && "my-12",
          className
        )}>
          <div className="flex items-center justify-between mb-4">
            <div>
              {title && (
                <h3 className="font-satoshi-bold text-lg text-[var(--heading-color)]">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-[var(--caption-color)] mt-1 font-satoshi">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2">
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

// Breadcrumb Divider - Specific for breadcrumb separators with Ordira styling
const BreadcrumbDivider = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "text-[var(--caption-color)] select-none font-satoshi-medium text-sm",
        className
      )}
      aria-hidden="true"
      {...props}
    >
      {children || '/'}
    </span>
  )
);

BreadcrumbDivider.displayName = "BreadcrumbDivider";

// Menu Divider - For dropdown and navigation menus with Ordira theming
const MenuDivider = React.forwardRef<HTMLHRElement, Omit<DividerProps, 'orientation' | 'spacing'>>(
  ({ className, ...props }, ref) => (
    <hr
      ref={ref}
      className={cn(
        "border-t border-[var(--border)] my-1 mx-0",
        className
      )}
      {...props}
    />
  )
);

MenuDivider.displayName = "MenuDivider";

// Card Divider - For separating content within cards using Ordira styling
const CardDivider = React.forwardRef<HTMLHRElement, Omit<DividerProps, 'orientation' | 'spacing'>>(
  ({ className, ...props }, ref) => (
    <hr
      ref={ref}
      className={cn(
        "border-t border-[var(--border)] my-4 mx-0",
        className
      )}
      {...props}
    />
  )
);

CardDivider.displayName = "CardDivider";

// Stat Divider - For dashboard stats with Ordira branding
export interface StatDividerProps {
  value: string | number;
  label: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  trend?: React.ReactNode;
  className?: string;
}

const StatDivider = React.forwardRef<HTMLDivElement, StatDividerProps>(
  ({ value, label, change, icon, trend, className }, ref) => (
    <div ref={ref} className={cn("text-center font-satoshi", className)}>
      {icon && (
        <div className="flex justify-center mb-2 text-[var(--primary)]">
          {icon}
        </div>
      )}
      
      <div className="font-satoshi-bold text-2xl lg:text-3xl text-[var(--heading-color)] mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      
      <div className="text-sm text-[var(--caption-color)] font-satoshi-medium mb-1">
        {label}
      </div>
      
      {change && (
        <div className={cn(
          "text-xs font-satoshi-bold",
          change.isPositive ? "text-[var(--success)]" : "text-[var(--error)]"
        )}>
          {change.isPositive ? '+' : ''}{change.value}%
        </div>
      )}
      
      {trend && (
        <div className="mt-2 flex justify-center">
          {trend}
        </div>
      )}
    </div>
  )
);

StatDivider.displayName = "StatDivider";

// Content Divider - For separating different content sections with visual flair
export interface ContentDividerProps extends Omit<DividerProps, 'label'> {
  icon?: React.ReactNode;
  animated?: boolean;
}

const ContentDivider = React.forwardRef<HTMLDivElement, ContentDividerProps>(
  ({ icon, animated = false, variant = 'gradient-subtle', spacing = 'lg', className, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(
          "relative flex items-center justify-center font-satoshi",
          spacing === 'sm' && "my-4",
          spacing === 'md' && "my-6",
          spacing === 'lg' && "my-8",
          spacing === 'xl' && "my-12",
          className
        )}
      >
        <Divider 
          variant={variant}
          spacing="none" 
          className="flex-1"
          {...props}
        />
        
        {icon && (
          <div className={cn(
            "mx-4 p-2 rounded-full bg-[var(--background)] border border-[var(--border)]",
            "text-[var(--primary)] shadow-sm",
            animated && "transition-all duration-300 hover:scale-110 hover:shadow-md"
          )}>
            {icon}
          </div>
        )}
        
        <Divider 
          variant={variant}
          spacing="none" 
          className="flex-1"
          {...props}
        />
      </div>
    );
  }
);

ContentDivider.displayName = "ContentDivider";

// Dashboard Section Divider - Specific for dashboard layouts
export interface DashboardSectionDividerProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  variant?: 'default' | 'accent' | 'gradient';
  className?: string;
}

const DashboardSectionDivider = React.forwardRef<HTMLDivElement, DashboardSectionDividerProps>(
  ({ title, subtitle, actions, variant = 'default', className }, ref) => {
    const variantStyles = {
      default: "border-[var(--border)]",
      accent: "border-[var(--primary)]", 
      gradient: "ordira-border-gradient"
    };

    return (
      <div 
        ref={ref}
        className={cn(
          "py-6 border-b font-satoshi",
          variantStyles[variant],
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-satoshi-bold text-xl lg:text-2xl text-[var(--heading-color)]">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[var(--caption-color)] mt-1 font-satoshi">
                {subtitle}
              </p>
            )}
          </div>
          
          {actions && (
            <div className="flex items-center gap-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    );
  }
);

DashboardSectionDivider.displayName = "DashboardSectionDivider";

export { 
  Divider, 
  SectionDivider, 
  BreadcrumbDivider, 
  MenuDivider, 
  CardDivider, 
  StatDivider,
  ContentDivider,
  DashboardSectionDivider,
  dividerVariants 
};