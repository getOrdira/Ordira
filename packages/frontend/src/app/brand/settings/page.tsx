// src/app/(brand)/settings/page.tsx
'use client';

import { useState } from 'react';
import { BrandLayout } from '@/components/layout/brand-layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UserIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  BellIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  KeyIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PencilIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/hooks/use-auth';

interface SettingsSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  description: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Form states
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: '',
    avatar: '',
  });

  const [businessData, setBusinessData] = useState({
    businessName: user?.businessName || '',
    businessAddress: '',
    businessWebsite: '',
    businessNumber: '',
    industry: '',
    description: '',
    logo: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    voteUpdates: true,
    certificateUpdates: true,
    orderUpdates: true,
    marketingEmails: false,
    securityAlerts: true,
  });

  const [billingData, setBillingData] = useState({
    plan: 'Foundation',
    billingEmail: user?.email || '',
    paymentMethod: '**** **** **** 1234',
    nextBilling: '2024-02-15',
  });

  const settingsSections: SettingsSection[] = [
    {
      id: 'profile',
      title: 'Profile',
      icon: UserIcon,
      description: 'Personal information and account details',
    },
    {
      id: 'business',
      title: 'Business',
      icon: BuildingOfficeIcon,
      description: 'Company information and branding',
    },
    {
      id: 'billing',
      title: 'Billing',
      icon: CreditCardIcon,
      description: 'Subscription and payment settings',
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: BellIcon,
      description: 'Email and alert preferences',
    },
    {
      id: 'security',
      title: 'Security',
      icon: ShieldCheckIcon,
      description: 'Password and authentication settings',
    },
    {
      id: 'domains',
      title: 'Domains',
      icon: GlobeAltIcon,
      description: 'Custom domain configuration',
    },
    {
      id: 'api',
      title: 'API Keys',
      icon: KeyIcon,
      description: 'Integration and API management',
    },
    {
      id: 'advanced',
      title: 'Advanced',
      icon: Cog6ToothIcon,
      description: 'Advanced settings and preferences',
    },
  ];

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // Implement profile update API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      console.log('Profile updated:', profileData);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBusiness = async () => {
    setIsLoading(true);
    try {
      // Implement business update API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      console.log('Business updated:', businessData);
    } catch (error) {
      console.error('Error updating business:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsLoading(true);
    try {
      // Implement notifications update API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      console.log('Notifications updated:', notificationSettings);
    } catch (error) {
      console.error('Error updating notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BrandLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your account, business information, and preferences
          </p>
        </div>

        {/* Settings Navigation */}
        <div className="bg-white rounded-xl border border-gray-200">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-200">
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto p-1">
                {settingsSections.map((section) => {
                  const IconComponent = section.icon;
                  return (
                    <TabsTrigger 
                      key={section.id}
                      value={section.id}
                      className="flex flex-col items-center p-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                    >
                      <IconComponent className="w-5 h-5 mb-1" />
                      <span className="text-xs font-medium">{section.title}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {/* Profile Settings */}
            <TabsContent value="profile" className="p-6">
              <div className="max-w-2xl">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Information</h3>
                  <p className="text-gray-600">Update your personal information and account details.</p>
                </div>

                <div className="space-y-6">
                  {/* Avatar Upload */}
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                      <UserIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <Button variant="outline" size="sm">
                        <PencilIcon className="w-4 h-4 mr-2" />
                        Change Avatar
                      </Button>
                      <p className="text-sm text-gray-500 mt-1">JPG, PNG up to 2MB</p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileData.fullName}
                        onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        placeholder="+1 (555) 123-4567"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time Zone
                      </label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option>Eastern Time (ET)</option>
                        <option>Central Time (CT)</option>
                        <option>Mountain Time (MT)</option>
                        <option>Pacific Time (PT)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <Button 
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Business Settings */}
            <TabsContent value="business" className="p-6">
              <div className="max-w-2xl">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Information</h3>
                  <p className="text-gray-600">Update your company details and branding information.</p>
                </div>

                <div className="space-y-6">
                  {/* Business Logo */}
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                      <BuildingOfficeIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <Button variant="outline" size="sm">
                        <PencilIcon className="w-4 h-4 mr-2" />
                        Change Logo
                      </Button>
                      <p className="text-sm text-gray-500 mt-1">Square logo preferred, up to 2MB</p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Name
                      </label>
                      <input
                        type="text"
                        value={businessData.businessName}
                        onChange={(e) => setBusinessData({...businessData, businessName: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Industry
                        </label>
                        <select 
                          value={businessData.industry}
                          onChange={(e) => setBusinessData({...businessData, industry: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select Industry</option>
                          <option value="sustainable">Sustainable Products</option>
                          <option value="electronics">Electronics</option>
                          <option value="fashion">Fashion & Apparel</option>
                          <option value="home">Home & Garden</option>
                          <option value="beauty">Beauty & Personal Care</option>
                          <option value="food">Food & Beverage</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Business Number
                        </label>
                        <input
                          type="text"
                          value={businessData.businessNumber}
                          onChange={(e) => setBusinessData({...businessData, businessNumber: e.target.value})}
                          placeholder="Tax ID or Registration Number"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Address
                      </label>
                      <textarea
                        value={businessData.businessAddress}
                        onChange={(e) => setBusinessData({...businessData, businessAddress: e.target.value})}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website URL
                      </label>
                      <input
                        type="url"
                        value={businessData.businessWebsite}
                        onChange={(e) => setBusinessData({...businessData, businessWebsite: e.target.value})}
                        placeholder="https://your-website.com"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Description
                      </label>
                      <textarea
                        value={businessData.description}
                        onChange={(e) => setBusinessData({...businessData, description: e.target.value})}
                        rows={4}
                        placeholder="Brief description of your business and products..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <Button 
                      onClick={handleSaveBusiness}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Billing Settings */}
            <TabsContent value="billing" className="p-6">
              <div className="max-w-2xl">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Billing & Subscription</h3>
                  <p className="text-gray-600">Manage your subscription plan and payment methods.</p>
                </div>

                <div className="space-y-6">
                  {/* Current Plan */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-blue-900">Current Plan: {billingData.plan}</h4>
                        <p className="text-sm text-blue-700">Next billing date: {billingData.nextBilling}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Upgrade Plan
                      </Button>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <div className="flex items-center justify-between p-3 border border-gray-300 rounded-lg">
                      <div className="flex items-center">
                        <CreditCardIcon className="w-5 h-5 text-gray-400 mr-3" />
                        <span>{billingData.paymentMethod}</span>
                      </div>
                      <Button variant="outline" size="sm">
                        Update
                      </Button>
                    </div>
                  </div>

                  {/* Billing Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Billing Email
                    </label>
                    <input
                      type="email"
                      value={billingData.billingEmail}
                      onChange={(e) => setBillingData({...billingData, billingEmail: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Plan Features */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Current Plan Features</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center">
                        <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                        Unlimited voting proposals
                      </li>
                      <li className="flex items-center">
                        <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                        Basic certificate minting
                      </li>
                      <li className="flex items-center">
                        <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                        Standard analytics
                      </li>
                      <li className="flex items-center">
                        <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 mr-2" />
                        Advanced integrations (Premium)
                      </li>
                      <li className="flex items-center">
                        <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 mr-2" />
                        Custom domains (Premium)
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Notifications Settings */}
            <TabsContent value="notifications" className="p-6">
              <div className="max-w-2xl">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Notification Preferences</h3>
                  <p className="text-gray-600">Control what notifications you receive and how.</p>
                </div>

                <div className="space-y-6">
                  {/* Email Notifications */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Email Notifications</h4>
                    <div className="space-y-4">
                      {[
                        { key: 'emailNotifications', label: 'Email notifications', description: 'Receive general email notifications' },
                        { key: 'voteUpdates', label: 'Vote updates', description: 'New votes and proposal status changes' },
                        { key: 'certificateUpdates', label: 'Certificate updates', description: 'Certificate minting and blockchain confirmations' },
                        { key: 'orderUpdates', label: 'Order updates', description: 'Order status and fulfillment notifications' },
                        { key: 'securityAlerts', label: 'Security alerts', description: 'Important security and account notifications' },
                        { key: 'marketingEmails', label: 'Marketing emails', description: 'Product updates and promotional content' },
                      ].map((setting) => (
                        <div key={setting.key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{setting.label}</p>
                            <p className="text-sm text-gray-600">{setting.description}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationSettings[setting.key as keyof typeof notificationSettings]}
                              onChange={(e) => setNotificationSettings({
                                ...notificationSettings,
                                [setting.key]: e.target.checked
                              })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <Button 
                      onClick={handleSaveNotifications}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoading ? 'Saving...' : 'Save Preferences'}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security" className="p-6">
              <div className="max-w-2xl">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Security Settings</h3>
                  <p className="text-gray-600">Manage your password and account security.</p>
                </div>

                <div className="space-y-6">
                  {/* Change Password */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-4">Change Password</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password
                        </label>
                        <input
                          type="password"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <Button variant="outline">
                        Update Password
                      </Button>
                    </div>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                        <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Enable 2FA
                      </Button>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-4">Recent Login Activity</h4>
                    <div className="space-y-3">
                      {[
                        { device: 'Chrome on Mac', location: 'San Francisco, CA', time: '2 hours ago', current: true },
                        { device: 'Safari on iPhone', location: 'San Francisco, CA', time: '1 day ago', current: false },
                        { device: 'Chrome on Windows', location: 'New York, NY', time: '3 days ago', current: false },
                      ].map((activity, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {activity.device}
                              {activity.current && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Current</span>}
                            </p>
                            <p className="text-xs text-gray-600">{activity.location} • {activity.time}</p>
                          </div>
                          {!activity.current && (
                            <Button variant="outline" size="sm">
                              Revoke
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* API Keys Settings */}
            <TabsContent value="api" className="p-6">
              <div className="max-w-2xl">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">API Keys</h3>
                  <p className="text-gray-600">Manage API keys for integrations and third-party access.</p>
                </div>

                <div className="space-y-6">
                  {/* Create API Key */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900">Create API Key</h4>
                        <p className="text-sm text-blue-700 mt-1">Generate a new API key for integrations</p>
                      </div>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Generate Key
                      </Button>
                    </div>
                  </div>

                  {/* Existing API Keys */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Existing API Keys</h4>
                    <div className="space-y-3">
                      {[
                        { name: 'Production API', key: 'pk_live_1234567890abcdef', created: '2024-01-15', lastUsed: '2 hours ago' },
                        { name: 'Development API', key: 'pk_test_abcdef1234567890', created: '2024-01-10', lastUsed: '1 day ago' },
                      ].map((apiKey, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-900">{apiKey.name}</h5>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowApiKey(!showApiKey)}
                              >
                                {showApiKey ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded p-2 font-mono text-sm mb-2">
                            {showApiKey ? apiKey.key : apiKey.key.replace(/./g, '•')}
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Created: {apiKey.created}</span>
                            <span>Last used: {apiKey.lastUsed}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Advanced Settings */}
            <TabsContent value="advanced" className="p-6">
              <div className="max-w-2xl">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Settings</h3>
                  <p className="text-gray-600">Advanced configuration and account management options.</p>
                </div>

                <div className="space-y-6">
                  {/* Data Export */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Export Account Data</h4>
                    <p className="text-sm text-gray-600 mb-4">Download all your account data including votes, certificates, and products.</p>
                    <Button variant="outline">
                      Request Data Export
                    </Button>
                  </div>

                  {/* Delete Account */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-900 mb-2">Delete Account</h4>
                    <p className="text-sm text-red-700 mb-4">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                      <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Domains Settings (Premium Feature) */}
            <TabsContent value="domains" className="p-6">
              <div className="max-w-2xl">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Custom Domains</h3>
                  <p className="text-gray-600">Configure custom domains for your voting and certificate pages.</p>
                </div>

                {/* Premium Feature Notice */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900">Premium Feature</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Custom domains are available on Premium and Enterprise plans. 
                        <Button variant="link" className="p-0 h-auto ml-1 text-yellow-700 underline">
                          Upgrade your plan
                        </Button> to access this feature.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="opacity-50 pointer-events-none">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Domain Name
                      </label>
                      <input
                        type="text"
                        placeholder="voting.yourbrand.com"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        disabled
                      />
                    </div>
                    <Button disabled>
                      Add Domain
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </BrandLayout>
  );
}