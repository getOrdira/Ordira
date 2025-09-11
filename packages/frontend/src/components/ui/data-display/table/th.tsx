// src/components/ui/data-display/table/th.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useTableContext, type TableColumn } from './table';

export interface TableHeaderProps {
  className?: string;
  column?: TableColumn;
  children?: React.ReactNode;
}

const TableHeader = React.forwardRef<HTMLTableCellElement, TableHeaderProps>(
  ({ className, column, children, ...props }, ref) => {
    const { sortable, sortState, onSort } = useTableContext();

    // Render sort icon
    const renderSortIcon = (columnKey: string) => {
      if (sortState.column !== columnKey) {
        return (
          <div className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronUpIcon className="w-3 h-3 text-gray-400" />
          </div>
        );
      }
      
      return (
        <div className="ml-1">
          {sortState.direction === 'asc' ? (
            <ChevronUpIcon className="w-3 h-3 text-gray-600" />
          ) : (
            <ChevronDownIcon className="w-3 h-3 text-gray-600" />
          )}
        </div>
      );
    };

    const handleClick = () => {
      if (column?.sortable && onSort) {
        onSort(column.key);
      }
    };

    if (column) {
      return (
        <th
          ref={ref}
          className={cn(
            "text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
            column.sortable && sortable && "cursor-pointer select-none group hover:bg-gray-100",
            column.align === 'center' && "text-center",
            column.align === 'right' && "text-right",
            className
          )}
          style={{ 
            width: column.width, 
            minWidth: column.minWidth 
          }}
          onClick={handleClick}
          {...props}
        >
          <div className="flex items-center">
            {column.headerRender ? column.headerRender() : column.header}
            {column.sortable && sortable && renderSortIcon(column.key)}
          </div>
        </th>
      );
    }

    return (
      <th
        ref={ref}
        className={cn(
          "text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
          className
        )}
        {...props}
      >
        {children}
      </th>
    );
  }
);

TableHeader.displayName = "TableHeader";

// Export alias for convenience
export const Th = TableHeader;

export { TableHeader };