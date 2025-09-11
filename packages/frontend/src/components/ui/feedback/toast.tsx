// src/components/ui/feedback/toast.tsx
'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  ExclamationCircleIcon, 
  InformationCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

const toastVariants = cva(
  // Base toast styles - matching your image design
  "relative flex items-start gap-4 w-full max-w-md p-4 rounded-2xl shadow-lg border-l-4 bg-white backdrop-blur-sm transition-all duration-300 transform",
  {
    variants: {
      variant: {
        success: [
          "border-l-[var(--success)]",
          "shadow-[var(--success)]/10"
        ].join(" "),
        
        info: [
          "border-l-[var(--info)]", 
          "shadow-[var(--info)]/10"
        ].join(" "),
        
        warning: [
          "border-l-[var(--warning)]",
          "shadow-[var(--warning)]/10"
        ].join(" "),
        
        error: [
          "border-l-[var(--error)]",
          "shadow-[var(--error)]/10"
        ].join(" ")
      },
      position: {
        'top-right': 'animate-slide-in-right',
        'top-left': 'animate-slide-in-left',
        'bottom-right': 'animate-slide-in-right',
        'bottom-left': 'animate-slide-in-left',
        'top-center': 'animate-slide-in-down',
        'bottom-center': 'animate-slide-in-up'
      }
    },
    defaultVariants: {
      variant: "info",
      position: "top-right"
    }
  }
);

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
  actions?: ToastAction[];
  dismissible?: boolean;
  persistent?: boolean;
}

export interface ToastProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof toastVariants> {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ toast, onDismiss, position, className, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    // Auto-dismiss timer
    useEffect(() => {
      if (!toast.persistent && toast.duration !== 0) {
        const timer = setTimeout(() => {
          setIsExiting(true);
          setTimeout(() => onDismiss(toast.id), 300);
        }, toast.duration || 5000);

        return () => clearTimeout(timer);
      }
    }, [toast.id, toast.duration, toast.persistent, onDismiss]);

    // Show animation
    useEffect(() => {
      setIsVisible(true);
    }, []);

    const handleDismiss = () => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    };

    // Get icon based on variant
    const getIcon = () => {
      const iconClass = "w-6 h-6 flex-shrink-0";
      
      switch (toast.variant) {
        case 'success':
          return <CheckCircleIcon className={cn(iconClass, "text-[var(--success)]")} />;
        case 'warning':
          return <ExclamationTriangleIcon className={cn(iconClass, "text-[var(--warning)]")} />;
        case 'error':
          return <ExclamationCircleIcon className={cn(iconClass, "text-[var(--error)]")} />;
        case 'info':
        default:
          return <InformationCircleIcon className={cn(iconClass, "text-[var(--info)]")} />;
      }
    };

    // Get variant label
    const getVariantLabel = () => {
      switch (toast.variant) {
        case 'success':
          return 'Success';
        case 'warning':
          return 'Warning';
        case 'error':
          return 'Danger';
        case 'info':
        default:
          return 'Info';
      }
    };

    // Get action button styles
    const getActionButtonClass = (variant?: string) => {
      const baseClass = "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors";
      
      switch (variant) {
        case 'primary':
          return cn(baseClass, "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]");
        case 'secondary':
          return cn(baseClass, "bg-[var(--background-secondary)] text-[var(--foreground)] hover:bg-[var(--background-tertiary)]");
        case 'outline':
        default:
          return cn(baseClass, "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--hover-overlay)]");
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          toastVariants({ variant: toast.variant, position }),
          isExiting && "animate-slide-out-right opacity-0 scale-95",
          className
        )}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        {...props}
      >
        {/* Icon */}
        {getIcon()}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header with variant label and title */}
          <div className="flex items-start justify-between mb-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <span className={cn(
                  "text-xs font-medium uppercase tracking-wide",
                  toast.variant === 'success' && "text-[var(--success)]",
                  toast.variant === 'warning' && "text-[var(--warning)]",
                  toast.variant === 'error' && "text-[var(--error)]",
                  toast.variant === 'info' && "text-[var(--info)]"
                )}>
                  {getVariantLabel()}
                </span>
              </div>
              
              <h3 className="text-sm font-semibold text-[var(--foreground)] mt-1 line-clamp-2">
                {toast.title}
              </h3>
            </div>
            
            {/* Dismiss button */}
            {toast.dismissible !== false && (
              <button
                onClick={handleDismiss}
                className="ml-2 p-1 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover-overlay)] rounded-lg transition-colors flex-shrink-0"
                aria-label="Dismiss notification"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Description */}
          {toast.description && (
            <p className="text-sm text-[var(--muted)] mb-3 line-clamp-3">
              {toast.description}
            </p>
          )}
          
          {/* Actions */}
          {toast.actions && toast.actions.length > 0 && (
            <div className="flex items-center space-x-2 mt-3">
              {toast.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={getActionButtonClass(action.variant)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Progress bar for auto-dismiss */}
        {!toast.persistent && toast.duration !== 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--background-secondary)] rounded-b-2xl overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all ease-linear",
                toast.variant === 'success' && "bg-[var(--success)]",
                toast.variant === 'warning' && "bg-[var(--warning)]",
                toast.variant === 'error' && "bg-[var(--error)]",
                toast.variant === 'info' && "bg-[var(--info)]"
              )}
              style={{
                animation: `toast-progress ${toast.duration || 5000}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>
    );
  }
);

Toast.displayName = "Toast";

// Toast Container
export interface ToastContainerProps {
  toasts: Toast[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  onDismiss: (id: string) => void;
  maxToasts?: number;
}

const ToastContainer = React.forwardRef<HTMLDivElement, ToastContainerProps>(
  ({ toasts, position = 'top-right', onDismiss, maxToasts = 5 }, ref) => {
    const positionClasses = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
      'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
    };

    const visibleToasts = toasts.slice(0, maxToasts);
    const isBottom = position.includes('bottom');

    return (
      <div
        ref={ref}
        className={cn(
          "fixed z-50 flex flex-col gap-3",
          positionClasses[position],
          isBottom && "flex-col-reverse"
        )}
        aria-live="polite"
        aria-label="Notifications"
      >
        {visibleToasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            position={position}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    );
  }
);

ToastContainer.displayName = "ToastContainer";

// Toast Context for global state management
interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast Provider
export interface ToastProviderProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  position = 'top-right', 
  maxToasts = 5 
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    setToasts(prev => [newToast, ...prev]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearToasts = () => {
    setToasts([]);
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer
        toasts={toasts}
        position={position}
        onDismiss={removeToast}
        maxToasts={maxToasts}
      />
    </ToastContext.Provider>
  );
};

// Convenience functions for common toast types
export const toast = {
  success: (title: string, description?: string, options?: Partial<Toast>) => {
    // This would be implemented by the useToast hook
    return { title, description, variant: 'success' as const, ...options };
  },
  
  error: (title: string, description?: string, options?: Partial<Toast>) => {
    return { title, description, variant: 'error' as const, ...options };
  },
  
  warning: (title: string, description?: string, options?: Partial<Toast>) => {
    return { title, description, variant: 'warning' as const, ...options };
  },
  
  info: (title: string, description?: string, options?: Partial<Toast>) => {
    return { title, description, variant: 'info' as const, ...options };
  }
};

// CSS for animations
const toastStyles = `
  @keyframes toast-progress {
    from { width: 100%; }
    to { width: 0%; }
  }
  
  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slide-in-left {
    from {
      transform: translateX(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slide-in-down {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes slide-in-up {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes slide-out-right {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out forwards;
  }
  
  .animate-slide-in-left {
    animation: slide-in-left 0.3s ease-out forwards;
  }
  
  .animate-slide-in-down {
    animation: slide-in-down 0.3s ease-out forwards;
  }
  
  .animate-slide-in-up {
    animation: slide-in-up 0.3s ease-out forwards;
  }
  
  .animate-slide-out-right {
    animation: slide-out-right 0.3s ease-in forwards;
  }
`;

// Add styles to document if not already present
if (typeof document !== 'undefined' && !document.getElementById('toast-styles')) {
  const style = document.createElement('style');
  style.id = 'toast-styles';
  style.textContent = toastStyles;
  document.head.appendChild(style);
}

export { 
  Toast, 
  ToastContainer, 
  toastVariants 
};