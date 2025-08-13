// src/app/(brand)/voting/page.tsx
'use client';

import { useState } from 'react';
import { BrandLayout } from '@/components/layout/brand-layout';
import { VotingStatsCards } from '@/components/features/voting/voting-stats-cards';
import { VotingCharts } from '@/components/features/voting/voting-charts';
import { ProposalTable } from '@/components/features/voting/proposal-table';
import { CreateProposalModal } from '@/components/features/voting/create-proposal-modal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PlusIcon, 
  ChartBarIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { useProposals, useVotingStats } from '@/lib/hooks/use-api';

type ProposalStatus = 'all' | 'active' | 'passed' | 'rejected' | 'draft';

export default function VotingPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ProposalStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // API hooks
  const { data: proposalsResponse, isLoading: proposalsLoading } = useProposals({
    status: activeTab === 'all' ? undefined : activeTab,
    search: searchQuery || undefined,
  });
  const { data: statsResponse, isLoading: statsLoading } = useVotingStats();

  const proposals = proposalsResponse?.data || [];
  const stats = statsResponse?.data || {
    total: 0,
    active: 0,
    passed: 0,
    rejected: 0,
    engagement: 0,
  };

  // Tab configuration with icons and counts
  const tabs = [
    {
      value: 'all' as ProposalStatus,
      label: 'All Proposals',
      count: stats.total,
      icon: DocumentTextIcon,
      color: 'text-gray-600',
    },
    {
      value: 'active' as ProposalStatus,
      label: 'Active',
      count: stats.active,
      icon: ClockIcon,
      color: 'text-blue-600',
    },
    {
      value: 'passed' as ProposalStatus,
      label: 'Passed',
      count: stats.passed,
      icon: CheckCircleIcon,
      color: 'text-green-600',
    },
    {
      value: 'rejected' as ProposalStatus,
      label: 'Rejected',
      count: stats.rejected,
      icon: XCircleIcon,
      color: 'text-red-600',
    },
    {
      value: 'draft' as ProposalStatus,
      label: 'Drafts',
      count: proposals.filter(p => p.status === 'draft').length,
      icon: DocumentTextIcon,
      color: 'text-yellow-600',
    },
  ];

  return (
    <BrandLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Voting Center</h1>
            <p className="text-gray-600 mt-1">
              Create and manage customer voting proposals to drive product decisions
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
              onClick={() => setShowCreateModal(true)}
              className="flex items-center bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Proposal
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <VotingStatsCards 
          stats={stats}
          isLoading={statsLoading}
        />

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <VotingCharts />
          </div>
          
          {/* Quick Insights */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Insights
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <ChartBarIcon className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-900">
                    Avg. Engagement
                  </span>
                </div>
                <span className="text-sm font-bold text-blue-700">
                  {stats.engagement}%
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-900">
                    Success Rate
                  </span>
                </div>
                <span className="text-sm font-bold text-green-700">
                  {stats.total > 0 ? Math.round((stats.passed / (stats.passed + stats.rejected)) * 100) : 0}%
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <ClockIcon className="w-5 h-5 text-gray-600 mr-2" />
                  <span className="text-sm font-medium text-gray-900">
                    Avg. Duration
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-700">
                  7 days
                </span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Recent Activity
              </h4>
              <div className="space-y-2 text-xs text-gray-600">
                <p>• 5 new votes on "Eco-Bottle Design"</p>
                <p>• "Solar Backpack" proposal ended</p>
                <p>• 12 participants joined this week</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search proposals by title, description, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Filter Panel */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Range
                    </label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                      <option>Last 30 days</option>
                      <option>Last 7 days</option>
                      <option>Last 3 months</option>
                      <option>All time</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Category
                    </label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                      <option>All Categories</option>
                      <option>Sustainable</option>
                      <option>Electronics</option>
                      <option>Fashion</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sort By
                    </label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                      <option>Newest First</option>
                      <option>Most Votes</option>
                      <option>Ending Soon</option>
                      <option>A-Z</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="px-4 pt-4">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProposalStatus)}>
              <TabsList className="grid w-full grid-cols-5 mb-6">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <TabsTrigger 
                      key={tab.value}
                      value={tab.value}
                      className="flex items-center space-x-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                    >
                      <IconComponent className={`w-4 h-4 ${tab.color}`} />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                      {tab.count > 0 && (
                        <span className="ml-1 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                          {tab.count}
                        </span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* Table Content */}
              <div className="pb-6">
                {tabs.map((tab) => (
                  <TabsContent key={tab.value} value={tab.value} className="mt-0">
                    <ProposalTable 
                      proposals={proposals}
                      filter={tab.value}
                      isLoading={proposalsLoading}
                      searchQuery={searchQuery}
                    />
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>
        </div>

        {/* Create Proposal Modal */}
        <CreateProposalModal 
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      </div>
    </BrandLayout>
  );
}