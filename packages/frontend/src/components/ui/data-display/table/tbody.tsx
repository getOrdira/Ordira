// src/components/ui/data-display/table/tbody.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils/utils';
import { useTableContext } from './table';
import { TableRow } from './tr';
import { TableCell } from './td';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

export interface TableBodyProps {
  className?: string;
}

const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, ...props }, ref) => {
    const {
      data,
      columns,
      selectable,
      selectedRows,
      onSelectionChange,
      getRowId,
      actions,
      striped,
      cellClassName
    } = useTableContext();

    // Handle row selection
    const handleSelectRow = (rowId: string) => {
      if (!selectable || !onSelectionChange) return;
      
      if (selectedRows.includes(rowId)) {
        onSelectionChange(selectedRows.filter(id => id !== rowId));
      } else {
        onSelectionChange([...selectedRows, rowId]);
      }
    };

    // Render actions dropdown
    const renderActions = (row: any) => {
      const visibleActions = actions.filter(action => !action.hidden?.(row));
      if (visibleActions.length === 0) return null;

      return (
        <div className="relative group">
          <button className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <EllipsisVerticalIcon className="w-4 h-4" />
          </button>
          
          {/* Dropdown menu - would need proper dropdown implementation */}
          <div className="absolute right-0 top-8 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-32 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
            {visibleActions.map((action) => (
              <button
                key={action.key}
                onClick={() => action.onClick(row)}
                disabled={action.disabled?.(row)}
                className={cn(
                  "w-full px-3 py-2 text-sm text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2",
                  action.variant === 'destructive' && "text-red-600 hover:bg-red-50",
                  action.variant === 'primary' && "text-blue-600 hover:bg-blue-50"
                )}
              >
                {action.icon && <action.icon className="w-4 h-4" />}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      );
    };

    return (
      <tbody 
        ref={ref} 
        className={cn(
          "bg-white divide-y divide-gray-200", 
          striped && "divide-gray-100",
          className
        )} 
        {...props}
      >
        {data.map((row, index) => {
          const rowId = getRowId(row, index);
          const isSelected = selectedRows.includes(rowId);
          
          return (
            <TableRow 
              key={rowId} 
              row={row} 
              index={index}
              isSelected={isSelected}
            >
              {/* Selection cell */}
              {selectable && (
                <TableCell className="w-10">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectRow(rowId)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </TableCell>
              )}
              
              {/* Data cells */}
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  column={column}
                  value={row[column.key]}
                  row={row}
                  index={index}
                  className={cellClassName}
                />
              ))}
              
              {/* Actions cell */}
              {actions.length > 0 && (
                <TableCell className="w-10 text-right">
                  {renderActions(row)}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </tbody>
    );
  }
);

TableBody.displayName = "TableBody";

// Export alias for convenience
export const Tbody = TableBody;

export { TableBody };