import React from 'react';
import { 
  TrendingUpIcon, 
  TrendingDownIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// CSS Variables for colors (matching your globals.css)
const styles = `
  :root {
    --background: #ffffff;
    --foreground: #171717;
    --accent: #3B82F6;
    --accent-dark: #2563EB;
    --dark: #171717;
    --muted: #6B7280;
    --success: #10B981;
    --warning: #F59E0B;
    --error: #EF4444;
  }
`;

// Mock components for demo (simplified versions)
const Card = ({ children, size = "md", variant = "default", className = "", ...props }) => {
  const sizeClasses = {
    sm: "p-4 min-h-[120px]",
    md: "p-6 min-h-[200px]", 
    lg: "p-8 min-h-[300px]",
    xl: "p-10 min-h-[400px]",
    compact: "p-3 min-h-[80px]",
    auto: "p-6"
  };

  const variantClasses = {
    default: "border border-gray-100/60 shadow-sm hover:shadow-md",
    elevated: "border border-gray-100/40 shadow-lg hover:shadow-xl",
    interactive: "border border-gray-100/60 cursor-pointer shadow-sm hover:shadow-lg hover:scale-[1.01]"
  };

  return (
    <div 
      className={`bg-white rounded-2xl transition-all duration-200 relative overflow-hidden ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const MetricCard = ({ title, value, change, description, icon, trend, actions, size = "sm", className = "" }) => (
  <Card size={size} className={className}>
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="flex items-center space-x-2">
          {icon && <div className="text-gray-400 opacity-60">{icon}</div>}
          {actions}
        </div>
      </div>
      
      {/* Value */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        
        {/* Change indicator */}
        {change && (
          <div className={`flex items-center text-xs font-medium ${change.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <span className="mr-1">{change.isPositive ? '↗' : '↘'}</span>
            {change.percentage}
          </div>
        )}
        
        {/* Description */}
        {description && (
          <p className="text-xs text-gray-500 mt-2">{description}</p>
        )}
      </div>
      
      {/* Trend */}
      {trend && (
        <div className="mt-3">
          {trend}
        </div>
      )}
    </div>
  </Card>
);

const ProgressCard = ({ title, description, progress, value, target, className = "" }) => (
  <Card size="md" className={className}>
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </div>
      
      <div className="flex-1 flex flex-col justify-center space-y-4">
        {(value || target) && (
          <div className="flex justify-between text-sm">
            {value && <span className="font-medium">{value}</span>}
            {target && <span className="text-gray-500">{target}</span>}
          </div>
        )}
        
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{progress}% complete</span>
            <span>Goal: 100%</span>
          </div>
        </div>
      </div>
    </div>
  </Card>
);

const ChartCard = ({ title, description, children, actions, period, size = "lg", className = "" }) => (
  <Card size={size} className={className}>
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {period && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {period}
              </span>
            )}
          </div>
          {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
        </div>
        {actions}
      </div>
      
      <div className="flex-1">
        {children}
      </div>
    </div>
  </Card>
);

const FeatureCard = ({ title, description, icon, status, action, className = "" }) => (
  <Card variant="interactive" size="md" className={`group ${className}`}>
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1">
          {icon && (
            <div className="flex-shrink-0 p-3 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
              <div className="text-blue-600">{icon}</div>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate mb-1">
              {title}
            </h3>
            
            {status && (
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                status === 'active' ? 'bg-green-100 text-green-800' :
                status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {status}
              </div>
            )}
          </div>
        </div>
        
        {action}
      </div>
      
      <div className="flex-1">
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  </Card>
);

// Mock chart components
const SimpleChart = ({ data, color = "#3B82F6" }) => (
  <div className="w-full h-32 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg flex items-end justify-center relative overflow-hidden">
    <div className="absolute inset-0 flex items-end justify-center space-x-1 p-4">
      {[...Array(12)].map((_, i) => (
        <div 
          key={i}
          className="bg-blue-500 rounded-t-sm flex-1 opacity-80"
          style={{ 
            height: `${Math.random() * 60 + 20}%`,
            backgroundColor: color 
          }}
        />
      ))}
    </div>
    <span className="relative z-10 text-blue-700 font-medium">{data}</span>
  </div>
);

const ProgressBars = () => (
  <div className="space-y-3">
    {[
      { label: 'Lower', value: 15, color: '#EF4444' },
      { label: 'Median', value: 45, color: '#3B82F6' },
      { label: 'You', value: 75, color: '#3B82F6' },
      { label: 'Upper', value: 85, color: '#F59E0B' }
    ].map((item, i) => (
      <div key={i} className="flex items-center space-x-3">
        <span className="text-xs text-gray-600 w-12">{item.label}</span>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className="h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${item.value}%`,
              backgroundColor: item.color
            }}
          />
        </div>
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
      </div>
    ))}
  </div>
);

export default function DashboardCardsExample() {
  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <style>{styles}</style>
      
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Manufacturing Platform Dashboard Cards</h1>
        
        {/* Top Row - Voting & Certificate Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Votes"
            value="1,247"
            change={{ value: 23, percentage: "+23 this week", isPositive: true }}
            icon={<CheckCircleIcon className="w-4 h-4" />}
            description="Customer votes received"
          />
          
          <MetricCard
            title="Certificates Issued"
            value="89"
            change={{ value: 12, percentage: "+12 this month", isPositive: true }}
            description="Product authenticity certificates"
            trend={
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="h-2 rounded-full bg-green-600" style={{ width: '75%' }} />
              </div>
            }
          />
          
          <MetricCard
            title="Active Proposals"
            value="7"
            description="Customer voting proposals"
            actions={
              <div className="flex space-x-1">
                <button className="p-1 text-gray-400 hover:text-gray-600">
                  <PlayIcon className="w-3 h-3" />
                </button>
                <button className="p-1 text-gray-400 hover:text-gray-600">
                  <TrendingUpIcon className="w-3 h-3" />
                </button>
              </div>
            }
          />
          
          <MetricCard
            title="Approval Rate"
            value="87.3%"
            change={{ value: 5.2, percentage: "+5.2%", isPositive: true }}
            trend={
              <div className="flex items-center space-x-2">
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div className="h-1 rounded-full bg-blue-600" style={{ width: '87%' }} />
                </div>
                <div className="w-2 h-6 bg-blue-600 rounded-sm" />
              </div>
            }
          />
        </div>

        {/* Second Row - Subscription & Usage Tracking */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Subscription Usage */}
          <ProgressCard
            title="Monthly Vote Limit"
            description="Track your subscription usage and plan limits."
            progress={68}
            value="680 used"
            target="1,000 limit"
          />
          
          {/* Certificate Quota */}
          <ChartCard
            title="Certificate Quota"
            period="Current Plan"
            size="md"
            children={
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">156</div>
                  <div className="text-sm text-gray-500">Certificates remaining</div>
                </div>
                <div className="flex justify-center space-x-4 text-xs text-gray-500">
                  <span>Used: 44</span>
                  <span className="text-blue-600 font-medium">Limit: 200</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="h-3 rounded-full bg-blue-600" style={{ width: '22%' }} />
                </div>
              </div>
            }
          />
          
          {/* New Voting Campaign */}
          <Card size="md">
            <div className="h-full flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Create Vote</h3>
                <p className="text-sm text-gray-600">
                  Start a new customer voting campaign for product feedback and validation.
                </p>
              </div>
              
              <div className="flex-1 flex items-center justify-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 bg-blue-600 rounded-sm flex items-center justify-center">
                    <span className="text-white text-lg font-bold">+</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Third Row - Analytics & Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Performance Benchmark */}
          <Card size="lg">
            <div className="h-full flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Performance Benchmark</h3>
                <p className="text-sm text-gray-600">
                  Compare your voting engagement rates with similar manufacturing brands.
                </p>
              </div>
              
              <div className="flex-1 space-y-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 text-green-600 mb-2">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">You're outperforming 78% of similar brands in customer engagement!</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {[
                    { label: 'Low Engagement', value: 25, color: '#EF4444' },
                    { label: 'Average', value: 45, color: '#F59E0B' },
                    { label: 'Your Brand', value: 78, color: '#3B82F6' },
                    { label: 'Top Performers', value: 95, color: '#10B981' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <span className="text-xs text-gray-600 w-20">{item.label}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${item.value}%`,
                            backgroundColor: item.color
                          }}
                        />
                      </div>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
          
          {/* Voting Analytics */}
          <ChartCard
            title="Vote Analytics"
            description="Deep dive into voting patterns and customer engagement trends."
            size="lg"
            children={
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-500">Weekly Votes</div>
                    <div className="text-2xl font-bold text-gray-900">247</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Target</div>
                    <div className="text-lg font-semibold text-gray-700">/300</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex space-x-1">
                    {[...Array(20)].map((_, i) => (
                      <div 
                        key={i}
                        className={`h-3 rounded-sm flex-1 ${i < 16 ? 'bg-blue-500' : 'bg-gray-200'}`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Yes: 189</span>
                    <span>No: 58</span>
                  </div>
                </div>
                
                <SimpleChart data="82% engagement" color="#3B82F6" />
              </div>
            }
          />
        </div>

        {/* Bottom Row - Management Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Product Catalog */}
          <FeatureCard
            title="Product Catalog"
            description="Manage your product listings, certificates, and customer voting campaigns."
            icon={<ClipboardDocumentListIcon className="w-5 h-5" />}
            status="active"
          />
          
          {/* Subscription Plan */}
          <Card size="md">
            <div className="h-full flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Current Plan</h3>
                <p className="text-sm text-gray-600">
                  Premium Plan - 1,000 votes/month, 200 certificates/month
                </p>
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-blue-900">Votes Remaining</span>
                  <span className="text-lg font-bold text-blue-600">320</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-green-900">Certificates Left</span>
                  <span className="text-lg font-bold text-green-600">156</span>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Recent Activity */}
          <Card size="md">
            <div className="h-full flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircleIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">Vote Completed</div>
                    <div className="text-xs text-gray-500">"Eco-Bottle v2" - 89% approval</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <DocumentTextIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">Certificate Issued</div>
                    <div className="text-xs text-gray-500">Solar Backpack - Batch #2024-03</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <ClockIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">Vote Pending</div>
                    <div className="text-xs text-gray-500">"Smart Thermostat" - 2 days left</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Code Examples */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Manufacturing Platform Card Examples</h2>
          
          <div className="bg-gray-900 text-gray-300 p-4 rounded-lg text-sm font-mono overflow-x-auto">
            <pre>{`// Voting Metrics Card
<MetricCard
  title="Total Votes"
  value="1,247"
  change={{ value: 23, percentage: "+23 this week", isPositive: true }}
  icon={<CheckCircleIcon className="w-4 h-4" />}
  description="Customer votes received"
/>

// Subscription Usage Card  
<ProgressCard
  title="Monthly Vote Limit"
  description="Track your subscription usage and plan limits"
  progress={68}
  value="680 used"
  target="1,000 limit"
/>

// Certificate Analytics Card
<ChartCard
  title="Certificate Quota"
  period="Current Plan"
  size="md"
>
  <CertificateQuotaChart />
</ChartCard>

// Product Management Card
<FeatureCard
  title="Product Catalog"
  description="Manage your product listings and certificates"
  icon={<ClipboardDocumentListIcon className="w-5 h-5" />}
  status="active"
/>

// Subscription Plan Overview
<Card size="md">
  <CardHeader>
    <CardTitle>Current Plan</CardTitle>
    <CardDescription>Premium - 1,000 votes/month</CardDescription>
  </CardHeader>
  <CardContent>
    <PlanUsageDisplay />
  </CardContent>
</Card>`}</pre>
          </div>
        </div>

        {/* Manufacturing Platform Specific Metrics */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Platform Metrics Overview</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">1,247</div>
              <div className="text-sm text-blue-800">Total Customer Votes</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">89</div>
              <div className="text-sm text-green-800">Certificates Issued</div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">7</div>
              <div className="text-sm text-yellow-800">Active Proposals</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">87.3%</div>
              <div className="text-sm text-purple-800">Approval Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

        {/* Code Examples */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Card Component Usage</h2>
          
          <div className="bg-gray-900 text-gray-300 p-4 rounded-lg text-sm font-mono overflow-x-auto">
            <pre>{`// Metric Card Example
<MetricCard
  title="Revenue churn"
  value="5.8%"
  change={{ value: 5.8, percentage: "5.8%", isPositive: true }}
  icon={<TrendingUpIcon className="w-4 h-4" />}
  size="sm"
/>

// Progress Card Example  
<ProgressCard
  title="Goals"
  description="Track progress towards goals"
  progress={75}
  value="$365.71"
  target="August 30"
  size="md"
/>

// Chart Card Example
<ChartCard
  title="Monthly recurring revenue"
  period="September"
  size="lg"
>
  <YourChartComponent />
</ChartCard>

// Feature Card Example
<FeatureCard
  title="Control centre"
  description="The lifeblood of your business"
  icon={<ChartBarIcon className="w-5 h-5" />}
  status="active"
  action={<Button>Configure</Button>}
/>

// Stats Grid Layout
<StatsGrid columns={4} gap="md">
  <MetricCard ... />
  <MetricCard ... />
  <MetricCard ... />
  <MetricCard ... />
</StatsGrid>`}</pre>
          </div>
        </div>

        {/* Size Examples */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Card Sizes Reference</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Compact</h3>
              <Card size="compact" className="flex items-center justify-center">
                <span className="text-xs text-gray-500">80px min</span>
              </Card>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Small</h3>
              <Card size="sm" className="flex items-center justify-center">
                <span className="text-xs text-gray-500">120px min</span>
              </Card>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Medium</h3>
              <Card size="md" className="flex items-center justify-center">
                <span className="text-xs text-gray-500">200px min</span>
              </Card>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Large</h3>
              <Card size="lg" className="flex items-center justify-center">
                <span className="text-xs text-gray-500">300px min</span>
              </Card>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Extra Large</h3>
              <Card size="xl" className="flex items-center justify-center">
                <span className="text-xs text-gray-500">400px min</span>
              </Card>
            </div>
          </div>
        </div>

        {/* Variant Examples */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Card Variants</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="default" size="sm" className="flex items-center justify-center">
              <span className="text-sm text-gray-600">Default</span>
            </Card>
            
            <Card variant="elevated" size="sm" className="flex items-center justify-center">
              <span className="text-sm text-gray-600">Elevated</span>
            </Card>
            
            <Card variant="interactive" size="sm" className="flex items-center justify-center">
              <span className="text-sm text-gray-600">Interactive</span>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}