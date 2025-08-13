// src/app/manufacturer/brands/page.tsx
'use client';

import { useState } from 'react';
import { ManufacturerLayout } from '@/components/layout/manufacturer-layout';
import { useManufacturerBrands } from '@/lib/hooks/use-manufacturer-api';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  ChatBubbleBottomCenterTextIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  CheckBadgeIcon,
  PlusIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  ClockIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import { formatNumber, formatDate } from '@/lib/utils/format';

interface Brand {
  id: string;
  businessId: string;
  businessName: string;
  logoUrl?: string;
  connectionDate: string;
  industry?: string;
  verified?: boolean;
  totalOrders?: number;
  monthlyRevenue?: number;
  lastInteraction?: string;
  status: 'active' | 'pending' | 'inactive';
  productProposals?: {
    activeProposals: number;
    totalProposals: number;
    totalVotes: number;
    recentProposals: Array<{
      id: string;
      productName: string;
      description: string;
      category: string;
      imageUrl?: string;
      voteCount: number;
      topPreferences: {
        sizing: Array<{ option: string; votes: number; percentage: number }>;
        fit: Array<{ option: string; votes: number; percentage: number }>;
        colors?: Array<{ option: string; votes: number; percentage: number }>;
        materials?: Array<{ option: string; votes: number; percentage: number }>;
      };
      status: 'active' | 'ended' | 'in_production';
      endDate: string;
      createdAt: string;
      trending?: boolean;
    }>;
    manufacturingInsights: {
      popularSizes: Array<{ size: string; demandPercentage: number }>;
      preferredFit: Array<{ fit: string; votes: number }>;
      productionRecommendations: string[];
      estimatedDemand: number;
      seasonalTrends?: Array<{ period: string; demand: number }>;
    };
    monthlyActivity: {
      proposalsCreated: number;
      votesReceived: number;
      customerEngagement: number;
      productionApprovals: number;
    };
  };
}

type FilterType = 'all' | 'active' | 'pending' | 'inactive';
type SortType = 'name' | 'revenue' | 'orders' | 'recent';

export default function ManufacturerBrandsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('recent');
  const [showFilters, setShowFilters] = useState(false);
  
  const { data: brandsResponse, isLoading } = useManufacturerBrands();

  // Mock data - replace with actual API data
  const mockBrands: Brand[] = [
    {
      id: '1',
      businessId: 'brand_001',
      businessName: 'EcoTech Solutions',
      logoUrl: '/images/brands/ecotech.png',
      connectionDate: '2025-06-15',
      industry: 'Sustainable Technology',
      verified: true,
      totalOrders: 45,
      monthlyRevenue: 125000,
      lastInteraction: '2025-08-12',
      status: 'active',
      productProposals: {
        activeProposals: 3,
        totalProposals: 24,
        totalVotes: 1847,
        recentProposals: [
          {
            id: 'proposal_001',
            productName: 'Eco Bottle v2.0',
            description: 'Sustainable water bottle with bamboo cap',
            category: 'Drinkware',
            imageUrl: '/images/products/eco-bottle.jpg',
            voteCount: 478,
            topPreferences: {
              sizing: [
                { option: '500ml', votes: 234, percentage: 49 },
                { option: '750ml', votes: 156, percentage: 33 },
                { option: '1L', votes: 88, percentage: 18 },
              ],
              fit: [
                { option: 'Standard Grip', votes: 298, percentage: 62 },
                { option: 'Slim Profile', votes: 123, percentage: 26 },
                { option: 'Wide Mouth', votes: 57, percentage: 12 },
              ],
              colors: [
                { option: 'Ocean Blue', votes: 189, percentage: 40 },
                { option: 'Forest Green', votes: 145, percentage: 30 },
                { option: 'Charcoal Gray', votes: 144, percentage: 30 },
              ],
              materials: [
                { option: '100% Recycled Plastic', votes: 312, percentage: 65 },
                { option: 'Bamboo Fiber Blend', votes: 166, percentage: 35 },
              ],
            },
            status: 'active',
            endDate: '2025-08-20',
            createdAt: '2025-08-01',
            trending: true,
          },
          {
            id: 'proposal_002',
            productName: 'Solar Power Bank',
            description: 'Portable solar charger with wireless charging',
            category: 'Electronics',
            voteCount: 234,
            topPreferences: {
              sizing: [
                { option: '10,000mAh', votes: 134, percentage: 57 },
                { option: '20,000mAh', votes: 67, percentage: 29 },
                { option: '5,000mAh', votes: 33, percentage: 14 },
              ],
              fit: [
                { option: 'Pocket Size', votes: 156, percentage: 67 },
                { option: 'Backpack Compatible', votes: 78, percentage: 33 },
              ],
            },
            status: 'active',
            endDate: '2025-08-18',
            createdAt: '2025-08-03',
          },
        ],
        manufacturingInsights: {
          popularSizes: [
            { size: '500ml', demandPercentage: 45 },
            { size: '10,000mAh', demandPercentage: 28 },
            { size: 'Medium', demandPercentage: 27 },
          ],
          preferredFit: [
            { fit: 'Standard/Universal', votes: 567 },
            { fit: 'Compact/Portable', votes: 334 },
            { fit: 'Large/Professional', votes: 123 },
          ],
          productionRecommendations: [
            'Focus on 500ml bottles with standard grip',
            'Prepare tooling for Ocean Blue color variant',
            'Consider 10,000mAh as primary power bank capacity',
          ],
          estimatedDemand: 2400,
          seasonalTrends: [
            { period: 'Q3 2025', demand: 2400 },
            { period: 'Q4 2025', demand: 3200 },
            { period: 'Q1 2026', demand: 1800 },
          ],
        },
        monthlyActivity: {
          proposalsCreated: 8,
          votesReceived: 1247,
          customerEngagement: 87,
          productionApprovals: 3,
        },
      },
    },
    {
      id: '2',
      businessId: 'brand_002',
      businessName: 'GreenLife Brand',
      logoUrl: '/images/brands/greenlife.png',
      connectionDate: '2025-07-01',
      industry: 'Organic Products',
      verified: true,
      totalOrders: 32,
      monthlyRevenue: 89000,
      lastInteraction: '2025-08-10',
      status: 'active',
      productProposals: {
        activeProposals: 2,
        totalProposals: 15,
        totalVotes: 892,
        recentProposals: [
          {
            id: 'proposal_003',
            productName: 'Organic Soap Bar Collection',
            description: 'Natural soap bars with essential oils',
            category: 'Personal Care',
            voteCount: 298,
            topPreferences: {
              sizing: [
                { option: '100g Standard', votes: 178, percentage: 60 },
                { option: '150g Large', votes: 89, percentage: 30 },
                { option: '50g Travel', votes: 31, percentage: 10 },
              ],
              fit: [
                { option: 'Rectangular Bar', votes: 201, percentage: 67 },
                { option: 'Round Bar', votes: 97, percentage: 33 },
              ],
              colors: [
                { option: 'Lavender Purple', votes: 134, percentage: 45 },
                { option: 'Natural Beige', votes: 89, percentage: 30 },
                { option: 'Mint Green', votes: 75, percentage: 25 },
              ],
            },
            status: 'active',
            endDate: '2025-08-22',
            createdAt: '2025-08-05',
          },
        ],
        manufacturingInsights: {
          popularSizes: [
            { size: '100g Standard', demandPercentage: 58 },
            { size: '150g Large', demandPercentage: 32 },
            { size: '50g Travel', demandPercentage: 10 },
          ],
          preferredFit: [
            { fit: 'Rectangular/Traditional', votes: 401 },
            { fit: 'Round/Artisan', votes: 234 },
          ],
          productionRecommendations: [
            'Prioritize 100g rectangular bars for main production',
            'Lavender scent shows highest demand',
            'Consider limited edition large size for premium line',
          ],
          estimatedDemand: 1200,
        },
        monthlyActivity: {
          proposalsCreated: 5,
          votesReceived: 634,
          customerEngagement: 72,
          productionApprovals: 2,
        },
      },
    },
    {
      id: '3',
      businessId: 'brand_003',
      businessName: 'Natural Goods Co',
      connectionDate: '2025-07-20',
      industry: 'Health & Wellness',
      verified: false,
      totalOrders: 12,
      monthlyRevenue: 34000,
      lastInteraction: '2025-08-08',
      status: 'pending',
      productProposals: {
        activeProposals: 1,
        totalProposals: 8,
        totalVotes: 234,
        recentProposals: [
          {
            id: 'proposal_004',
            productName: 'Herbal Tea Blend',
            description: 'Organic herbal tea with adaptogens',
            category: 'Beverages',
            voteCount: 89,
            topPreferences: {
              sizing: [
                { option: '20 Tea Bags', votes: 45, percentage: 51 },
                { option: '50 Tea Bags', votes: 28, percentage: 31 },
                { option: '100g Loose Leaf', votes: 16, percentage: 18 },
              ],
              fit: [
                { option: 'Individual Sachets', votes: 67, percentage: 75 },
                { option: 'Loose Leaf', votes: 22, percentage: 25 },
              ],
            },
            status: 'active',
            endDate: '2025-08-25',
            createdAt: '2025-08-08',
          },
        ],
        manufacturingInsights: {
          popularSizes: [
            { size: '20 Tea Bags', demandPercentage: 52 },
            { size: '50 Tea Bags', demandPercentage: 31 },
            { size: 'Loose Leaf', demandPercentage: 17 },
          ],
          preferredFit: [
            { fit: 'Pre-packaged Sachets', votes: 156 },
            { fit: 'Loose Leaf', votes: 78 },
          ],
          productionRecommendations: [
            'Focus on individual sachet packaging',
            '20-count packages optimal for entry point',
            'Consider premium loose leaf variant for enthusiasts',
          ],
          estimatedDemand: 450,
        },
        monthlyActivity: {
          proposalsCreated: 3,
          votesReceived: 234,
          customerEngagement: 45,
          productionApprovals: 1,
        },
      },
    },
    {
      id: '4',
      businessId: 'brand_004',
      businessName: 'Pure Elements',
      logoUrl: '/images/brands/pure.png',
      connectionDate: '2025-05-10',
      industry: 'Cosmetics',
      verified: true,
      totalOrders: 67,
      monthlyRevenue: 156000,
      lastInteraction: '2025-08-13',
      status: 'active',
      productProposals: {
        activeProposals: 4,
        totalProposals: 31,
        totalVotes: 2134,
        recentProposals: [
          {
            id: 'proposal_005',
            productName: 'Anti-Aging Serum',
            description: 'Advanced anti-aging serum with vitamin C',
            category: 'Skincare',
            voteCount: 567,
            topPreferences: {
              sizing: [
                { option: '30ml Standard', votes: 298, percentage: 53 },
                { option: '50ml Value', votes: 178, percentage: 31 },
                { option: '15ml Travel', votes: 91, percentage: 16 },
              ],
              fit: [
                { option: 'Pump Bottle', votes: 334, percentage: 59 },
                { option: 'Dropper Bottle', votes: 233, percentage: 41 },
              ],
              colors: [
                { option: 'Amber Glass', votes: 298, percentage: 53 },
                { option: 'Clear Glass', votes: 189, percentage: 33 },
                { option: 'Frosted Glass', votes: 80, percentage: 14 },
              ],
            },
            status: 'active',
            endDate: '2025-08-17',
            createdAt: '2025-08-02',
            trending: true,
          },
        ],
        manufacturingInsights: {
          popularSizes: [
            { size: '30ml', demandPercentage: 52 },
            { size: '50ml', demandPercentage: 31 },
            { size: '15ml', demandPercentage: 17 },
          ],
          preferredFit: [
            { fit: 'Pump Dispensers', votes: 892 },
            { fit: 'Dropper Bottles', votes: 567 },
            { fit: 'Tube Packaging', votes: 234 },
          ],
          productionRecommendations: [
            'Prioritize 30ml pump bottles for main SKU',
            'Amber glass preferred for UV protection',
            'Consider 50ml size for value tier',
            'Plan for high demand - 2x normal production',
          ],
          estimatedDemand: 3200,
        },
        monthlyActivity: {
          proposalsCreated: 12,
          votesReceived: 2134,
          customerEngagement: 94,
          productionApprovals: 7,
        },
      },
    },
  ];

  const brands = brandsResponse?.data?.brands || mockBrands;

  const filteredBrands = brands
    .filter((brand) => {
      const matchesSearch = brand.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           brand.industry?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'all' || brand.status === filter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.businessName.localeCompare(b.businessName);
        case 'revenue':
          return (b.monthlyRevenue || 0) - (a.monthlyRevenue || 0);
        case 'orders':
          return (b.totalOrders || 0) - (a.totalOrders || 0);
        case 'recent':
          return new Date(b.lastInteraction || b.connectionDate).getTime() - 
                 new Date(a.lastInteraction || a.connectionDate).getTime();
        default:
          return 0;
      }
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    total: brands.length,
    active: brands.filter(b => b.status === 'active').length,
    pending: brands.filter(b => b.status === 'pending').length,
    totalRevenue: brands.reduce((sum, b) => sum + (b.monthlyRevenue || 0), 0),
    totalActiveProposals: brands.reduce((sum, b) => sum + (b.productProposals?.activeProposals || 0), 0),
    totalMonthlyVotes: brands.reduce((sum, b) => sum + (b.productProposals?.monthlyActivity.votesReceived || 0), 0),
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
            <h1 className="text-2xl font-bold text-gray-900">Connected Brands</h1>
            <p className="text-gray-600">Manage your brand partnerships and monitor product proposals</p>
          </div>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <PlusIcon className="w-4 h-4 mr-2" />
            Connect New Brand
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Brands</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <CheckBadgeIcon className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <ChartBarIcon className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-bold text-lg">$</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${formatNumber(stats.totalRevenue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <ClockIcon className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Proposals</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalActiveProposals}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <HandThumbUpIcon className="w-8 h-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Monthly Votes</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalMonthlyVotes)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search brands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-3">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterType)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="recent">Most Recent</option>
                <option value="name">Name A-Z</option>
                <option value="revenue">Highest Revenue</option>
                <option value="orders">Most Orders</option>
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
        </div>

        {/* Brands Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBrands.map((brand) => (
            <div key={brand.id} className="bg-white rounded-lg border hover:shadow-lg transition-shadow duration-200">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      {brand.logoUrl ? (
                        <img src={brand.logoUrl} alt={brand.businessName} className="w-8 h-8 rounded" />
                      ) : (
                        <BuildingOfficeIcon className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{brand.businessName}</h3>
                      <p className="text-sm text-gray-600">{brand.industry}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {brand.verified && <CheckBadgeIcon className="w-5 h-5 text-blue-600" />}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(brand.status)}`}>
                      {brand.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Total Orders</p>
                    <p className="font-semibold text-gray-900">{brand.totalOrders || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Monthly Revenue</p>
                    <p className="font-semibold text-gray-900">${formatNumber(brand.monthlyRevenue || 0)}</p>
                  </div>
                </div>

                {/* Product Proposals Section */}
                {brand.productProposals && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-blue-900">Product Proposals & Insights</h4>
                      {brand.productProposals.activeProposals > 0 && (
                        <span className="flex items-center text-xs text-blue-700">
                          <ClockIcon className="w-3 h-3 mr-1" />
                          {brand.productProposals.activeProposals} active
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Total Votes</p>
                        <span className="text-sm font-semibold text-blue-700">
                          {formatNumber(brand.productProposals.totalVotes)}
                        </span>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Proposals</p>
                        <span className="text-sm font-semibold text-green-700">
                          {brand.productProposals.totalProposals}
                        </span>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Engagement</p>
                        <span className="text-sm font-semibold text-purple-700">
                          {brand.productProposals.monthlyActivity.customerEngagement}%
                        </span>
                      </div>
                    </div>

                    {/* Recent Proposal */}
                    {brand.productProposals.recentProposals.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-600 mb-1">Latest Product Proposal:</div>
                        {brand.productProposals.recentProposals.slice(0, 1).map((proposal) => (
                          <div key={proposal.id} className="bg-white rounded-md p-2 border">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center">
                                  <p className="text-xs font-medium text-gray-900 truncate">{proposal.productName}</p>
                                  {proposal.trending && (
                                    <FireIcon className="w-3 h-3 text-orange-500 ml-1 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mt-1 line-clamp-1">{proposal.description}</p>
                                
                                {/* Top Preferences Summary */}
                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500">Top Size:</span>
                                    <span className="font-medium text-gray-700">
                                      {proposal.topPreferences.sizing[0]?.option} ({proposal.topPreferences.sizing[0]?.percentage}%)
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500">Preferred Fit:</span>
                                    <span className="font-medium text-gray-700">
                                      {proposal.topPreferences.fit[0]?.option} ({proposal.topPreferences.fit[0]?.percentage}%)
                                    </span>
                                  </div>
                                  {proposal.topPreferences.colors && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-gray-500">Top Color:</span>
                                      <span className="font-medium text-gray-700">
                                        {proposal.topPreferences.colors[0]?.option} ({proposal.topPreferences.colors[0]?.percentage}%)
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-blue-600 font-medium">{proposal.voteCount} votes</span>
                                    <div className="w-12 bg-gray-200 rounded-full h-1">
                                      <div 
                                        className="bg-blue-500 h-1 rounded-full transition-all duration-300" 
                                        style={{ width: `${Math.min((proposal.voteCount / 500) * 100, 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    proposal.status === 'active' ? 'bg-green-100 text-green-800' : 
                                    proposal.status === 'in_production' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {proposal.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Manufacturing Insights */}
                        {brand.productProposals.manufacturingInsights && (
                          <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                            <div className="text-xs font-medium text-amber-800 mb-1">
                              📊 Manufacturing Insights
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-amber-700">
                                <strong>Popular Size:</strong> {brand.productProposals.manufacturingInsights.popularSizes[0]?.size} 
                                ({brand.productProposals.manufacturingInsights.popularSizes[0]?.demandPercentage}% demand)
                              </div>
                              <div className="text-xs text-amber-700">
                                <strong>Est. Demand:</strong> {formatNumber(brand.productProposals.manufacturingInsights.estimatedDemand)} units
                              </div>
                              {brand.productProposals.manufacturingInsights.productionRecommendations.length > 0 && (
                                <div className="text-xs text-amber-700">
                                  <strong>Key Insight:</strong> {brand.productProposals.manufacturingInsights.productionRecommendations[0]}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {brand.productProposals.activeProposals > 1 && (
                          <div className="text-center">
                            <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                              +{brand.productProposals.activeProposals - 1} more active proposals
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-xs text-gray-500">Connected Since</p>
                  <p className="text-sm text-gray-700">{formatDate(brand.connectionDate)}</p>
                </div>

                <div className="flex space-x-2">
                  <button className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                    <EyeIcon className="w-4 h-4 mr-1" />
                    View
                  </button>
                  <button className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">
                    <ChatBubbleBottomCenterTextIcon className="w-4 h-4 mr-1" />
                    Message
                  </button>
                  <button className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">
                    <ChartBarIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredBrands.length === 0 && (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No brands found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by connecting your first brand.'}
            </p>
            <div className="mt-6">
              <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                <PlusIcon className="w-4 h-4 mr-2" />
                Connect New Brand
              </button>
            </div>
          </div>
        )}
      </div>
    </ManufacturerLayout>
  );
}