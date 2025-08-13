// src/app/(brand)/products/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BrandLayout } from '@/components/layout/brand-layout';
import { ProductGrid } from '@/components/features/products/product-grid';
import { ProductForm } from '@/components/features/products/product-form';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PlusIcon,
  ShoppingBagIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Squares2X2Icon,
  ListBulletIcon,
  TagIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { 
  ShoppingBagIcon as ShoppingBagSolidIcon,
  EyeIcon as EyeSolidIcon,
} from '@heroicons/react/24/solid';
import { useProducts } from '@/lib/hooks/use-api';
import { formatNumber } from '@/lib/utils/format';

type ProductStatus = 'all' | 'active' | 'draft' | 'archived';
type ViewMode = 'grid' | 'list';

interface ProductStatsCard {
  title: string;
  value: number;
  change: number;
  icon: React.ComponentType<any>;
  solidIcon: React.ComponentType<any>;
  color: string;
  description: string;
}

export default function ProductsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ProductStatus>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'price' | 'category'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // API hooks
  const { data: productsResponse, isLoading: productsLoading } = useProducts();

  const products = productsResponse?.data || [];

  // Calculate stats
  const stats = {
    total: products.length,
    active: products.filter(p => p.status === 'active').length,
    draft: products.filter(p => p.status === 'draft').length,
    archived: products.filter(p => p.status === 'archived').length,
  };

  // Stats cards configuration
  const statsCards: ProductStatsCard[] = [
    {
      title: 'Total Products',
      value: stats.total,
      change: 12.5,
      icon: ShoppingBagIcon,
      solidIcon: ShoppingBagSolidIcon,
      color: 'bg-blue-500',
      description: 'All products in catalog',
    },
    {
      title: 'Active Products',
      value: stats.active,
      change: 8.3,
      icon: EyeIcon,
      solidIcon: EyeSolidIcon,
      color: 'bg-green-500',
      description: 'Publicly visible products',
    },
    {
      title: 'Draft Products',
      value: stats.draft,
      change: -2.1,
      icon: PencilIcon,
      solidIcon: PencilIcon,
      color: 'bg-yellow-500',
      description: 'Products in development',
    },
    {
      title: 'Total Views',
      value: products.reduce((sum, p) => sum + (p.views || 0), 0),
      change: 15.7,
      icon: ChartBarIcon,
      solidIcon: ChartBarIcon,
      color: 'bg-purple-500',
      description: 'Customer engagement',
    },
  ];

  // Tab configuration
  const tabs = [
    {
      value: 'all' as ProductStatus,
      label: 'All Products',
      count: stats.total,
    },
    {
      value: 'active' as ProductStatus,
      label: 'Active',
      count: stats.active,
    },
    {
      value: 'draft' as ProductStatus,
      label: 'Draft',
      count: stats.draft,
    },
    {
      value: 'archived' as ProductStatus,
      label: 'Archived',
      count: stats.archived,
    },
  ];

  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      const matchesStatus = activeTab === 'all' || product.status === activeTab;
      const matchesSearch = !searchQuery || 
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'created':
          comparison = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          break;
        case 'price':
          comparison = (a.price || 0) - (b.price || 0);
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleBulkAction = (action: 'activate' | 'deactivate' | 'archive' | 'delete') => {
    if (selectedProducts.length === 0) {
      alert('Please select products to perform bulk action');
      return;
    }
    
    // Implement bulk action logic
    console.log(`Bulk ${action} for products:`, selectedProducts);
    setSelectedProducts([]);
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <BrandLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-600 mt-1">
              Manage your product catalog and customer engagement
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                }`}
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                }`}
              >
                <ListBulletIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Bulk Actions */}
            {selectedProducts.length > 0 && (
              <div className="flex items-center space-x-2">
                <select 
                  onChange={(e) => handleBulkAction(e.target.value as any)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Bulk Actions ({selectedProducts.length})</option>
                  <option value="activate">Activate</option>
                  <option value="deactivate">Deactivate</option>
                  <option value="archive">Archive</option>
                  <option value="delete">Delete</option>
                </select>
              </div>
            )}
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center"
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
            </Button>
            
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((card, index) => {
            const IconComponent = card.icon;
            const SolidIconComponent = card.solidIcon;
            
            return (
              <div key={index} className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${card.color}`}>
                    <SolidIconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className={`flex items-center text-sm font-medium ${
                    card.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {card.change >= 0 ? <ArrowUpIcon className="w-4 h-4 mr-1" /> : <ArrowDownIcon className="w-4 h-4 mr-1" />}
                    {Math.abs(card.change)}%
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(card.value)}
                  </p>
                  <p className="text-xs text-gray-500">{card.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors group"
            >
              <PlusIcon className="w-8 h-8 text-gray-400 group-hover:text-blue-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Add New Product</p>
                <p className="text-sm text-gray-600">Expand your catalog</p>
              </div>
            </button>
            
            <Link href="/products/categories" className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors group">
              <TagIcon className="w-8 h-8 text-gray-400 group-hover:text-green-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Manage Categories</p>
                <p className="text-sm text-gray-600">Organize products</p>
              </div>
            </Link>
            
            <Link href="/analytics/products" className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors group">
              <ChartBarIcon className="w-8 h-8 text-gray-400 group-hover:text-purple-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">View Analytics</p>
                <p className="text-sm text-gray-600">Product insights</p>
              </div>
            </Link>
            
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors group">
              <EyeIcon className="w-8 h-8 text-gray-400 group-hover:text-orange-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Preview Store</p>
                <p className="text-sm text-gray-600">Customer view</p>
              </div>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products by name, category, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Sort Controls */}
              <div className="flex items-center space-x-2">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="created">Date Created</option>
                  <option value="name">Name</option>
                  <option value="category">Category</option>
                  <option value="price">Price</option>
                </select>
                
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {sortOrder === 'asc' ? 
                    <ArrowUpIcon className="w-5 h-5" /> : 
                    <ArrowDownIcon className="w-5 h-5" />
                  }
                </button>
              </div>
            </div>
            
            {/* Filter Panel */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                      <option>All Categories</option>
                      <option>Sustainable</option>
                      <option>Electronics</option>
                      <option>Fashion</option>
                      <option>Home & Garden</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price Range
                    </label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                      <option>Any Price</option>
                      <option>$0 - $50</option>
                      <option>$50 - $100</option>
                      <option>$100 - $500</option>
                      <option>$500+</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Availability
                    </label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                      <option>All Products</option>
                      <option>In Stock</option>
                      <option>Out of Stock</option>
                      <option>Pre-order</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Created Date
                    </label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                      <option>Any Time</option>
                      <option>Last 7 days</option>
                      <option>Last 30 days</option>
                      <option>Last 3 months</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="px-4 pt-4">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProductStatus)}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                {tabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.value}
                    value={tab.value}
                    className="flex items-center space-x-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                  >
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                    {tab.count > 0 && (
                      <span className="ml-1 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                        {tab.count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Product Content */}
              <div className="pb-6">
                {tabs.map((tab) => (
                  <TabsContent key={tab.value} value={tab.value} className="mt-0">
                    {productsLoading ? (
                      <div className={viewMode === 'grid' ? 
                        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : 
                        "space-y-4"
                      }>
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className={viewMode === 'grid' ? 
                              "bg-gray-200 h-64 rounded-lg" : 
                              "bg-gray-200 h-20 rounded-lg"
                            }></div>
                          </div>
                        ))}
                      </div>
                    ) : filteredProducts.length > 0 ? (
                      <ProductGrid
                        products={filteredProducts}
                        viewMode={viewMode}
                        selectedProducts={selectedProducts}
                        onSelectProduct={(productId, selected) => {
                          if (selected) {
                            setSelectedProducts([...selectedProducts, productId]);
                          } else {
                            setSelectedProducts(selectedProducts.filter(id => id !== productId));
                          }
                        }}
                        onEditProduct={(product) => setEditingProduct(product)}
                      />
                    ) : (
                      <div className="text-center py-12">
                        <ShoppingBagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No products found
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {searchQuery ? 'Try adjusting your search criteria' : 'Get started by adding your first product'}
                        </p>
                        {!searchQuery && (
                          <Button onClick={() => setShowCreateModal(true)}>
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Add Product
                          </Button>
                        )}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>
        </div>

        {/* Create Product Modal */}
        <Modal 
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Add New Product"
          size="large"
        >
          <ProductForm 
            onSuccess={() => {
              setShowCreateModal(false);
              // Refresh products list
            }}
            onCancel={() => setShowCreateModal(false)}
          />
        </Modal>

        {/* Edit Product Modal */}
        <Modal 
          open={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          title="Edit Product"
          size="large"
        >
          {editingProduct && (
            <ProductForm 
              product={editingProduct}
              onSuccess={() => {
                setEditingProduct(null);
                // Refresh products list
              }}
              onCancel={() => setEditingProduct(null)}
            />
          )}
        </Modal>
      </div>
    </BrandLayout>
  );
}