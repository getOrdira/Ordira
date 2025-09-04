// src/components/ui/primitives/card.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  // Base styles
  "bg-white rounded-2xl transition-all duration-200 relative overflow-hidden",
  {
    variants: {
      variant: {
        // Default elevated card
        default: [
          "border border-gray-100/60 shadow-sm",
          "hover:shadow-md hover:border-gray-200/80"
        ].join(" "),
        
        // Elevated card with more prominent shadow
        elevated: [
          "border border-gray-100/40 shadow-lg",
          "hover:shadow-xl hover:border-gray-200/60"
        ].join(" "),
        
        // Interactive card with hover effects
        interactive: [
          "border border-gray-100/60 cursor-pointer shadow-sm",
          "hover:shadow-lg hover:scale-[1.02] hover:border-[var(--primary)]/20",
          "active:scale-[0.99] active:shadow-md"
        ].join(" "),
        
        // Outlined card
        outlined: [
          "border-2 border-gray-200 shadow-none",
          "hover:border-[var(--primary)]/30 hover:shadow-sm"
        ].join(" "),
        
        // Gradient card using brand colors
        gradient: [
          "border-none shadow-lg ordira-gradient text-white",
          "hover:shadow-xl hover:scale-[1.01]"
        ].join(" "),
        
        // Glass morphism effect
        glass: [
          "backdrop-blur-sm bg-white/80 border border-white/20 shadow-lg",
          "hover:bg-white/90 hover:shadow-xl"
        ].join(" ")
      },
      size: {
        // Compact size for small metrics
        compact: "p-4 min-h-[80px]",
        
        // Small cards for basic metrics
        sm: "p-4 min-h-[120px]",
        
        // Medium cards for standard content
        md: "p-6 min-h-[160px]",
        
        // Large cards for detailed content
        lg: "p-6 min-h-[240px]",
        
        // Extra large for complex layouts
        xl: "p-8 min-h-[320px]",
        
        // Auto height for flexible content
        auto: "p-6",
        
        // Full height for specific layouts
        full: "p-6 h-full"
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6", 
        lg: "p-8",
        xl: "p-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      padding: "md"
    }
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, padding, asChild = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, size, padding, className }))}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

// Card Header Component
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  actions?: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, actions, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-start justify-between space-x-4 mb-4",
          className
        )}
        {...props}
      >
        <div className="flex-1 min-w-0">
          {children}
        </div>
        {actions && (
          <div className="flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    );
  }
);

CardHeader.displayName = "CardHeader";

// Card Title Component
const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn(
          "font-satoshi-bold text-lg leading-6 text-[var(--heading-color)]",
          className
        )}
        {...props}
      />
    );
  }
);

CardTitle.displayName = "CardTitle";

// Card Description Component
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn(
          "text-sm text-[var(--caption-color)] leading-5 mt-1",
          className
        )}
        {...props}
      />
    );
  }
);

CardDescription.displayName = "CardDescription";

// Card Content Component
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex-1", className)}
        {...props}
      />
    );
  }
);

CardContent.displayName = "CardContent";

// Card Footer Component
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between pt-4 mt-auto border-t border-gray-100",
          className
        )}
        {...props}
      />
    );
  }
);

CardFooter.displayName = "CardFooter";

// Metric Card - for displaying KPIs and metrics
export interface MetricCardProps extends Omit<CardProps, 'children'> {
  title: string;
  value: string | number;
  change?: {
    value: number;
    percentage?: string;
    isPositive?: boolean;
  };
  description?: string;
  icon?: React.ReactNode;
  trend?: React.ReactNode;
  actions?: React.ReactNode;
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ 
    title, 
    value, 
    change, 
    description, 
    icon, 
    trend, 
    actions,
    className,
    size = "sm",
    ...props 
  }, ref) => {
    return (
      <Card
        ref={ref}
        size={size}
        className={cn("h-full flex flex-col", className)}
        {...props}
      >
        <CardHeader actions={actions}>
          <div className="flex items-center space-x-2">
            {icon && (
              <div className="text-[var(--muted-foreground)] opacity-70">
                {icon}
              </div>
            )}
            <CardTitle className="text-sm font-satoshi-medium text-[var(--caption-color)]">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-satoshi-bold text-[var(--heading-color)] mb-1">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            
            {change && (
              <div className={cn(
                "flex items-center text-xs font-satoshi-medium",
                change.isPositive ? "text-[var(--success)]" : "text-[var(--error)]"
              )}>
                <span className="mr-1">
                  {change.isPositive ? "↗" : "↘"}
                </span>
                <span>{change.percentage || `${Math.abs(change.value)}%`}</span>
              </div>
            )}
            
            {description && (
              <p className="text-xs text-[var(--caption-color)] mt-2">
                {description}
              </p>
            )}
            
            {trend && (
              <div className="mt-3">
                {trend}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

MetricCard.displayName = "MetricCard";

// Progress Card - for goals and progress tracking
export interface ProgressCardProps extends Omit<CardProps, 'children'> {
  title: string;
  description?: string;
  progress: number; // 0-100
  value?: string;
  target?: string;
  color?: string;
  showPercentage?: boolean;
}

const ProgressCard = React.forwardRef<HTMLDivElement, ProgressCardProps>(
  ({ 
    title, 
    description, 
    progress, 
    value, 
    target, 
    color = "var(--primary)",
    showPercentage = true,
    className,
    size = "md",
    ...props 
  }, ref) => {
    return (
      <Card
        ref={ref}
        size={size}
        className={cn("h-full flex flex-col", className)}
        {...props}
      >
        <CardHeader>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {(value || target) && (
              <div className="flex items-center justify-between text-sm">
                {value && (
                  <span className="font-satoshi-medium text-[var(--heading-color)]">
                    {value}
                  </span>
                )}
                {target && (
                  <span className="text-[var(--caption-color)]">
                    {target}
                  </span>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-300 relative overflow-hidden"
                  style={{ 
                    width: `${Math.min(progress, 100)}%`,
                    backgroundColor: color
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>
              </div>
              
              {showPercentage && (
                <div className="text-right">
                  <span className="text-xs font-satoshi-medium text-[var(--caption-color)]">
                    {progress}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

ProgressCard.displayName = "ProgressCard";

// Feature Card - for feature highlights and CTAs
export interface FeatureCardProps extends Omit<CardProps, 'children'> {
  title: string;
  description: string;
  icon?: React.ReactNode;
  status?: 'active' | 'inactive' | 'pending' | 'new';
  action?: React.ReactNode;
  badge?: string;
}

const FeatureCard = React.forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ 
    title, 
    description, 
    icon, 
    status, 
    action, 
    badge,
    className,
    variant = "interactive",
    size = "md",
    ...props 
  }, ref) => {
    const statusColors = {
      active: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
      inactive: "bg-gray-100 text-gray-600 border-gray-200",
      pending: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
      new: "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20"
    };

    return (
      <Card
        ref={ref}
        variant={variant}
        size={size}
        className={cn("h-full flex flex-col group", className)}
        {...props}
      >
        <CardHeader actions={action}>
          <div className="flex items-start space-x-3 flex-1">
            {icon && (
              <div className="flex-shrink-0 p-3 rounded-xl bg-[var(--primary)]/5 group-hover:bg-[var(--primary)]/10 transition-colors">
                <div className="text-[var(--primary)] group-hover:scale-110 transition-transform">
                  {icon}
                </div>
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <CardTitle className="group-hover:text-[var(--primary)] transition-colors truncate">
                  {title}
                </CardTitle>
                {badge && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-satoshi-medium bg-[var(--primary)]/10 text-[var(--primary)]">
                    {badge}
                  </span>
                )}
              </div>
              
              {status && (
                <div className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-satoshi-medium border",
                  statusColors[status]
                )}>
                  {status}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <CardDescription className="leading-relaxed">
            {description}
          </CardDescription>
        </CardContent>
      </Card>
    );
  }
);

FeatureCard.displayName = "FeatureCard";

// Stats Grid - for organizing multiple metric cards
export interface StatsGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3 | 4 | 6;
  gap?: 'sm' | 'md' | 'lg';
}

const StatsGrid = React.forwardRef<HTMLDivElement, StatsGridProps>(
  ({ className, columns = 4, gap = 'md', ...props }, ref) => {
    const columnClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
      6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
    };

    const gapClasses = {
      sm: 'gap-4',
      md: 'gap-6', 
      lg: 'gap-8'
    };

    return (
      <div
        ref={ref}
        className={cn(
          'grid',
          columnClasses[columns],
          gapClasses[gap],
          className
        )}
        {...props}
      />
    );
  }
);

StatsGrid.displayName = "StatsGrid";

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  MetricCard,
  ProgressCard,
  FeatureCard,
  StatsGrid,
  cardVariants 
};