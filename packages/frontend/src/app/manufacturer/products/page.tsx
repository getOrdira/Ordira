// src/app/manufacturer/products/page.tsx
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts, type Product } from '@/lib/api/products';
import { useAuth } from '@/providers/auth-provider';

// UI Components
import { Container } from '@/components/ui/layout/container';
import { PageHeader } from '@/components/ui/layout/page-header';
import { Button } from '@/components/ui/primitives/button';
import { Card } from '@/components/ui/layout/card';
import { Badge } from '@/components/ui/data-display/badge';
import { EmptyState } from '@/components/ui/data-display/empty-state';
import { LoadingSpinner } from '@/components/ui/feedback/loading-spinner';
import { Pagination } from '@/components/ui/navigation/pagination';
import { TextField } from '@/components/forms/inputs/text-field';
import { SelectField } from '@/components/forms/inputs/select-field';

// Icons
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';

/**
 * Manufacturer Products Page
 * 
 * This page displays all products for the authenticated manufacturer
 * with filtering, searching, and pagination capabilities.
 */

interface ProductsPageState {
  search: string;
  status: Product['status'] | 'all';
  category: string;
  page: number;
  limit: number;
}

export default function ManufacturerProductsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ProductsPageState>({
    search: '',
    status: 'all',
    category: '',
    page: 1,
    limit: 12,
  });

  // Fetch products with React Query
  const {
    data: productsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['manufacturer-products', user?.id, filters],
    queryFn: () => getProducts({
      manufacturer: user?.id,
      search: filters.search || undefined,
      status: filters.status === 'all' ? undefined : filters.status,
      category: filters.category || undefined,
      page: filters.page,
      limit: filters.limit,
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    }),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle filter changes
  const updateFilters = (updates: Partial<ProductsPageState>) => {
    setFilters(prev => ({
      ...prev,
      ...updates,
      page: updates.page ?? 1, // Reset to first page when filters change
    }));
  };

  // Handle search
  const handleSearch = (search: string) => {
    updateFilters({ search });
  };

  // Status options for filter
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'archived', label: 'Archived' },
  ];

  const products = productsData?.data?.products || [];
  const pagination = productsData?.data?.pagination;

  if (error) {
    return (
      <Container>
        <EmptyState
          icon="error"
          title="Failed to Load Products"
          description="There was an error loading your products. Please try again."
          action={
            <Button onClick={() => refetch()} variant="primary">
              Try Again
            </Button>
          }
        />
      </Container>
    );
  }

  return (
    <Container size="full" className="py-6">
      {/* Page Header */}
      <PageHeader
        title="My Products"
        description="Manage your manufacturing products and track their performance"
        action={
          <Button variant="primary" size="md">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        }
      />

      {/* Filters Section */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <TextField
              placeholder="Search products..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              leftIcon={MagnifyingGlassIcon}
            />

            {/* Status Filter */}
            <SelectField
              options={statusOptions}
              value={filters.status}
              onChange={(value) => updateFilters({ status: value as Product['status'] | 'all' })}
              placeholder="Filter by status"
            />

            {/* Category Filter */}
            <TextField
              placeholder="Category"
              value={filters.category}
              onChange={(e) => updateFilters({ category: e.target.value })}
            />

            {/* Filter Button */}
            <Button variant="outline" size="md">
              <AdjustmentsHorizontalIcon className="w-4 h-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Loading products..." />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon="empty"
          title="No Products Found"
          description={
            filters.search || filters.status !== 'all' || filters.category
              ? "No products match your current filters. Try adjusting your search criteria."
              : "You haven't created any products yet. Start by adding your first manufacturing product."
          }
          action={
            <Button variant="primary">
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Your First Product
            </Button>
          }
        />
      ) : (
        <>
          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
            {products.map((product) => (
              <Card key={product._id} className="group hover:shadow-lg transition-all duration-200">
                <div className="p-6">
                  {/* Product Image */}
                  <div className="aspect-square bg-[var(--background-secondary)] rounded-lg mb-4 flex items-center justify-center">
                    {product.media?.images?.[0] ? (
                      <img
                        src={product.media.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <DocumentIcon className="w-12 h-12 text-[var(--muted)]" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-satoshi-semibold text-[var(--heading-color)] group-hover:text-[var(--primary)] transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-sm text-[var(--muted)] line-clamp-2">
                        {product.description}
                      </p>
                    </div>

                    {/* Status and Category */}
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={product.status === 'active' ? 'success' : 
                                product.status === 'draft' ? 'warning' : 'default'}
                        size="sm"
                      >
                        {product.status}
                      </Badge>
                      {product.category && (
                        <Badge variant="outline" size="sm">
                          {product.category}
                        </Badge>
                      )}
                    </div>

                    {/* Pricing */}
                    {product.pricing && (
                      <div className="text-sm text-[var(--body-color)]">
                        {product.pricing.basePrice && (
                          <span className="font-satoshi-medium">
                            ${product.pricing.basePrice.toLocaleString()}
                          </span>
                        )}
                        {product.pricing.minimumOrderQuantity && (
                          <span className="text-[var(--muted)] ml-2">
                            MOQ: {product.pricing.minimumOrderQuantity}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={filters.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => updateFilters({ page })}
              showInfo
              totalItems={pagination.total}
              itemsPerPage={filters.limit}
            />
          )}
        </>
      )}
    </Container>
  );
}

/**
 * Page Features:
 * 
 * 1. Data Fetching: React Query for server state management
 * 2. Filtering: Search, status, and category filters
 * 3. Pagination: Efficient data loading with pagination
 * 4. Loading States: Proper loading indicators
 * 5. Error Handling: User-friendly error messages
 * 6. Empty States: Helpful empty state with actions
 * 7. Responsive Design: Works on all device sizes
 * 8. Performance: Optimized queries and rendering
 * 9. Accessibility: Keyboard navigation and screen readers
 * 10. Type Safety: Full TypeScript integration
 */
