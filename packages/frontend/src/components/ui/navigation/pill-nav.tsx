// src/components/ui/navigation/pill-nav.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/utils';

const pillNavVariants = cva(
  // Base styles
  "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full font-satoshi-medium text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer border",
  {
    variants: {
      variant: {
        default: [
          "bg-white border-[var(--muted)] text-[var(--muted-foreground)]",
          "hover:bg-[var(--muted)] hover:text-[var(--muted-foreground)]",
          "focus-visible:ring-[var(--primary)]"
        ].join(" "),
        
        primary: [
          "bg-[var(--primary)] border-[var(--primary)] text-white",
          "hover:bg-[var(--primary-dark)] hover:border-[var(--primary-dark)]",
          "focus-visible:ring-[var(--primary)]"
        ].join(" "),
        
        secondary: [
          "bg-[var(--secondary)] border-[var(--secondary)] text-[var(--secondary-foreground)]",
          "hover:bg-[var(--secondary)]/80 hover:border-[var(--secondary)]",
          "focus-visible:ring-[var(--secondary)]"
        ].join(" "),
        
        outline: [
          "bg-transparent border-[var(--border)] text-[var(--foreground)]",
          "hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
          "focus-visible:ring-[var(--ring)]"
        ].join(" "),
        
        ghost: [
          "bg-transparent border-transparent text-[var(--muted-foreground)]",
          "hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
          "focus-visible:ring-[var(--ring)]"
        ].join(" ")
      },
      
      size: {
        sm: "px-3 py-1.5 text-xs",
        default: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base"
      },
      
      active: {
        true: "",
        false: ""
      }
    },
    
    compoundVariants: [
      // Active state overrides
      {
        variant: "default",
        active: true,
        class: "bg-[var(--primary)] border-[var(--primary)] text-white hover:bg-[var(--primary-dark)] hover:border-[var(--primary-dark)]"
      },
      {
        variant: "secondary",
        active: true,
        class: "bg-[var(--primary)] border-[var(--primary)] text-white hover:bg-[var(--primary-dark)] hover:border-[var(--primary-dark)]"
      },
      {
        variant: "outline",
        active: true,
        class: "bg-[var(--primary)] border-[var(--primary)] text-white hover:bg-[var(--primary-dark)] hover:border-[var(--primary-dark)]"
      },
      {
        variant: "ghost",
        active: true,
        class: "bg-[var(--primary)] border-[var(--primary)] text-white hover:bg-[var(--primary-dark)] hover:border-[var(--primary-dark)]"
      }
    ],
    
    defaultVariants: {
      variant: "default",
      size: "default",
      active: false
    }
  }
);

export interface PillNavItem {
  id: string;
  label: string;
  value?: string;
  count?: number;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface PillNavProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pillNavVariants> {
  items: PillNavItem[];
  activeItem?: string;
  onItemChange?: (item: PillNavItem) => void;
  orientation?: 'horizontal' | 'vertical';
  showCounts?: boolean;
  maxItems?: number;
  showMoreLabel?: string;
}

const PillNav = React.forwardRef<HTMLDivElement, PillNavProps>(
  ({ 
    items,
    activeItem,
    onItemChange,
    variant = "default",
    size = "default",
    orientation = "horizontal",
    showCounts = false,
    maxItems,
    showMoreLabel = "More",
    className,
    ...props 
  }, ref) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    
    const visibleItems = maxItems && !isExpanded 
      ? items.slice(0, maxItems)
      : items;
    
    const hiddenItems = maxItems 
      ? items.slice(maxItems)
      : [];
    
    const handleItemClick = (item: PillNavItem) => {
      if (item.disabled) return;
      onItemChange?.(item);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent, item: PillNavItem) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleItemClick(item);
      }
    };
    
    return (
      <div
        ref={ref}
        className={cn(
          "flex gap-2",
          orientation === 'vertical' && "flex-col",
          className
        )}
        role="tablist"
        {...props}
      >
        {visibleItems.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activeItem === item.id}
            aria-controls={`panel-${item.id}`}
            tabIndex={activeItem === item.id ? 0 : -1}
            disabled={item.disabled}
            onClick={() => handleItemClick(item)}
            onKeyDown={(e) => handleKeyDown(e, item)}
            className={cn(
              pillNavVariants({ 
                variant, 
                size, 
                active: activeItem === item.id 
              }),
              item.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {item.icon && (
              <span className="flex-shrink-0">
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
            {showCounts && item.count !== undefined && (
              <span 
                className={cn(
                  "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium",
                  activeItem === item.id 
                    ? "bg-white/20 text-white" 
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        ))}
        
        {hiddenItems.length > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              pillNavVariants({ variant: "ghost", size }),
              "relative"
            )}
            aria-expanded={isExpanded}
            aria-haspopup="true"
          >
            {showMoreLabel}
            <span className="ml-1">
              {isExpanded ? '▲' : '▼'}
            </span>
          </button>
        )}
      </div>
    );
  }
);

PillNav.displayName = "PillNav";

// Filter Pill Nav - Specialized for filtering
export interface FilterPillNavProps extends Omit<PillNavProps, 'items'> {
  filters: Array<{
    key: string;
    label: string;
    count?: number;
    icon?: React.ReactNode;
  }>;
  activeFilters?: string[];
  onFiltersChange?: (activeFilters: string[]) => void;
  multiSelect?: boolean;
}

export const FilterPillNav = React.forwardRef<HTMLDivElement, FilterPillNavProps>(
  ({ 
    filters,
    activeFilters = [],
    onFiltersChange,
    multiSelect = false,
    ...props 
  }, ref) => {
    const items: PillNavItem[] = filters.map(filter => ({
      id: filter.key,
      label: filter.label,
      count: filter.count,
      icon: filter.icon
    }));
    
    const handleItemChange = (item: PillNavItem) => {
      if (multiSelect) {
        const newFilters = activeFilters.includes(item.id)
          ? activeFilters.filter(f => f !== item.id)
          : [...activeFilters, item.id];
        onFiltersChange?.(newFilters);
      } else {
        onFiltersChange?.(activeFilters.includes(item.id) ? [] : [item.id]);
      }
    };
    
    return (
      <PillNav
        ref={ref}
        items={items}
        activeItem={multiSelect ? undefined : activeFilters[0]}
        onItemChange={handleItemChange}
        showCounts={true}
        {...props}
      />
    );
  }
);

FilterPillNav.displayName = "FilterPillNav";

// Tab Pill Nav - Specialized for tab navigation
export interface TabPillNavProps extends Omit<PillNavProps, 'items'> {
  tabs: Array<{
    id: string;
    label: string;
    content?: React.ReactNode;
    disabled?: boolean;
    icon?: React.ReactNode;
  }>;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export const TabPillNav = React.forwardRef<HTMLDivElement, TabPillNavProps>(
  ({ 
    tabs,
    activeTab,
    onTabChange,
    ...props 
  }, ref) => {
    const items: PillNavItem[] = tabs.map(tab => ({
      id: tab.id,
      label: tab.label,
      disabled: tab.disabled,
      icon: tab.icon
    }));
    
    const handleItemChange = (item: PillNavItem) => {
      onTabChange?.(item.id);
    };
    
    const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;
    
    return (
      <div className="space-y-4">
        <PillNav
          ref={ref}
          items={items}
          activeItem={activeTab}
          onItemChange={handleItemChange}
          variant="ghost"
          {...props}
        />
        {activeTabContent && (
          <div 
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            className="mt-4"
          >
            {activeTabContent}
          </div>
        )}
      </div>
    );
  }
);

TabPillNav.displayName = "TabPillNav";

export { PillNav };
export default PillNav;
