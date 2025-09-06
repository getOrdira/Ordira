// src/components/ui/navigation/tabs.tsx
'use client';

import React, { useState, createContext, useContext } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const tabsVariants = cva(
  // Base tabs container styles aligned with Ordira design
  "w-full",
  {
    variants: {
      orientation: {
        horizontal: "space-y-2",
        vertical: "flex space-x-4"
      }
    },
    defaultVariants: {
      orientation: "horizontal"
    }
  }
);

const tabsListVariants = cva(
  // Base tabs list styles with Ordira branding
  "flex",
  {
    variants: {
      variant: {
        // Default underline style
        default: "border-b border-gray-200 bg-transparent",
        // Pill style with rounded background
        pills: "bg-gray-100 p-1 rounded-xl gap-1",
        // Card style with borders
        cards: "bg-white border border-gray-200 rounded-t-2xl",
        // Sidebar navigation style (matches your dashboard image)
        sidebar: "flex-col space-y-1 bg-transparent border-0"
      },
      size: {
        sm: "text-sm",
        md: "text-base", 
        lg: "text-lg"
      },
      orientation: {
        horizontal: "flex-row",
        vertical: "flex-col border-b-0 border-r border-gray-200 min-w-[200px]"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      orientation: "horizontal"
    }
  }
);

const tabsTriggerVariants = cva(
  // Base tab trigger styles with Satoshi font
  "inline-flex items-center justify-start whitespace-nowrap transition-all duration-200 font-satoshi-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default: [
          "px-4 py-3 border-b-2 border-transparent relative",
          "text-[var(--muted)] hover:text-[var(--ordira-accent)] hover:border-gray-300",
          "data-[state=active]:text-[var(--ordira-accent)] data-[state=active]:border-[var(--primary)]"
        ].join(" "),
        pills: [
          "px-4 py-2 rounded-lg",
          "text-[var(--muted)] hover:text-[var(--ordira-accent)] hover:bg-white/60",
          "data-[state=active]:bg-white data-[state=active]:text-[var(--ordira-accent)] data-[state=active]:shadow-sm"
        ].join(" "),
        cards: [
          "px-6 py-4 border-b-2 border-transparent rounded-t-xl",
          "text-[var(--muted)] hover:text-[var(--ordira-accent)] hover:bg-gray-50",
          "data-[state=active]:text-[var(--ordira-accent)] data-[state=active]:bg-white data-[state=active]:border-[var(--primary)]"
        ].join(" "),
        // Sidebar variant matching the dashboard image
        sidebar: [
          "w-full px-4 py-3 rounded-xl text-left relative",
          "text-[var(--muted)] hover:text-[var(--ordira-accent)] hover:bg-gray-50",
          // Orange tint background with grey text for active state (matches image)
          "data-[state=active]:bg-orange-50 data-[state=active]:text-gray-600 data-[state=active]:font-satoshi-medium",
          // Optional: Add a subtle left border for active state
          "data-[state=active]:border-l-2 data-[state=active]:border-orange-400"
        ].join(" ")
      },
      size: {
        sm: "px-3 py-2 text-sm",
        md: "px-4 py-3 text-base",
        lg: "px-6 py-4 text-lg"
      },
      orientation: {
        horizontal: "",
        vertical: "w-full justify-start"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md", 
      orientation: "horizontal"
    }
  }
);

const tabsContentVariants = cva(
  // Base content styles
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "pt-4",
        pills: "pt-4",
        cards: "p-6 bg-white border border-gray-200 border-t-0 rounded-b-2xl",
        sidebar: "pt-0" // No top padding for sidebar variant
      },
      orientation: {
        horizontal: "",
        vertical: "flex-1"
      }
    },
    defaultVariants: {
      variant: "default",
      orientation: "horizontal"
    }
  }
);

// Context for managing tab state
interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  orientation: 'horizontal' | 'vertical';
  variant: 'default' | 'pills' | 'cards' | 'sidebar';
  size: 'sm' | 'md' | 'lg';
}

const TabsContext = createContext<TabsContextValue | null>(null);

const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
};

// Main Tabs component
export interface TabsProps extends VariantProps<typeof tabsVariants> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
  variant?: 'default' | 'pills' | 'cards' | 'sidebar';
  size?: 'sm' | 'md' | 'lg';
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({
    defaultValue,
    value: controlledValue,
    onValueChange,
    orientation = 'horizontal',
    variant = 'default',
    size = 'md',
    className,
    children,
    ...props
  }, ref) => {
    const [internalValue, setInternalValue] = useState(defaultValue || '');
    
    const value = controlledValue !== undefined ? controlledValue : internalValue;
    
    const handleValueChange = (newValue: string) => {
      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    return (
      <TabsContext.Provider 
        value={{ 
          value, 
          onValueChange: handleValueChange, 
          orientation: orientation || 'horizontal',
          variant: variant || 'default',
          size: size || 'md'
        }}
      >
        <div
          ref={ref}
          className={cn(tabsVariants({ orientation }), className)}
          {...props}
        >
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);

Tabs.displayName = "Tabs";

// TabsList component
export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => {
    const { orientation, variant, size } = useTabsContext();
    
    return (
      <div
        ref={ref}
        role="tablist"
        aria-orientation={orientation}
        className={cn(
          tabsListVariants({ variant, size, orientation }),
          className
        )}
        {...props}
      />
    );
  }
);

TabsList.displayName = "TabsList";

// TabsTrigger component with enhanced icon support
export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  className?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  description?: string;
  /** Show notification dot for sidebar variant */
  hasNotification?: boolean;
  /** Count for badge display */
  count?: number;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ 
    value: triggerValue, 
    className, 
    children, 
    icon, 
    badge, 
    description, 
    hasNotification,
    count,
    disabled, 
    ...props 
  }, ref) => {
    const { value, onValueChange, orientation, variant, size } = useTabsContext();
    const isActive = value === triggerValue;

    return (
      <button
        ref={ref}
        role="tab"
        aria-selected={isActive}
        aria-controls={`content-${triggerValue}`}
        data-state={isActive ? "active" : "inactive"}
        disabled={disabled}
        className={cn(
          tabsTriggerVariants({ variant, size, orientation }),
          className
        )}
        onClick={() => !disabled && onValueChange(triggerValue)}
        {...props}
      >
        <div className={cn(
          "flex items-center",
          variant === 'sidebar' ? "space-x-3 w-full" : "space-x-2"
        )}>
          {icon && (
            <div className={cn(
              "flex-shrink-0 relative",
              variant === 'sidebar' ? "w-5 h-5" : "w-4 h-4"
            )}>
              {icon}
              {/* Notification dot for sidebar variant */}
              {hasNotification && variant === 'sidebar' && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
              )}
            </div>
          )}
          
          <div className={cn(
            "flex flex-col",
            variant === 'sidebar' ? "items-start flex-1" : "items-center"
          )}>
            <div className="flex items-center space-x-2">
              <span className={cn(
                variant === 'sidebar' ? "font-satoshi-regular text-sm" : ""
              )}>
                {children}
              </span>
              {badge && badge}
              {count !== undefined && count > 0 && (
                <span className={cn(
                  "inline-flex items-center justify-center px-2 py-1 text-xs font-satoshi-medium rounded-full",
                  isActive && variant === 'sidebar' 
                    ? "bg-orange-200 text-orange-800"
                    : "bg-gray-200 text-gray-600"
                )}>
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </div>
            {description && (
              <span className="text-xs text-[var(--muted)] font-satoshi-regular mt-1">
                {description}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  }
);

TabsTrigger.displayName = "TabsTrigger";

// TabsContent component
export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  className?: string;
  forceMount?: boolean;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value: contentValue, className, children, forceMount = false, ...props }, ref) => {
    const { value, orientation, variant } = useTabsContext();
    const isActive = value === contentValue;

    if (!isActive && !forceMount) {
      return null;
    }

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`content-${contentValue}`}
        aria-labelledby={`trigger-${contentValue}`}
        data-state={isActive ? "active" : "inactive"}
        className={cn(
          tabsContentVariants({ variant, orientation }),
          !isActive && "hidden",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabsContent.displayName = "TabsContent";

// Enhanced Badge component for tabs
export interface TabBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'orange';
  className?: string;
}

const TabBadge = ({ children, variant = 'default', className }: TabBadgeProps) => {
  const badgeVariants = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800", 
    error: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
    orange: "bg-orange-100 text-orange-800" // Added orange variant for Ordira branding
  };

  return (
    <span className={cn(
      "inline-flex items-center justify-center px-2 py-1 text-xs font-satoshi-medium rounded-full",
      badgeVariants[variant],
      className
    )}>
      {children}
    </span>
  );
};

// Sidebar Navigation Tabs (specialized component for your use case)
export interface SidebarTabsProps {
  items: Array<{
    value: string;
    label: string;
    icon?: React.ReactNode;
    count?: number;
    hasNotification?: boolean;
  }>;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

const SidebarTabs = React.forwardRef<HTMLDivElement, SidebarTabsProps>(
  ({ items, value, onValueChange, className }, ref) => {
    return (
      <Tabs 
        ref={ref}
        value={value} 
        onValueChange={onValueChange}
        variant="sidebar"
        orientation="vertical"
        className={className}
      >
        <TabsList>
          {items.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              icon={item.icon}
              count={item.count}
              hasNotification={item.hasNotification}
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    );
  }
);

SidebarTabs.displayName = "SidebarTabs";

// Loading Tab Content
export interface LoadingTabContentProps {
  className?: string;
}

const LoadingTabContent = ({ className }: LoadingTabContentProps) => (
  <div className={cn("flex items-center justify-center py-8", className)}>
    <div className="flex items-center space-x-2 text-[var(--muted)] font-satoshi-regular">
      <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
      <span>Loading...</span>
    </div>
  </div>
);

// Error Tab Content
export interface ErrorTabContentProps {
  error: string;
  onRetry?: () => void;
  className?: string;
}

const ErrorTabContent = ({ error, onRetry, className }: ErrorTabContentProps) => (
  <div className={cn("flex flex-col items-center justify-center py-8 space-y-4", className)}>
    <div className="text-red-600 text-sm font-satoshi-regular">{error}</div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity font-satoshi-medium"
      >
        Try Again
      </button>
    )}
  </div>
);

// Hook for managing tab state
export const useTabs = (defaultValue?: string) => {
  const [activeTab, setActiveTab] = useState(defaultValue || '');
  
  return {
    activeTab,
    setActiveTab,
    isActive: (value: string) => activeTab === value
  };
};

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabBadge,
  SidebarTabs,
  LoadingTabContent,
  ErrorTabContent
};

export default Tabs;