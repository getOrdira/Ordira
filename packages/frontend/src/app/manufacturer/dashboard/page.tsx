// src/app/manufacturer/dashboard/page.tsx
'use client';

import { useState } from 'react';
import { ManufacturerLayout } from '@/components/layout/manufacturer-layout';
import { ManufacturerChart } from '@/components/charts/manufacturer-chart';
import { useManufacturerStats } from '@/lib/hooks/use-manufacturer-api';
import {
  BuildingOfficeIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { formatNumber } from '@/lib/utils/format';

interface BrandConnection {
  id: string;
  name: string;
  logoUrl?: string;
  industry: string;
  connectionDate: string;
  status: 'active' | 'inactive' | 'pending';
  totalOrders: number;
  activeProposals: number;
  lastActivity: string;
}

interface VotingProposal {
  id: string;
  brandId: string;
  brandName: string;
  title: string;
  description: string;
  status: 'active' | 'closed' | 'draft';
  yesVotes: number;
  noVotes: number;
  totalVotes: number;
  endDate: string;
  createdAt: string;
}

export default function ManufacturerDashboardPage() {
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const { data: statsResponse, isLoading } = useManufacturerStats();
  
  const stats = statsResponse?.data || {
    totalConnections: 12,
    activeConnections: 10,
    totalProposals: 34,
    activeProposals: 8,
    totalVotes: 1247,
    pendingInvitations: 3,
  };

  // Mock data - replace with actual API calls
  const brandConnections: BrandConnection[] = [
    {
      id: 'brand-1',
      name: 'EcoTech Solutions',
      logoUrl: '/images/brands/ecotech.png',
      industry: 'Sustainable Technology',
      connectionDate: '2024-06-15',
      status: 'active',
      totalOrders: 23,
      activeProposals: 3,
      lastActivity: '2 hours ago'
    },
    {
      id: 'brand-2',
      name: 'GreenLife Brand',
      logoUrl: '/images/brands/greenlife.png',
      industry: 'Consumer Goods',
      connectionDate: '2024-07-20',
      status: 'active',
      totalOrders: 15,
      activeProposals: 2,
      lastActivity: '1 day ago'
    },
    {
      id: 'brand-3',
      name: 'Natural Goods Co',
      logoUrl: '/images/brands/natural.png',
      industry: 'Food & Beverage',
      connectionDate: '2024-05-10',
      status: 'active',
      totalOrders: 31,
      activeProposals: 1,
      lastActivity: '3 hours ago'
    },
    {
      id: 'brand-4',
      name: 'Sustainable Wear',
      industry: 'Fashion',
      connectionDate: '2024-08-01',
      status: 'pending',
      totalOrders: 0,
      activeProposals: 0,
      lastActivity: 'Pending approval'
    }
  ];

  const votingProposals: VotingProposal[] = [
    {
      id: 'prop-1',
      brandId: 'brand-1',
      brandName: 'EcoTech Solutions',
      title: 'New Biodegradable Packaging Design',
      description: 'Should we adopt the new compostable packaging design for our product line?',
      status: 'active',
      yesVotes: 127,
      noVotes: 23,
      totalVotes: 150,
      endDate: '2025-08-20',
      createdAt: '2025-08-10'
    },
    {
      id: 'prop-2',
      brandId: 'brand-2',
      brandName: 'GreenLife Brand',
      title: 'Partnership with Local Suppliers',
      description: 'Vote on expanding our supplier network to include more local partners.',
      status: 'active',
      yesVotes: 89,
      noVotes: 45,
      totalVotes: 134,
      endDate: '2025-08-18',
      createdAt: '2025-08-08'
    },
    {
      id: 'prop-3',
      brandId: 'brand-1',
      brandName: 'EcoTech Solutions',
      title: 'Sustainable Manufacturing Process',
      description: 'Implementation of carbon-neutral manufacturing processes.',
      status: 'active',
      yesVotes: 203,
      noVotes: 67,
      totalVotes: 270,
      endDate: '2025-08-25',
      createdAt: '2025-08-12'
    }
  ];

  // Mock chart data - replace with actual API data based on selected brand
  const chartData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    data: [
      {
        period: 'Week 1',
        totalVotes: 45,
        activeProposals: 2,
        yesVotes: 32,
        noVotes: 13
      },
      {
        period: 'Week 2',
        totalVotes: 67,
        activeProposals: 3,
        yesVotes: 48,
        noVotes: 19
      },
      {
        period: 'Week 3',
        totalVotes: 89,
        activeProposals: 4,
        yesVotes: 67,
        noVotes: 22
      },
      {
        period: 'Week 4',
        totalVotes: 123,
        activeProposals: 3,
        yesVotes: 89,
        noVotes: 34
      }
    ]
  };

  const votingMetrics = {
    totalVotes: 1247,
    activeProposals: 8,
    change: {
      value: 156,
      percentage: '+14.3%',
      isPositive: true
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'inactive':
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProposalStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <ManufacturerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
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
            <h1 className="text-2xl font-bold" style={{ color: 'var(--dark)' }}>
              Manufacturer Dashboard
            </h1>
            <p style={{ color: 'var(--muted)' }}>
              Monitor brand connections and voting analytics across your network
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-lg p-6 border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="w-8 h-8" style={{ color: 'var(--accent)' }} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium truncate" style={{ color: 'var(--muted)' }}>
                    Brand Connections
                  </dt>
                  <dd>
                    <div className="text-lg font-medium" style={{ color: 'var(--dark)' }}>
                      {stats.totalConnections}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="rounded-lg p-6 border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="w-8 h-8" style={{ color: 'var(--success)' }} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium truncate" style={{ color: 'var(--muted)' }}>
                    Active Connections
                  </dt>
                  <dd>
                    <div className="text-lg font-medium" style={{ color: 'var(--dark)' }}>
                      {stats.activeConnections}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="rounded-lg p-6 border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardDocumentListIcon className="w-8 h-8" style={{ color: 'var(--chart-warning)' }} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium truncate" style={{ color: 'var(--muted)' }}>
                    Active Proposals
                  </dt>
                  <dd>
                    <div className="text-lg font-medium" style={{ color: 'var(--dark)' }}>
                      {stats.activeProposals}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="rounded-lg p-6 border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="w-8 h-8" style={{ color: 'var(--chart-primary)' }} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium truncate" style={{ color: 'var(--muted)' }}>
                    Total Votes
                  </dt>
                  <dd>
                    <div className="text-lg font-medium" style={{ color: 'var(--dark)' }}>
                      {formatNumber(stats.totalVotes)}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Main Chart */}
        <ManufacturerChart
          brands={brandConnections}
          selectedBrandId={selectedBrandId}
          onBrandChange={setSelectedBrandId}
          votingMetrics={votingMetrics}
          data={chartData.data}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Brand Connections Card */}
          <div className="rounded-lg border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
            <div className="p-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--dark)' }}>
                  Brand Connections
                </h2>
                <span className="px-2 py-1 text-xs font-medium rounded-full" 
                  style={{ backgroundColor: 'var(--success)', color: 'white' }}>
                  {brandConnections.filter(b => b.status === 'active').length} Active
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {brandConnections.map((brand) => (
                  <div 
                    key={brand.id} 
                    className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ 
                      backgroundColor: selectedBrandId === brand.id ? 'var(--accent)' : 'var(--background)',
                      borderColor: selectedBrandId === brand.id ? 'var(--accent)' : 'var(--card-border)',
                      color: selectedBrandId === brand.id ? 'white' : 'var(--dark)'
                    }}
                    onClick={() => setSelectedBrandId(brand.id)}
                  >
                    <div className="flex items-center space-x-3">
                      {brand.logoUrl ? (
                        <img 
                          src={brand.logoUrl} 
                          alt={brand.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: selectedBrandId === brand.id ? 'rgba(255,255,255,0.2)' : 'var(--muted)' }}>
                          <BuildingOfficeIcon className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium">{brand.name}</h3>
                        <p className="text-sm opacity-70">{brand.industry}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-1">
                        {getStatusIcon(brand.status)}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(brand.status)}`}>
                          {brand.status}
                        </span>
                      </div>
                      <p className="text-xs opacity-70">{brand.activeProposals} active proposals</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Live Voting Proposals Card */}
          <div className="rounded-lg border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
            <div className="p-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--dark)' }}>
                  Live Voting Proposals
                </h2>
                <span className="px-2 py-1 text-xs font-medium rounded-full"
                  style={{ backgroundColor: 'var(--chart-warning)', color: 'white' }}>
                  {votingProposals.filter(p => p.status === 'active').length} Active
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {votingProposals.filter(p => p.status === 'active').map((proposal) => (
                  <div key={proposal.id} className="p-4 rounded-lg border" style={{ borderColor: 'var(--card-border)' }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-sm" style={{ color: 'var(--dark)' }}>
                            {proposal.title}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getProposalStatusBadge(proposal.status)}`}>
                            {proposal.status}
                          </span>
                        </div>
                        <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
                          {proposal.brandName}
                        </p>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                          {proposal.description}
                        </p>
                      </div>
                    </div>
                    
                    {/* Vote Progress */}
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
                        <span>Yes: {proposal.yesVotes}</span>
                        <span>No: {proposal.noVotes}</span>
                      </div>
                      <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--card-border)' }}>
                        <div 
                          className="h-2 rounded-full"
                          style={{ 
                            backgroundColor: 'var(--success)',
                            width: `${(proposal.yesVotes / proposal.totalVotes) * 100}%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span style={{ color: 'var(--muted)' }}>
                          {proposal.totalVotes} total votes
                        </span>
                        <span style={{ color: 'var(--muted)' }}>
                          {calculateDaysRemaining(proposal.endDate)} days left
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>
                        Ends {new Date(proposal.endDate).toLocaleDateString()}
                      </div>
                      <button 
                        className="flex items-center space-x-1 px-3 py-1 rounded text-xs font-medium transition-colors"
                        style={{ 
                          backgroundColor: 'var(--accent)',
                          color: 'white'
                        }}
                        onClick={() => {
                          // Handle view proposal details
                          console.log('View proposal:', proposal.id);
                        }}
                      >
                        <EyeIcon className="w-3 h-3" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                ))}
                
                {votingProposals.filter(p => p.status === 'active').length === 0 && (
                  <div className="text-center py-8">
                    <ClipboardDocumentListIcon className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--muted)' }} />
                    <p style={{ color: 'var(--muted)' }}>No active proposals</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                      Connect with brands to see their voting proposals
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="rounded-lg border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
          <div className="p-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--dark)' }}>
              Recent Activity
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {brandConnections.map((brand) => (
                <div key={`activity-${brand.id}`} className="flex items-center space-x-4 p-4 rounded-lg" 
                  style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
                  <div className="flex-shrink-0">
                    {brand.logoUrl ? (
                      <img 
                        src={brand.logoUrl} 
                        alt={brand.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--muted)' }}>
                        <BuildingOfficeIcon className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--dark)' }}>
                      {brand.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      Last activity: {brand.lastActivity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {brand.totalOrders} total orders
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {brand.activeProposals} active proposals
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ManufacturerLayout>
  );
}