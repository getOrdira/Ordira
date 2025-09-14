// src/components/forms/inputs/password-field.tsx

import React, { forwardRef, useState } from 'react';
import { FieldWrapper, type FieldWrapperProps } from '../elements/field-wrapper';
import { PasswordInput, type PasswordInputProps } from '@/components/ui/primitives/input';
import { useFieldState, type BaseFieldProps } from '../adapters/rhf/field';

export interface PasswordFieldProps 
  extends Omit<PasswordInputProps, 'error' | 'success' | 'label' | 'helper' | 'name'>,
    Omit<FieldWrapperProps, 'children'>,
    BaseFieldProps {
  // Password-specific options
  showStrengthMeter?: boolean;
  requireStrength?: boolean;
  confirmPassword?: boolean;
  confirmPasswordName?: string;
  // Validation rules
  minLength?: number;
  requireNumbers?: boolean;
  requireSymbols?: boolean;
  requireMixedCase?: boolean;
}

// Password strength calculation
const calculatePasswordStrength = (password: string): {
  score: number;
  label: string;
  color: string;
  suggestions: string[];
} => {
  let score = 0;
  const suggestions: string[] = [];
  
  if (password.length >= 8) score += 1;
  else suggestions.push('At least 8 characters');
  
  if (/[a-z]/.test(password)) score += 1;
  else suggestions.push('Include lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else suggestions.push('Include uppercase letters');
  
  if (/\d/.test(password)) score += 1;
  else suggestions.push('Include numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else suggestions.push('Include special characters');
  
  const strengthLevels = [
    { label: 'Very Weak', color: 'text-[var(--error)]' },
    { label: 'Weak', color: 'text-[var(--warning)]' },
    { label: 'Fair', color: 'text-[var(--warning)]' },
    { label: 'Good', color: 'text-[var(--success)]' },
    { label: 'Strong', color: 'text-[var(--success)]' }
  ];
  
  return {
    score,
    ...strengthLevels[score],
    suggestions
  };
};

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(({
  name,
  control,
  label,
  help,
  tooltip,
  required,
  optional,
  error,
  showStrengthMeter = false,
  requireStrength = false,
  confirmPassword = false,
  confirmPasswordName,
  minLength = 8,
  requireNumbers = true,
  requireSymbols = true,
  requireMixedCase = true,
  transformError,
  className,
  ...props
}, ref) => {
  const {
    field,
    error: fieldError,
    isLoading
  } = useFieldState(name, control);

  const [showPassword, setShowPassword] = useState(false);
  const displayError = error || fieldError;
  
  // Calculate password strength
  const password = field.value || '';
  const strength = password ? calculatePasswordStrength(password) : null;

  return (
    <FieldWrapper
      label={label}
      help={help}
      tooltip={tooltip}
      required={required}
      optional={optional}
      error={typeof displayError === 'string' ? displayError : Array.isArray(displayError) ? displayError.join(', ') : displayError?.message}
      className={className}
      htmlFor={field.name}
    >
      <PasswordInput
        {...props}
        ref={ref}
        name={field.name}
        value={field.value || ''}
        onChange={(e) => field.onChange(e.target.value)}
        disabled={props.disabled || isLoading}
        showPassword={showPassword}
        onTogglePassword={setShowPassword}
        minLength={minLength}
      />
      
      {showStrengthMeter && password && strength && (
        <div className="mt-2 space-y-2">
          {/* Strength bar */}
          <div className="flex space-x-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i < strength.score 
                    ? strength.score <= 2 ? 'bg-[var(--error)]' : strength.score <= 3 ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'
                    : 'bg-[var(--border)]'
                }`}
              />
            ))}
          </div>
          
          {/* Strength label */}
          <div className={`text-xs font-satoshi-medium ${strength.color}`}>
            {strength.label}
          </div>
          
          {/* Suggestions */}
          {strength.suggestions.length > 0 && (
            <ul className="text-xs text-[var(--caption-color)] font-satoshi space-y-1">
              {strength.suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className="w-1 h-1 bg-[var(--caption-color)] rounded-full" />
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </FieldWrapper>
  );
});

PasswordField.displayName = 'PasswordField';