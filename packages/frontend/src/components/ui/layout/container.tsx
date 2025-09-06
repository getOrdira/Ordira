// src/components/ui/layout/container.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const containerVariants = cva(
  // Base container styles with Ordira brand typography
  "w-full mx-auto font-satoshi",
  {
    variants: {
      size: {
        // Small containers for compact content
        sm: "max-w-2xl",
        // Medium containers for standard pages
        md: "max-w-4xl", 
        // Large containers for dashboard layouts (matches brand layout)
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
        // Medium padding (default, matches existing layouts)
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

// Dashboard Container - Main layout wrapper for dashboard pages
export interface DashboardContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  sidebarCollapsed?: boolean;
}

const DashboardContainer = React.forwardRef<HTMLDivElement, DashboardContainerProps>(
  ({ sidebar, header, children, sidebarCollapsed = false, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex h-screen bg-[var(--background-secondary)] overflow-hidden font-satoshi", className)}
      {...props}
    >
      {/* Sidebar Navigation */}
      {sidebar}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        {header}

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
);

DashboardContainer.displayName = "DashboardContainer";

// Page Container - Specific for page layouts with consistent spacing
export interface PageContainerProps extends ContainerProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ 
    title, 
    description, 
    actions, 
    breadcrumbs, 
    children, 
    className,
    size = "full",
    padding = "lg",
    spacing = "lg",
    ...props 
  }, ref) => {
    const spacingClasses = {
      none: "",
      sm: "space-y-4",
      md: "space-y-6",
      lg: "space-y-8",
      xl: "space-y-12"
    };

    return (
      <Container 
        ref={ref} 
        size={size} 
        padding={padding}
        className={cn(spacingClasses[spacing], className)} 
        {...props}
      >
        {breadcrumbs && (
          <div className="mb-4">
            {breadcrumbs}
          </div>
        )}
        
        {(title || description || actions) && (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {title && (
                <h1 className="font-satoshi-bold text-2xl lg:text-3xl text-[var(--heading-color)] mb-2">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-[var(--caption-color)] font-satoshi text-base">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-3 flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
        )}
        
        <div className="w-full">
          {children}
        </div>
      </Container>
    );
  }
);

PageContainer.displayName = "PageContainer";

// Section Container - For grouping related content within pages
export interface SectionContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'bordered' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

const SectionContainer = React.forwardRef<HTMLDivElement, SectionContainerProps>(
  ({ 
    title, 
    description, 
    actions, 
    children, 
    variant = 'default',
    padding = 'md',
    spacing = 'md',
    className,
    ...props 
  }, ref) => {
    const sectionVariants = {
      default: "",
      // Elevated cards using Ordira theme
      elevated: "bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] border border-[var(--card-border)]",
      // Bordered variant with Ordira colors
      bordered: "border border-[var(--border)] rounded-2xl",
      // Glass morphism effect
      glass: "glass rounded-2xl border border-white/20"
    };

    const paddingVariants = {
      none: "",
      sm: "p-4",
      md: "p-6", 
      lg: "p-8",
      xl: "p-10"
    };

    const spacingClasses = {
      none: "",
      sm: "space-y-4",
      md: "space-y-6",
      lg: "space-y-8"
    };

    return (
      <div
        ref={ref}
        className={cn(
          "font-satoshi",
          sectionVariants[variant],
          paddingVariants[padding],
          spacingClasses[spacing],
          className
        )}
        {...props}
      >
        {(title || description || actions) && (
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 className="font-satoshi-bold text-lg lg:text-xl text-[var(--heading-color)]">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-[var(--caption-color)] mt-1 font-satoshi">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2 flex-shrink-0">
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

// Content Container - For main content areas with optional sidebar
export interface ContentContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar?: React.ReactNode;
  sidebarPosition?: 'left' | 'right';
  sidebarWidth?: 'sm' | 'md' | 'lg' | 'xl';
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  sidebarSticky?: boolean;
}

const ContentContainer = React.forwardRef<HTMLDivElement, ContentContainerProps>(
  ({ 
    children, 
    sidebar, 
    sidebarPosition = 'right',
    sidebarWidth = 'md',
    gap = 'lg',
    sidebarSticky = false,
    className,
    ...props 
  }, ref) => {
    const sidebarWidths = {
      sm: 'w-64',
      md: 'w-80',
      lg: 'w-96',
      xl: 'w-[28rem]'
    };

    const gaps = {
      sm: 'gap-4',
      md: 'gap-6',
      lg: 'gap-8',
      xl: 'gap-12'
    };

    if (!sidebar) {
      return (
        <div ref={ref} className={cn("w-full font-satoshi", className)} {...props}>
          {children}
        </div>
      );
    }

    return (
      <div 
        ref={ref} 
        className={cn("flex font-satoshi", gaps[gap], className)} 
        {...props}
      >
        {sidebarPosition === 'left' && (
          <div className={cn(
            "flex-shrink-0",
            sidebarWidths[sidebarWidth],
            sidebarSticky && "sticky top-0 h-fit"
          )}>
            {sidebar}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {children}
        </div>
        
        {sidebarPosition === 'right' && (
          <div className={cn(
            "flex-shrink-0",
            sidebarWidths[sidebarWidth],
            sidebarSticky && "sticky top-0 h-fit"
          )}>
            {sidebar}
          </div>
        )}
      </div>
    );
  }
);

ContentContainer.displayName = "ContentContainer";

// Grid Container - For responsive grid layouts
export interface GridContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  responsive?: boolean;
}

const GridContainer = React.forwardRef<HTMLDivElement, GridContainerProps>(
  ({ children, columns = 3, gap = 'md', responsive = true, className, ...props }, ref) => {
    const columnClasses = responsive ? {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
      5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
      6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
    } : {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6'
    };

    const gapClasses = {
      sm: 'gap-4',
      md: 'gap-6', 
      lg: 'gap-8',
      xl: 'gap-12'
    };

    return (
      <div
        ref={ref}
        className={cn(
          'grid font-satoshi',
          columnClasses[columns],
          gapClasses[gap],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GridContainer.displayName = "GridContainer";

export { 
  Container, 
  DashboardContainer,
  PageContainer, 
  SectionContainer, 
  ContentContainer,
  GridContainer,
  containerVariants 
};