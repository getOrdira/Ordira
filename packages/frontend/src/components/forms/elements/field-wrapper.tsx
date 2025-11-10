// src/components/forms/elements/field-wrapper.tsx

import React from 'react';
import { cn } from '@/lib/utils/utils';
import { FieldLabel, type FieldLabelProps } from './field-label';
import { FieldError, type FieldErrorProps } from './field-error';
import { FieldHelp, type FieldHelpProps } from './field-help';

export interface FieldWrapperProps {
  // Label props
  label?: string;
  labelProps?: Omit<FieldLabelProps, 'children'>;
  required?: boolean;
  optional?: boolean;
  
  // Error props
  error?: string | string[];
  errorProps?: Omit<FieldErrorProps, 'error'>;
  
  // Help props
  help?: string;
  tooltip?: string;
  helpProps?: Omit<FieldHelpProps, 'help' | 'tooltip'>;
  
  // Layout
  spacing?: 'sm' | 'md' | 'lg';
  orientation?: 'vertical' | 'horizontal';
  
  // Wrapper styling
  className?: string;
  fieldClassName?: string;
  
  // Content
  children: React.ReactNode;
  
  // HTML props
  htmlFor?: string;
}

export const FieldWrapper: React.FC<FieldWrapperProps> = ({
  label,
  labelProps,
  required,
  optional,
  error,
  errorProps,
  help,
  tooltip,
  helpProps,
  spacing = 'md',
  orientation = 'vertical',
  className,
  fieldClassName,
  children,
  htmlFor,
  ...props
}) => {
  const spacingClasses = {
    sm: 'space-y-1',
    md: 'space-y-2', 
    lg: 'space-y-3'
  };

  const horizontalClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4'
  };

  if (orientation === 'horizontal') {
    return (
      <div className={cn('flex items-start', horizontalClasses[spacing], className)} {...props}>
        {label && (
          <div className="flex-shrink-0 pt-2">
            <FieldLabel
              htmlFor={htmlFor}
              required={required}
              optional={optional}
              {...labelProps}
            >
              {label}
            </FieldLabel>
          </div>
        )}
        
        <div className={cn('flex-1 space-y-2', fieldClassName)}>
          {children}
          <FieldError error={error} {...errorProps} />
          <FieldHelp help={help} tooltip={tooltip} {...helpProps} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(spacingClasses[spacing], className)} {...props}>
      {label && (
        <FieldLabel
          htmlFor={htmlFor}
          required={required}
          optional={optional}
          {...labelProps}
        >
          {label}
        </FieldLabel>
      )}
      
      <div className={fieldClassName}>
        {children}
      </div>
      
      <FieldError error={error} {...errorProps} />
      <FieldHelp help={help} tooltip={tooltip} {...helpProps} />
    </div>
  );
};