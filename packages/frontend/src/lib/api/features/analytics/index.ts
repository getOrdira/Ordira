// src/lib/api/features/analytics/index.ts
// Analytics API barrel export

import analyticsDashboardApi from './analyticsDashboard.api';
import analyticsInsightsApi from './analyticsInsights.api';
import analyticsPlatformDataApi from './analyticsPlatformData.api';
import analyticsReportGenerationApi from './analyticsReportGeneration.api';
import analyticsReportingApi from './analyticsReporting.api';
import analyticsSystemHealthApi from './analyticsSystemHealth.api';

export * from './analyticsDashboard.api';
export * from './analyticsInsights.api';
export * from './analyticsPlatformData.api';
export * from './analyticsReportGeneration.api';
export * from './analyticsReporting.api';
export * from './analyticsSystemHealth.api';

export {
  analyticsDashboardApi,
  analyticsInsightsApi,
  analyticsPlatformDataApi,
  analyticsReportGenerationApi,
  analyticsReportingApi,
  analyticsSystemHealthApi,
};

export const analyticsApi = {
  dashboard: analyticsDashboardApi,
  insights: analyticsInsightsApi,
  platform: analyticsPlatformDataApi,
  reports: analyticsReportGenerationApi,
  reporting: analyticsReportingApi,
  health: analyticsSystemHealthApi,
};

export default analyticsApi;

