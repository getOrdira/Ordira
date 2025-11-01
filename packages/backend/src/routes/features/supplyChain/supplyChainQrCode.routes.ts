// src/routes/features/supplyChain/supplyChainQrCode.routes.ts
// Supply chain QR code routes using modular supply chain QR code controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { supplyChainQrCodeController } from '../../../controllers/features/supplyChain/supplyChainQrCode.controller';

const generateSupplyChainQRBodySchema = Joi.object({
  productId: Joi.string().trim().min(1).max(200).required(),
  productName: Joi.string().trim().min(1).max(200).required(),
  manufacturerId: Joi.string().trim().min(1).max(200).required(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  businessId: Joi.string().trim().optional(),
  options: Joi.object({
    size: Joi.number().integer().min(64).max(2048).optional(),
    format: Joi.string().valid('png', 'svg', 'pdf').optional(),
    errorCorrectionLevel: Joi.string().valid('L', 'M', 'Q', 'H').optional(),
    margin: Joi.number().integer().min(0).max(20).optional(),
    color: Joi.object({
      dark: Joi.string().trim().optional(),
      light: Joi.string().trim().optional()
    }).optional(),
    logo: Joi.object({
      url: Joi.string().trim().required(),
      size: Joi.number().integer().min(1).optional()
    }).optional()
  }).optional()
});

const generateCertificateQRBodySchema = Joi.object({
  certificateId: Joi.string().trim().min(1).max(200).required(),
  tokenId: Joi.string().trim().min(1).max(200).required(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  options: Joi.object({
    size: Joi.number().integer().min(64).max(2048).optional(),
    format: Joi.string().valid('png', 'svg', 'pdf').optional(),
    errorCorrectionLevel: Joi.string().valid('L', 'M', 'Q', 'H').optional(),
    margin: Joi.number().integer().min(0).max(20).optional(),
    color: Joi.object({
      dark: Joi.string().trim().optional(),
      light: Joi.string().trim().optional()
    }).optional(),
    logo: Joi.object({
      url: Joi.string().trim().required(),
      size: Joi.number().integer().min(1).optional()
    }).optional()
  }).optional()
});

const generateVotingQRBodySchema = Joi.object({
  proposalId: Joi.string().trim().min(1).max(200).required(),
  voterEmail: Joi.string().email().max(255).required(),
  options: Joi.object({
    size: Joi.number().integer().min(64).max(2048).optional(),
    format: Joi.string().valid('png', 'svg', 'pdf').optional(),
    errorCorrectionLevel: Joi.string().valid('L', 'M', 'Q', 'H').optional(),
    margin: Joi.number().integer().min(0).max(20).optional(),
    color: Joi.object({
      dark: Joi.string().trim().optional(),
      light: Joi.string().trim().optional()
    }).optional(),
    logo: Joi.object({
      url: Joi.string().trim().required(),
      size: Joi.number().integer().min(1).optional()
    }).optional()
  }).optional()
});

const generateQRWithLogoBodySchema = Joi.object({
  type: Joi.string().valid('supply_chain_tracking', 'certificate_verification', 'voting').required(),
  data: Joi.object().unknown(true).optional(),
  logoUrl: Joi.string().trim().required(),
  options: Joi.object({
    size: Joi.number().integer().min(64).max(2048).optional(),
    format: Joi.string().valid('png', 'svg', 'pdf').optional(),
    errorCorrectionLevel: Joi.string().valid('L', 'M', 'Q', 'H').optional(),
    margin: Joi.number().integer().min(0).max(20).optional(),
    color: Joi.object({
      dark: Joi.string().trim().optional(),
      light: Joi.string().trim().optional()
    }).optional()
  }).optional()
});

const generateBatchQRBodySchema = Joi.object({
  requests: Joi.array().items(Joi.object({
    type: Joi.string().valid('supply_chain_tracking', 'certificate_verification', 'voting').optional(),
    data: Joi.object().unknown(true).optional(),
    options: Joi.object({
      size: Joi.number().integer().min(64).max(2048).optional(),
      format: Joi.string().valid('png', 'svg', 'pdf').optional(),
      errorCorrectionLevel: Joi.string().valid('L', 'M', 'Q', 'H').optional(),
      margin: Joi.number().integer().min(0).max(20).optional(),
      color: Joi.object({
        dark: Joi.string().trim().optional(),
        light: Joi.string().trim().optional()
      }).optional(),
      logo: Joi.object({
        url: Joi.string().trim().required(),
        size: Joi.number().integer().min(1).optional()
      }).optional()
    }).optional()
  })).min(1).max(50).required()
});

const parseQRBodySchema = Joi.object({
  qrCodeData: Joi.string().trim().required()
});

const validateQRBodySchema = Joi.object({
  data: Joi.object().unknown(true).required()
});

const getQRStatsQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required()
});

const regenerateQRBodySchema = Joi.object({
  type: Joi.string().valid('supply_chain_tracking', 'certificate_verification', 'voting').optional(),
  data: Joi.object().unknown(true).optional(),
  options: Joi.object({
    size: Joi.number().integer().min(64).max(2048).optional(),
    format: Joi.string().valid('png', 'svg', 'pdf').optional(),
    errorCorrectionLevel: Joi.string().valid('L', 'M', 'Q', 'H').optional(),
    margin: Joi.number().integer().min(0).max(20).optional(),
    color: Joi.object({
      dark: Joi.string().trim().optional(),
      light: Joi.string().trim().optional()
    }).optional(),
    logo: Joi.object({
      url: Joi.string().trim().required(),
      size: Joi.number().integer().min(1).optional()
    }).optional()
  }).optional()
});

const deactivateQRBodySchema = Joi.object({
  qrCodeId: Joi.string().trim().required(),
  reason: Joi.string().trim().max(1000).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Generate supply chain QR code
builder.post(
  '/generate-supply-chain',
  createHandler(supplyChainQrCodeController, 'generateSupplyChainQrCode'),
  {
    validateBody: generateSupplyChainQRBodySchema
  }
);

// Generate certificate QR code
builder.post(
  '/generate-certificate',
  createHandler(supplyChainQrCodeController, 'generateCertificateQrCode'),
  {
    validateBody: generateCertificateQRBodySchema
  }
);

// Generate voting QR code
builder.post(
  '/generate-voting',
  createHandler(supplyChainQrCodeController, 'generateVotingQrCode'),
  {
    validateBody: generateVotingQRBodySchema
  }
);

// Generate QR code with logo
builder.post(
  '/generate-with-logo',
  createHandler(supplyChainQrCodeController, 'generateQrCodeWithLogo'),
  {
    validateBody: generateQRWithLogoBodySchema
  }
);

// Generate batch QR codes
builder.post(
  '/batch',
  createHandler(supplyChainQrCodeController, 'generateBatchQrCodes'),
  {
    validateBody: generateBatchQRBodySchema
  }
);

// Parse QR code data
builder.post(
  '/parse',
  createHandler(supplyChainQrCodeController, 'parseQrCodeData'),
  {
    validateBody: parseQRBodySchema
  }
);

// Validate QR code data
builder.post(
  '/validate',
  createHandler(supplyChainQrCodeController, 'validateQrCodeData'),
  {
    validateBody: validateQRBodySchema
  }
);

// Get QR code statistics
builder.get(
  '/statistics',
  createHandler(supplyChainQrCodeController, 'getQrCodeStatistics'),
  {
    validateQuery: getQRStatsQuerySchema
  }
);

// Regenerate QR code
builder.post(
  '/regenerate',
  createHandler(supplyChainQrCodeController, 'regenerateQrCode'),
  {
    validateBody: regenerateQRBodySchema
  }
);

// Deactivate QR code
builder.post(
  '/deactivate',
  createHandler(supplyChainQrCodeController, 'deactivateQrCode'),
  {
    validateBody: deactivateQRBodySchema
  }
);

export default builder.getRouter();