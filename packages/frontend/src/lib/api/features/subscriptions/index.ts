// src/lib/api/features/subscriptions/index.ts
// Subscriptions API barrel export

import subscriptionsAnalyticsApi from './subscriptionsAnalytics.api';
import subscriptionsBillingApi from './subscriptionsBilling.api';
import subscriptionsDataApi from './subscriptionsData.api';
import subscriptionsDiscountsApi from './subscriptionsDiscounts.api';
import subscriptionsLifecycleApi from './subscriptionsLifecycle.api';
import subscriptionsPlansApi from './subscriptionsPlans.api';
import subscriptionsUsageApi from './subscriptionsUsage.api';

export * from './subscriptionsAnalytics.api';
export * from './subscriptionsBilling.api';
export * from './subscriptionsData.api';
export * from './subscriptionsDiscounts.api';
export * from './subscriptionsLifecycle.api';
export * from './subscriptionsPlans.api';
export * from './subscriptionsUsage.api';

export {
  subscriptionsAnalyticsApi,
  subscriptionsBillingApi,
  subscriptionsDataApi,
  subscriptionsDiscountsApi,
  subscriptionsLifecycleApi,
  subscriptionsPlansApi,
  subscriptionsUsageApi
};

export const subscriptionsApi = {
  analytics: subscriptionsAnalyticsApi,
  billing: subscriptionsBillingApi,
  data: subscriptionsDataApi,
  discounts: subscriptionsDiscountsApi,
  lifecycle: subscriptionsLifecycleApi,
  plans: subscriptionsPlansApi,
  usage: subscriptionsUsageApi
};

export default subscriptionsApi;
