// src/components/ui/data-display/empty-state.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';
import { 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  FaceSmileIcon,
  DocumentIcon,
  UserGroupIcon,
  ShoppingCartIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const emptyStateVariants = cva(
  "flex flex-col items-center justify-center text-center p-8 font-satoshi",
  {
    variants: {
      variant: {
        default: "",
        card: "bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg",
        minimal: "p-4",
        elevated: "bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-[var(--card-shadow)]"
      },
      size: {
        sm: "p-4 space-y-3",
        md: "p-8 space-y-4", 
        lg: "p-12 space-y-6"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

export interface EmptyStateProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  title: string;
  description?: string;
  
  // Visual elements
  icon?: React.ReactNode;
  illustration?: string;
  
  // Actions
  primaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  
  // Styling
  iconClassName?: string;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({
    title,
    description,
    icon,
    illustration,
    primaryAction,
    secondaryAction,
    iconClassName,
    variant = "default",
    size = "md",
    className,
    ...props
  }, ref) => {
    
    const renderIcon = () => {
      if (illustration) {
        return (
          <img 
            src={illustration} 
            alt={title}
            className="w-32 h-32 mb-4 opacity-60"
          />
        );
      }
      
      if (icon) {
        return (
          <div className={cn(
            "w-16 h-16 mb-4 text-[var(--muted)] flex items-center justify-center",
            iconClassName
          )}>
            {icon}
          </div>
        );
      }
      
      return (
        <div className="w-16 h-16 mb-4 text-[var(--muted)] flex items-center justify-center">
          <DocumentIcon className="w-full h-full" />
        </div>
      );
    };

    const getActionButtonClasses = (actionVariant: string = 'primary') => {
      const baseClasses = "px-4 py-2 rounded-lg font-medium transition-colors";
      
      switch (actionVariant) {
        case 'primary':
          return cn(baseClasses, "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]");
        case 'secondary':
          return cn(baseClasses, "bg-[var(--background-secondary)] text-[var(--foreground)] hover:bg-[var(--background-tertiary)]");
        case 'outline':
          return cn(baseClasses, "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--hover-overlay)]");
        default:
          return cn(baseClasses, "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]");
      }
    };

    return (
      <div
        ref={ref}
        className={cn(emptyStateVariants({ variant, size }), className)}
        {...props}
      >
        {renderIcon()}
        
        <div className="space-y-2">
          <h3 className="text-lg font-satoshi-bold text-[var(--heading-color)]">
            {title}
          </h3>
          
          {description && (
            <p className="text-[var(--body-color)] max-w-sm">
              {description}
            </p>
          )}
        </div>

        {(primaryAction || secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            {primaryAction && (
              <button
                onClick={primaryAction.onClick}
                className={getActionButtonClasses(primaryAction.variant)}
              >
                {primaryAction.label}
              </button>
            )}
            
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="px-4 py-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);

EmptyState.displayName = "EmptyState";

// Pre-configured empty state components for common scenarios

// No Data Empty State
export interface NoDataEmptyStateProps extends Omit<EmptyStateProps, 'title' | 'icon'> {
  dataType?: 'users' | 'products' | 'orders' | 'files' | 'messages' | 'custom';
  customTitle?: string;
}

export const NoDataEmptyState = React.forwardRef<HTMLDivElement, NoDataEmptyStateProps>(
  ({ dataType = 'custom', customTitle, ...props }, ref) => {
    const configs = {
      users: { title: 'No users found', icon: <UserGroupIcon className="w-full h-full" /> },
      products: { title: 'No products available', icon: <ShoppingCartIcon className="w-full h-full" /> },
      orders: { title: 'No orders yet', icon: <DocumentIcon className="w-full h-full" /> },
      files: { title: 'No files uploaded', icon: <DocumentIcon className="w-full h-full" /> },
      messages: { title: 'No messages', icon: <InformationCircleIcon className="w-full h-full" /> },
      custom: { title: customTitle || 'No data available', icon: <DocumentIcon className="w-full h-full" /> }
    };

    const config = configs[dataType];

    return (
      <EmptyState
        ref={ref}
        title={config.title}
        icon={config.icon}
        {...props}
      />
    );
  }
);

NoDataEmptyState.displayName = "NoDataEmptyState";

// Error Empty State
export interface ErrorEmptyStateProps extends Omit<EmptyStateProps, 'title' | 'icon'> {
  errorType?: 'network' | 'permission' | 'notfound' | 'generic';
  customTitle?: string;
}

export const ErrorEmptyState = React.forwardRef<HTMLDivElement, ErrorEmptyStateProps>(
  ({ errorType = 'generic', customTitle, ...props }, ref) => {
    const configs = {
      network: { 
        title: 'Connection Error', 
        description: 'Unable to load data. Please check your connection and try again.',
        icon: <ExclamationTriangleIcon className="w-full h-full" />
      },
      permission: { 
        title: 'Access Denied', 
        description: 'You don\'t have permission to view this content.',
        icon: <ExclamationTriangleIcon className="w-full h-full" />
      },
      notfound: { 
        title: 'Not Found', 
        description: 'The content you\'re looking for doesn\'t exist.',
        icon: <InformationCircleIcon className="w-full h-full" />
      },
      generic: { 
        title: customTitle || 'Something went wrong', 
        description: 'An error occurred while loading the content.',
        icon: <ExclamationTriangleIcon className="w-full h-full" />
      }
    };

    const config = configs[errorType];

    return (
      <EmptyState
        ref={ref}
        title={config.title}
        description={config.description}
        icon={config.icon}
        iconClassName="text-[var(--error)]"
        {...props}
      />
    );
  }
);

ErrorEmptyState.displayName = "ErrorEmptyState";

// Welcome Empty State
export interface WelcomeEmptyStateProps extends Omit<EmptyStateProps, 'title' | 'icon'> {
  userName?: string;
}

export const WelcomeEmptyState = React.forwardRef<HTMLDivElement, WelcomeEmptyStateProps>(
  ({ userName, ...props }, ref) => (
    <EmptyState
      ref={ref}
      title={userName ? `Welcome, ${userName}!` : 'Welcome!'}
      description="Get started by exploring the features or creating your first item."
      icon={<FaceSmileIcon className="w-full h-full" />}
      iconClassName="text-[var(--primary)]"
      {...props}
    />
  )
);

WelcomeEmptyState.displayName = "WelcomeEmptyState";

export { EmptyState };
export default EmptyState;