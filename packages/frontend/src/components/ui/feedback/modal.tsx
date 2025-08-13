// src/components/ui/feedback/modal.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { XMarkIcon } from '@heroicons/react/24/outline';

const modalVariants = cva(
  // Base modal styles matching your image
  "relative bg-white rounded-3xl shadow-2xl w-full max-h-[90vh] overflow-hidden",
  {
    variants: {
      size: {
        sm: "max-w-md",
        md: "max-w-lg",
        lg: "max-w-2xl", 
        xl: "max-w-4xl",
        "2xl": "max-w-6xl",
        full: "max-w-[95vw]"
      },
      padding: {
        none: "",
        sm: "p-4",
        md: "p-6",
        lg: "p-8"
      }
    },
    defaultVariants: {
      size: "md",
      padding: "none"
    }
  }
);

const overlayVariants = cva(
  // Backdrop overlay
  "fixed inset-0 z-50 flex items-center justify-center p-4",
  {
    variants: {
      backdrop: {
        blur: "bg-black/50 backdrop-blur-sm",
        solid: "bg-black/60",
        light: "bg-black/30 backdrop-blur-sm"
      }
    },
    defaultVariants: {
      backdrop: "blur"
    }
  }
);

export interface ModalProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof modalVariants> {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  backdrop?: 'blur' | 'solid' | 'light';
  children?: React.ReactNode;
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({
    open,
    onClose,
    title,
    description,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    showCloseButton = true,
    backdrop = 'blur',
    size,
    padding = 'none',
    className,
    children,
    ...props
  }, ref) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Handle escape key
    useEffect(() => {
      if (!open || !closeOnEscape) return;

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [open, closeOnEscape, onClose]);

    // Handle body scroll lock
    useEffect(() => {
      if (open) {
        document.body.style.overflow = 'hidden';
        return () => {
          document.body.style.overflow = 'unset';
        };
      }
    }, [open]);

    // Handle click outside
    const handleOverlayClick = (event: React.MouseEvent) => {
      if (closeOnOverlayClick && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (!open) return null;

    return (
      <div
        className={cn(overlayVariants({ backdrop }))}
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        aria-describedby={description ? "modal-description" : undefined}
      >
        <div
          ref={modalRef}
          className={cn(modalVariants({ size, padding }), className)}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {/* Header */}
          {(title || description || showCloseButton) && (
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div className="flex-1 min-w-0">
                {title && (
                  <h2 
                    id="modal-title"
                    className="text-xl font-semibold text-[var(--dark)] mb-1"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p 
                    id="modal-description"
                    className="text-sm text-[var(--muted)]"
                  >
                    {description}
                  </p>
                )}
              </div>
              
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="ml-4 p-2 text-[var(--muted)] hover:text-[var(--dark)] hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    );
  }
);

Modal.displayName = "Modal";

// Modal Header Component
export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

const ModalHeader = React.forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ title, description, actions, icon, className, children, ...props }, ref) => (
    <div 
      ref={ref}
      className={cn("flex items-start justify-between p-6 border-b border-gray-100", className)}
      {...props}
    >
      <div className="flex items-start space-x-3 flex-1 min-w-0">
        {icon && (
          <div className="flex-shrink-0 p-2 rounded-lg bg-[var(--accent)]/10">
            <div className="w-6 h-6 text-[var(--accent)]">
              {icon}
            </div>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {title && (
            <h2 className="text-xl font-semibold text-[var(--dark)] mb-1">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-[var(--muted)]">
              {description}
            </p>
          )}
          {children}
        </div>
      </div>
      
      {actions && (
        <div className="flex items-center space-x-2 ml-4">
          {actions}
        </div>
      )}
    </div>
  )
);

ModalHeader.displayName = "ModalHeader";

// Modal Body Component
export interface ModalBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

const ModalBody = React.forwardRef<HTMLDivElement, ModalBodyProps>(
  ({ spacing = 'md', className, ...props }, ref) => {
    const spacingClasses = {
      none: "p-0",
      sm: "p-4",
      md: "p-6",
      lg: "p-8"
    };

    return (
      <div 
        ref={ref}
        className={cn(spacingClasses[spacing], className)}
        {...props}
      />
    );
  }
);

ModalBody.displayName = "ModalBody";

// Modal Footer Component (for action buttons)
export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  justify?: 'start' | 'center' | 'end' | 'between';
  spacing?: 'sm' | 'md' | 'lg';
}

const ModalFooter = React.forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ justify = 'end', spacing = 'md', className, ...props }, ref) => {
    const justifyClasses = {
      start: "justify-start",
      center: "justify-center", 
      end: "justify-end",
      between: "justify-between"
    };

    const spacingClasses = {
      sm: "space-x-2",
      md: "space-x-3",
      lg: "space-x-4"
    };

    return (
      <div 
        ref={ref}
        className={cn(
          "flex items-center p-6 border-t border-gray-100 bg-gray-50/50",
          justifyClasses[justify],
          spacingClasses[spacing],
          className
        )}
        {...props}
      />
    );
  }
);

ModalFooter.displayName = "ModalFooter";

// Confirmation Modal
export interface ConfirmationModalProps extends Omit<ModalProps, 'children'> {
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: 'default' | 'destructive' | 'warning';
  loading?: boolean;
  icon?: React.ReactNode;
}

const ConfirmationModal = React.forwardRef<HTMLDivElement, ConfirmationModalProps>(
  ({
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    variant = 'default',
    loading = false,
    icon,
    title,
    description,
    onClose,
    ...modalProps
  }, ref) => {
    const handleCancel = () => {
      onCancel?.();
      onClose();
    };

    const handleConfirm = () => {
      onConfirm();
      // Don't auto-close - let parent handle closing after async operations
    };

    return (
      <Modal
        ref={ref}
        title={title}
        description={description}
        onClose={onClose}
        size="sm"
        {...modalProps}
      >
        {icon && (
          <ModalBody>
            <div className="flex items-center justify-center mb-4">
              <div className={cn(
                "p-3 rounded-full",
                variant === 'destructive' && "bg-[var(--error)]/10",
                variant === 'warning' && "bg-[var(--warning)]/10",
                variant === 'default' && "bg-[var(--accent)]/10"
              )}>
                <div className={cn(
                  "w-8 h-8",
                  variant === 'destructive' && "text-[var(--error)]",
                  variant === 'warning' && "text-[var(--warning)]", 
                  variant === 'default' && "text-[var(--accent)]"
                )}>
                  {icon}
                </div>
              </div>
            </div>
          </ModalBody>
        )}

        <ModalFooter>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-[var(--muted)] bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {cancelText}
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              "px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 relative",
              variant === 'destructive' && "bg-[var(--error)] hover:bg-[var(--error-dark)]",
              variant === 'warning' && "bg-[var(--warning)] hover:bg-[var(--warning-dark)]",
              variant === 'default' && "bg-[var(--accent)] hover:bg-[var(--accent-dark)]"
            )}
          >
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <span className={loading ? 'opacity-0' : ''}>
              {confirmText}
            </span>
          </button>
        </ModalFooter>
      </Modal>
    );
  }
);

ConfirmationModal.displayName = "ConfirmationModal";

// Form Modal - For forms like in your image
export interface FormModalProps extends Omit<ModalProps, 'children'> {
  children: React.ReactNode;
  submitText?: string;
  cancelText?: string;
  onSubmit?: (event: React.FormEvent) => void;
  onCancel?: () => void;
  submitDisabled?: boolean;
  submitLoading?: boolean;
  submitVariant?: 'primary' | 'success' | 'warning' | 'error';
  formProps?: React.FormHTMLAttributes<HTMLFormElement>;
}

const FormModal = React.forwardRef<HTMLDivElement, FormModalProps>(
  ({
    children,
    submitText = 'Submit',
    cancelText = 'Cancel',
    onSubmit,
    onCancel,
    submitDisabled = false,
    submitLoading = false,
    submitVariant = 'primary',
    formProps,
    onClose,
    ...modalProps
  }, ref) => {
    const handleCancel = () => {
      onCancel?.();
      onClose();
    };

    const handleSubmit = (event: React.FormEvent) => {
      event.preventDefault();
      onSubmit?.(event);
    };

    const submitVariantClasses = {
      primary: "bg-[var(--accent)] hover:bg-[var(--accent-dark)]",
      success: "bg-[var(--success)] hover:bg-[var(--success-dark)]",
      warning: "bg-[var(--warning)] hover:bg-[var(--warning-dark)]",
      error: "bg-[var(--error)] hover:bg-[var(--error-dark)]"
    };

    return (
      <Modal
        ref={ref}
        onClose={onClose}
        {...modalProps}
      >
        <form onSubmit={handleSubmit} {...formProps}>
          <ModalBody>
            {children}
          </ModalBody>

          <ModalFooter>
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitLoading}
              className="px-4 py-2 text-sm font-medium text-[var(--muted)] bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {cancelText}
            </button>
            
            <button
              type="submit"
              disabled={submitDisabled || submitLoading}
              className={cn(
                "px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 relative",
                submitVariantClasses[submitVariant]
              )}
            >
              {submitLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <span className={submitLoading ? 'opacity-0' : ''}>
                {submitText}
              </span>
            </button>
          </ModalFooter>
        </form>
      </Modal>
    );
  }
);

FormModal.displayName = "FormModal";

export { 
  Modal, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  ConfirmationModal, 
  FormModal,
  modalVariants 
};