// src/components/ui/data-display/table/thead.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils/utils';
import { useTableContext } from './table';
import { TableRow } from './tr';
import { TableHeader } from './th';

export interface TableHeadProps {
  className?: string;
}

const TableHead = React.forwardRef<HTMLTableSectionElement, TableHeadProps>(
  ({ className, ...props }, ref) => {
    const {
      columns,
      selectable,
      selectedRows,
      onSelectionChange,
      data,
      getRowId,
      actions,
      headerClassName
    } = useTableContext();

    // Handle select all
    const handleSelectAll = () => {
      if (!selectable || !onSelectionChange) return;
      
      const allRowIds = data.map((row, index) => getRowId(row, index));
      const isAllSelected = allRowIds.length > 0 && allRowIds.every(id => selectedRows.includes(id));
      
      if (isAllSelected) {
        onSelectionChange([]);
      } else {
        onSelectionChange(allRowIds);
      }
    };

    const isAllSelected = data.length > 0 && data.every((row, index) => selectedRows.includes(getRowId(row, index)));
    const isIndeterminate = selectedRows.length > 0 && !isAllSelected;

    return (
      <thead 
        ref={ref} 
        className={cn("bg-gray-50", className)} 
        {...props}
      >
        <TableRow>
          {/* Selection column */}
          {selectable && (
            <TableHeader className="w-10">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isIndeterminate;
                }}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
            </TableHeader>
          )}
          
          {/* Data columns */}
          {columns.map((column) => (
            <TableHeader
              key={column.key}
              column={column}
              className={headerClassName}
            />
          ))}
          
          {/* Actions column */}
          {actions.length > 0 && (
            <TableHeader className="w-10 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </TableHeader>
          )}
        </TableRow>
      </thead>
    );
  }
);

TableHead.displayName = "TableHead";

// Export alias for convenience
export const Thead = TableHead;

export { TableHead };