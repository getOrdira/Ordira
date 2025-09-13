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
function useFieldState<TFieldValues extends FieldValues = FieldValues>(
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
function formatFieldError(
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
    any,
    any
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

    return React.createElement(Component, {
      ...props,
      ...field,
      ref,
      disabled: disabled || isLoading,
      error: errorMessage,
      success: successMessage,
      className: cn(className, {
        'opacity-50 cursor-not-allowed': disabled || isLoading,
      }),
    });
  });

  FieldAdapter.displayName = displayName;
  return FieldAdapter;
}

// ===== FIELD COMPONENTS =====

/**
 * Standard text input field with RHF integration
 */
export type RHFInputProps = Omit<InputProps, 'error' | 'success' | 'name'> & BaseFieldProps;

export const RHFInput = createFieldAdapter(Input, 'RHFInput');

/**
 * Password input field with show/hide toggle
 */
export type RHFPasswordInputProps = Omit<PasswordInputProps, 'error' | 'success' | 'name'> & BaseFieldProps;

export const RHFPasswordInput = createFieldAdapter(PasswordInput, 'RHFPasswordInput');

/**
 * Email input field with email validation UI
 */
export type RHFEmailInputProps = Omit<EmailInputProps, 'error' | 'success' | 'name'> & BaseFieldProps;

export const RHFEmailInput = createFieldAdapter(EmailInput, 'RHFEmailInput');

/**
 * Phone input field with international format
 */
export type RHFPhoneInputProps = Omit<PhoneInputProps, 'error' | 'success' | 'name'> & BaseFieldProps;

export const RHFPhoneInput = createFieldAdapter(PhoneInput, 'RHFPhoneInput');

/**
 * URL input field with URL validation UI
 */
export type RHFURLInputProps = Omit<URLInputProps, 'error' | 'success' | 'name'> & BaseFieldProps;

export const RHFURLInput = createFieldAdapter(URLInput, 'RHFURLInput');

/**
 * Search input field
 */
export type RHFSearchInputProps = Omit<SearchInputProps, 'error' | 'success' | 'name'> & BaseFieldProps;

export const RHFSearchInput = createFieldAdapter(SearchInput, 'RHFSearchInput');

/**
 * Textarea field for longer text input
 */
export type RHFTextareaProps = Omit<TextareaProps, 'error' | 'success' | 'name'> & BaseFieldProps;

export const RHFTextarea = createFieldAdapter(Textarea, 'RHFTextarea');

// ===== SPECIALIZED FIELD COMPONENTS =====

/**
 * Business email field with disposable domain validation
 * Aligns with backend businessEmail validation
 */
export const RHFBusinessEmailInput = forwardRef<
  HTMLInputElement,
  RHFEmailInputProps
>(({ transformError, name, ...props }, ref) => {
  const businessEmailTransform = (error: FieldError): string => {
    if (error.message?.includes('disposable')) {
      return 'Business email addresses only - disposable emails not allowed';
    }
    return formatFieldError(error) || 'Invalid business email';
  };

  return (
    <RHFEmailInput
      {...props}
      name={name}
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
>(({ transformError, name, ...props }, ref) => {
  const mongoIdTransform = (error: FieldError): string => {
    if (error.type === 'pattern') {
      return 'Must be a valid ID format';
    }
    return formatFieldError(error) || 'Invalid ID';
  };

  return (
    <RHFInput
      {...props}
      name={name}
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
>(({ baseDomain = '.yourapp.com', transformError, name, ...props }, ref) => {
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
        name={name}
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

/**
 * Business name field with validation for brand/manufacturer names
 */
export const RHFBusinessNameInput = forwardRef<
  HTMLInputElement,
  RHFInputProps
>(({ transformError, name, ...props }, ref) => {
  const businessNameTransform = (error: FieldError): string => {
    if (error.type === 'minLength') {
      return 'Business name must be at least 2 characters';
    }
    if (error.type === 'maxLength') {
      return 'Business name must be less than 100 characters';
    }
    if (error.type === 'pattern') {
      return 'Business name can only contain letters, numbers, spaces, and basic punctuation';
    }
    return formatFieldError(error) || 'Invalid business name';
  };

  return (
    <RHFInput
      {...props}
      name={name}
      ref={ref}
      transformError={transformError || businessNameTransform}
      placeholder="Your Business Name"
      maxLength={100}
    />
  );
});

RHFBusinessNameInput.displayName = 'RHFBusinessNameInput';

/**
 * Phone number field with international format validation
 */
export const RHFPhoneNumberInput = forwardRef<
  HTMLInputElement,
  RHFPhoneInputProps
>(({ transformError, name, ...props }, ref) => {
  const phoneTransform = (error: FieldError): string => {
    if (error.type === 'pattern') {
      return 'Please enter a valid phone number (e.g., +1 (555) 123-4567)';
    }
    return formatFieldError(error) || 'Invalid phone number';
  };

  return (
    <RHFPhoneInput
      {...props}
      name={name}
      ref={ref}
      transformError={transformError || phoneTransform}
      placeholder="+1 (555) 123-4567"
    />
  );
});

RHFPhoneNumberInput.displayName = 'RHFPhoneNumberInput';

/**
 * Website URL field with domain validation
 */
export const RHFWebsiteInput = forwardRef<
  HTMLInputElement,
  RHFURLInputProps
>(({ transformError, name, ...props }, ref) => {
  const websiteTransform = (error: FieldError): string => {
    if (error.type === 'pattern') {
      return 'Please enter a valid website URL (e.g., https://example.com)';
    }
    if (error.message?.includes('domain')) {
      return 'Please enter a valid domain name';
    }
    return formatFieldError(error) || 'Invalid website URL';
  };

  return (
    <RHFURLInput
      {...props}
      name={name}
      ref={ref}
      transformError={transformError || websiteTransform}
      placeholder="https://yourwebsite.com"
    />
  );
});

RHFWebsiteInput.displayName = 'RHFWebsiteInput';

/**
 * Industry selection field (for manufacturers)
 */
export const RHFIndustryInput = forwardRef<
  HTMLInputElement,
  RHFInputProps
>(({ transformError, name, ...props }, ref) => {
  const industryTransform = (error: FieldError): string => {
    if (error.type === 'minLength') {
      return 'Please specify your industry';
    }
    return formatFieldError(error) || 'Invalid industry';
  };

  return (
    <RHFInput
      {...props}
      name={name}
      ref={ref}
      transformError={transformError || industryTransform}
      placeholder="e.g., Fashion, Electronics, Food & Beverage"
    />
  );
});

RHFIndustryInput.displayName = 'RHFIndustryInput';

/**
 * Product name field with validation
 */
export const RHFProductNameInput = forwardRef<
  HTMLInputElement,
  RHFInputProps
>(({ transformError, name, ...props }, ref) => {
  const productNameTransform = (error: FieldError): string => {
    if (error.type === 'minLength') {
      return 'Product name must be at least 3 characters';
    }
    if (error.type === 'maxLength') {
      return 'Product name must be less than 200 characters';
    }
    return formatFieldError(error) || 'Invalid product name';
  };

  return (
    <RHFInput
      {...props}
      name={name}
      ref={ref}
      transformError={transformError || productNameTransform}
      placeholder="Enter product name"
      maxLength={200}
    />
  );
});

RHFProductNameInput.displayName = 'RHFProductNameInput';

/**
 * Description textarea with character limits
 */
export const RHFDescriptionTextarea = forwardRef<
  HTMLTextAreaElement,
  RHFTextareaProps & { maxLength?: number }
>(({ transformError, name, maxLength = 1000, ...props }, ref) => {
  const descriptionTransform = (error: FieldError): string => {
    if (error.type === 'maxLength') {
      return `Description must be less than ${maxLength} characters`;
    }
    return formatFieldError(error) || 'Invalid description';
  };

  return (
    <RHFTextarea
      {...props}
      name={name}
      ref={ref}
      transformError={transformError || descriptionTransform}
      placeholder="Enter description..."
      maxLength={maxLength}
      showCharacterCount
    />
  );
});

RHFDescriptionTextarea.displayName = 'RHFDescriptionTextarea';

// Export field state hook and utilities
export { useFieldState, formatFieldError };