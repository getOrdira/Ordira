// src/app/(brand)/integrations/page.tsx
'use client';

import { useState } from 'react';
import { BrandLayout } from '@/components/layout/brand-layout';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PlusIcon,
  ShoppingCartIcon,
  BuildingOfficeIcon,
  LinkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  XCircleIcon,
  Cog6ToothIcon,
  EyeIcon,
  TrashIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  InformationCircleIcon,
  ChartBarIcon,
  UserGroupIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleSolidIcon,
  ExclamationTriangleIcon as ExclamationTriangleSolidIcon,
  ClockIcon as ClockSolidIcon,
} from '@heroicons/react/24/solid';

interface Integration {
  id: string;
  name: string;
  type: 'ecommerce' | 'manufacturer';
  platform?: string;
  status: 'connected' | 'pending' | 'error' | 'disconnected';
  lastSync?: string;
  syncFrequency?: string;
  description: string;
  logo: string;
  metrics?: {
    orders?: number;
    revenue?: number;
    products?: number;
    certificates?: number;
  };
  connectedAt?: string;
  webhookUrl?: string;
  apiVersion?: string;
}

interface EcommerceProvider {
  id: string;
  name: string;
  logo: string;
  description: string;
  features: string[];
  planRequired: 'foundation' | 'growth' | 'premium' | 'enterprise';
  isPopular?: boolean;
}

interface ManufacturerConnection {
  id: string;
  name: string;
  industry: string;
  location: string;
  status: 'connected' | 'pending' | 'invited' | 'rejected';
  specialties: string[];
  moq: { min: number; max: number };
  rating: number;
  responseTime: string;
  connectedAt?: string;
  lastOrder?: string;
  totalOrders: number;
  isVerified: boolean;
}

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<'ecommerce' | 'manufacturers'>('ecommerce');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showManufacturerModal, setShowManufacturerModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Mock data - replace with API calls
  const integrations: Integration[] = [
    {
      id: '1',
      name: 'Shopify Store',
      type: 'ecommerce',
      platform: 'shopify',
      status: 'connected',
      lastSync: '2 minutes ago',
      syncFrequency: 'Real-time',
      description: 'Main e-commerce store integration',
      logo: '/logos/shopify.svg',
      metrics: { orders: 156, revenue: 45200, products: 23 },
      connectedAt: '2024-01-15',
      webhookUrl: 'https://api.yourbrand.com/webhooks/shopify',
      apiVersion: '2024-01',
    },
    {
      id: '2',
      name: 'WooCommerce',
      type: 'ecommerce',
      platform: 'woocommerce',
      status: 'error',
      lastSync: '2 hours ago',
      syncFrequency: 'Every 15 minutes',
      description: 'Secondary store with sync issues',
      logo: '/logos/woocommerce.svg',
      metrics: { orders: 89, revenue: 12300, products: 15 },
      connectedAt: '2024-01-20',
    },
  ];

  const ecommerceProviders: EcommerceProvider[] = [
    {
      id: 'shopify',
      name: 'Shopify',
      logo: '/logos/shopify.svg',
      description: 'Connect your Shopify store to sync products, orders, and customer data',
      features: ['Real-time sync', 'Order tracking', 'Product management', 'Customer analytics'],
      planRequired: 'foundation',
      isPopular: true,
    },
    {
      id: 'woocommerce',
      name: 'WooCommerce',
      logo: '/logos/woocommerce.svg',
      description: 'Integrate with your WordPress WooCommerce store',
      features: ['Product sync', 'Order management', 'Customer data', 'Inventory tracking'],
      planRequired: 'foundation',
    },
    {
      id: 'magento',
      name: 'Magento',
      logo: '/logos/magento.svg',
      description: 'Enterprise e-commerce platform integration',
      features: ['Advanced sync', 'Multi-store support', 'B2B features', 'Custom workflows'],
      planRequired: 'growth',
    },
    {
      id: 'bigcommerce',
      name: 'BigCommerce',
      logo: '/logos/bigcommerce.svg',
      description: 'Cloud-based e-commerce platform',
      features: ['API-first sync', 'Multi-channel', 'Analytics', 'Automation'],
      planRequired: 'growth',
    },
    {
      id: 'salesforce',
      name: 'Salesforce Commerce',
      logo: '/logos/salesforce.svg',
      description: 'Enterprise commerce cloud integration',
      features: ['CRM integration', 'Advanced analytics', 'AI insights', 'B2B commerce'],
      planRequired: 'premium',
    },
    {
      id: 'custom',
      name: 'Custom API',
      logo: '/logos/api.svg',
      description: 'Connect any platform using our REST API',
      features: ['Custom endpoints', 'Webhook support', 'Real-time data', 'Full control'],
      planRequired: 'enterprise',
    },
  ];

  const manufacturerConnections: ManufacturerConnection[] = [
    {
      id: '1',
      name: 'EcoManufacturing Co.',
      industry: 'Sustainable Products',
      location: 'Portland, OR',
      status: 'connected',
      specialties: ['Recycled Materials', 'Biodegradable Products', 'Carbon Neutral'],
      moq: { min: 100, max: 10000 },
      rating: 4.8,
      responseTime: '< 2 hours',
      connectedAt: '2024-01-10',
      lastOrder: '3 days ago',
      totalOrders: 12,
      isVerified: true,
    },
    {
      id: '2',
      name: 'TechComponents Ltd.',
      industry: 'Electronics',
      location: 'Shenzhen, China',
      status: 'connected',
      specialties: ['IoT Devices', 'Wearables', 'Smart Home'],
      moq: { min: 500, max: 50000 },
      rating: 4.6,
      responseTime: '< 4 hours',
      connectedAt: '2024-01-05',
      lastOrder: '1 week ago',
      totalOrders: 8,
      isVerified: true,
    },
    {
      id: '3',
      name: 'Sustainable Textiles Inc.',
      industry: 'Fashion & Apparel',
      location: 'Los Angeles, CA',
      status: 'pending',
      specialties: ['Organic Cotton', 'Hemp Products', 'Fair Trade'],
      moq: { min: 200, max: 5000 },
      rating: 4.9,
      responseTime: '< 6 hours',
      totalOrders: 0,
      isVerified: true,
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircleSolidIcon className="w-5 h-5 text-green-500" />;
      case 'pending':
      case 'invited':
        return <ClockSolidIcon className="w-5 h-5 text-yellow-500" />;
      case 'error':
      case 'rejected':
        return <ExclamationTriangleSolidIcon className="w-5 h-5 text-red-500" />;
      default:
        return <XCircleIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'pending':
        return 'Pending';
      case 'invited':
        return 'Invitation Sent';
      case 'error':
        return 'Error';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Disconnected';
    }
  };

  const handleConnectEcommerce = (provider: EcommerceProvider) => {
    console.log('Connecting to:', provider.name);
    setShowConnectModal(false);
    // Implement OAuth flow or API connection
  };

  const handleInviteManufacturer = (manufacturerId: string) => {
    console.log('Inviting manufacturer:', manufacturerId);
    // Implement manufacturer invitation
  };

  const handleDisconnectIntegration = (integrationId: string) => {
    console.log('Disconnecting integration:', integrationId);
    // Implement disconnection logic
  };

  return (
    <BrandLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
            <p className="text-gray-600 mt-1">
              Connect your e-commerce platforms and manufacturer partners
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center"
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
            </Button>
            
            <Button 
              onClick={() => activeTab === 'ecommerce' ? setShowConnectModal(true) : setShowManufacturerModal(true)}
              className="flex items-center bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              {activeTab === 'ecommerce' ? 'Add Integration' : 'Find Manufacturers'}
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-500">
                <ShoppingCartIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-green-600">+12%</span>
            </div>
            <p className="text-sm font-medium text-gray-600">E-commerce Integrations</p>
            <p className="text-2xl font-bold text-gray-900">{integrations.filter(i => i.type === 'ecommerce').length}</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-500">
                <BuildingOfficeIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-green-600">+8%</span>
            </div>
            <p className="text-sm font-medium text-gray-600">Manufacturer Partners</p>
            <p className="text-2xl font-bold text-gray-900">{manufacturerConnections.length}</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-purple-500">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-green-600">+25%</span>
            </div>
            <p className="text-sm font-medium text-gray-600">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900">
              {integrations.reduce((sum, i) => sum + (i.metrics?.orders || 0), 0)}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-orange-500">
                <CreditCardIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-green-600">+18%</span>
            </div>
            <p className="text-sm font-medium text-gray-600">Revenue Synced</p>
            <p className="text-2xl font-bold text-gray-900">
              ${integrations.reduce((sum, i) => sum + (i.metrics?.revenue || 0), 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        {showFilters && (
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search integrations and manufacturers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select className="border border-gray-300 rounded-md px-3 py-2">
                <option>All Status</option>
                <option>Connected</option>
                <option>Pending</option>
                <option>Error</option>
              </select>
              
              <select className="border border-gray-300 rounded-md px-3 py-2">
                <option>All Types</option>
                <option>E-commerce</option>
                <option>Manufacturers</option>
              </select>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-xl border border-gray-200">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <div className="border-b border-gray-200 px-6 pt-6">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="ecommerce" className="flex items-center space-x-2">
                  <ShoppingCartIcon className="w-4 h-4" />
                  <span>E-commerce</span>
                </TabsTrigger>
                <TabsTrigger value="manufacturers" className="flex items-center space-x-2">
                  <BuildingOfficeIcon className="w-4 h-4" />
                  <span>Manufacturers</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* E-commerce Integrations */}
            <TabsContent value="ecommerce" className="p-6">
              <div className="space-y-6">
                {/* Connected Integrations */}
                {integrations.filter(i => i.type === 'ecommerce').length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Connected Platforms</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {integrations
                        .filter(i => i.type === 'ecommerce')
                        .filter(i => !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((integration) => (
                        <div key={integration.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                <ShoppingCartIcon className="w-6 h-6 text-gray-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{integration.name}</h4>
                                <div className="flex items-center space-x-2 mt-1">
                                  {getStatusIcon(integration.status)}
                                  <span className="text-sm text-gray-600">{getStatusText(integration.status)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm" onClick={() => setSelectedIntegration(integration)}>
                                <Cog6ToothIcon className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDisconnectIntegration(integration.id)}>
                                <TrashIcon className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </div>

                          <p className="text-sm text-gray-600 mb-4">{integration.description}</p>

                          {integration.metrics && (
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="text-center">
                                <p className="text-lg font-semibold text-gray-900">{integration.metrics.orders}</p>
                                <p className="text-xs text-gray-600">Orders</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-semibold text-gray-900">${integration.metrics.revenue?.toLocaleString()}</p>
                                <p className="text-xs text-gray-600">Revenue</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-semibold text-gray-900">{integration.metrics.products}</p>
                                <p className="text-xs text-gray-600">Products</p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>Last sync: {integration.lastSync}</span>
                            <span>{integration.syncFrequency}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Integrations */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Platforms</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ecommerceProviders
                      .filter(provider => !searchQuery || provider.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((provider) => (
                      <div key={provider.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              <ShoppingCartIcon className="w-6 h-6 text-gray-600" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                                {provider.isPopular && (
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Popular</span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 capitalize">{provider.planRequired}+ plan</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">{provider.description}</p>

                        <div className="space-y-2 mb-4">
                          {provider.features.slice(0, 3).map((feature, index) => (
                            <div key={index} className="flex items-center text-sm text-gray-600">
                              <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                              {feature}
                            </div>
                          ))}
                          {provider.features.length > 3 && (
                            <p className="text-xs text-gray-500">+{provider.features.length - 3} more features</p>
                          )}
                        </div>

                        <Button 
                          onClick={() => handleConnectEcommerce(provider)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          <LinkIcon className="w-4 h-4 mr-2" />
                          Connect
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Manufacturer Connections */}
            <TabsContent value="manufacturers" className="p-6">
              <div className="space-y-6">
                {/* Connected Manufacturers */}
                {manufacturerConnections.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Connected Manufacturers</h3>
                    <div className="space-y-4">
                      {manufacturerConnections
                        .filter(mfg => !searchQuery || mfg.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((manufacturer) => (
                        <div key={manufacturer.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4 flex-1">
                              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                                <BuildingOfficeIcon className="w-8 h-8 text-gray-600" />
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h4 className="font-semibold text-gray-900">{manufacturer.name}</h4>
                                  {manufacturer.isVerified && (
                                    <CheckCircleIcon className="w-5 h-5 text-blue-500" title="Verified Manufacturer" />
                                  )}
                                  <div className="flex items-center space-x-1">
                                    {getStatusIcon(manufacturer.status)}
                                    <span className="text-sm text-gray-600">{getStatusText(manufacturer.status)}</span>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">Industry</p>
                                    <p className="text-sm text-gray-600">{manufacturer.industry}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">Location</p>
                                    <p className="text-sm text-gray-600">{manufacturer.location}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">MOQ Range</p>
                                    <p className="text-sm text-gray-600">{manufacturer.moq.min.toLocaleString()} - {manufacturer.moq.max.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">Rating</p>
                                    <div className="flex items-center">
                                      <span className="text-sm text-gray-600">{manufacturer.rating}/5</span>
                                      <div className="flex ml-1">
                                        {[...Array(5)].map((_, i) => (
                                          <span key={i} className={`text-xs ${i < Math.floor(manufacturer.rating) ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="mb-4">
                                  <p className="text-sm font-medium text-gray-900 mb-2">Specialties</p>
                                  <div className="flex flex-wrap gap-2">
                                    {manufacturer.specialties.map((specialty, index) => (
                                      <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md">
                                        {specialty}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {manufacturer.status === 'connected' && (
                                  <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <p className="text-gray-600">Total Orders</p>
                                      <p className="font-semibold">{manufacturer.totalOrders}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-600">Last Order</p>
                                      <p className="font-semibold">{manufacturer.lastOrder || 'None'}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-600">Response Time</p>
                                      <p className="font-semibold">{manufacturer.responseTime}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 ml-4">
                              <Button variant="outline" size="sm">
                                <EyeIcon className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Cog6ToothIcon className="w-4 h-4" />
                              </Button>
                              {manufacturer.status === 'connected' && (
                                <Button variant="outline" size="sm" className="text-red-600">
                                  <TrashIcon className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Find More Manufacturers */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="text-center">
                    <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Find More Manufacturers</h3>
                    <p className="text-gray-600 mb-4">
                      Discover verified manufacturers that match your product requirements and quality standards.
                    </p>
                    <Button onClick={() => setShowManufacturerModal(true)}>
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Browse Manufacturers
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Connect E-commerce Modal */}
        <Modal
          open={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          title="Connect E-commerce Platform"
          size="large"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ecommerceProviders.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleConnectEcommerce(provider)}
                  className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <ShoppingCartIcon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{provider.name}</h4>
                      <p className="text-sm text-gray-500 capitalize">{provider.planRequired}+ plan required</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{provider.description}</p>
                  <div className="space-y-1">
                    {provider.features.slice(0, 2).map((feature, index) => (
                      <div key={index} className="flex items-center text-sm text-gray-600">
                        <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Integration Requirements</h4>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• Store admin access for API connection</li>
                    <li>• SSL certificate for secure data transfer</li>
                    <li>• Webhook endpoints for real-time sync</li>
                    <li>• Compatible plan subscription</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* Find Manufacturers Modal */}
        <Modal
          open={showManufacturerModal}
          onClose={() => setShowManufacturerModal(false)}
          title="Find Manufacturers"
          size="large"
        >
          <div className="space-y-6">
            {/* Search Filters */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                    <option>All Industries</option>
                    <option>Sustainable Products</option>
                    <option>Electronics</option>
                    <option>Fashion & Apparel</option>
                    <option>Home & Garden</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                    <option>Any Location</option>
                    <option>North America</option>
                    <option>Europe</option>
                    <option>Asia</option>
                    <option>South America</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MOQ Range</label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                    <option>Any MOQ</option>
                    <option>1 - 100</option>
                    <option>100 - 1,000</option>
                    <option>1,000 - 10,000</option>
                    <option>10,000+</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Manufacturer Results */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Sample manufacturers for discovery */}
              {[
                {
                  id: 'new-1',
                  name: 'GreenTech Manufacturing',
                  industry: 'Sustainable Technology',
                  location: 'Austin, TX',
                  rating: 4.7,
                  moq: '500 - 25,000',
                  specialties: ['Solar Components', 'Recycled Plastics', 'Energy Efficient'],
                  responseTime: '< 3 hours',
                  isVerified: true,
                  description: 'Leading manufacturer of sustainable technology products with 15+ years experience.'
                },
                {
                  id: 'new-2',
                  name: 'Fashion Forward Co.',
                  industry: 'Sustainable Fashion',
                  location: 'Portland, OR',
                  rating: 4.9,
                  moq: '200 - 5,000',
                  specialties: ['Organic Materials', 'Fair Trade', 'Zero Waste'],
                  responseTime: '< 1 hour',
                  isVerified: true,
                  description: 'Ethical fashion manufacturer committed to sustainability and fair labor practices.'
                },
                {
                  id: 'new-3',
                  name: 'Smart Home Solutions',
                  industry: 'Electronics',
                  location: 'San Jose, CA',
                  rating: 4.5,
                  moq: '1,000 - 50,000',
                  specialties: ['IoT Devices', 'Smart Sensors', 'Connected Products'],
                  responseTime: '< 4 hours',
                  isVerified: false,
                  description: 'Innovative manufacturer specializing in smart home and IoT device production.'
                },
              ].map((manufacturer) => (
                <div key={manufacturer.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{manufacturer.name}</h4>
                        {manufacturer.isVerified && (
                          <CheckCircleIcon className="w-5 h-5 text-blue-500" title="Verified Manufacturer" />
                        )}
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600">{manufacturer.rating}/5</span>
                          <div className="flex ml-1">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={`text-xs ${i < Math.floor(manufacturer.rating) ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{manufacturer.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs font-medium text-gray-900">Industry</p>
                          <p className="text-xs text-gray-600">{manufacturer.industry}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-900">Location</p>
                          <p className="text-xs text-gray-600">{manufacturer.location}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-900">MOQ Range</p>
                          <p className="text-xs text-gray-600">{manufacturer.moq}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-900">Response Time</p>
                          <p className="text-xs text-gray-600">{manufacturer.responseTime}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {manufacturer.specialties.map((specialty, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => handleInviteManufacturer(manufacturer.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Send Invite
                      </Button>
                      <Button variant="outline" size="sm">
                        View Profile
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <InformationCircleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900">Manufacturer Verification</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    All manufacturers go through our verification process including business registration, 
                    quality certifications, and reference checks before being approved.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* Integration Settings Modal */}
        <Modal
          open={!!selectedIntegration}
          onClose={() => setSelectedIntegration(null)}
          title="Integration Settings"
          size="large"
        >
          {selectedIntegration && (
            <div className="space-y-6">
              {/* Integration Overview */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <ShoppingCartIcon className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{selectedIntegration.name}</h4>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedIntegration.status)}
                    <span className="text-sm text-gray-600">{getStatusText(selectedIntegration.status)}</span>
                  </div>
                </div>
              </div>

              {/* Settings Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex space-x-8">
                  <button className="py-2 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm">
                    Configuration
                  </button>
                  <button className="py-2 px-1 text-gray-500 hover:text-gray-700 font-medium text-sm">
                    Sync Settings
                  </button>
                  <button className="py-2 px-1 text-gray-500 hover:text-gray-700 font-medium text-sm">
                    Webhooks
                  </button>
                </div>
              </div>

              {/* Configuration Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store URL
                  </label>
                  <input
                    type="url"
                    value="https://your-store.shopify.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Version
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>{selectedIntegration.apiVersion}</option>
                    <option>2024-01 (Latest)</option>
                    <option>2023-10</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sync Frequency
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>Real-time (Webhooks)</option>
                    <option>Every 5 minutes</option>
                    <option>Every 15 minutes</option>
                    <option>Every hour</option>
                    <option>Daily</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data to Sync
                  </label>
                  <div className="space-y-2">
                    {[
                      { key: 'products', label: 'Products & Inventory' },
                      { key: 'orders', label: 'Orders & Fulfillment' },
                      { key: 'customers', label: 'Customer Data' },
                      { key: 'analytics', label: 'Sales Analytics' },
                    ].map((option) => (
                      <label key={option.key} className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-2" />
                        <span className="text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => console.log('Testing connection...')}
                  >
                    <ArrowPathIcon className="w-4 h-4 mr-2" />
                    Test Connection
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => console.log('Syncing now...')}
                  >
                    <ArrowPathIcon className="w-4 h-4 mr-2" />
                    Sync Now
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedIntegration(null)}
                  >
                    Cancel
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </BrandLayout>
  );
}