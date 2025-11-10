// src/components/ui/data-display/metrics/analytics-chart.tsx
'use client';

import React from 'react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { cn } from '@/lib/utils/utils';
import { Card } from '@/components/ui/primitives/card';
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

// Chart data interfaces matching backend analytics
export interface ChartDataPoint {
  name: string;
  value: number;
  date?: string;
  month?: string;
  [key: string]: any;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  change?: number;
  label?: string;
  [key: string]: any;
}

export interface CategoryDataPoint {
  name: string;
  value: number;
  count?: number;
  percentage?: number;
  color?: string;
}

export interface AnalyticsChartProps {
  // Data
  data: ChartDataPoint[] | TimeSeriesDataPoint[] | CategoryDataPoint[];
  
  // Chart configuration
  type: 'line' | 'area' | 'bar' | 'pie' | 'donut';
  title?: string;
  description?: string;
  
  // Data keys
  dataKey?: string;
  xAxisKey?: string;
  yAxisKey?: string;
  
  // Styling
  height?: number;
  colors?: string[];
  gradient?: boolean;
  
  // Features
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  loading?: boolean;
  error?: string;
  
  // Interaction
  onPointClick?: (data: any) => void;
  
  // Layout
  className?: string;
  compact?: boolean;
}

// Default color palette matching your Ordira brand
const DEFAULT_COLORS = [
  'var(--primary)',           // Ordira Orange
  'var(--ordira-primary-dark)', // Darker Orange
  'var(--success)',           // Green
  'var(--warning)',           // Yellow/Amber
  'var(--error)',            // Red
  'var(--info)',             // Blue
  '#8B5CF6',                 // Purple
  '#06B6D4',                 // Cyan
  '#84CC16',                 // Lime
  '#F59E0B'                  // Amber
];

const AnalyticsChart = React.forwardRef<HTMLDivElement, AnalyticsChartProps>(
  ({
    data,
    type,
    title,
    description,
    dataKey = 'value',
    xAxisKey = 'name',
    yAxisKey = 'value',
    height = 300,
    colors = DEFAULT_COLORS,
    gradient = false,
    showGrid = true,
    showTooltip = true,
    showLegend = false,
    loading = false,
    error,
    onPointClick,
    className,
    compact = false,
    ...props
  }, ref) => {
    // Custom tooltip component
    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
            <p className="font-satoshi-medium text-sm text-gray-900 mb-1">{label}</p>
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
              </p>
            ))}
          </div>
        );
      }
      return null;
    };

    // Format numbers for display
    const formatNumber = (value: number): string => {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toLocaleString();
    };

    // Render loading state
    if (loading) {
      return (
        <Card className={cn("p-6", className)}>
          {title && (
            <div className="mb-4">
              <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
              {description && <div className="h-3 bg-gray-200 rounded w-48 animate-pulse"></div>}
            </div>
          )}
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </Card>
      );
    }

    // Render error state
    if (error) {
      return (
        <Card className={cn("p-6", className)}>
          {title && (
            <div className="mb-4">
              <h3 className="font-satoshi-bold text-lg text-[var(--heading-color)]">{title}</h3>
              {description && <p className="text-sm text-[var(--caption-color)] mt-1">{description}</p>}
            </div>
          )}
          <div className="flex items-center justify-center h-64 text-[var(--error)]">
            <div className="text-center">
              <InformationCircleIcon className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-medium">Error loading chart</p>
              <p className="text-xs text-[var(--muted)] mt-1">{error}</p>
            </div>
          </div>
        </Card>
      );
    }

    // Render empty state
    if (!data || data.length === 0) {
      return (
        <Card className={cn("p-6", className)}>
          {title && (
            <div className="mb-4">
              <h3 className="font-satoshi-bold text-lg text-[var(--heading-color)]">{title}</h3>
              {description && <p className="text-sm text-[var(--caption-color)] mt-1">{description}</p>}
            </div>
          )}
          <div className="flex items-center justify-center h-64 text-[var(--muted)]">
            <div className="text-center">
              <ChartBarIcon className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-medium">No data available</p>
              <p className="text-xs mt-1">Data will appear here when available</p>
            </div>
          </div>
        </Card>
      );
    }

    // Render chart based on type
    const renderChart = () => {
      const commonProps = {
        data,
        margin: { top: 5, right: 30, left: 20, bottom: 5 }
      };

      switch (type) {
        case 'line':
          return (
            <LineChart {...commonProps}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />}
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fontSize: 12, fill: 'var(--caption-color)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'var(--caption-color)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatNumber}
              />
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend />}
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke={colors[0]}
                strokeWidth={2}
                dot={{ fill: colors[0], strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: colors[0], strokeWidth: 2 }}
                onClick={onPointClick}
              />
            </LineChart>
          );

        case 'area':
          return (
            <AreaChart {...commonProps}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />}
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fontSize: 12, fill: 'var(--caption-color)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'var(--caption-color)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatNumber}
              />
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend />}
              <Area 
                type="monotone" 
                dataKey={dataKey} 
                stroke={colors[0]}
                fill={gradient ? `url(#gradient-${dataKey})` : colors[0]}
                fillOpacity={0.6}
                onClick={onPointClick}
              />
              {gradient && (
                <defs>
                  <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors[0]} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={colors[0]} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
              )}
            </AreaChart>
          );

        case 'bar':
          return (
            <BarChart {...commonProps}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />}
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fontSize: 12, fill: 'var(--caption-color)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'var(--caption-color)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatNumber}
              />
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend />}
              <Bar 
                dataKey={dataKey} 
                fill={colors[0]}
                radius={[4, 4, 0, 0]}
                onClick={onPointClick}
              />
            </BarChart>
          );

        case 'pie':
        case 'donut':
          const innerRadius = type === 'donut' ? 60 : 0;
          return (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={120}
                paddingAngle={2}
                dataKey={dataKey}
                onClick={onPointClick}
              >
                {data.map((entry: any, index: number) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color || colors[index % colors.length]} 
                  />
                ))}
              </Pie>
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend />}
            </PieChart>
          );

        default:
          return (
            <div className="flex items-center justify-center h-64 text-[var(--muted)]">
              <div className="text-center">
                <ChartBarIcon className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-medium">Unsupported chart type</p>
                <p className="text-xs mt-1">Chart type "{type}" is not supported</p>
              </div>
            </div>
          );
      }
    };

    return (
      <Card ref={ref} className={cn("p-6", className)} {...props}>
        {/* Header */}
        {(title || description) && (
          <div className={cn("mb-6", compact && "mb-4")}>
            {title && (
              <h3 className={cn(
                "font-satoshi-bold text-[var(--heading-color)]",
                compact ? "text-base" : "text-lg"
              )}>
                {title}
              </h3>
            )}
            {description && (
              <p className={cn(
                "text-[var(--caption-color)] font-satoshi-regular mt-1",
                compact ? "text-xs" : "text-sm"
              )}>
                {description}
              </p>
            )}
          </div>
        )}

        {/* Chart */}
        <div style={{ width: '100%', height: compact ? height * 0.8 : height }}>
          <ResponsiveContainer>
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }
);

AnalyticsChart.displayName = "AnalyticsChart";

// Pre-configured chart components for common analytics use cases

// Trend Chart - for time series data
export interface TrendChartProps extends Omit<AnalyticsChartProps, 'type'> {
  metric: string;
  timeframe?: string;
}

export const TrendChart = React.forwardRef<HTMLDivElement, TrendChartProps>(
  ({ metric, timeframe, title, ...props }, ref) => (
    <AnalyticsChart
      ref={ref}
      type="area"
      title={title || `${metric} Trend`}
      description={timeframe ? `Over ${timeframe}` : undefined}
      gradient={true}
      {...props}
    />
  )
);

TrendChart.displayName = "TrendChart";

// Revenue Chart - specifically for revenue analytics
export interface RevenueChartProps extends Omit<AnalyticsChartProps, 'type' | 'colors'> {
  currency?: string;
}

export const RevenueChart = React.forwardRef<HTMLDivElement, RevenueChartProps>(
  ({ currency = '$', title = 'Revenue', ...props }, ref) => (
    <AnalyticsChart
      ref={ref}
      type="area"
      title={title}
      colors={['var(--success)', 'var(--primary)']}
      gradient={true}
      {...props}
    />
  )
);

RevenueChart.displayName = "RevenueChart";

// Voting Analytics Chart - for vote distribution
export interface VotingChartProps extends Omit<AnalyticsChartProps, 'type'> {
  showPercentages?: boolean;
}

export const VotingChart = React.forwardRef<HTMLDivElement, VotingChartProps>(
  ({ title = 'Vote Distribution', showPercentages = true, ...props }, ref) => (
    <AnalyticsChart
      ref={ref}
      type="bar"
      title={title}
      colors={['var(--primary)', 'var(--success)', 'var(--warning)']}
      {...props}
    />
  )
);

VotingChart.displayName = "VotingChart";

// Engagement Chart - for user engagement metrics
export interface EngagementChartProps extends Omit<AnalyticsChartProps, 'type'> {}

export const EngagementChart = React.forwardRef<HTMLDivElement, EngagementChartProps>(
  ({ title = 'User Engagement', ...props }, ref) => (
    <AnalyticsChart
      ref={ref}
      type="line"
      title={title}
      colors={['var(--primary)', 'var(--success)']}
      {...props}
    />
  )
);

EngagementChart.displayName = "EngagementChart";

// Product Performance Chart - for product analytics
export interface ProductChartProps extends Omit<AnalyticsChartProps, 'type'> {}

export const ProductChart = React.forwardRef<HTMLDivElement, ProductChartProps>(
  ({ title = 'Product Performance', ...props }, ref) => (
    <AnalyticsChart
      ref={ref}
      type="bar"
      title={title}
      colors={['var(--info)', 'var(--primary)', 'var(--success)']}
      {...props}
    />
  )
);

ProductChart.displayName = "ProductChart";

export { AnalyticsChart };
export default AnalyticsChart;