// src/services/apiKey/utils/exportHelpers.ts
// Export and formatting utility functions

export function generateCSV(keys: any[]): string {
  const headers = ['Key ID', 'Name', 'Created At', 'Status', 'Permissions', 'Rate Limits', 'Description'];
  const rows = keys.map(key => [
    key.keyId,
    key.name || '',
    key.createdAt ? new Date(key.createdAt).toISOString() : '',
    key.isActive ? 'Active' : 'Inactive',
    key.permissions ? key.permissions.join(', ') : '',
    key.rateLimits ? `${key.rateLimits.requestsPerMinute}/min, ${key.rateLimits.requestsPerDay}/day` : '',
    key.description || ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  return csvContent;
}

export function formatApiKeyForExport(apiKey: any): any {
  return {
    keyId: apiKey.keyId,
    name: apiKey.name,
    createdAt: apiKey.createdAt,
    status: apiKey.isActive ? 'active' : 'inactive',
    permissions: apiKey.permissions || [],
    rateLimits: apiKey.rateLimits || {},
    description: apiKey.description,
    expiresAt: apiKey.expiresAt,
    lastUsed: apiKey.lastUsed,
    usage: apiKey.usage || {}
  };
}

export function performApiKeyTests(apiKey: any): any {
  return {
    keyId: apiKey.keyId,
    testTimestamp: new Date().toISOString(),
    tests: {
      keyExists: {
        status: 'passed',
        message: 'API key found and accessible'
      },
      isActive: {
        status: apiKey.isActive ? 'passed' : 'failed',
        message: apiKey.isActive ? 'API key is active' : 'API key is inactive'
      },
      notExpired: {
        status: !apiKey.expiresAt || apiKey.expiresAt > new Date() ? 'passed' : 'failed',
        message: !apiKey.expiresAt ? 'API key does not expire' : 
                 apiKey.expiresAt > new Date() ? 'API key is not expired' : 'API key has expired'
      },
      notRevoked: {
        status: !apiKey.revoked ? 'passed' : 'failed',
        message: !apiKey.revoked ? 'API key is not revoked' : 'API key has been revoked'
      },
      hasPermissions: {
        status: apiKey.permissions && apiKey.permissions.length > 0 ? 'passed' : 'warning',
        message: apiKey.permissions && apiKey.permissions.length > 0 ? 
                 `API key has ${apiKey.permissions.length} permission(s)` : 'API key has no permissions'
      }
    }
  };
}

export function generateTestRecommendations(tests: any): string[] {
  const recommendations = [];
  
  if (!tests.active.passed) {
    recommendations.push('Activate the API key to enable functionality');
  }
  
  if (!tests.notExpired.passed) {
    recommendations.push('Update the expiration date or remove expiration');
  }
  
  if (!tests.hasPermissions.passed) {
    recommendations.push('Add appropriate permissions to the API key');
  }
  
  return recommendations;
}

export function calculateDailyAverage(totalRequests: number, timeframe: string): number {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 30;
  return Math.round(totalRequests / days);
}

export function convertToCSV(keys: any[]): string {
  if (keys.length === 0) return 'No data to export';

  const headers = ['Key ID', 'Name', 'Description', 'Permissions', 'Is Active', 'Created At', 'Expires At'];
  const csvRows = [headers.join(',')];

  keys.forEach(key => {
    const row = [
      key.keyId,
      `"${key.name || ''}"`,
      `"${key.description || ''}"`,
      `"${key.permissions?.join(';') || ''}"`,
      key.isActive,
      key.createdAt,
      key.expiresAt || ''
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

