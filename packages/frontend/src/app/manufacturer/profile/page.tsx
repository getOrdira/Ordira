// src/app/manufacturer/profile/page.tsx
'use client';

import { useState } from 'react';
import { ManufacturerLayout } from '@/components/layout/manufacturer-layout';
import { useManufacturerProfile, useUpdateManufacturerProfile } from '@/lib/hooks/use-manufacturer-api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  UserIcon,
  BuildingOfficeIcon,
  CogIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  CameraIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
  PencilIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  contactEmail?: string;
  phone?: string;
  website?: string;
  industry?: string;
  description?: string;
  servicesOffered?: string[];
  moq?: number;
  profilePictureUrl?: string;
  location?: {
    country?: string;
    city?: string;
    address?: string;
  };
  businessInformation?: {
    establishedYear?: number;
    employeeCount?: string;
    annualRevenue?: string;
    businessLicense?: string;
    certifications?: string[];
  };
  isVerified: boolean;
  profileCompleteness: number;
  totalConnections: number;
  joinDate: string;
  lastActive?: string;
}

export default function ManufacturerProfilePage() {
  const [activeTab, setActiveTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ProfileData>>({});
  
  const { data: profileResponse, isLoading } = useManufacturerProfile();
  const { mutate: updateProfile, isLoading: isUpdating } = useUpdateManufacturerProfile();

  // Mock data - replace with actual API data
  const mockProfile: ProfileData = {
    id: 'mfg_001',
    name: 'Premium Manufacturing Co.',
    email: 'contact@premiummanufacturing.com',
    contactEmail: 'orders@premiummanufacturing.com',
    phone: '+1-555-123-4567',
    website: 'https://premiummanufacturing.com',
    industry: 'Sustainable Packaging',
    description: 'Leading manufacturer of sustainable packaging solutions with over 15 years of experience in eco-friendly production methods.',
    servicesOffered: ['Custom Packaging', 'Sustainable Materials', 'Bulk Production', 'Design Services'],
    moq: 1000,
    profilePictureUrl: '/images/company-logo.png',
    location: {
      country: 'United States',
      city: 'Portland',
      address: '123 Manufacturing Drive, Portland, OR 97201',
    },
    businessInformation: {
      establishedYear: 2008,
      employeeCount: '50-100',
      annualRevenue: '$5M-$10M',
      businessLicense: 'BL-2024-001',
      certifications: ['ISO 9001', 'FSC Certified', 'Sustainable Packaging Coalition'],
    },
    isVerified: true,
    profileCompleteness: 85,
    totalConnections: 12,
    joinDate: '2025-01-15',
    lastActive: '2025-08-13',
  };

  const profile = profileResponse?.data?.profile || mockProfile;

  const handleEdit = () => {
    setIsEditing(true);
    setFormData(profile);
  };

  const handleSave = () => {
    updateProfile(formData, {
      onSuccess: () => {
        setIsEditing(false);
      },
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({});
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getCompletenessColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const industries = [
    'Sustainable Packaging',
    'Electronics',
    'Textiles',
    'Automotive',
    'Food & Beverage',
    'Cosmetics',
    'Pharmaceuticals',
    'Construction',
    'Other',
  ];

  const employeeCounts = [
    '1-10',
    '11-25',
    '26-50',
    '51-100',
    '101-250',
    '251-500',
    '500+',
  ];

  const revenueRanges = [
    'Under $1M',
    '$1M-$5M',
    '$5M-$10M',
    '$10M-$50M',
    '$50M-$100M',
    'Over $100M',
  ];

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
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                  {profile.profilePictureUrl ? (
                    <img
                      src={profile.profilePictureUrl}
                      alt={profile.name}
                      className="w-24 h-24 rounded-lg object-cover"
                    />
                  ) : (
                    <BuildingOfficeIcon className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <button className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                  <CameraIcon className="w-4 h-4" />
                </button>
              </div>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                  {profile.isVerified && (
                    <CheckBadgeIcon className="w-6 h-6 text-blue-600" title="Verified Manufacturer" />
                  )}
                </div>
                <p className="text-gray-600 mt-1">{profile.industry}</p>
                <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                  <span className="flex items-center">
                    <EnvelopeIcon className="w-4 h-4 mr-1" />
                    {profile.email}
                  </span>
                  {profile.phone && (
                    <span className="flex items-center">
                      <PhoneIcon className="w-4 h-4 mr-1" />
                      {profile.phone}
                    </span>
                  )}
                  {profile.website && (
                    <span className="flex items-center">
                      <GlobeAltIcon className="w-4 h-4 mr-1" />
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                        Website
                      </a>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Profile Completeness</span>
                  <span className={`font-semibold ${getCompletenessColor(profile.profileCompleteness)}`}>
                    {profile.profileCompleteness}%
                  </span>
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${profile.profileCompleteness}%` }}
                  ></div>
                </div>
              </div>
              {!isEditing ? (
                <Button onClick={handleEdit} className="flex items-center">
                  <PencilIcon className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button onClick={handleCancel} variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isUpdating}>
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Connected Brands</p>
                <p className="text-2xl font-bold text-gray-900">{profile.totalConnections}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <CheckBadgeIcon className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Verification Status</p>
                <p className="text-lg font-semibold text-gray-900">
                  {profile.isVerified ? 'Verified' : 'Pending'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <UserIcon className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Member Since</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(profile.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General Information</TabsTrigger>
              <TabsTrigger value="business">Business Details</TabsTrigger>
              <TabsTrigger value="services">Services & Capabilities</TabsTrigger>
              <TabsTrigger value="verification">Verification</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name *
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="py-2 text-gray-900">{profile.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Industry *
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.industry || ''}
                        onChange={(e) => handleInputChange('industry', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Industry</option>
                        {industries.map((industry) => (
                          <option key={industry} value={industry}>{industry}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="py-2 text-gray-900">{profile.industry}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Description
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe your company, capabilities, and what makes you unique..."
                    />
                  ) : (
                    <p className="py-2 text-gray-900">{profile.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Email
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={formData.contactEmail || ''}
                        onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="py-2 text-gray-900">{profile.contactEmail}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="py-2 text-gray-900">{profile.phone}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={formData.website || ''}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://your-website.com"
                    />
                  ) : (
                    <p className="py-2 text-gray-900">
                      {profile.website ? (
                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                          {profile.website}
                        </a>
                      ) : (
                        'Not provided'
                      )}
                    </p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.location?.country || ''}
                          onChange={(e) => handleInputChange('location', { ...formData.location, country: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="py-2 text-gray-900">{profile.location?.country}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.location?.city || ''}
                          onChange={(e) => handleInputChange('location', { ...formData.location, city: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="py-2 text-gray-900">{profile.location?.city}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.location?.address || ''}
                        onChange={(e) => handleInputChange('location', { ...formData.location, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="py-2 text-gray-900">{profile.location?.address}</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="business" className="mt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Established Year
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={formData.businessInformation?.establishedYear || ''}
                        onChange={(e) => handleInputChange('businessInformation', { 
                          ...formData.businessInformation, 
                          establishedYear: parseInt(e.target.value) 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1900"
                        max={new Date().getFullYear()}
                      />
                    ) : (
                      <p className="py-2 text-gray-900">{profile.businessInformation?.establishedYear}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employee Count
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.businessInformation?.employeeCount || ''}
                        onChange={(e) => handleInputChange('businessInformation', { 
                          ...formData.businessInformation, 
                          employeeCount: e.target.value 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Range</option>
                        {employeeCounts.map((count) => (
                          <option key={count} value={count}>{count}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="py-2 text-gray-900">{profile.businessInformation?.employeeCount}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Annual Revenue
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.businessInformation?.annualRevenue || ''}
                        onChange={(e) => handleInputChange('businessInformation', { 
                          ...formData.businessInformation, 
                          annualRevenue: e.target.value 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Range</option>
                        {revenueRanges.map((range) => (
                          <option key={range} value={range}>{range}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="py-2 text-gray-900">{profile.businessInformation?.annualRevenue}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business License Number
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.businessInformation?.businessLicense || ''}
                      onChange={(e) => handleInputChange('businessInformation', { 
                        ...formData.businessInformation, 
                        businessLicense: e.target.value 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="py-2 text-gray-900">{profile.businessInformation?.businessLicense}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Certifications
                  </label>
                  <div className="space-y-2">
                    {profile.businessInformation?.certifications?.map((cert, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckBadgeIcon className="w-5 h-5 text-green-600" />
                        <span className="text-gray-900">{cert}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="services" className="mt-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Services Offered
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {profile.servicesOffered?.map((service, index) => (
                      <div key={index} className="flex items-center p-3 bg-blue-50 rounded-lg">
                        <CheckBadgeIcon className="w-5 h-5 text-blue-600 mr-2" />
                        <span className="text-blue-900 font-medium">{service}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Order Quantity (MOQ)
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={formData.moq || ''}
                      onChange={(e) => handleInputChange('moq', parseInt(e.target.value))}
                      className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                    />
                  ) : (
                    <p className="py-2 text-gray-900">{profile.moq?.toLocaleString()} units</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="verification" className="mt-6">
              <div className="space-y-6">
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  {profile.isVerified ? (
                    <>
                      <CheckBadgeIcon className="w-8 h-8 text-green-600" />
                      <div>
                        <h3 className="font-medium text-green-900">Verified Manufacturer</h3>
                        <p className="text-sm text-green-700">Your account has been successfully verified.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <ExclamationCircleIcon className="w-8 h-8 text-yellow-600" />
                      <div>
                        <h3 className="font-medium text-yellow-900">Verification Pending</h3>
                        <p className="text-sm text-yellow-700">Please submit required documents for verification.</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Required Documents</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <DocumentTextIcon className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-900">Business License</span>
                      </div>
                      {profile.isVerified ? (
                        <CheckBadgeIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <Button variant="outline" size="sm">Upload</Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <DocumentTextIcon className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-900">Tax Certificate</span>
                      </div>
                      {profile.isVerified ? (
                        <CheckBadgeIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <Button variant="outline" size="sm">Upload</Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <DocumentTextIcon className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-900">Proof of Address</span>
                      </div>
                      {profile.isVerified ? (
                        <CheckBadgeIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <Button variant="outline" size="sm">Upload</Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ManufacturerLayout>
  );
}