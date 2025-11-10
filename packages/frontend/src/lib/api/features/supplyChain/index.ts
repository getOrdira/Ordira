// src/lib/api/features/supplyChain/index.ts
// Supply chain API barrel export

import supplyChainAnalyticsApi from './supplyChainAnalytics.api';
import supplyChainAssociationApi from './supplyChainAssociation.api';
import supplyChainContractReadApi from './supplyChainContractRead.api';
import supplyChainContractWriteApi from './supplyChainContractWrite.api';
import supplyChainDashboardApi from './supplyChainDashboard.api';
import supplyChainDeploymentApi from './supplyChainDeployment.api';
import supplyChainProductLifecycleApi from './supplyChainProductLifecycle.api';
import supplyChainQrCodeApi from './supplyChainQrCode.api';

export * from './supplyChainAnalytics.api';
export * from './supplyChainAssociation.api';
export * from './supplyChainContractRead.api';
export * from './supplyChainContractWrite.api';
export * from './supplyChainDashboard.api';
export * from './supplyChainDeployment.api';
export * from './supplyChainProductLifecycle.api';
export * from './supplyChainQrCode.api';

export {
  supplyChainAnalyticsApi,
  supplyChainAssociationApi,
  supplyChainContractReadApi,
  supplyChainContractWriteApi,
  supplyChainDashboardApi,
  supplyChainDeploymentApi,
  supplyChainProductLifecycleApi,
  supplyChainQrCodeApi
};

export const supplyChainApi = {
  analytics: supplyChainAnalyticsApi,
  association: supplyChainAssociationApi,
  contractRead: supplyChainContractReadApi,
  contractWrite: supplyChainContractWriteApi,
  dashboard: supplyChainDashboardApi,
  deployment: supplyChainDeploymentApi,
  productLifecycle: supplyChainProductLifecycleApi,
  qrCode: supplyChainQrCodeApi
};

export default supplyChainApi;