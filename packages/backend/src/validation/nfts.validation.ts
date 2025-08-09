// src/validation/nfts.validation.ts
import Joi from 'joi';
import { commonSchemas, customJoi } from '../middleware/validation.middleware';

/**
 * Enhanced NFT validation with comprehensive Web3 and business logic
 */

// NFT contract deployment validation
export const deployNftSchema = Joi.object({
  // Basic contract information
  name: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .pattern(/^[a-zA-Z0-9\s\-_'\.]+$/)
    .custom((value, helpers) => {
      // Check for inappropriate content
      const inappropriate = ['test', 'demo', 'fake', 'scam', 'spam'];
      if (inappropriate.some(word => value.toLowerCase().includes(word))) {
        return helpers.error('string.inappropriateName');
      }
      
      // Ensure professional naming
      if (value.length < 5) {
        helpers.state.path.push('shortName');
      }
      
      return value;
    })
    .required()
    .messages({
      'string.min': 'NFT collection name must be at least 3 characters',
      'string.max': 'NFT collection name cannot exceed 50 characters',
      'string.pattern.base': 'Name can only contain letters, numbers, spaces, hyphens, underscores, apostrophes, and periods',
      'string.inappropriateName': 'Name contains inappropriate content'
    }),

  symbol: Joi.string()
    .trim()
    .min(2)
    .max(10)
    .uppercase()
    .pattern(/^[A-Z0-9]+$/)
    .custom((value, helpers) => {
      // Check for reserved symbols
      const reserved = ['ETH', 'BTC', 'USDC', 'USDT', 'DAI', 'WETH', 'NFT', 'ERC'];
      if (reserved.includes(value)) {
        return helpers.error('string.reservedSymbol');
      }
      
      // Prefer 3-5 character symbols
      if (value.length >= 3 && value.length <= 5) {
        helpers.state.path.push('goodLength');
      }
      
      return value;
    })
    .required()
    .messages({
      'string.min': 'Symbol must be at least 2 characters',
      'string.max': 'Symbol cannot exceed 10 characters',
      'string.pattern.base': 'Symbol can only contain uppercase letters and numbers',
      'string.reservedSymbol': 'This symbol is reserved and cannot be used'
    }),

  baseUri: commonSchemas.url
    .custom((value, helpers) => {
      // Validate IPFS or other decentralized storage
      const validProtocols = ['https://', 'ipfs://', 'ar://'];
      const hasValidProtocol = validProtocols.some(protocol => 
        value.toLowerCase().startsWith(protocol)
      );
      
      if (!hasValidProtocol) {
        return helpers.error('uri.invalidProtocol');
      }
      
      // Prefer decentralized storage
      if (value.startsWith('ipfs://') || value.startsWith('ar://')) {
        helpers.state.path.push('decentralizedStorage');
      }
      
      // Check for trusted IPFS gateways
      const trustedGateways = [
        'ipfs.io', 'gateway.pinata.cloud', 'cloudflare-ipfs.com',
        'dweb.link', 'nftstorage.link', 'infura-ipfs.io'
      ];
      
      if (value.startsWith('https://')) {
        const isTrustedGateway = trustedGateways.some(gateway => 
          value.includes(gateway)
        );
        
        if (!isTrustedGateway) {
          helpers.state.path.push('untrustedGateway');
        }
      }
      
      return value;
    })
    .required()
    .messages({
      'uri.invalidProtocol': 'Base URI must use HTTPS or IPFS protocol'
    }),

  // Advanced contract configuration
  contractSettings: Joi.object({
    maxSupply: Joi.number()
      .integer()
      .min(1)
      .max(10000)
      .custom((value, helpers) => {
        // Business logic for supply limits
        if (value > 5000) {
          helpers.state.path.push('largeSupply');
        }
        
        return value;
      })
      .messages({
        'number.min': 'Maximum supply must be at least 1',
        'number.max': 'Maximum supply cannot exceed 10,000 for standard collections'
      })
      .optional(),

    royaltyPercentage: Joi.number()
      .min(0)
      .max(10)
      .precision(2)
      .default(2.5)
      .messages({
        'number.min': 'Royalty percentage cannot be negative',
        'number.max': 'Royalty percentage cannot exceed 10%',
        'number.precision': 'Royalty percentage can have maximum 2 decimal places'
      })
      .optional(),

    mintPrice: Joi.number()
      .min(0)
      .precision(6) // Support up to 6 decimal places for crypto
      .custom((value, helpers) => {
        if (value === 0) {
          helpers.state.path.push('freeMint');
        } else if (value < 0.001) {
          helpers.state.path.push('veryLowPrice');
        }
        
        return value;
      })
      .optional(),

    enableWhitelist: Joi.boolean().default(false).optional(),
    enableReveal: Joi.boolean().default(true).optional(),
    transferable: Joi.boolean().default(true).optional()
  }).optional(),

  // Metadata standards
  metadataStandard: Joi.string()
    .valid('ERC721', 'ERC1155', 'OpenSea', 'Custom')
    .default('ERC721')
    .optional(),

  // Network configuration
  networkConfig: Joi.object({
    chainId: Joi.number()
      .integer()
      .valid(1, 5, 137, 80001, 56, 97, 43114, 43113, 250, 4002) // Major networks
      .default(1)
      .messages({
        'any.only': 'Unsupported blockchain network'
      })
      .optional(),

    gasLimit: Joi.number()
      .integer()
      .min(100000)
      .max(8000000)
      .default(500000)
      .optional(),

    gasPrice: Joi.number()
      .min(1)
      .max(1000)
      .optional() // In Gwei
  }).optional()
});

// Enhanced NFT minting validation
export const mintNftSchema = Joi.object({
  // Product reference
  productId: commonSchemas.mongoId
    .custom(async (value, helpers) => {
      // Could add database validation here if needed
      return value;
    }),

  // Recipient validation
  recipient: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .custom((value, helpers) => {
      const address = value.toLowerCase();
      
      // Check for burn addresses and invalid addresses
      const invalidAddresses = [
        '0x0000000000000000000000000000000000000000', // Zero address
        '0x000000000000000000000000000000000000dead', // Dead address
        '0xffffffffffffffffffffffffffffffffffffffff'  // Max address
      ];
      
      if (invalidAddresses.includes(address)) {
        return helpers.error('string.invalidRecipient');
      }
      
      // Check for common contract addresses (might not be suitable for NFT recipients)
      const commonContracts = [
        '0xa0b86a33e6776c9c8b6c8a2da7b1a1b7f3d2c4d5', // Example contract
        '0xdac17f958d2ee523a2206206994597c13d831ec7'  // USDT contract
      ];
      
      if (commonContracts.includes(address)) {
        helpers.state.path.push('contractAddress');
      }
      
      return value;
    })
    .required()
    .messages({
      'string.pattern.base': 'Recipient must be a valid Ethereum address (42 characters starting with 0x)',
      'string.invalidRecipient': 'Invalid or restricted recipient address'
    }),

  // NFT-specific metadata
  metadata: Joi.object({
    name: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.empty': 'NFT name is required',
        'string.max': 'NFT name cannot exceed 100 characters'
      }),

    description: Joi.string()
      .trim()
      .max(1000)
      .optional(),

    image: commonSchemas.url
      .custom((value, helpers) => {
        // Validate image URL for NFT
        const imageFormats = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
        const hasValidFormat = imageFormats.some(format => 
          value.toLowerCase().includes(format)
        );
        
        if (!hasValidFormat && !value.startsWith('ipfs://')) {
          return helpers.error('url.invalidNftImage');
        }
        
        return value;
      })
      .required()
      .messages({
        'url.invalidNftImage': 'Image must be a valid image URL or IPFS hash'
      }),

    attributes: Joi.array()
      .items(
        Joi.object({
          trait_type: Joi.string().trim().min(1).max(50).required(),
          value: Joi.alternatives().try(
            Joi.string().max(100),
            Joi.number(),
            Joi.boolean()
          ).required(),
          display_type: Joi.string()
            .valid('number', 'boost_percentage', 'boost_number', 'date')
            .optional()
        })
      )
      .max(50)
      .optional()
      .messages({
        'array.max': 'Maximum 50 attributes allowed per NFT'
      }),

    external_url: commonSchemas.optionalUrl,
    animation_url: commonSchemas.optionalUrl,
    youtube_url: commonSchemas.optionalUrl
  }).required(),

  // Minting options
  mintingOptions: Joi.object({
    quantity: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(1)
      .messages({
        'number.min': 'Quantity must be at least 1',
        'number.max': 'Cannot mint more than 100 NFTs in a single transaction'
      }),

    transferable: Joi.boolean().default(true),
    
    lockUntil: Joi.date()
      .iso()
      .min('now')
      .optional()
      .messages({
        'date.min': 'Lock date cannot be in the past'
      }),

    royaltyRecipient: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{40}$/)
      .optional(),

    royaltyPercentage: Joi.number()
      .min(0)
      .max(10)
      .precision(2)
      .optional()
  }).optional(),

  // Verification and compliance
  verification: Joi.object({
    ownershipProof: Joi.boolean().default(false),
    contentVerified: Joi.boolean().default(false),
    copyrightClear: Joi.boolean().default(false).required(),
    termsAccepted: Joi.boolean().valid(true).required()
  }).required()
});

// Batch minting validation
export const batchMintNftSchema = Joi.object({
  productId: commonSchemas.mongoId,
  
  recipients: Joi.array()
    .items(
      Joi.object({
        address: Joi.string()
          .pattern(/^0x[a-fA-F0-9]{40}$/)
          .required(),
        quantity: Joi.number().integer().min(1).max(10).default(1),
        metadata: Joi.object().optional() // Custom metadata per recipient
      })
    )
    .min(1)
    .max(1000)
    .unique((a, b) => a.address === b.address)
    .required()
    .messages({
      'array.min': 'At least one recipient is required',
      'array.max': 'Cannot mint to more than 1000 recipients in batch',
      'array.unique': 'Duplicate recipient addresses are not allowed'
    }),

  baseMetadata: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    description: Joi.string().trim().max(1000).optional(),
    image: commonSchemas.url.required(),
    attributes: Joi.array().items(Joi.object()).max(50).optional()
  }).required(),

  batchOptions: Joi.object({
    delayBetweenMints: Joi.number()
      .integer()
      .min(0)
      .max(60)
      .default(1)
      .messages({
        'number.max': 'Delay between mints cannot exceed 60 seconds'
      }),

    failOnError: Joi.boolean().default(false),
    notifyRecipients: Joi.boolean().default(false)
  }).optional()
});

// NFT transfer validation
export const transferNftSchema = Joi.object({
  tokenId: Joi.string()
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Token ID must be a valid number'
    }),

  from: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required(),

  to: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .custom((value, helpers) => {
      const context = helpers.state.ancestors[0];
      if (value === context.from) {
        return helpers.error('string.sameAddress');
      }
      return value;
    })
    .required()
    .messages({
      'string.sameAddress': 'Sender and recipient cannot be the same address'
    }),

  transferReason: Joi.string()
    .valid('sale', 'gift', 'trade', 'refund', 'correction', 'other')
    .optional(),

  memo: Joi.string()
    .max(500)
    .optional()
});

// NFT burn validation
export const burnNftSchema = Joi.object({
  tokenId: Joi.string()
    .pattern(/^[0-9]+$/)
    .required(),

  owner: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required(),

  burnReason: Joi.string()
    .valid('defective', 'recalled', 'expired', 'duplicate', 'owner_request', 'other')
    .required(),

  confirmBurn: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'Burn confirmation is required'
    }),

  memo: Joi.string()
    .max(500)
    .optional()
});

// NFT marketplace listing validation
export const listNftSchema = Joi.object({
  tokenId: Joi.string()
    .pattern(/^[0-9]+$/)
    .required(),

  price: Joi.number()
    .positive()
    .precision(6)
    .required()
    .messages({
      'number.positive': 'Price must be greater than 0',
      'number.precision': 'Price can have maximum 6 decimal places'
    }),

  currency: Joi.string()
    .valid('ETH', 'USDC', 'USDT', 'DAI', 'WETH')
    .default('ETH')
    .optional(),

  listingDuration: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .default(30)
    .messages({
      'number.min': 'Listing duration must be at least 1 day',
      'number.max': 'Listing duration cannot exceed 365 days'
    })
    .optional(),

  reservePrice: Joi.number()
    .positive()
    .precision(6)
    .optional(),

  allowOffers: Joi.boolean().default(true).optional()
});

// NFT collection analytics validation
export const nftAnalyticsSchema = Joi.object({
  contractAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .optional(),

  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d', '1y', 'all')
    .default('30d')
    .optional(),

  metrics: Joi.array()
    .items(Joi.string().valid(
      'volume', 'sales', 'floor_price', 'avg_price',
      'unique_holders', 'total_supply', 'market_cap'
    ))
    .min(1)
    .default(['volume', 'sales', 'floor_price'])
    .optional(),

  groupBy: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .default('day')
    .optional()
});

// NFT metadata update validation
export const updateNftMetadataSchema = Joi.object({
  tokenId: Joi.string()
    .pattern(/^[0-9]+$/)
    .required(),

  metadata: Joi.object({
    name: Joi.string().trim().min(1).max(100).optional(),
    description: Joi.string().trim().max(1000).optional(),
    image: commonSchemas.url.optional(),
    
    attributes: Joi.array()
      .items(
        Joi.object({
          trait_type: Joi.string().trim().min(1).max(50).required(),
          value: Joi.alternatives().try(
            Joi.string().max(100),
            Joi.number(),
            Joi.boolean()
          ).required(),
          display_type: Joi.string()
            .valid('number', 'boost_percentage', 'boost_number', 'date')
            .optional()
        })
      )
      .max(50)
      .optional(),

    external_url: commonSchemas.optionalUrl,
    animation_url: commonSchemas.optionalUrl
  }).min(1).required(),

  updateReason: Joi.string()
    .valid('correction', 'enhancement', 'error_fix', 'owner_request')
    .required(),

  preserveHistory: Joi.boolean().default(true).optional()
});

// NFT royalty configuration
export const configureRoyaltiesSchema = Joi.object({
  contractAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required(),

  royaltyRecipient: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required(),

  royaltyPercentage: Joi.number()
    .min(0)
    .max(10)
    .precision(2)
    .required()
    .messages({
      'number.min': 'Royalty percentage cannot be negative',
      'number.max': 'Royalty percentage cannot exceed 10%'
    }),

  enableRoyalties: Joi.boolean().default(true).optional()
});

// Export all NFT validation schemas
export const nftValidationSchemas = {
  deployNft: deployNftSchema,
  mintNft: mintNftSchema,
  batchMintNft: batchMintNftSchema,
  transferNft: transferNftSchema,
  burnNft: burnNftSchema,
  listNft: listNftSchema,
  nftAnalytics: nftAnalyticsSchema,
  updateNftMetadata: updateNftMetadataSchema,
  configureRoyalties: configureRoyaltiesSchema
};