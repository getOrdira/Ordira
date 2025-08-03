// src/routes/nfts.routes.ts

import { Router } from 'express';
import * as nftsCtrl from '../controllers/nfts.controller';
import { validateBody } from '../middleware/validation.middleware';
import { deployNftSchema, mintNftSchema } from '../validation/nfts.validation';

const nftsRouter = Router();

// Deploy a new NFT contract
nftsRouter.post(
  '/deploy',
  validateBody(deployNftSchema),
  nftsCtrl.deployNft
);

// List all NFT contracts for the brand
nftsRouter.get(
  '/',
  nftsCtrl.listNftContracts
);

// List all issued certificates (optionally filter by productId)
nftsRouter.get(
  '/certificates',
  nftsCtrl.listCertificates
);

// Mint a new certificate NFT\ nftsRouter.post(
nftsRouter.post(  
'/mint',
  validateBody(mintNftSchema),
  nftsCtrl.mintNft
);

export default nftsRouter;



