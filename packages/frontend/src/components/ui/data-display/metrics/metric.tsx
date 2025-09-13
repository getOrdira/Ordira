// src/components/ui/data-display/metrics/metric.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/primitives/card';
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  MinusIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const metricVariants = cva(
  "font-satoshi transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-[var(--card-bg)] border-[var(--card-border)]",
        primary: "bg-gradient-to-br from-[var(--primary)]/10 to-[var(--primary)]/5 border-[var(--primary)]/20",
        success: "bg-gradient-to-br from-[var(--success)]/10 to-[var(--success)]/5 border-[var(--success)]/20",
        warning: "bg-gradient-to-br from-[var(--warning)]/10 to-[var(--warning)]/5 border-[var(--warning)]/20",
        error: "bg-gradient-to-br from-[var(--error)]/10 to-[var(--error)]/5 border-[var(--error)]/20",
        minimal: "bg-transparent border-transparent"
      },
      size: {
        sm: "p-4",
        md: "p-6", 
        lg: "p-8"
      },
      hoverable: {
        true: "hover:shadow-[var(--card-shadow-lg)] hover:scale-[1.02] cursor-pointer",
        false: ""
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      hoverable: false
    }
  }
);

export interface MetricProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof metricVariants> {
  title: string;
  value: string | number;
  
  // Change/trend indicators
  change?: {
    value: number;
    percentage?: string;
    isPositive?: boolean;
    trend?: 'up' | 'down' | 'neutral';
  };
  
  // Visual elements
  icon?: React.ReactNode;
  description?: string;
  loading?: boolean;
  error?: string;
  
  // Additional content
  suffix?: string;
  prefix?: string;
  subtitle?: string;
  
  // Styling
  valueColor?: string;
  compact?: boolean;
  
  // Interaction
  onClick?: () => void;
  tooltip?: string;
}

const Metric = React.forwardRef<HTMLDivElement, MetricProps>(
  ({
    title,
    value,
    change,
    icon,
    description,
    loading = false,
    error,
    suffix,
    prefix,
    subtitle,
    valueColor,
    compact = false,
    onClick,
    tooltip,
    variant = "default",
    size = "md",
    hoverable,
    className,
    ...props
  }, ref) => {
    // Auto-determine hoverable based on onClick
    const isHoverable = hoverable ?? Boolean(onClick);

    // Format the display value
    const formatValue = (val: string | number): string => {
      if (typeof val === 'number') {
        if (val >= 1000000) {
          return `${(val / 1000000).toFixed(1)}M`;
        } else if (val >= 1000) {
          return `${(val / 1000).toFixed(1)}K`;
        }
        return val.toLocaleString();
      }
      return val;
    };

    // Render trend icon
    const renderTrendIcon = () => {
      if (!change) return null;

      const trend = change.trend || (change.isPositive ? 'up' : 'down');
      const trendColor = change.isPositive 
        ? 'text-[var(--success)]' 
        : 'text-[var(--error)]';

      switch (trend) {
        case 'up':
          return <ArrowTrendingUpIcon className={cn("w-4 h-4", trendColor)} />;
        case 'down':
          return <ArrowTrendingDownIcon className={cn("w-4 h-4", trendColor)} />;
        case 'neutral':
          return <MinusIcon className="w-4 h-4 text-[var(--muted)]" />;
        default:
          return null;
      }
    };

    // Handle loading state
    if (loading) {
      return (
        <Card className={cn(metricVariants({ variant, size, hoverable: isHoverable }), className)}>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-3"></div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        </Card>
      );
    }

    // Handle error state
    if (error) {
      return (
        <Card className={cn(metricVariants({ variant: 'error', size, hoverable: false }), className)}>
          <div className="flex items-center space-x-2 text-[var(--error)]">
            <InformationCircleIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Error loading metric</span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-1">{error}</p>
        </Card>
      );
    }

    return (
      <Card 
        ref={ref}
        className={cn(metricVariants({ variant, size, hoverable: isHoverable }), className)}
        onClick={onClick}
        title={tooltip}
        {...props}
      >
        {/* Header with icon and title */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            {icon && (
              <div className="text-[var(--primary)] flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className={cn(
                "font-satoshi-medium text-[var(--caption-color)] truncate",
                compact ? "text-xs" : "text-sm"
              )}>
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-[var(--muted)] truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          
          {/* Change indicator */}
          {change && (
            <div className={cn(
              "flex items-center space-x-1 flex-shrink-0",
              compact ? "text-xs" : "text-sm"
            )}>
              {renderTrendIcon()}
              <span className={cn(
                "font-satoshi-bold",
                change.isPositive 
                  ? "text-[var(--success)]" 
                  : "text-[var(--error)]"
              )}>
                {change.isPositive ? '+' : ''}{change.percentage || `${change.value}%`}
              </span>
            </div>
          )}
        </div>

        {/* Main value */}
        <div className="mb-2">
          <div className={cn(
            "font-satoshi-bold text-[var(--heading-color)]",
            compact ? "text-xl" : "text-2xl lg:text-3xl",
            valueColor && valueColor
          )}>
            {prefix && <span className="text-[var(--muted)] mr-1">{prefix}</span>}
            {formatValue(value)}
            {suffix && <span className="text-[var(--muted)] ml-1">{suffix}</span>}
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className={cn(
            "text-[var(--caption-color)] font-satoshi-regular",
            compact ? "text-xs" : "text-sm"
          )}>
            {description}
          </p>
        )}
      </Card>
    );
  }
);

Metric.displayName = "Metric";

// Specialized metric components for common use cases

// Revenue Metric
export interface RevenueMetricProps extends Omit<MetricProps, 'title' | 'prefix'> {
  currency?: string;
  period?: string;
}

export const RevenueMetric = React.forwardRef<HTMLDivElement, RevenueMetricProps>(
  ({ currency = '$', period, ...props }, ref) => (
    <Metric
      ref={ref}
      title={period ? `Revenue (${period})` : 'Revenue'}
      prefix={currency}
      variant="primary"
      {...props}
    />
  )
);

RevenueMetric.displayName = "RevenueMetric";

// Count Metric (for users, votes, products, etc.)
export interface CountMetricProps extends Omit<MetricProps, 'title'> {
  type: 'users' | 'votes' | 'products' | 'certificates' | 'custom';
  customLabel?: string;
}

export const CountMetric = React.forwardRef<HTMLDivElement, CountMetricProps>(
  ({ type, customLabel, ...props }, ref) => {
    const labels = {
      users: 'Total Users',
      votes: 'Total Votes', 
      products: 'Products',
      certificates: 'Certificates',
      custom: customLabel || 'Count'
    };

    return (
      <Metric
        ref={ref}
        title={labels[type]}
        {...props}
      />
    );
  }
);

CountMetric.displayName = "CountMetric";

// Percentage Metric
export interface PercentageMetricProps extends Omit<MetricProps, 'suffix'> {
  showPercentage?: boolean;
}

export const PercentageMetric = React.forwardRef<HTMLDivElement, PercentageMetricProps>(
  ({ showPercentage = true, ...props }, ref) => (
    <Metric
      ref={ref}
      suffix={showPercentage ? '%' : undefined}
      {...props}
    />
  )
);

PercentageMetric.displayName = "PercentageMetric";

export { Metric };
export default Metric;