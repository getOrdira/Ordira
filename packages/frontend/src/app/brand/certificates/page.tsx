// src/app/(brand)/certificates/page.tsx
'use client';

import { useState } from 'react';
import { BrandLayout } from '@/components/layout/brand-layout';
import { CertificateCard } from '@/components/features/certificates/certificate-card';
import { MintModal } from '@/components/features/certificates/mint-modal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PlusIcon,
  CreditCardIcon,
  CheckBadgeIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { 
  CreditCardIcon as CreditCardSolidIcon,
  CheckBadgeIcon as CheckBadgeSolidIcon,
} from '@heroicons/react/24/solid';
import { useCertificates, useCertificateStats } from '@/lib/hooks/use-api';
import { formatNumber } from '@/lib/utils/format';

type CertificateStatus = 'all' | 'minted' | 'pending' | 'failed';

interface CertificateStatsCard {
  title: string;
  value: number;
  change: number;
  icon: React.ComponentType<any>;
  solidIcon: React.ComponentType<any>;
  color: string;
  trend: 'up' | 'down' | 'neutral';
}

export default function CertificatesPage() {
  const [showMintModal, setShowMintModal] = useState(false);
  const [activeTab, setActiveTab] = useState<CertificateStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCertificates, setSelectedCertificates] = useState<string[]>([]);

  // API hooks
  const { data: certificatesResponse, isLoading: certificatesLoading } = useCertificates();
  const { data: statsResponse, isLoading: statsLoading } = useCertificateStats();

  const certificates = certificatesResponse?.data || [];
  const stats = statsResponse?.data || {
    total: 0,
    minted: 0,
    pending: 0,
    failed: 0,
    monthlyVolume: 0,
    avgGasCost: 0,
  };

  // Stats cards configuration
  const statsCards: CertificateStatsCard[] = [
    {
      title: 'Total Certificates',
      value: stats.total,
      change: 12.5,
      icon: CreditCardIcon,
      solidIcon: CreditCardSolidIcon,
      color: 'bg-blue-500',
      trend: 'up',
    },
    {
      title: 'Successfully Minted',
      value: stats.minted,
      change: 8.3,
      icon: CheckBadgeIcon,
      solidIcon: CheckBadgeSolidIcon,
      color: 'bg-green-500',
      trend: 'up',
    },
    {
      title: 'Pending Mint',
      value: stats.pending,
      change: -2.1,
      icon: ClockIcon,
      solidIcon: ClockIcon,
      color: 'bg-yellow-500',
      trend: 'down',
    },
    {
      title: 'Monthly Volume',
      value: stats.monthlyVolume,
      change: 15.7,
      icon: ChartBarIcon,
      solidIcon: ChartBarIcon,
      color: 'bg-purple-500',
      trend: 'up',
    },
  ];

  // Tab configuration
  const tabs = [
    {
      value: 'all' as CertificateStatus,
      label: 'All Certificates',
      count: stats.total,
      icon: CreditCardIcon,
    },
    {
      value: 'minted' as CertificateStatus,
      label: 'Minted',
      count: stats.minted,
      icon: CheckBadgeIcon,
    },
    {
      value: 'pending' as CertificateStatus,
      label: 'Pending',
      count: stats.pending,
      icon: ClockIcon,
    },
    {
      value: 'failed' as CertificateStatus,
      label: 'Failed',
      count: stats.failed,
      icon: ExclamationTriangleIcon,
    },
  ];

  // Filter certificates based on active tab and search
  const filteredCertificates = certificates.filter(cert => {
    const matchesStatus = activeTab === 'all' || cert.status === activeTab;
    const matchesSearch = !searchQuery || 
      cert.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.certificateId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.orderId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const handleBulkExport = () => {
    if (selectedCertificates.length === 0) {
      alert('Please select certificates to export');
      return;
    }
    // Implement bulk export logic
    console.log('Exporting certificates:', selectedCertificates);
  };

  return (
    <BrandLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Certificates</h1>
            <p className="text-gray-600 mt-1">
              Mint and manage blockchain certificates for your products
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {selectedCertificates.length > 0 && (
              <Button
                variant="outline"
                onClick={handleBulkExport}
                className="flex items-center"
              >
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                Export ({selectedCertificates.length})
              </Button>
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
              onClick={() => setShowMintModal(true)}
              className="flex items-center bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Mint Certificate
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
                    card.trend === 'up' ? 'text-green-600' : 
                    card.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {card.trend === 'up' ? '↗' : card.trend === 'down' ? '↘' : '→'} {card.change}%
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(card.value)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => setShowMintModal(true)}
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors group"
            >
              <PlusIcon className="w-8 h-8 text-gray-400 group-hover:text-blue-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Mint New Certificate</p>
                <p className="text-sm text-gray-600">Create blockchain certificate</p>
              </div>
            </button>
            
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors group">
              <EyeIcon className="w-8 h-8 text-gray-400 group-hover:text-green-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">View Analytics</p>
                <p className="text-sm text-gray-600">Certificate performance</p>
              </div>
            </button>
            
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors group">
              <ArrowDownTrayIcon className="w-8 h-8 text-gray-400 group-hover:text-purple-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Export Data</p>
                <p className="text-sm text-gray-600">Download certificate data</p>
              </div>
            </button>
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
                placeholder="Search certificates by product, order ID, or certificate ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Filter Panel */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      Blockchain Network
                    </label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                      <option>All Networks</option>
                      <option>Ethereum</option>
                      <option>Polygon</option>
                      <option>Base</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sort By
                    </label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                      <option>Newest First</option>
                      <option>Oldest First</option>
                      <option>Product Name</option>
                      <option>Status</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="px-4 pt-4">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as CertificateStatus)}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <TabsTrigger 
                      key={tab.value}
                      value={tab.value}
                      className="flex items-center space-x-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                    >
                      <IconComponent className="w-4 h-4" />
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

              {/* Certificate Grid */}
              <div className="pb-6">
                {tabs.map((tab) => (
                  <TabsContent key={tab.value} value={tab.value} className="mt-0">
                    {certificatesLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="bg-gray-200 h-48 rounded-lg"></div>
                          </div>
                        ))}
                      </div>
                    ) : filteredCertificates.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCertificates.map((certificate) => (
                          <CertificateCard
                            key={certificate.id}
                            certificate={certificate}
                            isSelected={selectedCertificates.includes(certificate.id)}
                            onSelect={(selected) => {
                              if (selected) {
                                setSelectedCertificates([...selectedCertificates, certificate.id]);
                              } else {
                                setSelectedCertificates(selectedCertificates.filter(id => id !== certificate.id));
                              }
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <CreditCardIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No certificates found
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {searchQuery ? 'Try adjusting your search criteria' : 'Get started by minting your first certificate'}
                        </p>
                        {!searchQuery && (
                          <Button onClick={() => setShowMintModal(true)}>
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Mint Certificate
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

        {/* Mint Certificate Modal */}
        <MintModal 
          open={showMintModal}
          onClose={() => setShowMintModal(false)}
        />
      </div>
    </BrandLayout>
  );
}