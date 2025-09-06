// src/components/ui/navigation/breadcrumb.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

const breadcrumbVariants = cva(
  // Base container styles - clean and modern
  "flex items-center space-x-2 text-sm font-satoshi-regular",
  {
    variants: {
      variant: {
        default: "text-[var(--muted)]",
        large: "text-base text-[var(--muted)]",
        compact: "text-xs text-[var(--muted)]"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

const breadcrumbItemVariants = cva(
  // Base item styles with Ordira branding
  "transition-colors duration-200 font-satoshi-regular hover:text-[var(--primary)]",
  {
    variants: {
      variant: {
        default: "text-[var(--muted)] hover:text-[var(--primary)]",
        current: "text-[var(--ordira-accent)] font-satoshi-medium",
        home: "text-[var(--muted)] hover:text-[var(--primary)]"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

const separatorVariants = cva(
  "text-[var(--muted)] flex items-center",
  {
    variants: {
      type: {
        arrow: "mx-3 text-[var(--primary)]", // Orange arrows like in your image
        chevron: "mx-2",
        slash: "mx-3"
      }
    },
    defaultVariants: {
      type: "chevron"
    }
  }
);

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<any>;
  current?: boolean;
}

export interface BreadcrumbProps extends VariantProps<typeof breadcrumbVariants> {
  items: BreadcrumbItem[];
  separator?: 'arrow' | 'chevron' | 'slash';
  showHome?: boolean;
  homeHref?: string;
  homeLabel?: string;
  maxItems?: number;
  className?: string;
  itemClassName?: string;
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({
    items,
    variant,
    separator = 'chevron',
    showHome = false,
    homeHref = '/',
    homeLabel = 'Home',
    maxItems,
    className,
    itemClassName,
    ...props
  }, ref) => {
    
    // Handle max items with ellipsis (like in your image)
    const processedItems = React.useMemo(() => {
      if (!maxItems || items.length <= maxItems) {
        return items;
      }

      if (maxItems <= 2) {
        return [
          items[0],
          { label: '...', href: undefined },
          items[items.length - 1]
        ];
      }

      const firstItems = items.slice(0, 1);
      const lastItems = items.slice(-(maxItems - 2));
      
      return [
        ...firstItems,
        { label: '...', href: undefined },
        ...lastItems
      ];
    }, [items, maxItems]);

    const renderSeparator = (index: number) => {
      if (separator === 'arrow') {
        return (
          <span key={`sep-${index}`} className={cn(separatorVariants({ type: 'arrow' }))}>
            →
          </span>
        );
      }
      
      if (separator === 'slash') {
        return (
          <span key={`sep-${index}`} className={cn(separatorVariants({ type: 'slash' }))}>
            /
          </span>
        );
      }

      return (
        <ChevronRightIcon 
          key={`sep-${index}`} 
          className={cn(separatorVariants({ type: 'chevron' }), "w-4 h-4")} 
        />
      );
    };

    const renderBreadcrumbItem = (item: BreadcrumbItem, index: number) => {
      const isLast = index === processedItems.length - 1;
      const isEllipsis = item.label === '...';
      const isCurrent = item.current || isLast;

      if (isEllipsis) {
        return (
          <span 
            key={index}
            className={cn(
              breadcrumbItemVariants({ variant: "default" }),
              "font-satoshi-medium",
              itemClassName
            )}
          >
            ...
          </span>
        );
      }

      const content = (
        <>
          {item.icon && (
            <item.icon className="w-4 h-4 mr-1.5" />
          )}
          <span>{item.label}</span>
        </>
      );

      if (item.href && !isCurrent) {
        return (
          <Link
            key={index}
            href={item.href}
            className={cn(
              breadcrumbItemVariants({ variant: "default" }),
              "hover:underline underline-offset-2",
              itemClassName
            )}
          >
            {content}
          </Link>
        );
      }

      return (
        <span
          key={index}
          className={cn(
            breadcrumbItemVariants({ 
              variant: isCurrent ? "current" : "default" 
            }),
            itemClassName,
            isCurrent && "cursor-default"
          )}
          aria-current={isCurrent ? "page" : undefined}
        >
          {content}
        </span>
      );
    };

    return (
      <nav 
        ref={ref} 
        aria-label="Breadcrumb" 
        className={cn(breadcrumbVariants({ variant }), className)} 
        {...props}
      >
        <ol className="flex items-center space-x-2">
          {/* Home item */}
          {showHome && (
            <>
              <li>
                <Link
                  href={homeHref}
                  className={cn(
                    breadcrumbItemVariants({ variant: "home" }),
                    "flex items-center hover:underline underline-offset-2",
                    itemClassName
                  )}
                >
                  <HomeIcon className="w-4 h-4 mr-1.5" />
                  <span>{homeLabel}</span>
                </Link>
              </li>
              {(processedItems.length > 0) && (
                <li>{renderSeparator(-1)}</li>
              )}
            </>
          )}

          {/* Breadcrumb items */}
          {processedItems.map((item, index) => (
            <React.Fragment key={index}>
              <li>{renderBreadcrumbItem(item, index)}</li>
              {index < processedItems.length - 1 && (
                <li>{renderSeparator(index)}</li>
              )}
            </React.Fragment>
          ))}
        </ol>
      </nav>
    );
  }
);

Breadcrumb.displayName = "Breadcrumb";

// Specialized breadcrumb variants for different use cases

// Dashboard breadcrumb - matches your image examples
export interface DashboardBreadcrumbProps extends Omit<BreadcrumbProps, 'variant'> {
  currentPage?: string;
}

const DashboardBreadcrumb = React.forwardRef<HTMLElement, DashboardBreadcrumbProps>(
  ({ currentPage, items, ...props }, ref) => {
    return (
      <Breadcrumb
        ref={ref}
        items={items}
        variant="default"
        separator="chevron"
        {...props}
      />
    );
  }
);

DashboardBreadcrumb.displayName = "DashboardBreadcrumb";

// Product breadcrumb with icons (like in your image)
export interface ProductBreadcrumbProps extends Omit<BreadcrumbProps, 'showHome'> {
  productName?: string;
  categoryName?: string;
}

const ProductBreadcrumb = React.forwardRef<HTMLElement, ProductBreadcrumbProps>(
  ({ productName, categoryName, items, ...props }, ref) => {
    // Add icons for common breadcrumb items
    const enhancedItems = items.map(item => {
      if (item.label.toLowerCase().includes('product')) {
        return {
          ...item,
          icon: ({ className }: { className?: string }) => (
            <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
              <path d="M7.5 21L3 16.5l4.5-4.5L9 13.5l-1.5 1.5 1.5 1.5L7.5 21zM16.5 21L21 16.5l-4.5-4.5L15 13.5l1.5 1.5-1.5 1.5L16.5 21zM12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z" />
            </svg>
          )
        };
      }
      if (item.label.toLowerCase().includes('category')) {
        return {
          ...item,
          icon: ({ className }: { className?: string }) => (
            <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
              <path d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path d="M6 6h.008v.008H6V6z" />
            </svg>
          )
        };
      }
      return item;
    });

    return (
      <Breadcrumb
        ref={ref}
        items={enhancedItems}
        showHome
        homeHref="/"
        homeLabel="Home"
        {...props}
      />
    );
  }
);

ProductBreadcrumb.displayName = "ProductBreadcrumb";

// Utility function to generate breadcrumb items from pathname
export const generateBreadcrumbsFromPath = (
  pathname: string,
  labels?: Record<string, string>
): BreadcrumbItem[] => {
  const segments = pathname.split('/').filter(Boolean);
  
  return segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = labels?.[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const current = index === segments.length - 1;
    
    return {
      label,
      href: current ? undefined : href,
      current
    };
  });
};

// Enhanced breadcrumb hook for Next.js with Ordira customizations
export const useBreadcrumbs = (
  customLabels?: Record<string, string>
) => {
  const [breadcrumbs, setBreadcrumbs] = React.useState<BreadcrumbItem[]>([]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const items = generateBreadcrumbsFromPath(pathname, customLabels);
      setBreadcrumbs(items);
    }
  }, [customLabels]);

  return breadcrumbs;
};

// Pre-configured breadcrumb items for common Ordira pages
export const ordiraBreadcrumbLabels = {
  'dashboard': 'Dashboard',
  'products': 'Products',
  'reports': 'Reports',
  'export': 'Export',
  'social': 'Social',
  'categories': 'Categories',
  'analytics': 'Analytics',
  'settings': 'Settings',
  'profile': 'Profile',
  'billing': 'Billing'
};

export { 
  Breadcrumb as default, 
  DashboardBreadcrumb,
  ProductBreadcrumb
};