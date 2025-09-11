// src/components/ui/data-display/metrics/metrics-grid.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { DashboardStatsGrid } from '@/components/ui/layout/grid';
import { Metric, RevenueMetric, CountMetric, PercentageMetric, type MetricProps } from './metric';
import { 
  UsersIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  DocumentCheckIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

// Define the data structure that matches your backend analytics
export interface MetricsData {
  // Overview metrics from analytics API
  totalUsers?: number;
  activeUsers?: number;
  registeredUsers?: number;
  
  // Voting metrics
  totalVotes?: number;
  vipCustomers?: number;
  
  // Product metrics  
  totalProducts?: number;
  productViews?: number;
  
  // Certificate metrics
  totalCertificates?: number;
  certificatesTransferred?: number;
  
  // Revenue metrics
  totalRevenue?: number;
  monthlyRevenue?: number;
  averageRevenuePerUser?: number;
  
  // Engagement metrics
  engagementRate?: number;
  retentionRate?: number;
  churnRate?: number;
  
  // Change indicators for trends
  changes?: {
    totalUsers?: { value: number; isPositive: boolean };
    totalVotes?: { value: number; isPositive: boolean };
    totalRevenue?: { value: number; isPositive: boolean };
    engagementRate?: { value: number; isPositive: boolean };
    activeUsers?: { value: number; isPositive: boolean };
    totalProducts?: { value: number; isPositive: boolean };
    totalCertificates?: { value: number; isPositive: boolean };
    retentionRate?: { value: number; isPositive: boolean };
  };
}

export interface MetricsGridProps {
  data: MetricsData;
  loading?: boolean;
  error?: string;
  
  // Layout options
  variant?: 'overview' | 'detailed' | 'compact';
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  
  // Feature flags to show/hide specific metrics
  showRevenue?: boolean;
  showVoting?: boolean;
  showProducts?: boolean;
  showCertificates?: boolean;
  showEngagement?: boolean;
  
  // Styling
  className?: string;
  
  // Interactions
  onMetricClick?: (metricType: string, value: any) => void;
}

const MetricsGrid = React.forwardRef<HTMLDivElement, MetricsGridProps>(
  ({
    data,
    loading = false,
    error,
    variant = 'overview',
    columns,
    showRevenue = true,
    showVoting = true, 
    showProducts = true,
    showCertificates = true,
    showEngagement = true,
    className,
    onMetricClick,
    ...props
  }, ref) => {
    // Determine grid columns based on variant and visible metrics
    const getColumns = (): number => {
      if (columns) return columns;
      
      switch (variant) {
        case 'compact':
          return 2;
        case 'detailed':
          return 3;
        case 'overview':
        default:
          return 4;
      }
    };

    // Create metric click handler
    const handleMetricClick = (metricType: string, value: any) => {
      onMetricClick?.(metricType, value);
    };

    // Helper to get metric size based on variant
    const getMetricSize = () => {
      switch (variant) {
        case 'compact':
          return 'sm';
        case 'detailed':
          return 'lg';
        case 'overview':
        default:
          return 'md';
      }
    };

    const metricSize = getMetricSize();
    const gridColumns = getColumns();

    return (
      <DashboardStatsGrid 
        ref={ref}
        columns={gridColumns}
        variant={variant === 'compact' ? 'compact' : 'default'}
        className={cn("w-full", className)}
        {...props}
      >
        {/* User Metrics */}
        <CountMetric
          type="users"
          value={data.totalUsers || 0}
          change={data.changes?.totalUsers}
          icon={<UsersIcon className="w-5 h-5" />}
          description="Total registered users"
          size={metricSize}
          loading={loading}
          error={error}
          onClick={() => handleMetricClick('users', data.totalUsers)}
        />

        <Metric
          title="Active Users"
          value={data.activeUsers || 0}
          change={data.changes?.activeUsers}
          icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
          description="Currently active users"
          size={metricSize}
          loading={loading}
          error={error}
          onClick={() => handleMetricClick('activeUsers', data.activeUsers)}
        />

        {/* Voting Metrics */}
        {showVoting && (
          <>
            <CountMetric
              type="votes"
              value={data.totalVotes || 0}
              change={data.changes?.totalVotes}
              icon={<TrophyIcon className="w-5 h-5" />}
              description="Total votes cast"
              size={metricSize}
              loading={loading}
              error={error}
              onClick={() => handleMetricClick('votes', data.totalVotes)}
            />

            <Metric
              title="VIP Customers"
              value={data.vipCustomers || 0}
              icon={<HeartIcon className="w-5 h-5" />}
              description="Premium customers"
              variant="primary"
              size={metricSize}
              loading={loading}
              error={error}
              onClick={() => handleMetricClick('vipCustomers', data.vipCustomers)}
            />
          </>
        )}

        {/* Product Metrics */}
        {showProducts && (
          <>
            <CountMetric
              type="products"
              value={data.totalProducts || 0}
              change={data.changes?.totalProducts}
              icon={<ChartBarIcon className="w-5 h-5" />}
              description="Products in catalog"
              size={metricSize}
              loading={loading}
              error={error}
              onClick={() => handleMetricClick('products', data.totalProducts)}
            />

            <Metric
              title="Product Views"
              value={data.productViews || 0}
              icon={<EyeIcon className="w-5 h-5" />}
              description="Total product views"
              size={metricSize}
              loading={loading}
              error={error}
              onClick={() => handleMetricClick('productViews', data.productViews)}
            />
          </>
        )}

        {/* Certificate Metrics */}
        {showCertificates && (
          <>
            <CountMetric
              type="certificates"
              value={data.totalCertificates || 0}
              change={data.changes?.totalCertificates}
              icon={<DocumentCheckIcon className="w-5 h-5" />}
              description="Certificates issued"
              size={metricSize}
              loading={loading}
              error={error}
              onClick={() => handleMetricClick('certificates', data.totalCertificates)}
            />

            <Metric
              title="Transferred"
              value={data.certificatesTransferred || 0}
              icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
              description="Certificates transferred"
              variant="success"
              size={metricSize}
              loading={loading}
              error={error}
              onClick={() => handleMetricClick('certificatesTransferred', data.certificatesTransferred)}
            />
          </>
        )}

        {/* Revenue Metrics */}
        {showRevenue && (
          <>
            <RevenueMetric
              value={data.totalRevenue || 0}
              change={data.changes?.totalRevenue}
              icon={<CurrencyDollarIcon className="w-5 h-5" />}
              description="Total revenue"
              size={metricSize}
              loading={loading}
              error={error}
              onClick={() => handleMetricClick('revenue', data.totalRevenue)}
            />

            <RevenueMetric
              value={data.monthlyRevenue || 0}
              period="Monthly"
              icon={<ChartBarIcon className="w-5 h-5" />}
              description="Monthly recurring revenue"
              variant="primary"
              size={metricSize}
              loading={loading}
              error={error}
              onClick={() => handleMetricClick('monthlyRevenue', data.monthlyRevenue)}
            />

            <RevenueMetric
              value={data.averageRevenuePerUser || 0}
              period="ARPU"
              icon={<UsersIcon className="w-5 h-5" />}
              description="Average revenue per user"
              size={metricSize}
              loading={loading}
              error={error}
              onClick={() => handleMetricClick('arpu', data.averageRevenuePerUser)}
            />
          </>
        )}

        {/* Engagement Metrics */}
        {showEngagement && (
          <>
            <PercentageMetric
              title="Engagement Rate"
              value={data.engagementRate || 0}
              change={data.changes?.engagementRate}
              icon={<HeartIcon className="w-5 h-5" />}
              description="User engagement rate"
              variant="success"
              size={metricSize}
              loading={loading}
              error={error}
              onClick={() => handleMetricClick('engagement', data.engagementRate)}
            />

            <PercentageMetric
              title="Retention Rate"
              value={data.retentionRate || 0}
              change={data.changes?.retentionRate}
              icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
              description="User retention rate"
              variant="primary"
              size={metricSize}
              loading={loading}
              error={error}
              onClick={() => handleMetricClick('retention', data.retentionRate)}
            />

            {data.churnRate !== undefined && (
              <PercentageMetric
                title="Churn Rate"
                value={data.churnRate}
                icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
                description="User churn rate"
                variant="warning"
                size={metricSize}
                loading={loading}
                error={error}
                onClick={() => handleMetricClick('churn', data.churnRate)}
              />
            )}
          </>
        )}
      </DashboardStatsGrid>
    );
  }
);

MetricsGrid.displayName = "MetricsGrid";

// Pre-configured metric grids for specific use cases

// Overview Grid - Most important metrics
export interface OverviewMetricsGridProps extends Omit<MetricsGridProps, 'variant'> {}

export const OverviewMetricsGrid = React.forwardRef<HTMLDivElement, OverviewMetricsGridProps>(
  ({ columns = 4, ...props }, ref) => (
    <MetricsGrid
      ref={ref}
      variant="overview"
      columns={columns}
      showRevenue={true}
      showVoting={true}
      showProducts={false}
      showCertificates={false}
      showEngagement={true}
      {...props}
    />
  )
);

OverviewMetricsGrid.displayName = "OverviewMetricsGrid";

// Detailed Grid - All available metrics
export interface DetailedMetricsGridProps extends Omit<MetricsGridProps, 'variant'> {}

export const DetailedMetricsGrid = React.forwardRef<HTMLDivElement, DetailedMetricsGridProps>(
  ({ columns = 3, ...props }, ref) => (
    <MetricsGrid
      ref={ref}
      variant="detailed"
      columns={columns}
      showRevenue={true}
      showVoting={true}
      showProducts={true}
      showCertificates={true}
      showEngagement={true}
      {...props}
    />
  )
);

DetailedMetricsGrid.displayName = "DetailedMetricsGrid";

export { MetricsGrid };
export default MetricsGrid;