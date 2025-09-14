// src/components/forms/inputs/select-field.tsx

import React, { forwardRef } from 'react';
import { FieldWrapper, type FieldWrapperProps } from '../elements/field-wrapper';
import { Select, type SelectProps } from '@/components/ui/primitives/select';
import { useFieldState, type BaseFieldProps } from '../adapters/rhf/field';

export interface SelectFieldProps 
  extends Omit<SelectProps, 'error' | 'success' | 'label' | 'helper'>,
    Omit<FieldWrapperProps, 'children'>,
    BaseFieldProps {
  // Select-specific options
  allowEmpty?: boolean;
  emptyText?: string;
  loadOptions?: () => Promise<Array<{label: string; value: any}>>;
  dependsOn?: string; // Field name that this select depends on
}

export const SelectField = forwardRef<HTMLButtonElement, SelectFieldProps>(({
  name,
  control,
  label,
  help,
  tooltip,
  required,
  optional,
  error,
  options = [],
  allowEmpty = false,
  emptyText = 'Select an option',
  loadOptions,
  dependsOn,
  transformError,
  className,
  ...props
}, ref) => {
  const {
    field,
    error: fieldError,
    isLoading
  } = useFieldState(name, control);

  const [dynamicOptions, setDynamicOptions] = React.useState(options);
  const [isLoadingOptions, setIsLoadingOptions] = React.useState(false);

  const displayError = error || fieldError;

  // Load options dynamically
  React.useEffect(() => {
    if (loadOptions) {
      setIsLoadingOptions(true);
      loadOptions()
        .then(setDynamicOptions)
        .catch(console.error)
        .finally(() => setIsLoadingOptions(false));
    }
  }, [loadOptions]);

  // Add empty option if allowed
  const finalOptions = allowEmpty 
    ? [{ label: emptyText, value: '' }, ...dynamicOptions]
    : dynamicOptions;

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
      <Select
        {...props}
        ref={ref}
        options={finalOptions}
        value={field.value}
        onValueChange={field.onChange}
        disabled={props.disabled || isLoading || isLoadingOptions}
        placeholder={props.placeholder || emptyText}
      />
    </FieldWrapper>
  );
});

SelectField.displayName = 'SelectField';