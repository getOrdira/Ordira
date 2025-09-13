// src/components/ui/data-display/table/table.tsx
'use client';

import React, { useState, useMemo, createContext, useContext } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { StarIcon } from '@heroicons/react/24/outline';
import { TablePagination } from '@/components/ui/navigation/pagination';
import { TableHead } from './thead';
import { TableBody } from './tbody';

const tableVariants = cva(
  "w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-[var(--card-border)]",
        minimal: "border-[var(--border)]",
        bordered: "border-[var(--border-dark)]",
      },
      size: {
        sm: "[&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2",
        md: "[&_th]:px-4 [&_th]:py-3 [&_td]:px-4 [&_td]:py-3",
        lg: "[&_th]:px-6 [&_th]:py-4 [&_td]:px-6 [&_td]:py-4",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

// Column definition interface
export interface TableColumn<T = any> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  minWidth?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, index: number) => React.ReactNode;
  headerRender?: () => React.ReactNode;
  sticky?: boolean;
}

// Sort direction type
export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  column: string | null;
  direction: SortDirection;
}

// Table action interface
export interface TableAction<T = any> {
  key: string;
  label: string;
  icon?: React.ComponentType<any>;
  onClick: (row: T) => void;
  variant?: 'default' | 'destructive' | 'primary';
  disabled?: (row: T) => boolean;
  hidden?: (row: T) => boolean;
}

// Bulk action interface
export interface BulkAction<T = any> {
  key: string;
  label: string;
  icon?: React.ComponentType<any>;
  onClick: (selectedRows: T[]) => void;
  variant?: 'default' | 'destructive' | 'primary';
}

export interface TableProps<T = any> 
  extends VariantProps<typeof tableVariants> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  
  // Selection
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selectedRows: string[]) => void;
  getRowId?: (row: T, index: number) => string;
  
  // Sorting
  sortable?: boolean;
  defaultSort?: SortState;
  onSort?: (sort: SortState) => void;
  
  // Actions
  actions?: TableAction<T>[];
  bulkActions?: BulkAction<T>[];
  
  // Pagination
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    showPageSizeSelector?: boolean;
    pageSizeOptions?: number[];
    onPageSizeChange?: (pageSize: number) => void;
  };
  
  // Empty state
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  
  // Styling
  className?: string;
  rowClassName?: (row: T, index: number) => string;
  cellClassName?: string;
  headerClassName?: string;
  
  // Features
  hoverable?: boolean;
  striped?: boolean;
  compact?: boolean;
}

// Table context for sharing state between components
interface TableContextValue<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  selectable: boolean;
  selectedRows: string[];
  onSelectionChange?: (selectedRows: string[]) => void;
  getRowId: (row: T, index: number) => string;
  sortable: boolean;
  sortState: SortState;
  onSort?: (columnKey: string) => void;
  actions: TableAction<T>[];
  variant: string;
  size: string;
  cellClassName?: string;
  headerClassName?: string;
  hoverable: boolean;
  striped: boolean;
  rowClassName?: (row: T, index: number) => string;
}

const TableContext = createContext<TableContextValue | null>(null);

export const useTableContext = () => {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error('Table components must be used within a Table component');
  }
  return context;
};

const Table = <T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  getRowId = (row, index) => row.id || index.toString(),
  sortable = true,
  defaultSort,
  onSort,
  actions = [],
  bulkActions = [],
  pagination,
  emptyMessage = "No data available",
  emptyAction,
  variant = "default",
  size = "md",
  className,
  rowClassName,
  cellClassName,
  headerClassName,
  hoverable = true,
  striped = false,
  compact = false,
  ...props
}: TableProps<T>) => {
  const [sortState, setSortState] = useState<SortState>(defaultSort || { column: null, direction: null });

  // Handle sorting
  const handleSort = (columnKey: string) => {
    if (!sortable) return;
    
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    let newDirection: SortDirection = 'asc';
    
    if (sortState.column === columnKey) {
      if (sortState.direction === 'asc') {
        newDirection = 'desc';
      } else if (sortState.direction === 'desc') {
        newDirection = null;
      }
    }

    const newSort = { column: newDirection ? columnKey : null, direction: newDirection };
    setSortState(newSort);
    onSort?.(newSort);
  };

  // Compute selected row data
  const selectedRowData = useMemo(() => {
    return data.filter((row, index) => selectedRows.includes(getRowId(row, index)));
  }, [data, selectedRows, getRowId]);

  const contextValue: TableContextValue<T> = {
    columns,
    data,
    selectable,
    selectedRows,
    onSelectionChange,
    getRowId,
    sortable,
    sortState,
    onSort: handleSort,
    actions,
    variant: variant || 'default',
    size: size || 'md',
    cellClassName,
    headerClassName,
    hoverable,
    striped,
    rowClassName,
  };

  return (
    <TableContext.Provider value={contextValue}>
      <div className={cn("space-y-4", className)} {...props}>
        {/* Bulk Actions Bar */}
        {selectable && selectedRows.length > 0 && bulkActions.length > 0 && (
          <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-[var(--primary)]">
                  {selectedRows.length} selected
                </span>
                <div className="flex items-center space-x-2">
                  {bulkActions.map((action) => (
                    <button
                      key={action.key}
                      onClick={() => action.onClick(selectedRowData)}
                      className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center space-x-1",
                        action.variant === 'destructive' 
                          ? "text-[var(--error)] bg-[var(--error)]/10 hover:bg-[var(--error)]/20"
                          : action.variant === 'primary'
                          ? "text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20"
                          : "text-[var(--foreground)] bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--background-secondary)]"
                      )}
                    >
                      {action.icon && <action.icon className="w-4 h-4" />}
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={() => onSelectionChange?.([])}
                className="text-[var(--primary)] hover:text-[var(--primary-dark)] text-sm font-medium"
              >
                Clear selection
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className={cn(tableVariants({ variant, size }))}>
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center space-x-2 text-[var(--muted)]">
                <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
                <span>Loading...</span>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-[var(--muted)] mb-4">{emptyMessage}</div>
              {emptyAction && (
                <button
                  onClick={emptyAction.onClick}
                  className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors"
                >
                  {emptyAction.label}
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <TableHead />
                <TableBody />
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && (
          <TablePagination {...pagination} />
        )}
      </div>
    </TableContext.Provider>
  );
};

// Helper components for common cell types

// Product cell with image and details
export const ProductCell = ({ 
  image, 
  name, 
  description, 
  code 
}: { 
  image?: string; 
  name: string; 
  description?: string; 
  code?: string; 
}) => (
  <div className="flex items-center space-x-3">
    <div className="w-10 h-10 bg-[var(--background-secondary)] rounded-lg overflow-hidden flex-shrink-0">
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-[var(--background-tertiary)]" />
      )}
    </div>
    <div className="min-w-0 flex-1">
      <div className="font-medium text-[var(--heading-color)] truncate">{name}</div>
      {description && (
        <div className="text-sm text-[var(--body-color)] truncate">{description}</div>
      )}
      {code && (
        <div className="text-xs text-[var(--caption-color)]">{code}</div>
      )}
    </div>
  </div>
);

// Status badge cell
export const StatusCell = ({ 
  status, 
  variant = 'default' 
}: { 
  status: string; 
  variant?: 'default' | 'success' | 'warning' | 'error'; 
}) => {
  const variants = {
    default: "bg-[var(--background-secondary)] text-[var(--foreground)]",
    success: "bg-[var(--success)]/10 text-[var(--success)]",
    warning: "bg-[var(--warning)]/10 text-[var(--warning)]",
    error: "bg-[var(--error)]/10 text-[var(--error)]",
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      variants[variant]
    )}>
      {status}
    </span>
  );
};

// Rating cell with stars
export const RatingCell = ({ 
  rating, 
  maxRating = 5 
}: { 
  rating: number; 
  maxRating?: number; 
}) => (
  <div className="flex items-center space-x-1">
    {Array.from({ length: maxRating }, (_, i) => (
      <div key={i}>
        {i < rating ? (
          <StarSolidIcon className="w-4 h-4 text-yellow-400" />
        ) : (
          <StarIcon className="w-4 h-4 text-[var(--border)]" />
        )}
      </div>
    ))}
    <span className="ml-1 text-sm text-[var(--body-color)]">{rating.toFixed(1)}</span>
  </div>
);

// Currency cell
export const CurrencyCell = ({ 
  amount, 
  currency = '$' 
}: { 
  amount: number; 
  currency?: string; 
}) => (
  <span className="font-medium text-[var(--heading-color)]">
    {currency}{amount.toLocaleString()}
  </span>
);

// Date cell
export const DateCell = ({ 
  date 
}: { 
  date: string | Date; 
}) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return (
    <span className="text-[var(--heading-color)]">
      {dateObj.toLocaleDateString()}
    </span>
  );
};

// User cell with avatar
export const UserCell = ({ 
  name, 
  email, 
  avatar 
}: { 
  name: string; 
  email?: string; 
  avatar?: string; 
}) => (
  <div className="flex items-center space-x-3">
    <div className="w-8 h-8 bg-[var(--background-secondary)] rounded-full overflow-hidden flex-shrink-0">
      {avatar ? (
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-[var(--background-tertiary)] flex items-center justify-center">
          <span className="text-xs font-medium text-[var(--foreground)]">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
    <div className="min-w-0 flex-1">
      <div className="font-medium text-[var(--heading-color)] truncate">{name}</div>
      {email && (
        <div className="text-sm text-[var(--body-color)] truncate">{email}</div>
      )}
    </div>
  </div>
);

export { Table };
export default Table;