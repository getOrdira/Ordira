// src/components/ui/navigation/pagination.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const paginationVariants = cva(
  // Base container styles aligned with Ordira branding
  "flex items-center justify-between bg-white rounded-2xl px-6 py-4 border border-gray-200 shadow-sm",
  {
    variants: {
      variant: {
        // Full pagination with labels and results info (matches image top variant)
        full: "justify-between",
        // Simple pagination with just page numbers (matches image middle variant)
        simple: "justify-center",
        // Minimal pagination with just arrows (matches image bottom variant)
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
  // Page button styles matching the image design
  "flex items-center justify-center min-w-[40px] h-10 rounded-full transition-all duration-200 font-satoshi-medium text-sm select-none",
  {
    variants: {
      variant: {
        default: "text-[var(--ordira-accent)] hover:bg-gray-100 hover:text-[var(--ordira-black)]",
        active: "bg-[var(--primary)] text-white shadow-md transform scale-105", // Purple active state like in image
        disabled: "text-[var(--muted)] cursor-not-allowed opacity-50"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

const navigationButtonVariants = cva(
  // Navigation arrow button styles matching image
  "flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 font-satoshi-medium text-sm border border-transparent hover:border-gray-200 hover:bg-gray-50",
  {
    variants: {
      variant: {
        default: "text-[var(--ordira-accent)] hover:text-[var(--ordira-black)]",
        disabled: "text-[var(--muted)] cursor-not-allowed opacity-50 hover:bg-transparent hover:border-transparent"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

const arrowButtonVariants = cva(
  // Arrow-only button styles for simple/minimal variants
  "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200",
  {
    variants: {
      variant: {
        default: "text-[var(--ordira-accent)] hover:bg-gray-100",
        active: "bg-[var(--primary)] text-white", // Purple background like in image
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
  /** Custom label for results (e.g., "products", "users", "orders") */
  itemLabel?: string;
  /** Loading state */
  loading?: boolean;
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
    itemLabel = "results",
    loading = false,
    ...props
  }, ref) => {
    
    // Calculate pagination range
    const range = (start: number, end: number) => {
      const length = end - start + 1;
      return Array.from({ length }, (_, idx) => start + idx);
    };

    const generatePaginationRange = () => {
      const totalPageNumbersToShow = siblingCount * 2 + 5;
      
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

      return range(1, totalPages);
    };

    const paginationRange = generatePaginationRange();
    
    // Calculate results info
    const startItem = totalItems ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const endItem = totalItems ? Math.min(currentPage * itemsPerPage, totalItems) : 0;

    const handlePageChange = (page: number) => {
      if (page >= 1 && page <= totalPages && page !== currentPage && !loading) {
        onPageChange(page);
      }
    };

    const handlePrevious = () => {
      handlePageChange(currentPage - 1);
    };

    const handleNext = () => {
      handlePageChange(currentPage + 1);
    };

    const formatNumber = (num: number) => num.toLocaleString();

    // Don't render if no pages
    if (totalPages <= 1 && !showResultsInfo) {
      return null;
    }

    // Minimal variant (bottom design in image)
    if (variant === "minimal") {
      return (
        <div ref={ref} className={cn(paginationVariants({ variant, size }), className)} {...props}>
          <button
            onClick={handlePrevious}
            disabled={currentPage === 1 || loading}
            className={cn(
              arrowButtonVariants({
                variant: currentPage === 1 ? "disabled" : "active"
              })
            )}
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>

          {showResultsInfo && totalItems && (
            <span className="text-[var(--ordira-accent)] font-satoshi-medium">
              Showing {formatNumber(endItem)} of {formatNumber(totalItems)} {itemLabel}
            </span>
          )}

          <button
            onClick={handleNext}
            disabled={currentPage === totalPages || loading}
            className={cn(
              arrowButtonVariants({
                variant: currentPage === totalPages ? "disabled" : "active"
              })
            )}
            aria-label="Next page"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      );
    }

    // Simple variant (middle design in image)
    if (variant === "simple") {
      return (
        <div ref={ref} className={cn(paginationVariants({ variant, size }), className)} {...props}>
          <div className="flex items-center space-x-1">
            {/* Previous Arrow */}
            <button
              onClick={handlePrevious}
              disabled={currentPage === 1 || loading}
              className={cn(
                arrowButtonVariants({
                  variant: currentPage === 1 ? "disabled" : "default"
                })
              )}
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>

            {/* Page Numbers */}
            {paginationRange.map((pageNumber, index) => {
              if (pageNumber === '...') {
                return (
                  <span key={`dots-${index}`} className="px-3 py-2 text-[var(--muted)] font-satoshi-regular">
                    …
                  </span>
                );
              }

              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(Number(pageNumber))}
                  disabled={loading}
                  className={cn(
                    pageButtonVariants({
                      variant: Number(pageNumber) === currentPage ? "active" : "default"
                    }),
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                  aria-label={`Go to page ${pageNumber}`}
                  aria-current={Number(pageNumber) === currentPage ? 'page' : undefined}
                >
                  {pageNumber}
                </button>
              );
            })}

            {/* Next Arrow */}
            <button
              onClick={handleNext}
              disabled={currentPage === totalPages || loading}
              className={cn(
                arrowButtonVariants({
                  variant: currentPage === totalPages ? "disabled" : "default"
                })
              )}
              aria-label="Next page"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      );
    }

    // Full variant (top design in image)
    return (
      <div ref={ref} className={cn(paginationVariants({ variant, size }), className)} {...props}>
        {/* Previous Button */}
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1 || loading}
          className={cn(
            navigationButtonVariants({
              variant: currentPage === 1 ? "disabled" : "default"
            }),
            loading && "opacity-50 cursor-not-allowed"
          )}
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          {showLabels && <span>Previous</span>}
        </button>

        {/* Page Numbers */}
        <div className="flex items-center space-x-1">
          {paginationRange.map((pageNumber, index) => {
            if (pageNumber === '...') {
              return (
                <span key={`dots-${index}`} className="px-3 py-2 text-[var(--muted)] font-satoshi-regular">
                  …
                </span>
              );
            }

            return (
              <button
                key={pageNumber}
                onClick={() => handlePageChange(Number(pageNumber))}
                disabled={loading}
                className={cn(
                  pageButtonVariants({
                    variant: Number(pageNumber) === currentPage ? "active" : "default"
                  }),
                  loading && "opacity-50 cursor-not-allowed"
                )}
                aria-label={`Go to page ${pageNumber}`}
                aria-current={Number(pageNumber) === currentPage ? 'page' : undefined}
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
            disabled={currentPage === totalPages || loading}
            className={cn(
              navigationButtonVariants({
                variant: currentPage === totalPages ? "disabled" : "default"
              }),
              loading && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Next page"
          >
            {showLabels && <span>Next</span>}
            <ChevronRightIcon className="w-4 h-4" />
          </button>

          {showResultsInfo && totalItems && (
            <span className="text-[var(--muted)] text-sm whitespace-nowrap font-satoshi-regular">
              Showing {formatNumber(endItem)} of {formatNumber(totalItems)} {itemLabel}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Pagination.displayName = "Pagination";

// Pagination Info Component (standalone)
export interface PaginationInfoProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  itemLabel?: string;
  className?: string;
}

const PaginationInfo = React.forwardRef<HTMLDivElement, PaginationInfoProps>(
  ({ currentPage, totalPages, totalItems, itemsPerPage, itemLabel = "results", className }, ref) => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
      <div ref={ref} className={cn("text-sm text-[var(--muted)] font-satoshi-regular", className)}>
        Showing <span className="font-satoshi-medium text-[var(--ordira-accent)]">{startItem.toLocaleString()}</span> to{' '}
        <span className="font-satoshi-medium text-[var(--ordira-accent)]">{endItem.toLocaleString()}</span> of{' '}
        <span className="font-satoshi-medium text-[var(--ordira-accent)]">{totalItems.toLocaleString()}</span> {itemLabel}
      </div>
    );
  }
);

PaginationInfo.displayName = "PaginationInfo";

// Enhanced Table Pagination Component
export interface TablePaginationProps extends PaginationProps {
  itemName?: string;
  showPageSizeSelector?: boolean;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  /** Show items per page selector on left */
  showItemsPerPage?: boolean;
}

const TablePagination = React.forwardRef<HTMLDivElement, TablePaginationProps>(
  ({
    itemName = "items",
    showPageSizeSelector = false,
    showItemsPerPage = false,
    pageSizeOptions = [10, 25, 50, 100],
    onPageSizeChange,
    itemsPerPage = 10,
    className,
    ...paginationProps
  }, ref) => {
    return (
      <div ref={ref} className={cn("flex items-center justify-between", className)}>
        <div className="flex items-center space-x-4">
          {(showPageSizeSelector || showItemsPerPage) && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-[var(--muted)] font-satoshi-regular">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] font-satoshi-regular bg-white"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-sm text-[var(--muted)] font-satoshi-regular">{itemName} per page</span>
            </div>
          )}
        </div>

        <Pagination {...paginationProps} itemsPerPage={itemsPerPage} />
      </div>
    );
  }
);

TablePagination.displayName = "TablePagination";

// Hook for pagination state management
export interface UsePaginationProps {
  initialPage?: number;
  initialPageSize?: number;
  totalItems: number;
}

export interface UsePaginationReturn {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  canNextPage: boolean;
  canPreviousPage: boolean;
  startItem: number;
  endItem: number;
}

export function usePagination({
  initialPage = 1,
  initialPageSize = 10,
  totalItems,
}: UsePaginationProps): UsePaginationReturn {
  const [currentPage, setCurrentPage] = React.useState(initialPage);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  const totalPages = Math.ceil(totalItems / pageSize);

  const setPage = React.useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const setPageSizeCallback = React.useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when page size changes
  }, []);

  const nextPage = React.useCallback(() => {
    setPage(currentPage + 1);
  }, [currentPage, setPage]);

  const previousPage = React.useCallback(() => {
    setPage(currentPage - 1);
  }, [currentPage, setPage]);

  const canNextPage = currentPage < totalPages;
  const canPreviousPage = currentPage > 1;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Reset to first page if current page is beyond total pages
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  return {
    currentPage,
    pageSize,
    totalPages,
    setPage,
    setPageSize: setPageSizeCallback,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    startItem,
    endItem,
  };
}

export { 
  Pagination, 
  PaginationInfo, 
  TablePagination, 
  paginationVariants,
};
