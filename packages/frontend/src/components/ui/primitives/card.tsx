// src/components/ui/layout/card.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  // Base styles
  "rounded-2xl transition-all duration-200 relative overflow-hidden",
  {
    variants: {
      variant: {
        // Default card with subtle shadow
        default: [
          "bg-white border",
          "border-gray-200/60",
          "shadow-sm hover:shadow-md",
          "backdrop-blur-sm"
        ].join(" "),
        
        // Elevated card with more prominent shadow
        elevated: [
          "bg-white border",
          "border-gray-200/40",
          "shadow-lg hover:shadow-xl",
          "backdrop-blur-sm"
        ].join(" "),
        
        // Interactive card for clickable elements
        interactive: [
          "bg-white border cursor-pointer",
          "border-gray-200/60",
          "shadow-sm hover:shadow-lg",
          "hover:scale-[1.02] active:scale-[0.98]",
          "backdrop-blur-sm"
        ].join(" "),
        
        // Outlined card with minimal shadow
        outlined: [
          "bg-white border-2",
          "border-[var(--card-border)]",
          "shadow-none hover:shadow-sm"
        ].join(" "),
        
        // Ghost card with minimal styling
        ghost: [
          "bg-white/50 border",
          "border-gray-200/30",
          "shadow-none hover:shadow-sm",
          "backdrop-blur-md"
        ].join(" "),
        
        // Gradient card with subtle background
        gradient: [
          "bg-gradient-to-br from-white to-gray-50/80 border",
          "border-gray-200/50",
          "shadow-sm hover:shadow-md",
          "backdrop-blur-sm"
        ].join(" ")
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
        xl: "p-10"
      },
      size: {
        sm: "max-w-sm",
        md: "max-w-md", 
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        full: "w-full",
        auto: "w-auto"
      }
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
      size: "auto"
    }
  }
);

const cardHeaderVariants = cva(
  "flex flex-col space-y-1.5",
  {
    variants: {
      padding: {
        none: "p-0",
        sm: "p-4 pb-2",
        md: "p-6 pb-3",
        lg: "p-8 pb-4",
        xl: "p-10 pb-5"
      }
    },
    defaultVariants: {
      padding: "md"
    }
  }
);

const cardContentVariants = cva(
  "",
  {
    variants: {
      padding: {
        none: "p-0",
        sm: "p-4 pt-0",
        md: "p-6 pt-0", 
        lg: "p-8 pt-0",
        xl: "p-10 pt-0"
      }
    },
    defaultVariants: {
      padding: "md"
    }
  }
);

const cardFooterVariants = cva(
  "flex items-center",
  {
    variants: {
      padding: {
        none: "p-0",
        sm: "p-4 pt-2",
        md: "p-6 pt-3",
        lg: "p-8 pt-4", 
        xl: "p-10 pt-5"
      }
    },
    defaultVariants: {
      padding: "md"
    }
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

export interface CardHeaderProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardHeaderVariants> {}

export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardContentVariants> {}

export interface CardFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardFooterVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, size, className }))}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardHeaderVariants({ padding, className }))}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "font-semibold leading-none tracking-tight",
        "text-[var(--dark)] text-lg",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        "text-sm leading-relaxed",
        "text-[var(--muted)]",
        className
      )}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardContentVariants({ padding, className }))}
      {...props}
    />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardFooterVariants({ padding, className }))}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

// Specialized card components for common patterns

export interface MetricCardProps extends CardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    percentage: string;
    isPositive: boolean;
  };
  description?: string;
  icon?: React.ReactNode;
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ title, value, change, description, icon, className, ...props }, ref) => (
    <Card
      ref={ref}
      variant="elevated"
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-[var(--muted)]">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-[var(--muted)]">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[var(--dark)]">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {change && (
          <div className={cn(
            "flex items-center text-xs mt-1",
            change.isPositive ? "text-[var(--success)]" : "text-[var(--error)]"
          )}>
            <span className="mr-1">
              {change.isPositive ? "↗" : "↘"}
            </span>
            {change.percentage}
          </div>
        )}
        {description && (
          <p className="text-xs text-[var(--muted)] mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
);
MetricCard.displayName = "MetricCard";

export interface FeatureCardProps extends CardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  status?: 'active' | 'inactive' | 'pending';
}

const FeatureCard = React.forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ title, description, icon, action, status, className, ...props }, ref) => (
    <Card
      ref={ref}
      variant="interactive"
      className={cn("group", className)}
      {...props}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="flex-shrink-0 p-2 rounded-lg bg-[var(--accent)]/10">
                <div className="text-[var(--accent)]">
                  {icon}
                </div>
              </div>
            )}
            <div>
              <CardTitle className="group-hover:text-[var(--accent)] transition-colors">
                {title}
              </CardTitle>
              {status && (
                <div className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1",
                  status === 'active' && "bg-[var(--success)]/10 text-[var(--success)]",
                  status === 'inactive' && "bg-[var(--muted)]/10 text-[var(--muted)]",
                  status === 'pending' && "bg-[var(--warning)]/10 text-[var(--warning)]"
                )}>
                  {status}
                </div>
              )}
            </div>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="leading-relaxed">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  )
);
FeatureCard.displayName = "FeatureCard";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  MetricCard,
  FeatureCard,
  cardVariants
};