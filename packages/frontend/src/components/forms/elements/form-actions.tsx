// src/components/forms/elements/form-actions.tsx

import React from 'react';
import { cn } from '@/lib/utils/utils';
import { SubmitButton, type SubmitButtonProps } from './submit-button';

export interface FormActionsProps {
  // Layout
  orientation?: 'horizontal' | 'vertical' | 'split';
  alignment?: 'left' | 'center' | 'right' | 'between' | 'around';
  spacing?: 'sm' | 'md' | 'lg';
  
  // Primary action (submit)
  submitText?: string;
  submitProps?: Omit<SubmitButtonProps, 'children'>;
  
  // Secondary actions
  showCancel?: boolean;
  cancelText?: string;
  onCancel?: () => void;
  
  showReset?: boolean;
  resetText?: string;
  onReset?: () => void;
  
  // Custom actions
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    disabled?: boolean;
    icon?: React.ReactNode;
  }>;
  
  // Styling
  className?: string;
  children?: React.ReactNode;
}

export const FormActions: React.FC<FormActionsProps> = ({
  orientation = 'horizontal',
  alignment = 'right',
  spacing = 'md',
  submitText = 'Submit',
  submitProps,
  showCancel = false,
  cancelText = 'Cancel',
  onCancel,
  showReset = false,
  resetText = 'Reset',
  onReset,
  actions = [],
  className,
  children
}) => {
  const spacingClasses = {
    sm: orientation === 'horizontal' ? 'gap-2' : 'space-y-2',
    md: orientation === 'horizontal' ? 'gap-3' : 'space-y-3',
    lg: orientation === 'horizontal' ? 'gap-4' : 'space-y-4'
  };

  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
    around: 'justify-around'
  };

  const containerClasses = cn(
    'flex',
    orientation === 'vertical' ? 'flex-col' : 'flex-row items-center',
    orientation === 'split' ? 'flex-row items-center justify-between' : alignmentClasses[alignment],
    spacingClasses[spacing],
    className
  );

  const secondaryActions = (
    <>
      {actions.map((action, index) => (
        <button
          key={index}
          type="button"
          onClick={action.onClick}
          disabled={action.disabled}
          className={cn(
            'inline-flex items-center justify-center px-4 py-2 text-sm font-satoshi-medium',
            'border rounded-lg transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-60',
            {
              'bg-[var(--primary)] text-white border-[var(--primary)] hover:bg-[var(--primary-dark)]': action.variant === 'primary',
              'bg-[var(--secondary)] text-white border-[var(--secondary)] hover:bg-[var(--secondary-dark)]': action.variant === 'secondary',
              'bg-transparent text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--background-secondary)]': action.variant === 'outline' || !action.variant,
              'bg-transparent text-[var(--foreground)] border-transparent hover:bg-[var(--background-secondary)]': action.variant === 'ghost'
            }
          )}
        >
          {action.icon && <span className="mr-2">{action.icon}</span>}
          {action.label}
        </button>
      ))}
      
      {showReset && (
        <button
          type="reset"
          onClick={onReset}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-satoshi-medium text-[var(--foreground)] bg-transparent border border-[var(--border)] rounded-lg hover:bg-[var(--background-secondary)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:ring-offset-2"
        >
          {resetText}
        </button>
      )}
      
      {showCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-satoshi-medium text-[var(--muted)] bg-transparent border border-transparent rounded-lg hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:ring-offset-2"
        >
          {cancelText}
        </button>
      )}
    </>
  );

  if (orientation === 'split') {
    return (
      <div className={containerClasses}>
        <div className={cn('flex items-center', spacingClasses[spacing])}>
          {secondaryActions}
        </div>
        <div className={cn('flex items-center', spacingClasses[spacing])}>
          <SubmitButton {...submitProps}>{submitText}</SubmitButton>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      {orientation === 'horizontal' && alignment === 'right' && secondaryActions}
      
      <SubmitButton {...submitProps}>{submitText}</SubmitButton>
      
      {orientation === 'horizontal' && alignment !== 'right' && secondaryActions}
      {orientation === 'vertical' && secondaryActions}
      
      {children}
    </div>
  );
};