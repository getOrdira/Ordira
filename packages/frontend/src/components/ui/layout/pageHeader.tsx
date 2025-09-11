// src/components/ui/layout/PageHeader.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  
  // Navigation
  breadcrumbs?: BreadcrumbItem[];
  
  // Actions
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<any>;
    loading?: boolean;
    disabled?: boolean;
  };
  
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<any>;
    variant?: 'default' | 'outline' | 'ghost';
  }>;
  
  // Content
  children?: React.ReactNode;
  
  // Styling
  className?: string;
  compact?: boolean;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({
    title,
    subtitle,
    description,
    breadcrumbs,
    primaryAction,
    secondaryActions = [],
    children,
    className,
    compact = false,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "border-b border-gray-200 bg-white",
          compact ? "pb-4" : "pb-6",
          className
        )}
        {...props}
      >
        <div className={cn(
          "px-6",
          compact ? "pt-4" : "pt-6"
        )}>
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="mb-4" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm">
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} className="flex items-center">
                    {index > 0 && (
                      <ChevronRightIcon className="w-4 h-4 text-gray-400 mx-2" />
                    )}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="text-gray-500 hover:text-gray-700 font-satoshi-medium transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-gray-900 font-satoshi-medium">
                        {crumb.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* Header Content */}
          <div className="flex items-center justify-between">
            {/* Title Section */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-3">
                <h1 className={cn(
                  "font-satoshi-bold text-gray-900",
                  compact ? "text-xl" : "text-2xl lg:text-3xl"
                )}>
                  {title}
                </h1>
                
                {subtitle && (
                  <span className="text-gray-500 font-satoshi-regular text-lg">
                    {subtitle}
                  </span>
                )}
              </div>
              
              {description && (
                <p className={cn(
                  "text-gray-600 font-satoshi-regular",
                  compact ? "text-sm mt-1" : "text-base mt-2"
                )}>
                  {description}
                </p>
              )}
            </div>

            {/* Actions */}
            {(primaryAction || secondaryActions.length > 0) && (
              <div className="flex items-center space-x-3 ml-6">
                {/* Secondary Actions */}
                {secondaryActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={cn(
                      "inline-flex items-center px-4 py-2 text-sm font-satoshi-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
                      action.variant === 'outline' && "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500",
                      action.variant === 'ghost' && "text-gray-700 hover:bg-gray-100 focus:ring-gray-500",
                      (!action.variant || action.variant === 'default') && "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500"
                    )}
                  >
                    {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                    {action.label}
                  </button>
                ))}

                {/* Primary Action */}
                {primaryAction && (
                  <button
                    onClick={primaryAction.onClick}
                    disabled={primaryAction.disabled || primaryAction.loading}
                    className={cn(
                      "inline-flex items-center px-4 py-2 text-sm font-satoshi-medium text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
                      "bg-[var(--ordira-primary)] hover:bg-[var(--ordira-primary-dark)] focus:ring-[var(--ordira-primary)]",
                      (primaryAction.disabled || primaryAction.loading) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {primaryAction.loading ? (
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      primaryAction.icon && <primaryAction.icon className="w-4 h-4 mr-2" />
                    )}
                    {primaryAction.label}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Additional Content */}
          {children && (
            <div className={cn(
              compact ? "mt-3" : "mt-4"
            )}>
              {children}
            </div>
          )}
        </div>
      </div>
    );
  }
);

PageHeader.displayName = "PageHeader";

// Pre-configured page headers for common use cases

// Dashboard Page Header
export interface DashboardPageHeaderProps extends Omit<PageHeaderProps, 'title'> {
  userType: 'brand' | 'manufacturer' | 'creator';
  userName: string;
}

export const DashboardPageHeader = React.forwardRef<HTMLDivElement, DashboardPageHeaderProps>(
  ({ userType, userName, ...props }, ref) => {
    const titles = {
      brand: 'Dashboard',
      manufacturer: 'Dashboard', 
      creator: 'Dashboard'
    };

    return (
      <PageHeader
        ref={ref}
        title={titles[userType]}
        subtitle={`Welcome back, ${userName}`}
        {...props}
      />
    );
  }
);

DashboardPageHeader.displayName = "DashboardPageHeader";

// List Page Header (for products, orders, etc.)
export interface ListPageHeaderProps extends Omit<PageHeaderProps, 'title'> {
  itemType: string;
  itemCount?: number;
  onCreateNew?: () => void;
  createLabel?: string;
}

export const ListPageHeader = React.forwardRef<HTMLDivElement, ListPageHeaderProps>(
  ({ itemType, itemCount, onCreateNew, createLabel, ...props }, ref) => (
    <PageHeader
      ref={ref}
      title={itemType}
      description={itemCount !== undefined ? `${itemCount} total ${itemType.toLowerCase()}` : undefined}
      primaryAction={onCreateNew ? {
        label: createLabel || `Add ${itemType.slice(0, -1)}`,
        onClick: onCreateNew
      } : undefined}
      {...props}
    />
  )
);

ListPageHeader.displayName = "ListPageHeader";

// Settings Page Header
export interface SettingsPageHeaderProps extends Omit<PageHeaderProps, 'title'> {
  section?: string;
}

export const SettingsPageHeader = React.forwardRef<HTMLDivElement, SettingsPageHeaderProps>(
  ({ section, ...props }, ref) => (
    <PageHeader
      ref={ref}
      title={section ? `${section} Settings` : 'Settings'}
      breadcrumbs={section ? [
        { label: 'Settings', href: '/settings' },
        { label: section }
      ] : undefined}
      compact={true}
      {...props}
    />
  )
);

SettingsPageHeaderProps.displayName = "SettingsPageHeader";

export { PageHeader };
export default PageHeader;