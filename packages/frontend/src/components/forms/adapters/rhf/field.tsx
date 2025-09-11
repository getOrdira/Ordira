// src/components/forms/adapters/rhf/field.tsx

import React, { forwardRef } from 'react';
import { 
  useController, 
  useFormContext, 
  FieldValues, 
  FieldPath,
  Control,
  ControllerRenderProps,
  FieldError
} from 'react-hook-form';
import { cn } from '@/lib/utils';

// Import your UI primitives
import { 
  Input, 
  PasswordInput, 
  EmailInput, 
  PhoneInput, 
  URLInput, 
  SearchInput,
  Textarea,
  type InputProps,
  type PasswordInputProps,
  type EmailInputProps,
  type PhoneInputProps,
  type URLInputProps,
  type SearchInputProps,
  type TextareaProps
} from '@/components/ui/primitives/input';

/**
 * Base field props that extend RHF controller
 */
export interface BaseFieldProps<TFieldValues extends FieldValues = FieldValues> {
  name: FieldPath<TFieldValues>;
  control?: Control<TFieldValues>;
  disabled?: boolean;
  className?: string;
  // Validation display options
  showErrorIcon?: boolean;
  showSuccessIcon?: boolean;
  // Custom error handling
  transformError?: (error: FieldError) => string;
}

/**
 * Hook to get field state and helpers for any form field
 */
export function useFieldState<TFieldValues extends FieldValues = FieldValues>(
  name: FieldPath<TFieldValues>,
  control?: Control<TFieldValues>
) {
  const formContext = useFormContext<TFieldValues>();
  const actualControl = control ?? formContext.control;
  
  if (!actualControl) {
    throw new Error('useFieldState must be used within a FormProvider or with control prop');
  }

  const {
    field,
    fieldState: { error, isDirty, isTouched, invalid },
    formState: { isSubmitting, isValidating }
  } = useController({
    name,
    control: actualControl,
  });

  return {
    field,
    error,
    isDirty,
    isTouched,
    invalid,
    isSubmitting,
    isValidating,
    // Derived states
    hasError: !!error,
    isSuccess: isTouched && !error && isDirty,
    isLoading: isSubmitting || isValidating,
  };
}

/**
 * Format field error message with proper fallbacks
 */
export function formatFieldError(
  error: FieldError | undefined,
  transformError?: (error: FieldError) => string
): string | undefined {
  if (!error) return undefined;
  
  if (transformError) {
    return transformError(error);
  }
  
  // Handle different error types from Zod/RHF
  if (error.message) {
    return error.message;
  }
  
  // Fallback error messages based on type
  switch (error.type) {
    case 'required':
      return 'This field is required';
    case 'pattern':
      return 'Invalid format';
    case 'min':
      return 'Value is too short';
    case 'max':
      return 'Value is too long';
    case 'minLength':
      return 'Minimum length not met';
    case 'maxLength':
      return 'Maximum length exceeded';
    case 'email':
      return 'Invalid email address';
    case 'url':
      return 'Invalid URL format';
    default:
      return 'Invalid value';
  }
}

/**
 * Higher-order component to create field adapters
 */
function createFieldAdapter<TComponent extends React.ComponentType<any>>(
  Component: TComponent,
  displayName: string
) {
  const FieldAdapter = forwardRef<
    React.ElementRef<TComponent>,
    React.ComponentPropsWithoutRef<TComponent> & BaseFieldProps
  >(({ 
    name, 
    control, 
    disabled, 
    className,
    showErrorIcon = true,
    showSuccessIcon = false,
    transformError,
    ...props 
  }, ref) => {
    const {
      field,
      error,
      isSuccess,
      isLoading,
      hasError
    } = useFieldState(name, control);

    const errorMessage = formatFieldError(error, transformError);
    const successMessage = isSuccess && showSuccessIcon ? 'Valid' : undefined;

    return (
      <Component
        {...props}
        {...field}
        ref={ref}
        disabled={disabled || isLoading}
        error={errorMessage}
        success={successMessage}
        className={cn(className, {
          'opacity-50 cursor-not-allowed': disabled || isLoading,
        })}
      />
    );
  });

  FieldAdapter.displayName = displayName;
  return FieldAdapter;
}

// ===== FIELD COMPONENTS =====

/**
 * Standard text input field with RHF integration
 */
export interface RHFInputProps extends 
  Omit<InputProps, 'error' | 'success'>, 
  BaseFieldProps {}

export const RHFInput = createFieldAdapter(Input, 'RHFInput');

/**
 * Password input field with show/hide toggle
 */
export interface RHFPasswordInputProps extends 
  Omit<PasswordInputProps, 'error' | 'success'>, 
  BaseFieldProps {}

export const RHFPasswordInput = createFieldAdapter(PasswordInput, 'RHFPasswordInput');

/**
 * Email input field with email validation UI
 */
export interface RHFEmailInputProps extends 
  Omit<EmailInputProps, 'error' | 'success'>, 
  BaseFieldProps {}

export const RHFEmailInput = createFieldAdapter(EmailInput, 'RHFEmailInput');

/**
 * Phone input field with international format
 */
export interface RHFPhoneInputProps extends 
  Omit<PhoneInputProps, 'error' | 'success'>, 
  BaseFieldProps {}

export const RHFPhoneInput = createFieldAdapter(PhoneInput, 'RHFPhoneInput');

/**
 * URL input field with URL validation UI
 */
export interface RHFURLInputProps extends 
  Omit<URLInputProps, 'error' | 'success'>, 
  BaseFieldProps {}

export const RHFURLInput = createFieldAdapter(URLInput, 'RHFURLInput');

/**
 * Search input field
 */
export interface RHFSearchInputProps extends 
  Omit<SearchInputProps, 'error' | 'success'>, 
  BaseFieldProps {}

export const RHFSearchInput = createFieldAdapter(SearchInput, 'RHFSearchInput');

/**
 * Textarea field for longer text input
 */
export interface RHFTextareaProps extends 
  Omit<TextareaProps, 'error' | 'success'>, 
  BaseFieldProps {}

export const RHFTextarea = createFieldAdapter(Textarea, 'RHFTextarea');

// ===== SPECIALIZED FIELD COMPONENTS =====

/**
 * Business email field with disposable domain validation
 * Aligns with backend businessEmail validation
 */
export const RHFBusinessEmailInput = forwardRef<
  HTMLInputElement,
  RHFEmailInputProps
>(({ transformError, ...props }, ref) => {
  const businessEmailTransform = (error: FieldError): string => {
    if (error.message?.includes('disposable')) {
      return 'Business email addresses only - disposable emails not allowed';
    }
    return formatFieldError(error) || 'Invalid business email';
  };

  return (
    <RHFEmailInput
      {...props}
      ref={ref}
      transformError={transformError || businessEmailTransform}
      placeholder="your.business@company.com"
    />
  );
});

RHFBusinessEmailInput.displayName = 'RHFBusinessEmailInput';

/**
 * MongoDB ObjectId field for ID inputs
 */
export const RHFMongoIdInput = forwardRef<
  HTMLInputElement,
  RHFInputProps
>(({ transformError, ...props }, ref) => {
  const mongoIdTransform = (error: FieldError): string => {
    if (error.type === 'pattern') {
      return 'Must be a valid ID format';
    }
    return formatFieldError(error) || 'Invalid ID';
  };

  return (
    <RHFInput
      {...props}
      ref={ref}
      transformError={transformError || mongoIdTransform}
      placeholder="507f1f77bcf86cd799439011"
      className={cn("font-mono text-sm", props.className)}
    />
  );
});

RHFMongoIdInput.displayName = 'RHFMongoIdInput';

/**
 * Subdomain input field for brand subdomains
 */
export const RHFSubdomainInput = forwardRef<
  HTMLInputElement,
  RHFInputProps & { baseDomain?: string }
>(({ baseDomain = '.yourapp.com', transformError, ...props }, ref) => {
  const subdomainTransform = (error: FieldError): string => {
    if (error.type === 'pattern') {
      return 'Subdomain can only contain letters, numbers, and hyphens';
    }
    if (error.type === 'minLength') {
      return 'Subdomain must be at least 3 characters';
    }
    return formatFieldError(error) || 'Invalid subdomain';
  };

  return (
    <div className="flex items-center">
      <RHFInput
        {...props}
        ref={ref}
        transformError={transformError || subdomainTransform}
        placeholder="your-brand"
        className={cn("rounded-r-none", props.className)}
      />
      <div className="px-3 py-2 bg-muted border border-l-0 rounded-r-md text-sm text-muted-foreground">
        {baseDomain}
      </div>
    </div>
  );
});

RHFSubdomainInput.displayName = 'RHFSubdomainInput';

// Export field state hook and utilities
export { useFieldState, formatFieldError };