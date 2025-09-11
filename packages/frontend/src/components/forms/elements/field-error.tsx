// src/components/forms/elements/field-error.tsx

import React from 'react';
import { cn } from '@/lib/utils';

export interface FieldErrorProps {
  error?: string | string[];
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const FieldError: React.FC<FieldErrorProps> = ({
  error,
  className,
  showIcon = true,
  size = 'sm'
}) => {
  if (!error) return null;

  const errors = Array.isArray(error) ? error : [error];
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm', 
    lg: 'text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className={cn('space-y-1', className)}>
      {errors.map((errorMessage, index) => (
        <div
          key={index}
          className={cn(
            'flex items-start gap-1.5 text-[var(--error)] font-satoshi',
            sizeClasses[size]
          )}
          role="alert"
          aria-live="polite"
        >
          {showIcon && (
            <svg 
              className={cn('flex-shrink-0 mt-0.5', iconSizes[size])} 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zM10 15a1 1 0 100-2 1 1 0 000 2z" 
                clipRule="evenodd" 
              />
            </svg>
          )}
          <span className="leading-tight">{errorMessage}</span>
        </div>
      ))}
    </div>
  );
};