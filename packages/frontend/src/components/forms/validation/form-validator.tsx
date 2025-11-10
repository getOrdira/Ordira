// src/components/forms/validation/form-validator.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { FieldValues, Path, useFormContext } from 'react-hook-form';
import { ZodSchema, ZodError, ZodObject } from 'zod';
import { cn } from '@/lib/utils/utils';

// Types aligned with backend Joi validation patterns
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  value?: any;
  type?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  data?: any;
}

export interface FieldValidationRule<T = any> {
  field: string;
  validator: (value: T) => ValidationResult | Promise<ValidationResult>;
  dependencies?: string[];
  debounceMs?: number;
}

export interface FormValidatorContextType {
  errors: Record<string, ValidationError[]>;
  isValidating: boolean;
  isValid: boolean;
  addError: (field: string, error: ValidationError) => void;
  removeError: (field: string, errorCode?: string) => void;
  clearErrors: (field?: string) => void;
  validateField: (field: string, value: any) => Promise<ValidationResult>;
  validateForm: (data: any) => Promise<ValidationResult>;
  registerRule: (rule: FieldValidationRule) => void;
  unregisterRule: (field: string) => void;
  debouncedValidateField: (field: string, value: any, delay?: number) => void;
}

const FormValidatorContext = createContext<FormValidatorContextType | null>(null);

export const useFormValidator = () => {
  const context = useContext(FormValidatorContext);
  if (!context) {
    throw new Error('useFormValidator must be used within a FormValidator');
  }
  return context;
};

export interface FormValidatorProps {
  children: React.ReactNode;
  schema?: ZodSchema;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
  mode?: 'progressive' | 'aggressive' | 'onSubmit';
  onValidationChange?: (isValid: boolean, errors: Record<string, ValidationError[]>) => void;
}

export const FormValidator: React.FC<FormValidatorProps> = ({
  children,
  schema,
  validateOnChange = true,
  validateOnBlur = true,
  debounceMs = 300,
  mode = 'progressive',
  onValidationChange
}) => {
  const [errors, setErrors] = useState<Record<string, ValidationError[]>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [validationRules, setValidationRules] = useState<Map<string, FieldValidationRule>>(new Map());
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [validationTimers, setValidationTimers] = useState<Map<string, NodeJS.Timeout>>(new Map());

  // Check if form is valid
  const isValid = Object.keys(errors).length === 0 || 
    Object.values(errors).every(fieldErrors => fieldErrors.length === 0);

  // Notify parent of validation changes
  useEffect(() => {
    onValidationChange?.(isValid, errors);
  }, [isValid, errors, onValidationChange]);

  // Cleanup validation timers on unmount
  useEffect(() => {
    return () => {
      validationTimers.forEach(timer => clearTimeout(timer));
    };
  }, [validationTimers]);

  // Format Zod errors to match backend Joi error format
  const formatZodError = (zodError: ZodError, fieldPrefix = ''): ValidationError[] => {
    return zodError.issues.map(error => ({
      field: fieldPrefix ? `${fieldPrefix}.${error.path.join('.')}` : error.path.join('.'),
      message: error.message,
      code: error.code,
      value: error.path.length > 0 ? getNestedValue(zodError.name, error.path.map(String)) : undefined,
      type: 'zod_validation'
    }));
  };

  // Helper to get nested object values
  const getNestedValue = (obj: any, path: (string | number)[]): any => {
    return path.reduce((current, key) => current?.[key], obj);
  };

  // Add error for a field
  const addError = useCallback((field: string, error: ValidationError) => {
    setErrors(prev => {
      const fieldErrors = prev[field] || [];
      const existingIndex = fieldErrors.findIndex(e => e.code === error.code);
      
      if (existingIndex >= 0) {
        // Update existing error
        fieldErrors[existingIndex] = error;
      } else {
        // Add new error
        fieldErrors.push(error);
      }
      
      return { ...prev, [field]: fieldErrors };
    });
  }, []);

  // Remove error for a field
  const removeError = useCallback((field: string, errorCode?: string) => {
    setErrors(prev => {
      const fieldErrors = prev[field] || [];
      
      if (errorCode) {
        // Remove specific error by code
        const updatedErrors = fieldErrors.filter(e => e.code !== errorCode);
        if (updatedErrors.length === 0) {
          const { [field]: removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [field]: updatedErrors };
      } else {
        // Remove all errors for field
        const { [field]: removed, ...rest } = prev;
        return rest;
      }
    });
  }, []);

  // Clear errors
  const clearErrors = useCallback((field?: string) => {
    if (field) {
      setErrors(prev => {
        const { [field]: removed, ...rest } = prev;
        return rest;
      });
    } else {
      setErrors({});
    }
  }, []);

  // Validate a single field
  const validateField = useCallback(async (field: string, value: any): Promise<ValidationResult> => {
    setIsValidating(true);
    
    try {
      const errors: ValidationError[] = [];

      // Schema validation (Zod)
      if (schema) {
        try {
          const fieldSchema = getFieldSchema(schema, field);
          if (fieldSchema) {
            fieldSchema.parse(value);
          }
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...formatZodError(error, field));
          }
        }
      }

      // Custom rule validation
      const rule = validationRules.get(field);
      if (rule) {
        try {
          const result = await rule.validator(value);
          if (!result.isValid) {
            errors.push(...result.errors);
          }
        } catch (error) {
          errors.push({
            field,
            message: 'Validation failed',
            code: 'CUSTOM_VALIDATION_ERROR',
            type: 'custom'
          });
        }
      }

      // Update errors state
      if (errors.length > 0) {
        setErrors(prev => ({ ...prev, [field]: errors }));
      } else {
        removeError(field);
      }

      return {
        isValid: errors.length === 0,
        errors,
        data: value
      };
    } finally {
      setIsValidating(false);
    }
  }, [schema, validationRules, removeError]);

  // Validate entire form
  const validateForm = useCallback(async (data: any): Promise<ValidationResult> => {
    setIsValidating(true);
    
    try {
      const allErrors: ValidationError[] = [];

      // Schema validation (Zod)
      if (schema) {
        try {
          schema.parse(data);
        } catch (error) {
          if (error instanceof ZodError) {
            allErrors.push(...formatZodError(error));
          }
        }
      }

      // Custom rules validation
      for (const [field, rule] of validationRules) {
        const value = getNestedValue(data, field.split('.'));
        try {
          const result = await rule.validator(value);
          if (!result.isValid) {
            allErrors.push(...result.errors);
          }
        } catch (error) {
          allErrors.push({
            field,
            message: 'Validation failed',
            code: 'CUSTOM_VALIDATION_ERROR',
            type: 'custom'
          });
        }
      }

      // Group errors by field
      const errorsByField: Record<string, ValidationError[]> = {};
      allErrors.forEach(error => {
        if (!errorsByField[error.field]) {
          errorsByField[error.field] = [];
        }
        errorsByField[error.field].push(error);
      });

      setErrors(errorsByField);

      return {
        isValid: allErrors.length === 0,
        errors: allErrors,
        data: allErrors.length === 0 ? data : undefined
      };
    } finally {
      setIsValidating(false);
    }
  }, [schema, validationRules]);

  // Register custom validation rule
  const registerRule = useCallback((rule: FieldValidationRule) => {
    setValidationRules(prev => new Map(prev).set(rule.field, rule));
  }, []);

  // Unregister validation rule
  const unregisterRule = useCallback((field: string) => {
    setValidationRules(prev => {
      const newRules = new Map(prev);
      newRules.delete(field);
      return newRules;
    });
  }, []);

  // Debounced validation
  const debouncedValidateField = useCallback((field: string, value: any, delay = debounceMs) => {
    // Clear existing timer
    const existingTimer = validationTimers.get(field);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      validateField(field, value);
      setValidationTimers(prev => {
        const newTimers = new Map(prev);
        newTimers.delete(field);
        return newTimers;
      });
    }, delay);

    setValidationTimers(prev => new Map(prev).set(field, timer));
  }, [debounceMs, validateField, validationTimers]);

  // Get field schema from Zod schema
  const getFieldSchema = (schema: ZodSchema, fieldPath: string) => {
    try {
      const pathParts = fieldPath.split('.');
      let currentSchema: any = schema;
      
      for (const part of pathParts) {
        if (currentSchema && typeof currentSchema === 'object') {
          if ('shape' in currentSchema && currentSchema.shape) {
            currentSchema = currentSchema.shape[part];
          } else if ('element' in currentSchema) {
            // Handle array schemas
            currentSchema = currentSchema.element;
          } else if ('innerType' in currentSchema) {
            // Handle optional/nullable schemas
            currentSchema = currentSchema.innerType;
          } else {
            return null;
          }
        } else {
          return null;
        }
      }
      
      return currentSchema;
    } catch {
      return null;
    }
  };

  const contextValue: FormValidatorContextType = {
    errors,
    isValidating,
    isValid,
    addError,
    removeError,
    clearErrors,
    validateField,
    validateForm,
    registerRule,
    unregisterRule,
    debouncedValidateField
  };

  return (
    <FormValidatorContext.Provider value={contextValue}>
      {children}
    </FormValidatorContext.Provider>
  );
};

// Field validation hook
export const useFieldValidator = <T extends FieldValues>(
  fieldName: Path<T>,
  validationRule?: FieldValidationRule
) => {
  const { errors, validateField, registerRule, unregisterRule } = useFormValidator();
  const form = useFormContext<T>();
  
  const fieldErrors = errors[fieldName] || [];
  const hasError = fieldErrors.length > 0;
  const errorMessage = fieldErrors[0]?.message;

  // Register custom validation rule
  useEffect(() => {
    if (validationRule) {
      registerRule({ ...validationRule, field: fieldName });
      return () => unregisterRule(fieldName);
    }
  }, [validationRule, fieldName, registerRule, unregisterRule]);

  // Validate field value
  const validate = useCallback(async (value: any) => {
    return await validateField(fieldName, value);
  }, [fieldName, validateField]);

  return {
    fieldErrors,
    hasError,
    errorMessage,
    validate
  };
};

// Higher-order component for form validation
export const withFormValidator = <P extends object>(
  Component: React.ComponentType<P>,
  validatorProps?: Partial<FormValidatorProps>
) => {
  return (props: P) => (
    <FormValidator {...validatorProps}>
      <Component {...props} />
    </FormValidator>
  );
};