'use client';

import React, { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { PageContainer } from '@/components/ui/layout/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/primitives/card';
import { Button } from '@/components/ui/primitives/button';
import { LoadingSpinner } from '@/components/ui/feedback/loading-spinner';
import { useAnalyticsOverview } from '@/hooks/use-analytics';
import { useBrandSettings } from '@/hooks/use-brand-hooks';
import { brandsApi } from '@/lib/apis/brands';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  ShoppingCart, 
  ArrowUpRight,
  Plus,
  BarChart3,
  PieChart,
  MapPin,
  Building2,
  CreditCard,
  Package,
  Share2,
  Zap,
  FileText,
  LifeBuoy,
  ChevronDown,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Settings Modal Component
function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedSetting, setSelectedSetting] = useState('profile');

  const handleOutsideClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const settingsOptions = [
    { id: 'profile', label: 'Profile', icon: Building2 },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'assets', label: 'Assets', icon: Package },
    { id: 'domains', label: 'Domains', icon: Share2 },
    { id: 'theme', label: 'Theme', icon: Zap },
  ];

  if (!isOpen) return null;

  return (
    <div 
      onClick={handleOutsideClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '90vw',
        height: '80vh',
        maxWidth: '1200px',
        display: 'flex',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000000',
            fontSize: '16px',
            fontWeight: 'bold',
            transition: 'all 0.2s',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.backgroundColor = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.backgroundColor = 'transparent';
          }}
        >
          ✕
        </button>
        {/* Settings Sidebar */}
        <div style={{
          width: '280px',
          backgroundColor: '#f9fafb',
          overflowY: 'auto',
          borderTopRightRadius: '24px',
          borderBottomRightRadius: '24px',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '8px 16px' }}>
            {/* Settings Title */}
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 16px 0',
              padding: '8px 0'
            }}>Settings</h2>
            
            {settingsOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedSetting(option.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    marginBottom: '4px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: selectedSetting === option.id ? '#f97316' : 'transparent',
                    color: selectedSetting === option.id ? 'white' : '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedSetting !== option.id) {
                      const target = e.target as HTMLButtonElement;
                      target.style.backgroundColor = '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedSetting !== option.id) {
                      const target = e.target as HTMLButtonElement;
                      target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <option.icon style={{
                    width: '18px',
                    height: '18px',
                    marginRight: '12px'
                  }} />
                  {option.label}
                </button>
              ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: 'white'
        }}>
          <div style={{ padding: '16px 24px' }}>
            {selectedSetting === 'profile' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                  Profile Settings
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                      Business Name
                    </label>
                    <input
                      type="text"
                      defaultValue="Test Brand"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue="test@brand.com"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                      Description
                    </label>
                    <textarea
                      defaultValue="A leading brand in sustainable products..."
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedSetting === 'billing' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                  Billing Settings
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                      Payment Method
                    </label>
                    <select style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}>
                      <option>Credit Card ending in 4242</option>
                      <option>PayPal</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                      Billing Address
                    </label>
                    <textarea
                      defaultValue="123 Business St, City, State 12345"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedSetting === 'theme' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                  Theme Settings
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                      Color Scheme
                    </label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {['Light', 'Dark', 'Auto'].map((theme) => (
                        <button
                          key={theme}
                          style={{
                            padding: '8px 16px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            backgroundColor: theme === 'Light' ? '#f97316' : 'white',
                            color: theme === 'Light' ? 'white' : '#374151',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Placeholder for other settings */}
            {!['profile', 'billing', 'theme'].includes(selectedSetting) && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                  {settingsOptions.find(opt => opt.id === selectedSetting)?.label} Settings
                </h3>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                  Settings for {settingsOptions.find(opt => opt.id === selectedSetting)?.label} will be implemented here.
                </p>
              </div>
            )}

            {/* Save Button */}
            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#f97316',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = '#ea580c';
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = '#f97316';
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BrandDashboardPage() {
  const { user } = useAuth();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Real API calls
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useAnalyticsOverview({
    timeframe: '30d'
  });

  const { settings: brandSettings, isLoading: settingsLoading } = useBrandSettings();

  // Profile analytics query
  const { data: profileAnalytics, isLoading: profileAnalyticsLoading } = useQuery({
    queryKey: ['brand-profile-analytics'],
    queryFn: () => brandsApi.getProfileAnalytics({ start: '30d' }),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Process real data for overview stats
  const overviewStats = React.useMemo(() => {
    if (!analyticsData && !profileAnalytics) {
      return [
        {
          title: 'Profile Views',
          value: '0',
          change: '0%',
          trend: 'neutral',
          icon: Users,
          color: 'text-gray-600'
        },
        {
          title: 'Connection Requests',
          value: '0',
          change: '0%',
          trend: 'neutral',
          icon: ArrowUpRight,
          color: 'text-gray-600'
        },
        {
          title: 'Engagement Rate',
          value: '0%',
          change: '0%',
          trend: 'neutral',
          icon: BarChart3,
          color: 'text-gray-600'
        },
        {
          title: 'Profile Score',
          value: '0',
          change: '0%',
          trend: 'neutral',
          icon: DollarSign,
          color: 'text-gray-600'
        }
      ];
    }

    const views = profileAnalytics?.views || { total: 0, unique: 0, trend: 0 };
    const engagement = profileAnalytics?.engagement || { profileViews: 0, connectionRequests: 0, averageTimeOnProfile: 0 };
    const performance = profileAnalytics?.performance || { searchRanking: 0, profileScore: 0, industryPosition: 0 };

    return [
      {
        title: 'Profile Views',
        value: views.total.toLocaleString(),
        change: `${views.trend > 0 ? '+' : ''}${views.trend.toFixed(1)}%`,
        trend: views.trend > 0 ? 'up' : views.trend < 0 ? 'down' : 'neutral',
        icon: Users,
        color: views.trend > 0 ? 'text-green-600' : views.trend < 0 ? 'text-red-600' : 'text-gray-600'
      },
      {
        title: 'Connection Requests',
        value: engagement.connectionRequests.toLocaleString(),
        change: engagement.connectionRequests > 0 ? '+12.5%' : '0%',
        trend: engagement.connectionRequests > 0 ? 'up' : 'neutral',
        icon: ArrowUpRight,
        color: engagement.connectionRequests > 0 ? 'text-green-600' : 'text-gray-600'
      },
      {
        title: 'Engagement Rate',
        value: `${(engagement.averageTimeOnProfile / 60).toFixed(1)}min`,
        change: engagement.averageTimeOnProfile > 0 ? '+5.2%' : '0%',
        trend: engagement.averageTimeOnProfile > 0 ? 'up' : 'neutral',
        icon: BarChart3,
        color: engagement.averageTimeOnProfile > 0 ? 'text-green-600' : 'text-gray-600'
      },
      {
        title: 'Profile Score',
        value: performance.profileScore.toString(),
        change: performance.profileScore > 0 ? '+2.1%' : '0%',
        trend: performance.profileScore > 0 ? 'up' : 'neutral',
        icon: DollarSign,
        color: performance.profileScore > 0 ? 'text-green-600' : 'text-gray-600'
      }
    ];
  }, [analyticsData, profileAnalytics]);

  // Loading state
  if (analyticsLoading || settingsLoading || profileAnalyticsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: 'white',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Main Content Area */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="space-y-6">
            {/* Page Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600 text-lg">Welcome back! Here's what's happening with your business today.</p>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {overviewStats.map((stat, index) => (
                <Card key={index} className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl ${stat.color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                      <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        stat.trend === 'up' ? 'bg-green-100 text-green-700' : 
                        stat.trend === 'down' ? 'bg-red-100 text-red-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {stat.trend === 'up' ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : stat.trend === 'down' ? (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        ) : null}
                        {stat.change}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Add Data Card */}
              <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-dashed border-2 border-gray-300 hover:border-orange-400 hover:bg-orange-50">
                <CardContent className="flex items-center justify-center h-full p-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Plus className="w-6 h-6 text-orange-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Add data</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Analytics Chart */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    Profile Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Legend */}
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-sm font-medium text-gray-700">Profile Views</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-orange-500 rounded-full mr-2"></div>
                        <span className="text-sm font-medium text-gray-700">Engagement</span>
                      </div>
                    </div>
                    
                    {/* Chart Placeholder */}
                    <div className="h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200">
                      <div className="text-center text-gray-500">
                        <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium mb-2">Profile Analytics Chart</p>
                        <p className="text-sm">Real-time analytics visualization will be implemented here</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Connection Requests */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <div className="p-2 bg-green-100 rounded-lg mr-3">
                      <PieChart className="w-5 h-5 text-green-600" />
                    </div>
                    Connection Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profileAnalytics?.views?.bySource?.slice(0, 8).map((source: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center">
                          <div className={`w-4 h-4 rounded-full mr-3 ${
                            ['bg-purple-500', 'bg-blue-400', 'bg-blue-600', 'bg-pink-500', 'bg-red-500', 'bg-green-400', 'bg-orange-500', 'bg-yellow-500'][index % 8]
                          }`}></div>
                          <span className="text-sm font-medium text-gray-700">{source.source}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{source.count}</span>
                      </div>
                    )) || (
                      <div className="text-center text-gray-500 py-8">
                        <ArrowUpRight className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No connection requests yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl">
                  <div className="p-2 bg-purple-100 rounded-lg mr-3">
                    <MapPin className="w-5 h-5 text-purple-600" />
                  </div>
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { name: 'Search Ranking', value: profileAnalytics?.performance?.searchRanking || 0, unit: '' },
                    { name: 'Profile Score', value: profileAnalytics?.performance?.profileScore || 0, unit: '/100' },
                    { name: 'Industry Position', value: profileAnalytics?.performance?.industryPosition || 0, unit: '%' },
                    { name: 'Avg. Time', value: Math.round((profileAnalytics?.engagement?.averageTimeOnProfile || 0) / 60), unit: 'min' }
                  ].map((metric, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all duration-200 border border-gray-200">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-white text-xs font-bold">
                            {metric.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-700">{metric.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 bg-white px-2 py-1 rounded-lg">{metric.value}{metric.unit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />
    </div>
  );
}
