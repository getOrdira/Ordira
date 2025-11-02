// src/controllers/features/nft/index.ts
// Export all NFT feature controllers

export * from './nftBase.controller';
export * from './nftData.controller';
export * from './nftDeployment.controller';
export * from './nftMinting.controller';
export * from './nftTransfer.controller';
export * from './nftAnalytics.controller';
export * from './nftBurning.controller';

// Export controller instances
export { nftDataController } from './nftData.controller';
export { nftDeploymentController } from './nftDeployment.controller';
export { nftMintingController } from './nftMinting.controller';
export { nftTransferController } from './nftTransfer.controller';
export { nftAnalyticsController } from './nftAnalytics.controller';
export { nftBurningController } from './nftBurning.controller';

