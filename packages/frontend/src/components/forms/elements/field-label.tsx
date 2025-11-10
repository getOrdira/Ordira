// src/components/forms/elements/field-label.tsx

import React from 'react';
import { cn } from '@/lib/utils/utils';

export interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  optional?: boolean;
  size?: 'sm' | 'md' | 'lg';
  weight?: 'normal' | 'medium' | 'semibold';
  description?: string;
  htmlFor?: string;
  children: React.ReactNode;
}

export const FieldLabel: React.FC<FieldLabelProps> = ({
  required = false,
  optional = false,
  size = 'sm',
  weight = 'medium',
  description,
  className,
  children,
  ...props
}) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const weightClasses = {
    normal: 'font-satoshi',
    medium: 'font-satoshi-medium',
    semibold: 'font-satoshi-semibold'
  };

  return (
    <div className="space-y-1">
      <label
        className={cn(
          'block text-[var(--heading-color)] leading-tight',
          sizeClasses[size],
          weightClasses[weight],
          className
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="text-[var(--error)] ml-1" aria-label="required">
            *
          </span>
        )}
        {optional && !required && (
          <span className="text-[var(--muted)] ml-1 font-satoshi text-xs">
            (optional)
          </span>
        )}
      </label>
      
      {description && (
        <p className="text-xs text-[var(--caption-color)] font-satoshi leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};