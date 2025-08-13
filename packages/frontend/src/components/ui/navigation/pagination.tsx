// src/components/ui/navigation/pagination.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const paginationVariants = cva(
  // Base container styles
  "flex items-center justify-between bg-white rounded-2xl px-6 py-4 border border-gray-200",
  {
    variants: {
      variant: {
        // Full pagination with labels and results info
        full: "justify-between",
        // Simple pagination with just page numbers
        simple: "justify-center",
        // Minimal pagination with just arrows
        minimal: "justify-between"
      },
      size: {
        sm: "px-4 py-3 text-sm",
        md: "px-6 py-4 text-base",
        lg: "px-8 py-5 text-lg"
      }
    },
    defaultVariants: {
      variant: "full",
      size: "md"
    }
  }
);

const pageButtonVariants = cva(
  // Base page button styles
  "flex items-center justify-center min-w-[40px] h-10 rounded-full transition-all duration-200 font-medium text-sm",
  {
    variants: {
      variant: {
        default: "text-[var(--dark)] hover:bg-gray-100",
        active: "bg-[var(--accent)] text-white shadow-md",
        disabled: "text-[var(--muted)] cursor-not-allowed opacity-50"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

const navigationButtonVariants = cva(
  // Navigation arrow button styles
  "flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm",
  {
    variants: {
      variant: {
        default: "text-[var(--dark)] hover:bg-gray-100",
        disabled: "text-[var(--muted)] cursor-not-allowed opacity-50"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface PaginationProps extends VariantProps<typeof paginationVariants> {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  showLabels?: boolean;
  showResultsInfo?: boolean;
  showFirstLast?: boolean;
  siblingCount?: number;
  className?: string;
}

const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage = 10,
    onPageChange,
    variant = "full",
    size = "md",
    showLabels = true,
    showResultsInfo = true,
    showFirstLast = false,
    siblingCount = 1,
    className,
    ...props
  }, ref) => {
    
    // Calculate pagination range
    const range = (start: number, end: number) => {
      const length = end - start + 1;
      return Array.from({ length }, (_, idx) => start + idx);
    };

    const generatePaginationRange = () => {
      const totalPageNumbersToShow = siblingCount * 2 + 5; // siblings + current + first + last + 2 dots
      
      if (totalPages <= totalPageNumbersToShow) {
        return range(1, totalPages);
      }

      const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
      const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

      const shouldShowLeftDots = leftSiblingIndex > 2;
      const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

      if (!shouldShowLeftDots && shouldShowRightDots) {
        const leftItemCount = 3 + 2 * siblingCount;
        const leftRange = range(1, leftItemCount);
        return [...leftRange, '...', totalPages];
      }

      if (shouldShowLeftDots && !shouldShowRightDots) {
        const rightItemCount = 3 + 2 * siblingCount;
        const rightRange = range(totalPages - rightItemCount + 1, totalPages);
        return [1, '...', ...rightRange];
      }

      if (shouldShowLeftDots && shouldShowRightDots) {
        const middleRange = range(leftSiblingIndex, rightSiblingIndex);
        return [1, '...', ...middleRange, '...', totalPages];
      }

      return [];
    };

    const paginationRange = generatePaginationRange();
    
    // Calculate results info
    const startItem = totalItems ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const endItem = totalItems ? Math.min(currentPage * itemsPerPage, totalItems) : 0;

    const handlePageChange = (page: number) => {
      if (page >= 1 && page <= totalPages && page !== currentPage) {
        onPageChange(page);
      }
    };

    const handlePrevious = () => {
      handlePageChange(currentPage - 1);
    };

    const handleNext = () => {
      handlePageChange(currentPage + 1);
    };

    // Render different variants
    if (variant === "minimal") {
      return (
        <div ref={ref} className={cn(paginationVariants({ variant, size }), className)} {...props}>
          <button
            onClick={handlePrevious}
            disabled={currentPage === 1}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full",
              currentPage === 1 
                ? "bg-[var(--accent)] text-white opacity-50 cursor-not-allowed"
                : "bg-[var(--accent)] text-white hover:opacity-90"
            )}
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>

          {showResultsInfo && totalItems && (
            <span className="text-[var(--dark)] font-medium">
              Showing {endItem.toLocaleString()} of {totalItems.toLocaleString()} results
            </span>
          )}

          <button
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full",
              currentPage === totalPages 
                ? "bg-[var(--accent)] text-white opacity-50 cursor-not-allowed"
                : "bg-[var(--accent)] text-white hover:opacity-90"
            )}
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      );
    }

    if (variant === "simple") {
      return (
        <div ref={ref} className={cn(paginationVariants({ variant, size }), className)} {...props}>
          <div className="flex items-center space-x-2">
            {/* Previous Arrow */}
            <button
              onClick={handlePrevious}
              disabled={currentPage === 1}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full",
                currentPage === 1 
                  ? "text-[var(--muted)] cursor-not-allowed"
                  : "text-[var(--dark)] hover:bg-gray-100"
              )}
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>

            {/* Page Numbers */}
            {paginationRange.map((pageNumber, index) => {
              if (pageNumber === '...') {
                return (
                  <span key={index} className="px-3 py-2 text-[var(--muted)]">
                    …
                  </span>
                );
              }

              return (
                <button
                  key={index}
                  onClick={() => handlePageChange(Number(pageNumber))}
                  className={cn(
                    pageButtonVariants({
                      variant: Number(pageNumber) === currentPage ? "active" : "default"
                    })
                  )}
                >
                  {pageNumber}
                </button>
              );
            })}

            {/* Last page if not shown */}
            {totalPages > 5 && !paginationRange.includes(totalPages) && (
              <>
                <span className="px-3 py-2 text-[var(--muted)]">…</span>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  className={cn(
                    pageButtonVariants({
                      variant: totalPages === currentPage ? "active" : "default"
                    })
                  )}
                >
                  {totalPages}
                </button>
              </>
            )}

            {/* Next Arrow */}
            <button
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full",
                currentPage === totalPages 
                  ? "text-[var(--muted)] cursor-not-allowed"
                  : "text-[var(--dark)] hover:bg-gray-100"
              )}
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      );
    }

    // Full variant (default)
    return (
      <div ref={ref} className={cn(paginationVariants({ variant, size }), className)} {...props}>
        {/* Previous Button */}
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className={cn(
            navigationButtonVariants({
              variant: currentPage === 1 ? "disabled" : "default"
            })
          )}
        >
          <ChevronLeftIcon className="w-4 h-4" />
          {showLabels && <span>Previous</span>}
        </button>

        {/* Page Numbers */}
        <div className="flex items-center space-x-2">
          {paginationRange.map((pageNumber, index) => {
            if (pageNumber === '...') {
              return (
                <span key={index} className="px-3 py-2 text-[var(--muted)]">
                  …
                </span>
              );
            }

            return (
              <button
                key={index}
                onClick={() => handlePageChange(Number(pageNumber))}
                className={cn(
                  pageButtonVariants({
                    variant: Number(pageNumber) === currentPage ? "active" : "default"
                  })
                )}
              >
                {pageNumber}
              </button>
            );
          })}
        </div>

        {/* Next Button and Results Info */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className={cn(
              navigationButtonVariants({
                variant: currentPage === totalPages ? "disabled" : "default"
              })
            )}
          >
            {showLabels && <span>Next</span>}
            <ChevronRightIcon className="w-4 h-4" />
          </button>

          {showResultsInfo && totalItems && (
            <span className="text-[var(--muted)] text-sm whitespace-nowrap">
              Showing {endItem.toLocaleString()} of {totalItems.toLocaleString()} results
            </span>
          )}
        </div>
      </div>
    );
  }
);

Pagination.displayName = "Pagination";

// Simple Pagination Info Component
export interface PaginationInfoProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  className?: string;
}

const PaginationInfo = React.forwardRef<HTMLDivElement, PaginationInfoProps>(
  ({ currentPage, totalPages, totalItems, itemsPerPage, className }, ref) => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
      <div ref={ref} className={cn("text-sm text-[var(--muted)]", className)}>
        Showing <span className="font-medium text-[var(--dark)]">{startItem.toLocaleString()}</span> to{' '}
        <span className="font-medium text-[var(--dark)]">{endItem.toLocaleString()}</span> of{' '}
        <span className="font-medium text-[var(--dark)]">{totalItems.toLocaleString()}</span> results
      </div>
    );
  }
);

PaginationInfo.displayName = "PaginationInfo";

// Table Pagination Component (for use with tables)
export interface TablePaginationProps extends PaginationProps {
  itemName?: string;
  showPageSizeSelector?: boolean;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
}

const TablePagination = React.forwardRef<HTMLDivElement, TablePaginationProps>(
  ({
    itemName = "items",
    showPageSizeSelector = false,
    pageSizeOptions = [10, 25, 50, 100],
    onPageSizeChange,
    itemsPerPage = 10,
    ...paginationProps
  }, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showPageSizeSelector && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-[var(--muted)]">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-sm text-[var(--muted)]">{itemName} per page</span>
            </div>
          )}
        </div>

        <Pagination {...paginationProps} itemsPerPage={itemsPerPage} />
      </div>
    );
  }
);

TablePagination.displayName = "TablePagination";

export { 
  Pagination, 
  PaginationInfo, 
  TablePagination, 
  paginationVariants 
};