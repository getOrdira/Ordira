export * from './env';
export {
  config,
  isFeatureEnabled,
  getApiUrl,
  getNetworkConfig,
  getCurrentNetwork,
  isTestnetNetwork,
  getEnvironmentConfig
} from './config';

import type {
  AppConfig as AppConfigType,
  ApiConfig as ApiConfigType,
  NetworkConfig as NetworkConfigType,
  FeatureFlag as FeatureFlagType
} from './config';

export type AppConfig = AppConfigType;
export type ApiConfig = ApiConfigType;
export type NetworkConfig = NetworkConfigType;
export type FeatureFlag = FeatureFlagType;
export { APP_CONSTANTS } from './constants';
export type {
  PageKey,
  UserRoleConstant as UserRole,
  PlanType,
  NotificationCategory,
  ApiPermission,
  CustomerSource,
  VotingSource,
  Country,
  Industry
} from './constants';

