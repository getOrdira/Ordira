// src/components/forms/elements/field-help.tsx

import React, { useState } from 'react';
import { cn } from '@/lib/utils/utils';

export interface FieldHelpProps {
  help?: string;
  tooltip?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const FieldHelp: React.FC<FieldHelpProps> = ({
  help,
  tooltip,
  className,
  size = 'sm',
  showIcon = true
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!help && !tooltip) return null;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={cn('flex items-start gap-1.5', className)}>
      {help && (
        <p className={cn(
          'text-[var(--caption-color)] font-satoshi leading-relaxed',
          sizeClasses[size]
        )}>
          {help}
        </p>
      )}
      
      {tooltip && (
        <div className="relative">
          <button
            type="button"
            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            aria-label="More information"
          >
            {showIcon && (
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path 
                  fillRule="evenodd" 
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" 
                  clipRule="evenodd" 
                />
              </svg>
            )}
          </button>
          
          {showTooltip && (
            <div className="absolute bottom-full left-0 mb-2 z-50">
              <div className="bg-[var(--foreground)] text-[var(--background)] text-xs font-satoshi px-3 py-2 rounded-lg shadow-lg max-w-xs whitespace-normal">
                {tooltip}
                <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[var(--foreground)]" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};