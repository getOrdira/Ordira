// src/components/ui/feedback/alert.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';
import { 
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

const alertVariants = cva(
  // Base styles
  "relative rounded-lg border p-4 transition-all duration-300",
  {
    variants: {
      variant: {
        default: [
          "border-[var(--primary)]/20 bg-[var(--primary)]/5 text-[var(--foreground)]",
          "[&>svg]:text-[var(--primary)]"
        ].join(" "),
        success: [
          "border-[var(--success)]/20 bg-[var(--success)]/5 text-[var(--foreground)]", 
          "[&>svg]:text-[var(--success)]"
        ].join(" "),
        warning: [
          "border-[var(--warning)]/20 bg-[var(--warning)]/5 text-[var(--foreground)]",
          "[&>svg]:text-[var(--warning)]"
        ].join(" "),
        error: [
          "border-[var(--error)]/20 bg-[var(--error)]/5 text-[var(--foreground)]",
          "[&>svg]:text-[var(--error)]"
        ].join(" "),
        info: [
          "border-[var(--info)]/20 bg-[var(--info)]/5 text-[var(--foreground)]",
          "[&>svg]:text-[var(--info)]"
        ].join(" "),
        neutral: [
          "border-[var(--border)] bg-[var(--background-secondary)] text-[var(--foreground)]",
          "[&>svg]:text-[var(--muted)]"
        ].join(" "),
      },
      size: {
        sm: "p-3 text-sm",
        md: "p-4 text-sm", 
        lg: "p-5 text-base",
      },
      position: {
        static: "relative",
        fixed: "fixed z-50",
        sticky: "sticky z-40",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      position: "static",
    },
  }
);

const iconMap = {
  default: InformationCircleIcon,
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  error: XCircleIcon,
  info: InformationCircleIcon,
  neutral: BellIcon,
};

export interface AlertProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  children: React.ReactNode;
  icon?: React.ComponentType<any> | boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
  actions?: React.ReactNode;
  className?: string;
  // Fixed position props
  top?: number | string;
  bottom?: number | string;
  left?: number | string; 
  right?: number | string;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ 
    className,
    variant = "default",
    size = "md",
    position = "static",
    title,
    children,
    icon: iconProp,
    dismissible = false,
    onDismiss,
    autoHide = false,
    autoHideDelay = 5000,
    actions,
    top,
    bottom,
    left,
    right,
    ...props 
  }, ref) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isExiting, setIsExiting] = useState(false);

    // Auto hide functionality
    useEffect(() => {
      if (autoHide && autoHideDelay > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, autoHideDelay);

        return () => clearTimeout(timer);
      }
    }, [autoHide, autoHideDelay]);

    const handleDismiss = () => {
      setIsExiting(true);
      
      // Wait for animation to complete before actually hiding
      setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, 200);
    };

    // Don't render if dismissed
    if (!isVisible) {
      return null;
    }

    // Determine icon to show
    let IconComponent = null;
    if (iconProp === true || iconProp === undefined) {
      IconComponent = iconMap[variant || 'default'];
    } else if (typeof iconProp === 'function') {
      IconComponent = iconProp;
    }

    // Position styles for fixed/sticky positioning
    const positionStyles = position !== 'static' ? {
      top,
      bottom,
      left,
      right,
    } : {};

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          alertVariants({ variant, size, position }),
          isExiting && "opacity-0 transform scale-95",
          position === 'fixed' && "shadow-lg",
          className
        )}
        style={positionStyles}
        {...props}
      >
        <div className="flex">
          {/* Icon */}
          {IconComponent && (
            <div className="flex-shrink-0">
              <IconComponent className="w-5 h-5" />
            </div>
          )}

          {/* Content */}
          <div className={cn("flex-1", IconComponent && "ml-3")}>
            {/* Title */}
            {title && (
              <h3 className="text-sm font-medium mb-1">
                {title}
              </h3>
            )}

            {/* Description */}
            <div className={cn(title ? "text-sm" : "")}>
              {children}
            </div>

            {/* Actions */}
            {actions && (
              <div className="mt-3 flex space-x-2">
                {actions}
              </div>
            )}
          </div>

          {/* Dismiss button */}
          {dismissible && (
            <div className="flex-shrink-0 ml-3">
              <button
                onClick={handleDismiss}
                className={cn(
                  "inline-flex rounded-md p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--focus-ring)]",
                  variant === 'success' && "text-[var(--success)] hover:bg-[var(--success)]/10",
                  variant === 'warning' && "text-[var(--warning)] hover:bg-[var(--warning)]/10", 
                  variant === 'error' && "text-[var(--error)] hover:bg-[var(--error)]/10",
                  (variant === 'default' || variant === 'info') && "text-[var(--primary)] hover:bg-[var(--primary)]/10",
                  variant === 'neutral' && "text-[var(--muted)] hover:bg-[var(--hover-overlay)]",
                )}
                aria-label="Dismiss alert"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = "Alert";

// Alert Title Component
export const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    >
      {children}
    </h5>
  )
);

AlertTitle.displayName = "AlertTitle";

// Alert Description Component  
export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    >
      {children}
    </div>
  )
);

AlertDescription.displayName = "AlertDescription";

// Specialized Alert Components

// Success Alert
export const SuccessAlert = React.forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>(
  (props, ref) => <Alert ref={ref} variant="success" {...props} />
);

SuccessAlert.displayName = "SuccessAlert";

// Warning Alert
export const WarningAlert = React.forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>(
  (props, ref) => <Alert ref={ref} variant="warning" {...props} />
);

WarningAlert.displayName = "WarningAlert";

// Error Alert
export const ErrorAlert = React.forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>(
  (props, ref) => <Alert ref={ref} variant="error" {...props} />
);

ErrorAlert.displayName = "ErrorAlert";

// Info Alert
export const InfoAlert = React.forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>(
  (props, ref) => <Alert ref={ref} variant="info" {...props} />
);

InfoAlert.displayName = "InfoAlert";

// Toast Alert (for notifications)
export interface ToastAlertProps extends Omit<AlertProps, 'position'> {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const ToastAlert = React.forwardRef<HTMLDivElement, ToastAlertProps>(
  ({ position = 'top-right', className, ...props }, ref) => {
    const positionClasses = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4', 
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-center': 'top-4 left-1/2 -translate-x-1/2',
      'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    };

    return (
      <Alert
        ref={ref}
        position="fixed"
        className={cn(positionClasses[position], 'max-w-sm', className)}
        dismissible
        autoHide
        {...props}
      />
    );
  }
);

ToastAlert.displayName = "ToastAlert";

// Banner Alert (full width)
export const BannerAlert = React.forwardRef<HTMLDivElement, Omit<AlertProps, 'position'>>(
  ({ className, ...props }, ref) => (
    <Alert
      ref={ref}
      position="static"
      className={cn('rounded-none border-x-0', className)}
      {...props}
    />
  )
);

BannerAlert.displayName = "BannerAlert";

// Inline Alert (compact)
export const InlineAlert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ size = 'sm', className, ...props }, ref) => (
    <Alert
      ref={ref}
      size={size}
      className={cn('border-l-4 border-t-0 border-r-0 border-b-0 rounded-l-none', className)}
      {...props}
    />
  )
);

InlineAlert.displayName = "InlineAlert";

// Alert Context Provider for managing global alerts
export interface AlertContextType {
  alerts: Array<AlertProps & { id: string }>;
  addAlert: (alert: Omit<AlertProps, 'onDismiss'>) => string;
  removeAlert: (id: string) => void;
  clearAlerts: () => void;
}

const AlertContext = React.createContext<AlertContextType | undefined>(undefined);

export const useAlerts = () => {
  const context = React.useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};

export const AlertProvider = ({ children }: { children: React.ReactNode }) => {
  const [alerts, setAlerts] = useState<Array<AlertProps & { id: string }>>([]);

  const addAlert = (alert: Omit<AlertProps, 'onDismiss'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setAlerts(prev => [...prev, { ...alert, id, onDismiss: () => removeAlert(id) }]);
    return id;
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  return (
    <AlertContext.Provider value={{ alerts, addAlert, removeAlert, clearAlerts }}>
      {children}
      
      {/* Global Alert Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {alerts.map(({ id, ...alertProps }) => (
          <Alert
            key={id}
            {...alertProps}
            dismissible
            autoHide
            autoHideDelay={5000}
          />
        ))}
      </div>
    </AlertContext.Provider>
  );
};

export { Alert };
export default Alert;