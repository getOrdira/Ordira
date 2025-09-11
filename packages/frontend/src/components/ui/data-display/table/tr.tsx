// src/components/ui/data-display/table/tr.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { useTableContext } from './table';

export interface TableRowProps {
  className?: string;
  row?: any;
  index?: number;
  isSelected?: boolean;
  children?: React.ReactNode;
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, row, index, isSelected, children, ...props }, ref) => {
    const { hoverable, striped, rowClassName } = useTableContext();

    return (
      <tr
        ref={ref}
        className={cn(
          "transition-colors",
          hoverable && "hover:bg-gray-50",
          isSelected && "bg-blue-50",
          striped && index !== undefined && index % 2 === 1 && "bg-gray-25",
          row && index !== undefined && rowClassName?.(row, index),
          className
        )}
        {...props}
      >
        {children}
      </tr>
    );
  }
);

TableRow.displayName = "TableRow";

// Export alias for convenience
export const Tr = TableRow;

export { TableRow };