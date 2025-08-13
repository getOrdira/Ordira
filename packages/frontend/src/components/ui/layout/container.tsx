// src/components/ui/layout/container.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const containerVariants = cva(
  // Base container styles
  "w-full mx-auto",
  {
    variants: {
      size: {
        // Small containers for compact content
        sm: "max-w-2xl",
        // Medium containers for standard pages
        md: "max-w-4xl", 
        // Large containers for dashboard layouts
        lg: "max-w-6xl",
        // Extra large for full-width dashboards
        xl: "max-w-7xl",
        // Full width with max constraint
        "2xl": "max-w-screen-2xl",
        // No max width constraint
        full: "max-w-none"
      },
      padding: {
        // No padding
        none: "px-0",
        // Small padding for mobile-first
        sm: "px-4 sm:px-6",
        // Medium padding (default)
        md: "px-4 sm:px-6 lg:px-8",
        // Large padding for spacious layouts
        lg: "px-6 sm:px-8 lg:px-12",
        // Extra large padding
        xl: "px-8 sm:px-12 lg:px-16"
      },
      center: {
        true: "mx-auto",
        false: ""
      }
    },
    defaultVariants: {
      size: "lg",
      padding: "md",
      center: true
    }
  }
);

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  as?: React.ElementType;
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, padding, center, as: Component = 'div', ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(containerVariants({ size, padding, center }), className)}
      {...props}
    />
  )
);

Container.displayName = "Container";

// Page Container - Specific for page layouts with consistent spacing
export interface PageContainerProps extends ContainerProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
}

const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ 
    title, 
    description, 
    actions, 
    breadcrumbs, 
    children, 
    className,
    size = "xl",
    ...props 
  }, ref) => (
    <Container 
      ref={ref} 
      size={size} 
      className={cn("space-y-6", className)} 
      {...props}
    >
      {breadcrumbs && (
        <div className="mb-4">
          {breadcrumbs}
        </div>
      )}
      
      {(title || description || actions) && (
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h1 className="text-2xl font-bold text-[var(--dark)]">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-[var(--muted)] mt-1">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-3">
              {actions}
            </div>
          )}
        </div>
      )}
      
      {children}
    </Container>
  )
);

PageContainer.displayName = "PageContainer";

// Section Container - For grouping related content within pages
export interface SectionContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const SectionContainer = React.forwardRef<HTMLDivElement, SectionContainerProps>(
  ({ 
    title, 
    description, 
    actions, 
    children, 
    variant = 'default',
    padding = 'md',
    className,
    ...props 
  }, ref) => {
    const sectionVariants = {
      default: "",
      elevated: "bg-white rounded-2xl shadow-sm border border-gray-100",
      bordered: "border border-gray-200 rounded-2xl"
    };

    const paddingVariants = {
      none: "",
      sm: "p-4",
      md: "p-6", 
      lg: "p-8"
    };

    return (
      <div
        ref={ref}
        className={cn(
          sectionVariants[variant],
          paddingVariants[padding],
          "space-y-6",
          className
        )}
        {...props}
      >
        {(title || description || actions) && (
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-[var(--dark)]">
                  {title}
                </h2>
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
        )}
        
        {children}
      </div>
    );
  }
);

SectionContainer.displayName = "SectionContainer";

// Content Container - For main content areas with proper spacing
export interface ContentContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar?: React.ReactNode;
  sidebarPosition?: 'left' | 'right';
  sidebarWidth?: 'sm' | 'md' | 'lg';
  gap?: 'sm' | 'md' | 'lg';
}

const ContentContainer = React.forwardRef<HTMLDivElement, ContentContainerProps>(
  ({ 
    children, 
    sidebar, 
    sidebarPosition = 'right',
    sidebarWidth = 'md',
    gap = 'md',
    className,
    ...props 
  }, ref) => {
    const sidebarWidths = {
      sm: 'w-64',
      md: 'w-80',
      lg: 'w-96'
    };

    const gaps = {
      sm: 'gap-4',
      md: 'gap-6',
      lg: 'gap-8'
    };

    if (!sidebar) {
      return (
        <div ref={ref} className={cn("w-full", className)} {...props}>
          {children}
        </div>
      );
    }

    return (
      <div 
        ref={ref} 
        className={cn("flex", gaps[gap], className)} 
        {...props}
      >
        {sidebarPosition === 'left' && (
          <div className={cn("flex-shrink-0", sidebarWidths[sidebarWidth])}>
            {sidebar}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {children}
        </div>
        
        {sidebarPosition === 'right' && (
          <div className={cn("flex-shrink-0", sidebarWidths[sidebarWidth])}>
            {sidebar}
          </div>
        )}
      </div>
    );
  }
);

ContentContainer.displayName = "ContentContainer";

export { 
  Container, 
  PageContainer, 
  SectionContainer, 
  ContentContainer,
  containerVariants 
};