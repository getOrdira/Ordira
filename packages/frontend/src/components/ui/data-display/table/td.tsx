// src/components/ui/data-display/table/td.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { type TableColumn } from './table';

export interface TableCellProps {
  className?: string;
  column?: TableColumn;
  value?: any;
  row?: any;
  index?: number;
  children?: React.ReactNode;
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, column, value, row, index, children, ...props }, ref) => {
    if (column) {
      return (
        <td
          ref={ref}
          className={cn(
            "whitespace-nowrap text-sm text-gray-900",
            column.align === 'center' && "text-center",
            column.align === 'right' && "text-right",
            className
          )}
          {...props}
        >
          {column.render && row && index !== undefined
            ? column.render(value, row, index)
            : value
          }
        </td>
      );
    }

    return (
      <td
        ref={ref}
        className={cn(
          "whitespace-nowrap text-sm text-gray-900",
          className
        )}
        {...props}
      >
        {children}
      </td>
    );
  }
);

TableCell.displayName = "TableCell";

// Export alias for convenience
export const Td = TableCell;

export { TableCell };