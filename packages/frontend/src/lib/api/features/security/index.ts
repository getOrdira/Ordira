// src/lib/api/features/security/index.ts
// Security API barrel export

import captchaApi from './captcha.api';
import securityAnalyticsApi from './securityAnalytics.api';
import securityAuditApi from './securityAudit.api';
import securityEventsApi from './securityEvents.api';
import securityScanningApi from './securityScanning.api';
import securitySessionsApi from './securitySessions.api';
import securityTokensApi from './securityTokens.api';

export * from './captcha.api';
export * from './securityAnalytics.api';
export * from './securityAudit.api';
export * from './securityEvents.api';
export * from './securityScanning.api';
export * from './securitySessions.api';
export * from './securityTokens.api';

export {
  captchaApi,
  securityAnalyticsApi,
  securityAuditApi,
  securityEventsApi,
  securityScanningApi,
  securitySessionsApi,
  securityTokensApi
};

export const securityApi = {
  captcha: captchaApi,
  analytics: securityAnalyticsApi,
  audit: securityAuditApi,
  events: securityEventsApi,
  scanning: securityScanningApi,
  sessions: securitySessionsApi,
  tokens: securityTokensApi
};

export default securityApi;

// Placeholder - to be implemented



