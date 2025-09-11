// src/components/forms/elements/form-grid.tsx

import React from 'react';
import { cn } from '@/lib/utils';

export interface FormGridProps extends React.HTMLAttributes<HTMLDivElement> {
  // Grid configuration
  columns?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  
  // Responsive behavior
  responsive?: {
    sm?: 1 | 2 | 3 | 4 | 6 | 12;
    md?: 1 | 2 | 3 | 4 | 6 | 12;
    lg?: 1 | 2 | 3 | 4 | 6 | 12;
    xl?: 1 | 2 | 3 | 4 | 6 | 12;
  };
  
  // Auto-fit behavior
  autoFit?: boolean;
  minItemWidth?: string; // e.g., '200px', '15rem'
  
  children: React.ReactNode;
}

export const FormGrid: React.FC<FormGridProps> = ({
  columns = 2,
  gap = 'md',
  responsive,
  autoFit = false,
  minItemWidth = '250px',
  className,
  children,
  ...props
}) => {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  };

  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2', 
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    6: 'grid-cols-6',
    12: 'grid-cols-12'
  };

  const responsiveClasses = responsive ? Object.entries(responsive).map(([breakpoint, cols]) => {
    const prefix = breakpoint === 'sm' ? 'sm:' : breakpoint === 'md' ? 'md:' : breakpoint === 'lg' ? 'lg:' : 'xl:';
    return `${prefix}${columnClasses[cols]}`;
  }).join(' ') : '';

  if (autoFit) {
    return (
      <div
        className={cn(
          'grid',
          gapClasses[gap],
          className
        )}
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`
        }}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid',
        columnClasses[columns],
        responsiveClasses,
        gapClasses[gap],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Column span utility component
export interface FormGridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  span?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  spanSm?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  spanMd?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  spanLg?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  spanXl?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  children: React.ReactNode;
}

export const FormGridItem: React.FC<FormGridItemProps> = ({
  span,
  spanSm,
  spanMd,
  spanLg,
  spanXl,
  className,
  children,
  ...props
}) => {
  const spanClasses = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
    6: 'col-span-6',
    7: 'col-span-7',
    8: 'col-span-8',
    9: 'col-span-9',
    10: 'col-span-10',
    11: 'col-span-11',
    12: 'col-span-12'
  };

  const responsiveSpans = [
    span && spanClasses[span],
    spanSm && `sm:${spanClasses[spanSm]}`,
    spanMd && `md:${spanClasses[spanMd]}`,
    spanLg && `lg:${spanClasses[spanLg]}`,
    spanXl && `xl:${spanClasses[spanXl]}`
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cn(responsiveSpans, className)}
      {...props}
    >
      {children}
    </div>
  );
};