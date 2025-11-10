// src/lib/api/features/nft/index.ts
// NFT API barrel export

import nftAnalyticsApi from './nftAnalytics.api';
import nftBurningApi from './nftBurning.api';
import nftDataApi from './nftData.api';
import nftDeploymentApi from './nftDeployment.api';
import nftMintingApi from './nftMinting.api';
import nftTransferApi from './nftTransfer.api';

export * from './nftAnalytics.api';
export * from './nftBurning.api';
export * from './nftData.api';
export * from './nftDeployment.api';
export * from './nftMinting.api';
export * from './nftTransfer.api';

export {
  nftAnalyticsApi,
  nftBurningApi,
  nftDataApi,
  nftDeploymentApi,
  nftMintingApi,
  nftTransferApi
};

export const nftApi = {
  analytics: nftAnalyticsApi,
  burning: nftBurningApi,
  data: nftDataApi,
  deployment: nftDeploymentApi,
  minting: nftMintingApi,
  transfer: nftTransferApi
};

export default nftApi;

