// src/components/ui/feedback/dialog.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';
import { XMarkIcon } from '@heroicons/react/24/outline';

const dialogVariants = cva(
  // Base styles for dialog content
  "relative bg-[var(--card-bg)] rounded-lg shadow-xl transform transition-all",
  {
    variants: {
      size: {
        xs: "max-w-xs",
        sm: "max-w-sm", 
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        "3xl": "max-w-3xl",
        "4xl": "max-w-4xl",
        "5xl": "max-w-5xl",
        "6xl": "max-w-6xl",
        "7xl": "max-w-7xl",
        full: "max-w-full",
      },
      variant: {
        default: "border border-[var(--card-border)]",
        elevated: "border-0 shadow-2xl",
        minimal: "border-0 shadow-lg",
      }
    },
    defaultVariants: {
      size: "md",
      variant: "elevated",
    },
  }
);

const overlayVariants = cva(
  "fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto",
  {
    variants: {
      backdrop: {
        default: "bg-black/50 backdrop-blur-sm",
        dark: "bg-black/70",
        light: "bg-black/30", 
        blur: "bg-black/30 backdrop-blur-md",
        none: "bg-transparent",
      }
    },
    defaultVariants: {
      backdrop: "default",
    },
  }
);

export interface DialogProps 
  extends VariantProps<typeof dialogVariants>,
    VariantProps<typeof overlayVariants> {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  preventScrollLock?: boolean;
  className?: string;
  overlayClassName?: string;
  contentClassName?: string;
  initialFocus?: React.RefObject<HTMLElement>;
  trapFocus?: boolean;
}

const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  ({ 
    open,
    onClose,
    children,
    title,
    description,
    size = "md",
    variant = "elevated",
    backdrop = "default",
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    preventScrollLock = false,
    className,
    overlayClassName,
    contentClassName,
    initialFocus,
    trapFocus = true,
    ...props 
  }, ref) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<Element | null>(null);
    const [mounted, setMounted] = useState(false);

    // Handle mounting for proper SSR
    useEffect(() => {
      setMounted(true);
    }, []);

    // Focus management
    useEffect(() => {
      if (!open || !mounted) return;

      // Store previously focused element
      previousActiveElement.current = document.activeElement;

      // Focus initial element or dialog
      const focusElement = initialFocus?.current || dialogRef.current;
      if (focusElement) {
        focusElement.focus();
      }

      return () => {
        // Restore focus when dialog closes
        if (previousActiveElement.current && trapFocus) {
          (previousActiveElement.current as HTMLElement).focus();
        }
      };
    }, [open, mounted, trapFocus]);

    // Focus trap
    useEffect(() => {
      if (!open || !trapFocus || !mounted) return;

      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab' || !dialogRef.current) return;

        const focusableElements = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      };

      document.addEventListener('keydown', handleTab);
      return () => document.removeEventListener('keydown', handleTab);
    }, [open, trapFocus, mounted]);

    // Escape key handler
    useEffect(() => {
      if (!open || !closeOnEscape || !mounted) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [open, closeOnEscape, onClose, mounted]);

    // Body scroll lock
    useEffect(() => {
      if (!open || preventScrollLock || !mounted) return;

      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;

      // Calculate scrollbar width
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }, [open, preventScrollLock, mounted]);

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose();
      }
    };

    if (!mounted || !open) {
      return null;
    }

    return (
      <div
        className={cn(overlayVariants({ backdrop }), overlayClassName)}
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "dialog-title" : undefined}
        aria-describedby={description ? "dialog-description" : undefined}
        {...props}
      >
        <div
          ref={dialogRef}
          className={cn(
            dialogVariants({ size, variant }),
            "mx-auto my-8 w-full",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || description || showCloseButton) && (
            <div className="flex items-start justify-between p-6 border-b border-[var(--border)]">
              <div className="flex-1">
                {title && (
                  <h2 
                    id="dialog-title"
                    className="text-lg font-semibold text-[var(--heading-color)] leading-6"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p 
                    id="dialog-description"
                    className="mt-1 text-sm text-[var(--body-color)]"
                  >
                    {description}
                  </p>
                )}
              </div>
              
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="ml-4 p-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-md hover:bg-[var(--hover-overlay)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  aria-label="Close dialog"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className={cn("p-6", contentClassName)}>
            {children}
          </div>
        </div>
      </div>
    );
  }
);

Dialog.displayName = "Dialog";

// Dialog Header Component
export const DialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

DialogHeader.displayName = "DialogHeader";

// Dialog Title Component
export const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-[var(--heading-color)]",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  )
);

DialogTitle.displayName = "DialogTitle";

// Dialog Description Component
export const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-[var(--body-color)]", className)}
      {...props}
    >
      {children}
    </p>
  )
);

DialogDescription.displayName = "DialogDescription";

// Dialog Content Component
export const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("space-y-4", className)}
      {...props}
    >
      {children}
    </div>
  )
);

DialogContent.displayName = "DialogContent";

// Dialog Footer Component
export const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0 pt-4 border-t border-[var(--border)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

DialogFooter.displayName = "DialogFooter";

// Confirmation Dialog Component
export interface ConfirmationDialogProps extends Omit<DialogProps, 'children'> {
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: 'default' | 'destructive';
  loading?: boolean;
}

export const ConfirmationDialog = React.forwardRef<HTMLDivElement, ConfirmationDialogProps>(
  ({ 
    confirmText = "Confirm",
    cancelText = "Cancel", 
    onConfirm,
    onCancel,
    variant: confirmVariant = "default",
    loading = false,
    onClose,
    ...props 
  }, ref) => {
    const handleCancel = () => {
      onCancel?.();
      onClose();
    };

    const handleConfirm = () => {
      onConfirm();
      // Let parent handle closing if needed
    };

    return (
      <Dialog
        ref={ref}
        onClose={onClose}
        size="sm"
        {...props}
      >
        <DialogFooter>
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-[var(--foreground-secondary)] bg-[var(--background)] border border-[var(--border)] rounded-md hover:bg-[var(--background-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 transition-colors"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              "px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              confirmVariant === "destructive" 
                ? "bg-[var(--error)] hover:bg-[var(--error-dark)] focus:ring-[var(--error)]" 
                : "bg-[var(--primary)] hover:bg-[var(--primary-dark)] focus:ring-[var(--primary)]"
            )}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Loading...</span>
              </div>
            ) : (
              confirmText
            )}
          </button>
        </DialogFooter>
      </Dialog>
    );
  }
);

ConfirmationDialog.displayName = "ConfirmationDialog";

// Form Dialog Component
export interface FormDialogProps extends Omit<DialogProps, 'children'> {
  children: React.ReactNode;
  submitText?: string;
  cancelText?: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  loading?: boolean;
  submitDisabled?: boolean;
}

export const FormDialog = React.forwardRef<HTMLDivElement, FormDialogProps>(
  ({ 
    children,
    submitText = "Submit",
    cancelText = "Cancel",
    onSubmit,
    onCancel,
    loading = false,
    submitDisabled = false,
    onClose,
    ...props 
  }, ref) => {
    const handleCancel = () => {
      onCancel?.();
      onClose();
    };

    return (
      <Dialog
        ref={ref}
        onClose={onClose}
        {...props}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogContent>
            {children}
          </DialogContent>
          
          <DialogFooter>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-[var(--foreground-secondary)] bg-[var(--background)] border border-[var(--border)] rounded-md hover:bg-[var(--background-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 transition-colors"
              disabled={loading}
            >
              {cancelText}
            </button>
            <button
              type="submit"
              disabled={loading || submitDisabled}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] border border-transparent rounded-md hover:bg-[var(--primary-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                submitText
              )}
            </button>
          </DialogFooter>
        </form>
      </Dialog>
    );
  }
);

FormDialog.displayName = "FormDialog";

export { 
  Dialog, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogContent, 
  DialogFooter 
};
export default Dialog;