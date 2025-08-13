// src/components/ui/navigation/tabs.tsx
'use client';

import React, { useState, createContext, useContext } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const tabsVariants = cva(
  // Base tabs container styles
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
  // Base tabs list styles
  "flex border-b border-gray-200",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        pills: "bg-gray-100 p-1 rounded-xl",
        cards: "bg-white border border-gray-200 rounded-t-2xl"
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
  // Base tab trigger styles
  "inline-flex items-center justify-center whitespace-nowrap transition-all duration-200 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: [
          "px-4 py-3 border-b-2 border-transparent",
          "text-[var(--muted)] hover:text-[var(--dark)] hover:border-gray-300",
          "data-[state=active]:text-[var(--accent)] data-[state=active]:border-[var(--accent)]"
        ].join(" "),
        pills: [
          "px-4 py-2 rounded-lg",
          "text-[var(--muted)] hover:text-[var(--dark)] hover:bg-white/60",
          "data-[state=active]:bg-white data-[state=active]:text-[var(--dark)] data-[state=active]:shadow-sm"
        ].join(" "),
        cards: [
          "px-6 py-4 border-b-2 border-transparent rounded-t-xl",
          "text-[var(--muted)] hover:text-[var(--dark)] hover:bg-gray-50",
          "data-[state=active]:text-[var(--accent)] data-[state=active]:bg-white data-[state=active]:border-[var(--accent)]"
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
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "pt-4",
        pills: "pt-4",
        cards: "p-6 bg-white border border-gray-200 border-t-0 rounded-b-2xl"
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
  variant: 'default' | 'pills' | 'cards';
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
  variant?: 'default' | 'pills' | 'cards';
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

// TabsTrigger component
export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  className?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  description?: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value: triggerValue, className, children, icon, badge, description, disabled, ...props }, ref) => {
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
        <div className="flex items-center space-x-2">
          {icon && (
            <div className="w-4 h-4 flex-shrink-0">
              {icon}
            </div>
          )}
          
          <div className="flex flex-col items-start">
            <div className="flex items-center space-x-2">
              <span>{children}</span>
              {badge && badge}
            </div>
            {description && (
              <span className="text-xs text-[var(--muted)] font-normal mt-1">
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

// Badge component for tabs
export interface TabBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

const TabBadge = ({ children, variant = 'default', className }: TabBadgeProps) => {
  const badgeVariants = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-[var(--success)]/10 text-[var(--success)]",
    warning: "bg-[var(--warning)]/10 text-[var(--warning)]",
    error: "bg-[var(--error)]/10 text-[var(--error)]",
    info: "bg-[var(--accent)]/10 text-[var(--accent)]"
  };

  return (
    <span className={cn(
      "inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full",
      badgeVariants[variant],
      className
    )}>
      {children}
    </span>
  );
};

// Loading Tab Content
export interface LoadingTabContentProps {
  className?: string;
}

const LoadingTabContent = ({ className }: LoadingTabContentProps) => (
  <div className={cn("flex items-center justify-center py-8", className)}>
    <div className="flex items-center space-x-2 text-[var(--muted)]">
      <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
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
    <div className="text-[var(--error)] text-sm">{error}</div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-dark)] transition-colors"
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
  LoadingTabContent,
  ErrorTabContent
};

export default Tabs;