// src/app/(brand)/dashboard/page.tsx
'use client';

import { useState } from 'react';
import { BrandLayout } from '@/components/layout/brand-layout';
import { AnalyticsChart } from './analytics-chart';
import { useDashboardStats } from '@/lib/hooks/use-api';
import {
  ChartBarIcon,
  CreditCardIcon,
  LinkIcon,
  CogIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  TrophyIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import {
  ChartBarIcon as ChartBarSolidIcon,
  CreditCardIcon as CreditCardSolidIcon,
} from '@heroicons/react/24/solid';
import { formatNumber } from '@/lib/utils/format';

type ViewType = 'daily' | 'weekly' | 'monthly';

interface MetricCard {
  title: string;
  value: number;
  change: number;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<any>;
  solidIcon: React.ComponentType<any>;
  color: string;
}

export default function DashboardPage() {
  const [view, setView] = useState<ViewType>('weekly');
  const { data: statsResponse, isLoading, error } = useDashboardStats();
  
  // Default stats for loading/error states
  const defaultStats = {
    certificates: { total: 0, thisMonth: 0, change: 0 },
    votes: { total: 0, active: 0, change: 0 },
    products: { total: 0, change: 0 },
    engagement: { rate: 0, change: 0 },
  };

  const stats = statsResponse?.data || defaultStats;

  // Metric cards configuration
  const metrics: MetricCard[] = [
    {
      title: 'Total Certificates',
      value: stats.certificates?.total || 0,
      change: stats.certificates?.change || 0,
      changeType: (stats.certificates?.change || 0) >= 0 ? 'positive' : 'negative',
      icon: CreditCardIcon,
      solidIcon: CreditCardSolidIcon,
      color: 'bg-blue-500',
    },
    {
      title: 'Active Votes',
      value: stats.votes?.active || 0,
      change: stats.votes?.change || 0,
      changeType: (stats.votes?.change || 0) >= 0 ? 'positive' : 'negative',
      icon: ChartBarIcon,
      solidIcon: ChartBarSolidIcon,
      color: 'bg-green-500',
    },
    {
      title: 'Products',
      value: stats.products?.total || 0,
      change: stats.products?.change || 0,
      changeType: (stats.products?.change || 0) >= 0 ? 'positive' : 'negative',
      icon: ShoppingBagIcon,
      solidIcon: ShoppingBagIcon,
      color: 'bg-purple-500',
    },
    {
      title: 'Engagement Rate',
      value: Math.round((stats.engagement?.rate || 0) * 100),
      change: stats.engagement?.change || 0,
      changeType: (stats.engagement?.change || 0) >= 0 ? 'positive' : 'negative',
      icon: UserGroupIcon,
      solidIcon: UserGroupIcon,
      color: 'bg-orange-500',
    },
  ];

  // Recent activity data
  const recentActivity = [
    {
      id: 1,
      type: 'certificate',
      title: 'Eco-Bottle Certificate Minted',
      description: 'Certificate #1024 created for sustainable water bottle',
      time: '2 hours ago',
      icon: CreditCardIcon,
      color: 'text-blue-600',
    },
    {
      id: 2,
      type: 'vote',
      title: 'New Vote Received',
      description: 'Solar Backpack proposal received 15 new votes',
      time: '4 hours ago',
      icon: ChartBarIcon,
      color: 'text-green-600',
    },
    {
      id: 3,
      type: 'product',
      title: 'Product Updated',
      description: 'Bamboo Toothbrush specifications updated',
      time: '6 hours ago',
      icon: ShoppingBagIcon,
      color: 'text-purple-600',
    },
  ];

  if (isLoading) {
    return (
      <BrandLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-white p-6 rounded-lg border">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </BrandLayout>
    );
  }

  if (error) {
    return (
      <BrandLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <TrophyIcon className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load dashboard</h3>
            <p className="text-gray-600 mb-4">Please try refreshing the page or contact support.</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </BrandLayout>
    );
  }

  return (
    <BrandLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Monitor your brand's voting, certificates, and engagement metrics
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['daily', 'weekly', 'monthly'] as ViewType[]).map((viewType) => (
                <button
                  key={viewType}
                  onClick={() => setView(viewType)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    view === viewType
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
                </button>
              ))}
            </div>
            
            {/* Actions */}
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <LinkIcon className="w-4 h-4 mr-2" />
              Quick Actions
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => {
            const IconComponent = metric.icon;
            const SolidIconComponent = metric.solidIcon;
            const isPositive = metric.changeType === 'positive';
            const isNeutral = metric.changeType === 'neutral';
            
            return (
              <div key={index} className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${metric.color}`}>
                    <SolidIconComponent className="w-6 h-6 text-white" />
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <EllipsisVerticalIcon className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metric.title.includes('Rate') ? `${metric.value}%` : formatNumber(metric.value)}
                  </p>
                  
                  {!isNeutral && (
                    <div className="flex items-center">
                      {isPositive ? (
                        <ArrowUpIcon className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <ArrowDownIcon className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm font-medium ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {Math.abs(metric.change)}%
                      </span>
                      <span className="text-sm text-gray-500 ml-1">vs last month</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Activity Overview</h3>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-gray-600">Certificates</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-gray-600">Votes</span>
                  </div>
                </div>
              </div>
              <DashboardChart view={view} />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View All
                </button>
              </div>
              
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const IconComponent = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`p-2 rounded-lg bg-gray-100 ${activity.color}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group">
              <ChartBarIcon className="w-8 h-8 text-gray-400 group-hover:text-blue-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Create Vote</p>
                <p className="text-sm text-gray-600">Start new proposal</p>
              </div>
            </button>
            
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors group">
              <CreditCardIcon className="w-8 h-8 text-gray-400 group-hover:text-green-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Mint Certificate</p>
                <p className="text-sm text-gray-600">Create NFT certificate</p>
              </div>
            </button>
            
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors group">
              <ShoppingBagIcon className="w-8 h-8 text-gray-400 group-hover:text-purple-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Add Product</p>
                <p className="text-sm text-gray-600">Expand catalog</p>
              </div>
            </button>
            
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors group">
              <CogIcon className="w-8 h-8 text-gray-400 group-hover:text-orange-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Settings</p>
                <p className="text-sm text-gray-600">Configure account</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </BrandLayout>
  );
}