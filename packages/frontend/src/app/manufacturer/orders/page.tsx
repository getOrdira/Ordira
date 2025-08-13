// src/app/manufacturer/orders/page.tsx
'use client';

import { useState } from 'react';
import { ManufacturerLayout } from '@/components/layout/manufacturer-layout';
import { useManufacturerOrders } from '@/lib/hooks/use-manufacturer-api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  DocumentTextIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { formatNumber, formatDate, formatCurrency } from '@/lib/utils/format';

interface Order {
  id: string;
  orderNumber: string;
  brand: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  product: {
    name: string;
    category: string;
    specifications?: string;
  };
  quantity: number;
  unitPrice: number;
  totalValue: number;
  status: 'pending' | 'confirmed' | 'in_production' | 'completed' | 'cancelled' | 'quote_requested';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  deadline: string;
  estimatedDelivery?: string;
  notes?: string;
  attachments?: string[];
}

type OrderStatus = 'all' | 'pending' | 'confirmed' | 'in_production' | 'completed' | 'cancelled' | 'quote_requested';
type SortType = 'deadline' | 'created' | 'value' | 'status';

export default function ManufacturerOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<OrderStatus>('all');
  const [sortBy, setSortBy] = useState<SortType>('deadline');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  
  const { data: ordersResponse, isLoading } = useManufacturerOrders();

  // Mock data - replace with actual API data
  const mockOrders: Order[] = [
    {
      id: '1',
      orderNumber: 'ORD-2024-001',
      brand: {
        id: 'brand_001',
        name: 'EcoTech Solutions',
        logoUrl: '/images/brands/ecotech.png',
      },
      product: {
        name: 'Sustainable Packaging Boxes',
        category: 'Packaging',
        specifications: '100% recycled cardboard, custom printing',
      },
      quantity: 5000,
      unitPrice: 2.50,
      totalValue: 12500,
      status: 'in_production',
      priority: 'high',
      createdAt: '2025-08-01',
      deadline: '2025-08-20',
      estimatedDelivery: '2025-08-18',
      notes: 'Rush order for product launch',
    },
    {
      id: '2',
      orderNumber: 'ORD-2024-002',
      brand: {
        id: 'brand_002',
        name: 'GreenLife Brand',
      },
      product: {
        name: 'Recycled Water Bottles',
        category: 'Bottles',
        specifications: 'BPA-free, 500ml capacity',
      },
      quantity: 10000,
      unitPrice: 1.80,
      totalValue: 18000,
      status: 'quote_requested',
      priority: 'medium',
      createdAt: '2025-08-05',
      deadline: '2025-08-25',
      notes: 'Requires MOQ confirmation',
    },
    {
      id: '3',
      orderNumber: 'ORD-2024-003',
      brand: {
        id: 'brand_003',
        name: 'Natural Goods Co',
      },
      product: {
        name: 'Biodegradable Food Containers',
        category: 'Containers',
        specifications: 'Compostable material, leak-proof design',
      },
      quantity: 3000,
      unitPrice: 3.25,
      totalValue: 9750,
      status: 'completed',
      priority: 'low',
      createdAt: '2025-07-15',
      deadline: '2025-08-10',
      estimatedDelivery: '2025-08-08',
    },
    {
      id: '4',
      orderNumber: 'ORD-2024-004',
      brand: {
        id: 'brand_004',
        name: 'Pure Elements',
        logoUrl: '/images/brands/pure.png',
      },
      product: {
        name: 'Glass Cosmetic Jars',
        category: 'Cosmetics',
        specifications: '50ml capacity, premium finish',
      },
      quantity: 2000,
      unitPrice: 4.50,
      totalValue: 9000,
      status: 'pending',
      priority: 'urgent',
      createdAt: '2025-08-10',
      deadline: '2025-08-22',
      notes: 'Expedited processing required',
    },
  ];

  const orders = ordersResponse?.data?.orders || mockOrders;

  const filteredOrders = orders
    .filter((order) => {
      const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'all' || order.status === activeTab;
      return matchesSearch && matchesTab;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'value':
          return b.totalValue - a.totalValue;
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_production':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-purple-100 text-purple-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'quote_requested':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'in_production':
        return <ClockIcon className="w-5 h-5 text-blue-600" />;
      case 'pending':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
      default:
        return <DocumentTextIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    inProduction: orders.filter(o => o.status === 'in_production').length,
    completed: orders.filter(o => o.status === 'completed').length,
    totalValue: orders.reduce((sum, o) => sum + o.totalValue, 0),
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    setSelectedOrders(
      selectedOrders.length === filteredOrders.length 
        ? [] 
        : filteredOrders.map(order => order.id)
    );
  };

  if (isLoading) {
    return (
      <ManufacturerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ManufacturerLayout>
    );
  }

  return (
    <ManufacturerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
            <p className="text-gray-600">Track and manage all your manufacturing orders</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Export
            </button>
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <PlusIcon className="w-4 h-4 mr-2" />
              New Order
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <DocumentTextIcon className="w-8 h-8 text-gray-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <ClockIcon className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Production</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inProduction}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-bold text-lg">$</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="deadline">Sort by Deadline</option>
                <option value="created">Sort by Created</option>
                <option value="value">Sort by Value</option>
                <option value="status">Sort by Status</option>
              </select>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FunnelIcon className="w-4 h-4 mr-2" />
                Filters
              </button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as OrderStatus)}>
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="quote_requested">Quotes ({orders.filter(o => o.status === 'quote_requested').length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmed ({orders.filter(o => o.status === 'confirmed').length})</TabsTrigger>
              <TabsTrigger value="in_production">Production ({stats.inProduction})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled ({orders.filter(o => o.status === 'cancelled').length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Orders</h2>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Select All</span>
                </label>
                {selectedOrders.length > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedOrders.length} selected
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-4 px-6 py-3"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deadline
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => handleSelectOrder(order.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(order.status)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                          <div className="text-sm text-gray-500">
                            Created {formatDate(order.createdAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                          {order.brand.logoUrl ? (
                            <img src={order.brand.logoUrl} alt={order.brand.name} className="w-6 h-6 rounded" />
                          ) : (
                            <span className="text-xs font-medium text-gray-600">
                              {order.brand.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{order.brand.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{order.product.name}</div>
                        <div className="text-sm text-gray-500">{order.product.category}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(order.quantity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(order.totalValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(order.priority)}`}>
                          {order.priority}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(order.deadline)}</div>
                      {order.estimatedDelivery && (
                        <div className="text-sm text-gray-500">
                          Est: {formatDate(order.estimatedDelivery)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          <DocumentTextIcon className="w-4 h-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          <ChevronRightIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria.' : 'You don\'t have any orders yet.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </ManufacturerLayout>
  );
}