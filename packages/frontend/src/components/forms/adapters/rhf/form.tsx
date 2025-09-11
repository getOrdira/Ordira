// src/components/forms/adapters/rhf/form.tsx

import React, { forwardRef, useCallback, useEffect } from 'react';
import { 
  FormProvider, 
  useForm, 
  UseFormReturn, 
  FieldValues, 
  SubmitHandler,
  UseFormProps,
  SubmitErrorHandler,
  DeepPartial
} from 'react-hook-form';
import { cn } from '@/lib/utils';

// Import common types that align with your backend patterns
import type { 
  ApiResponse, 
  ValidationError as BackendValidationError,
  BulkOperationResponse 
} from '@/lib/types/common';

/**
 * Enhanced form state that mirrors backend response patterns
 */
export interface FormState {
  isSubmitting: boolean;
  isValidating: boolean;
  isDirty: boolean;
  isValid: boolean;
  isSubmitSuccessful: boolean;
  submitCount: number;
  // Custom states
  isLoading: boolean;
  hasErrors: boolean;
  hasServerErrors: boolean;
}

/**
 * Form error structure that aligns with backend validation
 */
export interface FormError {
  field?: string;
  message: string;
  code?: string;
  type?: 'validation' | 'server' | 'network' | 'auth';
}

/**
 * Form submission result matching backend API patterns
 */
export interface FormSubmissionResult<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: FormError[];
  code?: string;
  // For bulk operations
  bulk?: {
    processed: number;
    successful: number;
    failed: number;
  };
}

/**
 * Form submission options
 */
export interface FormSubmissionOptions {
  // Transform data before submission
  transformData?: (data: any) => any;
  // Handle server errors
  onServerError?: (errors: FormError[]) => void;
  // Success callback
  onSuccess?: (result: any) => void;
  // Custom error handling
  onError?: (error: Error | FormError[]) => void;
  // Loading states
  onLoadingChange?: (isLoading: boolean) => void;
  // Show notifications
  showSuccessMessage?: boolean;
  showErrorMessage?: boolean;
  // Reset form after success
  resetOnSuccess?: boolean;
  // Focus first error field
  focusFirstError?: boolean;
}

/**
 * Props for the RHF Form component
 */
export interface RHFFormProps<TFieldValues extends FieldValues = FieldValues> 
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onError'> {
  // Form configuration
  methods?: UseFormReturn<TFieldValues>;
  formOptions?: UseFormProps<TFieldValues>;
  
  // Submission handling
  onSubmit: SubmitHandler<TFieldValues>;
  onError?: SubmitErrorHandler<TFieldValues>;
  
  // Submission options
  submissionOptions?: FormSubmissionOptions;
  
  // Server error handling
  serverErrors?: FormError[];
  clearServerErrors?: () => void;
  
  // Loading state (external)
  isLoading?: boolean;
  
  // Form state callbacks
  onFormStateChange?: (state: FormState) => void;
  
  // Auto-save options
  autoSave?: {
    enabled: boolean;
    delay?: number;
    exclude?: string[];
    onAutoSave?: (data: TFieldValues) => Promise<void>;
  };
  
  // Validation options
  validateOnMount?: boolean;
  revalidateOnSubmit?: boolean;
  
  // Form styling
  variant?: 'default' | 'card' | 'inline' | 'modal';
  size?: 'sm' | 'md' | 'lg';
  
  children: React.ReactNode;
}

/**
 * Transform backend validation errors to form errors
 */
export function transformBackendErrors(
  backendErrors: BackendValidationError[] | string[] | Record<string, string>
): FormError[] {
  if (Array.isArray(backendErrors)) {
    if (typeof backendErrors[0] === 'string') {
      // Array of error messages
      return (backendErrors as string[]).map(message => ({
        message,
        type: 'validation' as const
      }));
    } else {
      // Array of validation error objects
      return (backendErrors as BackendValidationError[]).map(error => ({
        field: error.field,
        message: error.message,
        code: error.code,
        type: 'validation' as const
      }));
    }
  } else {
    // Record of field -> message
    return Object.entries(backendErrors).map(([field, message]) => ({
      field,
      message,
      type: 'validation' as const
    }));
  }
}

/**
 * Apply server errors to form fields
 */
export function applyServerErrorsToForm<TFieldValues extends FieldValues>(
  methods: UseFormReturn<TFieldValues>,
  errors: FormError[]
) {
  // Clear existing server errors
  methods.clearErrors();
  
  errors.forEach(error => {
    if (error.field) {
      methods.setError(error.field as any, {
        type: 'server',
        message: error.message
      });
    } else {
      // Set root error for field-less errors
      methods.setError('root.serverError', {
        type: 'server',
        message: error.message
      });
    }
  });
}

/**
 * Main RHF Form component with backend integration
 */
export const RHFForm = forwardRef<
  HTMLFormElement,
  RHFFormProps
>(({
  methods: externalMethods,
  formOptions,
  onSubmit,
  onError,
  submissionOptions = {},
  serverErrors = [],
  clearServerErrors,
  isLoading = false,
  onFormStateChange,
  autoSave,
  validateOnMount = false,
  revalidateOnSubmit = true,
  variant = 'default',
  size = 'md',
  className,
  children,
  ...formProps
}, ref) => {
  // Create form methods if not provided
  const internalMethods = useForm<any>(formOptions);
  const methods = externalMethods || internalMethods;
  
  const {
    handleSubmit,
    formState,
    trigger,
    watch,
    setError,
    clearErrors
  } = methods;

  // Form state derived from RHF
  const formStateData: FormState = {
    isSubmitting: formState.isSubmitting,
    isValidating: formState.isValidating,
    isDirty: formState.isDirty,
    isValid: formState.isValid,
    isSubmitSuccessful: formState.isSubmitSuccessful,
    submitCount: formState.submitCount,
    isLoading: isLoading || formState.isSubmitting,
    hasErrors: !formState.isValid && Object.keys(formState.errors).length > 0,
    hasServerErrors: serverErrors.length > 0
  };

  // Notify parent of form state changes
  useEffect(() => {
    onFormStateChange?.(formStateData);
  }, [
    formStateData.isSubmitting,
    formStateData.isValidating,
    formStateData.isDirty,
    formStateData.isValid,
    formStateData.isSubmitSuccessful,
    formStateData.hasErrors,
    formStateData.hasServerErrors
  ]);

  // Apply server errors to form
  useEffect(() => {
    if (serverErrors.length > 0) {
      applyServerErrorsToForm(methods, serverErrors);
    }
  }, [serverErrors, methods]);

  // Validate on mount if requested
  useEffect(() => {
    if (validateOnMount) {
      trigger();
    }
  }, [validateOnMount, trigger]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave?.enabled) return;

    const subscription = watch((data, { name, type }) => {
      if (type === 'change' && name && !autoSave.exclude?.includes(name)) {
        const timer = setTimeout(() => {
          autoSave.onAutoSave?.(data);
        }, autoSave.delay || 1000);
        
        return () => clearTimeout(timer);
      }
    });

    return subscription.unsubscribe;
  }, [watch, autoSave]);

  // Enhanced submit handler with backend integration
  const handleFormSubmit = useCallback(async (data: any) => {
    try {
      submissionOptions.onLoadingChange?.(true);
      clearServerErrors?.();
      clearErrors();

      // Transform data if needed
      const transformedData = submissionOptions.transformData?.(data) || data;

      // Call the submit handler
      const result = await onSubmit(transformedData);

      // Handle successful submission
      if (submissionOptions.resetOnSuccess) {
        methods.reset();
      }

      submissionOptions.onSuccess?.(result);

      return result;
    } catch (error) {
      console.error('Form submission error:', error);

      // Handle different error types
      if (error && typeof error === 'object' && 'errors' in error) {
        // Backend validation errors
        const formErrors = transformBackendErrors(error.errors as any);
        applyServerErrorsToForm(methods, formErrors);
        submissionOptions.onServerError?.(formErrors);
      } else if (error instanceof Error) {
        // Network or other errors
        const formError: FormError = {
          message: error.message,
          type: 'network'
        };
        submissionOptions.onError?.(error);
      }

      // Focus first error field if requested
      if (submissionOptions.focusFirstError) {
        const firstErrorField = Object.keys(formState.errors)[0];
        if (firstErrorField) {
          const element = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
          element?.focus();
        }
      }

      throw error;
    } finally {
      submissionOptions.onLoadingChange?.(false);
    }
  }, [onSubmit, submissionOptions, methods, formState.errors, clearServerErrors, clearErrors]);

  // Form styling variants
  const formVariants = {
    default: 'space-y-6',
    card: 'space-y-6 p-6 bg-white border border-border rounded-lg shadow-sm',
    inline: 'flex gap-4 items-end',
    modal: 'space-y-4'
  };

  const sizeVariants = {
    sm: 'text-sm',
    md: '',
    lg: 'text-lg'
  };

  return (
    <FormProvider {...methods}>
      <form
        {...formProps}
        ref={ref}
        onSubmit={handleSubmit(handleFormSubmit, onError)}
        className={cn(
          formVariants[variant],
          sizeVariants[size],
          {
            'opacity-50 pointer-events-none': formStateData.isLoading,
          },
          className
        )}
        noValidate
      >
        {children}
        
        {/* Global form errors */}
        {formState.errors.root?.serverError && (
          <div className="p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
            {formState.errors.root.serverError.message}
          </div>
        )}
      </form>
    </FormProvider>
  );
});

RHFForm.displayName = 'RHFForm';

/**
 * Hook to use form context with better error handling
 */
export function useRHFFormContext<TFieldValues extends FieldValues = FieldValues>() {
  const methods = methods as UseFormReturn<TFieldValues>;
  
  if (!methods) {
    throw new Error('useRHFFormContext must be used within RHFForm or FormProvider');
  }
  
  return methods;
}

/**
 * Form section component for organizing forms
 */
export interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className,
  collapsible = false,
  defaultCollapsed = false
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">{title}</h3>
            {collapsible && (
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {isCollapsed ? 'Expand' : 'Collapse'}
              </button>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      
      {!isCollapsed && (
        <div className="space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

// Export types and utilities
export type { FormState, FormError, FormSubmissionResult, FormSubmissionOptions };
export { transformBackendErrors, applyServerErrorsToForm };