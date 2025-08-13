// src/components/ui/navigation/breadcrumb.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

const breadcrumbVariants = cva(
  // Base container styles
  "flex items-center space-x-2 text-sm",
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
  // Base item styles
  "transition-colors duration-200 hover:text-[var(--accent-dark)]",
  {
    variants: {
      variant: {
        default: "text-[var(--muted)]",
        current: "text-[var(--accent)] font-medium",
        home: "text-[var(--muted)] hover:text-[var(--accent)]"
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
        arrow: "mx-2",
        chevron: "mx-1",
        slash: "mx-2"
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
    
    // Handle max items with ellipsis
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
            <item.icon className="w-4 h-4 mr-1" />
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
      <nav ref={ref} aria-label="Breadcrumb" className={cn(breadcrumbVariants({ variant }), className)} {...props}>
        <ol className="flex items-center space-x-2">
          {/* Home item */}
          {showHome && (
            <>
              <li>
                <Link
                  href={homeHref}
                  className={cn(
                    breadcrumbItemVariants({ variant: "home" }),
                    "flex items-center",
                    itemClassName
                  )}
                >
                  <HomeIcon className="w-4 h-4 mr-1" />
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

// Simple breadcrumb hook for Next.js
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

export default Breadcrumb;