// src/components/ui/data-display/skeleton.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/utils';

const skeletonVariants = cva(
  // Base skeleton styles with shimmer animation
  "bg-[var(--background-secondary)] animate-pulse rounded",
  {
    variants: {
      variant: {
        default: "bg-[var(--background-secondary)]",
        light: "bg-[var(--background-tertiary)]", 
        muted: "bg-[var(--border)]",
        shimmer: "bg-gradient-to-r from-[var(--background-secondary)] via-[var(--border)] to-[var(--background-secondary)] bg-[length:200%_100%] animate-shimmer",
      },
      shape: {
        rectangle: "rounded",
        circle: "rounded-full",
        pill: "rounded-full",
        square: "rounded aspect-square",
      }
    },
    defaultVariants: {
      variant: "default", 
      shape: "rectangle",
    },
  }
);

export interface SkeletonProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  width?: string | number;
  height?: string | number;
  className?: string;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    className,
    variant = "default",
    shape = "rectangle", 
    width,
    height,
    style,
    ...props 
  }, ref) => {
    const skeletonStyle = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      ...style,
    };

    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant, shape }), className)}
        style={skeletonStyle}
        aria-label="Loading..."
        role="status"
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";

// Text Skeleton Component
export interface TextSkeletonProps {
  lines?: number;
  className?: string;
  variant?: VariantProps<typeof skeletonVariants>['variant'];
  lastLineWidth?: string;
  lineHeight?: string;
  spacing?: string;
}

const TextSkeleton = React.forwardRef<HTMLDivElement, TextSkeletonProps>(
  ({ 
    lines = 3,
    className,
    variant = "default",
    lastLineWidth = "75%",
    lineHeight = "1rem",
    spacing = "0.5rem",
    ...props 
  }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton
            key={i}
            variant={variant}
            height={lineHeight}
            width={i === lines - 1 ? lastLineWidth : "100%"}
            style={{ marginBottom: i < lines - 1 ? spacing : 0 }}
          />
        ))}
      </div>
    );
  }
);

TextSkeleton.displayName = "TextSkeleton";

// Avatar Skeleton Component
export interface AvatarSkeletonProps {
  size?: number;
  className?: string;
  variant?: VariantProps<typeof skeletonVariants>['variant'];
}

const AvatarSkeleton = React.forwardRef<HTMLDivElement, AvatarSkeletonProps>(
  ({ 
    size = 40,
    className,
    variant = "default",
    ...props 
  }, ref) => {
    return (
      <Skeleton
        ref={ref}
        variant={variant}
        shape="circle"
        width={size}
        height={size}
        className={className}
        {...props}
      />
    );
  }
);

AvatarSkeleton.displayName = "AvatarSkeleton";

// Card Skeleton Component
export interface CardSkeletonProps {
  className?: string;
  variant?: VariantProps<typeof skeletonVariants>['variant'];
  showAvatar?: boolean;
  avatarSize?: number;
  lines?: number;
  showActions?: boolean;
  height?: string | number;
}

const CardSkeleton = React.forwardRef<HTMLDivElement, CardSkeletonProps>(
  ({ 
    className,
    variant = "default",
    showAvatar = false,
    avatarSize = 40,
    lines = 3,
    showActions = false,
    height = "auto",
    ...props 
  }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn("bg-[var(--card-bg)] p-6 rounded-lg border border-[var(--card-border)]", className)}
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
        {...props}
      >
        {/* Header with optional avatar */}
        <div className="flex items-start space-x-4 mb-4">
          {showAvatar && <AvatarSkeleton size={avatarSize} variant={variant} />}
          <div className="flex-1 space-y-2">
            <Skeleton variant={variant} height="1.25rem" width="60%" />
            <Skeleton variant={variant} height="0.875rem" width="40%" />
          </div>
        </div>

        {/* Content lines */}
        <TextSkeleton lines={lines} variant={variant} className="mb-4" />

        {/* Actions */}
        {showActions && (
          <div className="flex space-x-2">
            <Skeleton variant={variant} height="2rem" width="5rem" />
            <Skeleton variant={variant} height="2rem" width="4rem" />
          </div>
        )}
      </div>
    );
  }
);

CardSkeleton.displayName = "CardSkeleton";

// Table Skeleton Component
export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
  variant?: VariantProps<typeof skeletonVariants>['variant'];
  showHeader?: boolean;
  showAvatar?: boolean;
  showActions?: boolean;
}

const TableSkeleton = React.forwardRef<HTMLDivElement, TableSkeletonProps>(
  ({ 
    rows = 5,
    columns = 4,
    className,
    variant = "default",
    showHeader = true,
    showAvatar = false,
    showActions = false,
    ...props 
  }, ref) => {
    const actualColumns = showActions ? columns + 1 : columns;
    
    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] overflow-hidden">
          {/* Table Header */}
          {showHeader && (
            <div className="bg-[var(--background-secondary)] px-6 py-3 border-b border-[var(--border)]">
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${actualColumns}, 1fr)` }}>
                {Array.from({ length: actualColumns }, (_, i) => (
                  <Skeleton
                    key={`header-${i}`}
                    variant={variant}
                    height="0.875rem"
                    width={i === 0 && showAvatar ? "8rem" : "60%"}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Table Rows */}
          <div className="divide-y divide-[var(--border)]">
            {Array.from({ length: rows }, (_, rowIndex) => (
              <div key={`row-${rowIndex}`} className="px-6 py-4">
                <div className="grid gap-4 items-center" style={{ gridTemplateColumns: `repeat(${actualColumns}, 1fr)` }}>
                  {Array.from({ length: actualColumns }, (_, colIndex) => (
                    <div key={`cell-${rowIndex}-${colIndex}`} className="flex items-center">
                      {/* Avatar in first column if enabled */}
                      {colIndex === 0 && showAvatar ? (
                        <div className="flex items-center space-x-3">
                          <AvatarSkeleton size={32} variant={variant} />
                          <Skeleton variant={variant} height="1rem" width="6rem" />
                        </div>
                      ) : colIndex === actualColumns - 1 && showActions ? (
                        /* Actions in last column */
                        <div className="flex space-x-2">
                          <Skeleton variant={variant} width="2rem" height="2rem" shape="circle" />
                          <Skeleton variant={variant} width="2rem" height="2rem" shape="circle" />
                        </div>
                      ) : (
                        /* Regular content */
                        <Skeleton 
                          variant={variant} 
                          height="1rem" 
                          width={Math.random() > 0.5 ? "80%" : "60%"} 
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

TableSkeleton.displayName = "TableSkeleton";

// Stats Card Skeleton Component
export interface StatsCardSkeletonProps {
  count?: number;
  className?: string;
  variant?: VariantProps<typeof skeletonVariants>['variant'];
  showIcons?: boolean;
  showTrends?: boolean;
}

const StatsCardSkeleton = React.forwardRef<HTMLDivElement, StatsCardSkeletonProps>(
  ({ 
    count = 4,
    className,
    variant = "default",
    showIcons = true,
    showTrends = true,
    ...props 
  }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}
        {...props}
      >
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <Skeleton variant={variant} height="0.875rem" width="70%" className="mb-2" />
                <Skeleton variant={variant} height="1.5rem" width="50%" />
              </div>
              {showIcons && (
                <Skeleton variant={variant} width="3rem" height="3rem" className="rounded-lg" />
              )}
            </div>
            
            {showTrends && (
              <div className="flex items-center justify-between">
                <Skeleton variant={variant} height="0.75rem" width="40%" />
                <Skeleton variant={variant} height="0.75rem" width="30%" />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
);

StatsCardSkeleton.displayName = "StatsCardSkeleton";

// Form Skeleton Component
export interface FormSkeletonProps {
  fields?: number;
  className?: string;
  variant?: VariantProps<typeof skeletonVariants>['variant'];
  showLabels?: boolean;
  showButtons?: boolean;
}

const FormSkeleton = React.forwardRef<HTMLDivElement, FormSkeletonProps>(
  ({ 
    fields = 5,
    className,
    variant = "default",
    showLabels = true,
    showButtons = true,
    ...props 
  }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-6", className)} {...props}>
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2">
            {showLabels && (
              <Skeleton variant={variant} height="0.875rem" width="25%" />
            )}
            <Skeleton variant={variant} height="2.5rem" width="100%" />
          </div>
        ))}
        
        {showButtons && (
          <div className="flex space-x-3 pt-4">
            <Skeleton variant={variant} height="2.5rem" width="6rem" />
            <Skeleton variant={variant} height="2.5rem" width="5rem" />
          </div>
        )}
      </div>
    );
  }
);

FormSkeleton.displayName = "FormSkeleton";

// Chart Skeleton Component  
export interface ChartSkeletonProps {
  type?: 'line' | 'bar' | 'pie' | 'area';
  className?: string;
  variant?: VariantProps<typeof skeletonVariants>['variant'];
  height?: string | number;
  showLegend?: boolean;
  showAxes?: boolean;
}

const ChartSkeleton = React.forwardRef<HTMLDivElement, ChartSkeletonProps>(
  ({ 
    type = 'bar',
    className,
    variant = "default",
    height = 300,
    showLegend = true,
    showAxes = true,
    ...props 
  }, ref) => {
    return (
      <div ref={ref} className={cn("bg-white p-6 rounded-lg border border-gray-200", className)} {...props}>
        {/* Chart Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <Skeleton variant={variant} height="1.25rem" width="12rem" />
            <Skeleton variant={variant} height="0.875rem" width="8rem" />
          </div>
          {showLegend && (
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <Skeleton variant={variant} width="1rem" height="1rem" />
                <Skeleton variant={variant} width="3rem" height="0.875rem" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton variant={variant} width="1rem" height="1rem" />
                <Skeleton variant={variant} width="3rem" height="0.875rem" />
              </div>
            </div>
          )}
        </div>

        {/* Chart Area */}
        <div 
          className="relative"
          style={{ height: typeof height === 'number' ? `${height}px` : height }}
        >
          {type === 'pie' ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton variant={variant} width="200px" height="200px" shape="circle" />
            </div>
          ) : (
            <div className="h-full flex items-end justify-between space-x-2">
              {Array.from({ length: 12 }, (_, i) => (
                <Skeleton
                  key={i}
                  variant={variant}
                  width="100%"
                  height={`${Math.random() * 60 + 20}%`}
                  className="flex-1"
                />
              ))}
            </div>
          )}

          {/* Axes */}
          {showAxes && type !== 'pie' && (
            <>
              {/* Y-axis */}
              <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between py-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} variant={variant} height="0.75rem" width="2rem" />
                ))}
              </div>
              
              {/* X-axis */}
              <div className="absolute bottom-0 left-12 right-0 h-6 flex justify-between items-center">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} variant={variant} height="0.75rem" width="2rem" />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
);

ChartSkeleton.displayName = "ChartSkeleton";

// Page Skeleton Component for full page layouts
export interface PageSkeletonProps {
  layout?: 'dashboard' | 'table' | 'profile' | 'form';
  className?: string;
  variant?: VariantProps<typeof skeletonVariants>['variant'];
}

const PageSkeleton = React.forwardRef<HTMLDivElement, PageSkeletonProps>(
  ({ 
    layout = 'dashboard',
    className,
    variant = "default",
    ...props 
  }, ref) => {
    const renderDashboard = () => (
      <div className="space-y-8">
        {/* Page Header */}
        <div className="space-y-4">
          <Skeleton variant={variant} height="2rem" width="20rem" />
          <Skeleton variant={variant} height="1rem" width="30rem" />
        </div>

        {/* Stats Cards */}
        <StatsCardSkeleton variant={variant} />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton variant={variant} />
          <ChartSkeleton type="pie" variant={variant} />
        </div>

        {/* Table Section */}
        <div className="space-y-4">
          <Skeleton variant={variant} height="1.5rem" width="15rem" />
          <TableSkeleton variant={variant} showAvatar showActions />
        </div>
      </div>
    );

    const renderTable = () => (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton variant={variant} height="2rem" width="15rem" />
            <Skeleton variant={variant} height="1rem" width="25rem" />
          </div>
          <div className="flex space-x-3">
            <Skeleton variant={variant} height="2.5rem" width="8rem" />
            <Skeleton variant={variant} height="2.5rem" width="6rem" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex space-x-4">
          <Skeleton variant={variant} height="2.5rem" width="12rem" />
          <Skeleton variant={variant} height="2.5rem" width="10rem" />
          <Skeleton variant={variant} height="2.5rem" width="8rem" />
        </div>

        {/* Table */}
        <TableSkeleton variant={variant} rows={8} showAvatar showActions />
      </div>
    );

    const renderProfile = () => (
      <div className="space-y-8">
        {/* Profile Header */}
        <div className="flex items-start space-x-6">
          <AvatarSkeleton size={100} variant={variant} />
          <div className="space-y-3 flex-1">
            <Skeleton variant={variant} height="2rem" width="20rem" />
            <Skeleton variant={variant} height="1rem" width="15rem" />
            <div className="flex space-x-3">
              <Skeleton variant={variant} height="2rem" width="8rem" />
              <Skeleton variant={variant} height="2rem" width="6rem" />
            </div>
          </div>
        </div>

        {/* Profile Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <FormSkeleton variant={variant} fields={6} />
          </div>
          <div className="space-y-6">
            <CardSkeleton variant={variant} lines={4} showActions />
            <CardSkeleton variant={variant} lines={3} />
          </div>
        </div>
      </div>
    );

    const renderForm = () => (
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Form Header */}
        <div className="space-y-4">
          <Skeleton variant={variant} height="2rem" width="20rem" />
          <Skeleton variant={variant} height="1rem" width="30rem" />
        </div>

        {/* Form Content */}
        <div className="bg-white p-8 rounded-lg border border-gray-200">
          <FormSkeleton variant={variant} fields={8} />
        </div>
      </div>
    );

    return (
      <div ref={ref} className={cn("p-6", className)} {...props}>
        {layout === 'dashboard' && renderDashboard()}
        {layout === 'table' && renderTable()}
        {layout === 'profile' && renderProfile()}
        {layout === 'form' && renderForm()}
      </div>
    );
  }
);

PageSkeleton.displayName = "PageSkeleton";

// Add shimmer animation CSS
const shimmerStyles = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  .animate-shimmer {
    animation: shimmer 2s ease-in-out infinite;
  }
`;

// Add styles to document if not already present
if (typeof document !== 'undefined' && !document.getElementById('shimmer-styles')) {
  const style = document.createElement('style');
  style.id = 'shimmer-styles';
  style.textContent = shimmerStyles;
  document.head.appendChild(style);
}

export { 
  Skeleton, 
  TextSkeleton, 
  AvatarSkeleton, 
  CardSkeleton, 
  TableSkeleton, 
  StatsCardSkeleton, 
  FormSkeleton, 
  ChartSkeleton, 
  PageSkeleton 
};
export default Skeleton;