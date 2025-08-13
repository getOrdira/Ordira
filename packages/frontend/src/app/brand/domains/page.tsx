/ src/app/domains/page.tsx
'use client';

import { useState } from 'react';
import { BrandLayout } from '@/components/layout/brand-layout';
import { 
  LinkIcon,
  PlusIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Domain {
  id: string;
  name: string;
  type: 'subdomain' | 'custom';
  status: 'active' | 'pending' | 'failed';
  createdAt: string;
  verified: boolean;
}

export default function DomainsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Mock data - replace with actual API calls
  const domains: Domain[] = [
    {
      id: '1',
      name: 'brand1.oursaasapp.com',
      type: 'subdomain',
      status: 'active',
      createdAt: '2025-01-05T00:00:00Z',
      verified: true,
    },
    {
      id: '2',
      name: 'shop.brand1.com',
      type: 'custom',
      status: 'active',
      createdAt: '2025-03-12T00:00:00Z',
      verified: true,
    },
    {
      id: '3',
      name: 'store.mybrand.com',
      type: 'custom',
      status: 'pending',
      createdAt: '2025-07-20T00:00:00Z',
      verified: false,
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      case 'failed':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      default:
        return <GlobeAltIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <BrandLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Custom Domains</h1>
            <p className="text-gray-600 mt-1">Manage your branded domains and subdomains</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Domain</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Cog6ToothIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm font-medium">Total Integrations</p>
                <p className="text-2xl font-bold text-gray-900">{integrations.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm font-medium">Connected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {integrations.filter(i => i.status === 'connected').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm font-medium">Issues</p>
                <p className="text-2xl font-bold text-gray-900">
                  {integrations.filter(i => i.status === 'error').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Available Integrations */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {availableIntegrations.map((integration) => (
              <div key={integration.type} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="text-4xl mb-2">{integration.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-1">{integration.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{integration.description}</p>
                  <button className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">
                    Connect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Connected Integrations */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Connected Integrations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Integration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Sync
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {integrations.map((integration) => (
                  <tr key={integration.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getStatusIcon(integration.status)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{integration.name}</div>
                          <div className="text-xs text-gray-500">
                            Connected {new Date(integration.connectedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {integration.type.charAt(0).toUpperCase() + integration.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(integration.status)}`}>
                        {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {integration.lastSync ? new Date(integration.lastSync).toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3">
                        Configure
                      </button>
                      <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                        Disconnect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {integrations.length === 0 && (
            <div className="text-center py-12">
              <Cog6ToothIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No integrations connected yet.</p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Connect Your First Integration
              </button>
            </div>
          )}
        </div>
      </div>
    </BrandLayout>
  );
}