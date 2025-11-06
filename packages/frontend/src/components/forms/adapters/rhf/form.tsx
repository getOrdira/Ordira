// src/components/forms/adapters/rhf/form.tsx

import React, { forwardRef, useCallback, useEffect } from 'react';
import { 
  FormProvider, 
  useForm, 
  useFormContext,
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
} from '@/lib/typessss/common';

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
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onError' | 'autoSave'> {
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
function transformBackendErrors(
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
function applyServerErrorsToForm<TFieldValues extends FieldValues>(
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
  const methods = useFormContext<TFieldValues>();
  
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

/**
 * Form actions component for submit/reset buttons
 */
export interface FormActionsProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'sticky' | 'inline';
  showReset?: boolean;
  resetLabel?: string;
  submitLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
  onReset?: () => void;
}

export const FormActions: React.FC<FormActionsProps> = ({
  children,
  className,
  variant = 'default',
  showReset = false,
  resetLabel = 'Reset',
  submitLabel = 'Submit',
  isLoading = false,
  disabled = false,
  onReset
}) => {
  const methods = useRHFFormContext();
  
  const handleReset = () => {
    methods.reset();
    onReset?.();
  };

  const variantStyles = {
    default: 'flex gap-3',
    sticky: 'sticky bottom-0 bg-white border-t border-border p-4 flex gap-3',
    inline: 'flex gap-2 items-center'
  };

  return (
    <div className={cn(variantStyles[variant], className)}>
      {children || (
        <>
          {showReset && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading || disabled}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resetLabel}
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || disabled}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Submitting...' : submitLabel}
          </button>
        </>
      )}
    </div>
  );
};

/**
 * Form field group component for organizing related fields
 */
export interface FormFieldGroupProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
  required?: boolean;
}

export const FormFieldGroup: React.FC<FormFieldGroupProps> = ({
  title,
  description,
  children,
  className,
  columns = 1,
  required = false
}) => {
  const columnStyles = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h4 className="text-sm font-medium text-gray-900 flex items-center gap-1">
              {title}
              {required && <span className="text-red-500">*</span>}
            </h4>
          )}
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
      )}
      
      <div className={cn('grid gap-4', columnStyles[columns])}>
        {children}
      </div>
    </div>
  );
};

/**
 * Form progress indicator component
 */
export interface FormProgressProps {
  steps: Array<{
    id: string;
    title: string;
    description?: string;
    completed?: boolean;
    current?: boolean;
  }>;
  className?: string;
  variant?: 'horizontal' | 'vertical';
}

export const FormProgress: React.FC<FormProgressProps> = ({
  steps,
  className,
  variant = 'horizontal'
}) => {
  const completedSteps = steps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  if (variant === 'horizontal') {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progress: {completedSteps}/{steps.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          {steps.map((step, index) => (
            <div key={step.id} className="text-center">
              <div className={cn(
                'w-3 h-3 rounded-full mx-auto mb-1',
                step.completed ? 'bg-indigo-600' : 
                step.current ? 'bg-indigo-300' : 'bg-gray-300'
              )} />
              <div className="text-xs text-gray-600 truncate max-w-16">
                {step.title}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-start space-x-3">
          <div className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
            step.completed ? 'bg-indigo-600 text-white' :
            step.current ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-600' :
            'bg-gray-200 text-gray-500'
          )}>
            {step.completed ? '✓' : index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900">{step.title}</h4>
            {step.description && (
              <p className="text-sm text-gray-500">{step.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Form validation summary component
 */
export interface FormValidationSummaryProps {
  className?: string;
  showFieldErrors?: boolean;
  showServerErrors?: boolean;
}

export const FormValidationSummary: React.FC<FormValidationSummaryProps> = ({
  className,
  showFieldErrors = true,
  showServerErrors = true
}) => {
  const methods = useRHFFormContext();
  const { formState } = methods;

  const fieldErrors = Object.entries(formState.errors).filter(([key, error]) => 
    key !== 'root' && error && typeof error === 'object' && 'message' in error
  ) as Array<[string, { message: string }]>;

  const serverErrors = formState.errors.root?.serverError ? [formState.errors.root.serverError] : [];

  if (fieldErrors.length === 0 && serverErrors.length === 0) {
    return null;
  }

  return (
    <div className={cn('bg-red-50 border border-red-200 rounded-md p-4', className)}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Please fix the following errors:
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <ul className="list-disc pl-5 space-y-1">
              {showFieldErrors && fieldErrors.map(([field, error]) => (
                <li key={field}>
                  <strong>{field}:</strong> {error.message}
                </li>
              ))}
              {showServerErrors && serverErrors.map((error, index) => (
                <li key={`server-${index}`}>
                  {error?.message || 'Server error'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export types and utilities
export { transformBackendErrors, applyServerErrorsToForm };