// src/components/forms/elements/submit-button.tsx

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils/utils';

export interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // Loading states
  isLoading?: boolean;
  loadingText?: string;
  
  // Variants
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  
  // Form integration
  requiresDirty?: boolean; // Only enable if form is dirty
  requiresValid?: boolean; // Only enable if form is valid
  
  // Content
  children?: React.ReactNode;
  icon?: React.ReactNode;
  loadingIcon?: React.ReactNode;
  
  // Submit behavior
  preventDoubleSubmit?: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  isLoading: externalLoading,
  loadingText = 'Submitting...',
  variant = 'primary',
  size = 'md',
  requiresDirty = false,
  requiresValid = true,
  children = 'Submit',
  icon,
  loadingIcon,
  preventDoubleSubmit = true,
  disabled,
  className,
  ...props
}) => {
  // Get form state if within form context
  const formContext = useFormContext();
  const formState = formContext?.formState;
  
  // Determine loading state
  const isFormSubmitting = formState?.isSubmitting || false;
  const isLoading = externalLoading || (preventDoubleSubmit && isFormSubmitting);
  
  // Determine if button should be disabled
  const isFormInvalid = requiresValid && formState && !formState.isValid;
  const isFormPristine = requiresDirty && formState && !formState.isDirty;
  const shouldDisable = disabled || isLoading || isFormInvalid || isFormPristine;

  // Styling variants
  const variantClasses = {
    primary: [
      'bg-[var(--primary)] text-white border-[var(--primary)]',
      'hover:bg-[var(--primary-dark)] hover:border-[var(--primary-dark)]',
      'focus:ring-[var(--primary)]/30',
      'disabled:bg-[var(--primary)]/60 disabled:border-[var(--primary)]/60'
    ].join(' '),
    secondary: [
      'bg-[var(--secondary)] text-white border-[var(--secondary)]',
      'hover:bg-[var(--secondary-dark)] hover:border-[var(--secondary-dark)]',
      'focus:ring-[var(--secondary)]/30',
      'disabled:bg-[var(--secondary)]/60 disabled:border-[var(--secondary)]/60'
    ].join(' '),
    outline: [
      'bg-transparent text-[var(--primary)] border-[var(--primary)]',
      'hover:bg-[var(--primary)] hover:text-white',
      'focus:ring-[var(--primary)]/30',
      'disabled:text-[var(--primary)]/60 disabled:border-[var(--primary)]/60'
    ].join(' '),
    ghost: [
      'bg-transparent text-[var(--primary)] border-transparent',
      'hover:bg-[var(--primary)]/10',
      'focus:ring-[var(--primary)]/30',
      'disabled:text-[var(--primary)]/60'
    ].join(' ')
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const DefaultLoadingIcon = () => (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="m12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8z"
      />
    </svg>
  );

  return (
    <button
      type="submit"
      disabled={shouldDisable}
      className={cn(
        // Base styles
        'inline-flex items-center justify-center font-satoshi-medium border transition-all duration-200',
        'rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        // Variant styles
        variantClasses[variant],
        // Size styles
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          {loadingIcon || <DefaultLoadingIcon />}
          <span className="ml-2">{loadingText}</span>
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};
