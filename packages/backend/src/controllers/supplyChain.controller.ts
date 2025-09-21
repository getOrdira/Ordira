// src/controllers/supplyChain.controller.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { SupplyChainEvent } from '../models/supplyChainEvent.model';
import { getAnalyticsService, getQrCodeService } from '../services/container.service';
import { SupplyChainService } from '../services/blockchain/supplyChain.service';
import { BrandSettings } from '../models/brandSettings.model';
import { Manufacturer } from '../models/manufacturer.model';
import { Product } from '../models/product.model';
import { Location } from '../models/location.model';
import redis from 'ioredis';
import { hasCreatedAt, hasSupplyChainSettings } from '../utils/typeGuards';

// Initialize services via container
const analyticsService = getAnalyticsService();
const qrCodeService = getQrCodeService();
const redisClient = new redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface SupplyChainRequest extends Request, UnifiedAuthRequest, ValidatedRequest {
  body: {
    productId: string;
    eventType: 'sourced' | 'manufactured' | 'quality_checked' | 'packaged' | 'shipped' | 'delivered';
    eventData?: {
      location?: string;
      coordinates?: { lat: number; lng: number };
      temperature?: number;
      humidity?: number;
      qualityMetrics?: Record<string, any>;
    };
  };
}

interface ContractDeploymentRequest extends Request, UnifiedAuthRequest, ValidatedRequest {
  body: {
    manufacturerName: string;
  };
}

interface EndpointRequest extends Request, UnifiedAuthRequest, ValidatedRequest {
  body: {
    name: string;
    eventType: 'sourced' | 'manufactured' | 'quality_checked' | 'packaged' | 'shipped' | 'delivered';
    location: string;
  };
}

interface ProductRequest extends Request, UnifiedAuthRequest, ValidatedRequest {
  body: {
    productId: string;
    name: string;
    description: string;
  };
}

interface QrScanRequest extends Request, UnifiedAuthRequest, ValidatedRequest {
  body: {
    qrCodeData: string;
    eventType: 'sourced' | 'manufactured' | 'quality_checked' | 'packaged' | 'shipped' | 'delivered';
    eventData?: {
      location?: string;
      coordinates?: { lat: number; lng: number };
      temperature?: number;
      humidity?: number;
      qualityMetrics?: Record<string, any>;
      notes?: string;
    };
  };
}

interface BatchQrCodeRequest extends Request, UnifiedAuthRequest, ValidatedRequest {
  body: {
    productIds: string[];
    batchName?: string;
    batchDescription?: string;
    batchMetadata?: {
      batchSize?: number;
      productionDate?: Date;
      qualityGrade?: string;
      shippingMethod?: string;
      destination?: string;
      specialInstructions?: string;
    };
  };
}

interface LocationRequest extends Request, UnifiedAuthRequest, ValidatedRequest {
  body: {
    name: string;
    description?: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
    coordinates: { lat: number; lng: number };
    locationType: 'factory' | 'warehouse' | 'distribution_center' | 'retail_store' | 'custom';
    capabilities?: string[];
    allowedEventTypes: Array<'sourced' | 'manufactured' | 'quality_checked' | 'packaged' | 'shipped' | 'delivered'>;
    contactInfo?: {
      phone?: string;
      email?: string;
      contactPerson?: string;
    };
    environmentalConditions?: {
      temperatureRange?: { min: number; max: number };
      humidityRange?: { min: number; max: number };
      specialRequirements?: string[];
    };
  };
}

/**
 * POST /api/products/:id/supply-chain/events
 * Log supply chain event for a product
 */
export const logEvent = asyncHandler(async (
  req: SupplyChainRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.userId!;
  const { productId, eventType, eventData } = req.validatedBody;

  // Create event
  const event = new SupplyChainEvent({
    product: productId,
    manufacturer: businessId,
    eventType,
    eventData: eventData || {}
  });

  // Generate QR and log to blockchain
  await event.generateQrCode();
  await event.logToBlockchain();
  await event.save();

  // Track analytics
  await analyticsService.trackEvent('supply_chain_event_logged', {
    userId: businessId,
    eventType,
    productId
  });

  res.status(201).json({
    success: true,
    data: event,
    message: 'Supply chain event logged successfully'
  });
});

/**
 * GET /api/products/:id/supply-chain/events
 * Get supply chain events for a product
 */
export const getEvents = asyncHandler(async (
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.userId!;
  const { id: productId } = req.params;

  const events = await SupplyChainEvent.find({
    product: productId,
    manufacturer: businessId
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: events,
    count: events.length
  });
});

/**
 * GET /api/products/:id/supply-chain/track
 * Get tracking data for a product
 */
export const getTrackingData = asyncHandler(async (
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.userId!;
  const { id: productId } = req.params;

  const events = await SupplyChainEvent.find({
    product: productId,
    manufacturer: businessId
  }).sort({ createdAt: 1 });

  // Calculate tracking metrics
  const trackingData = {
    productId,
    totalEvents: events.length,
    lastEvent: events[events.length - 1] || null,
    timeline: events.map(event => ({
      eventType: event.eventType,
      timestamp: hasCreatedAt(event) ? event.createdAt : new Date(),
      location: event.eventData?.location,
      txHash: event.txHash
    })),
    completionPercentage: Math.min((events.length / 6) * 100, 100) // Assuming 6 total stages
  };

  res.json({
    success: true,
    data: trackingData
  });
});

/**
 * POST /api/supply-chain/deploy
 * Deploy a new SupplyChain contract for the manufacturer
 */
export const deployContract = asyncHandler(async (
  req: ContractDeploymentRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.userId!;
  const { manufacturerName } = req.validatedBody;

  // Check if business already has a supply chain contract
  const brandSettings = await BrandSettings.findOne({ business: businessId });
  if (brandSettings?.web3Settings?.supplyChainContract) {
    res.status(409).json({
      success: false,
      error: 'Supply chain contract already deployed',
      contractAddress: brandSettings.web3Settings.supplyChainContract,
      code: 'CONTRACT_ALREADY_EXISTS'
    });
    return;
  }

  // Deploy contract
  const deployment = await SupplyChainService.deploySupplyChainContract(businessId, manufacturerName);

  res.status(201).json({
    success: true,
    data: deployment,
    message: 'Supply chain contract deployed successfully'
  });
});

/**
 * GET /api/supply-chain/contract
 * Get supply chain contract information
 */
export const getContract = asyncHandler(async (
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.userId!;

  const brandSettings = await BrandSettings.findOne({ business: businessId });
  if (!brandSettings?.web3Settings?.supplyChainContract) {
    res.status(404).json({
      success: false,
      error: 'No supply chain contract deployed',
      code: 'NO_CONTRACT_FOUND'
    });
    return;
  }

  const contractAddress = brandSettings.web3Settings.supplyChainContract;
  const stats = await SupplyChainService.getContractStats(contractAddress, businessId);

  res.json({
    success: true,
    data: {
      contractAddress,
      stats,
      deployedAt: hasSupplyChainSettings(brandSettings) ? brandSettings.supplyChainSettings?.contractDeployedAt : undefined
    }
  });
});

/**
 * POST /api/supply-chain/endpoints
 * Create a new endpoint
 */
export const createEndpoint = asyncHandler(async (
  req: EndpointRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.userId!;
  const { name, eventType, location } = req.validatedBody;

  const brandSettings = await BrandSettings.findOne({ business: businessId });
  if (!brandSettings?.web3Settings?.supplyChainContract) {
    res.status(404).json({
      success: false,
      error: 'No supply chain contract deployed',
      code: 'NO_CONTRACT_FOUND'
    });
    return;
  }

  const contractAddress = brandSettings.web3Settings.supplyChainContract;
  const result = await SupplyChainService.createEndpoint(
    contractAddress,
    { name, eventType, location },
    businessId
  );

  res.status(201).json({
    success: true,
    data: result,
    message: 'Endpoint created successfully'
  });
});

/**
 * GET /api/supply-chain/endpoints
 * Get all endpoints
 */
export const getEndpoints = asyncHandler(async (
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.userId!;

  const brandSettings = await BrandSettings.findOne({ business: businessId });
  if (!brandSettings?.web3Settings?.supplyChainContract) {
    res.status(404).json({
      success: false,
      error: 'No supply chain contract deployed',
      code: 'NO_CONTRACT_FOUND'
    });
    return;
  }

  const contractAddress = brandSettings.web3Settings.supplyChainContract;
  const endpoints = await SupplyChainService.getEndpoints(contractAddress, businessId);

  res.json({
    success: true,
    data: endpoints,
    count: endpoints.length
  });
});

/**
 * POST /api/supply-chain/products
 * Register a new product
 */
export const registerProduct = asyncHandler(async (
  req: ProductRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.userId!;
  const { productId, name, description } = req.validatedBody;

  const brandSettings = await BrandSettings.findOne({ business: businessId });
  if (!brandSettings?.web3Settings?.supplyChainContract) {
    res.status(404).json({
      success: false,
      error: 'No supply chain contract deployed',
      code: 'NO_CONTRACT_FOUND'
    });
    return;
  }

  const contractAddress = brandSettings.web3Settings.supplyChainContract;
  const result = await SupplyChainService.registerProduct(
    contractAddress,
    { productId, name, description },
    businessId
  );

  res.status(201).json({
    success: true,
    data: result,
    message: 'Product registered successfully'
  });
});

/**
 * GET /api/supply-chain/products
 * Get all registered products
 */
export const getProducts = asyncHandler(async (
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.userId!;

  const brandSettings = await BrandSettings.findOne({ business: businessId });
  if (!brandSettings?.web3Settings?.supplyChainContract) {
    res.status(404).json({
      success: false,
      error: 'No supply chain contract deployed',
      code: 'NO_CONTRACT_FOUND'
    });
    return;
  }

  const contractAddress = brandSettings.web3Settings.supplyChainContract;
  const products = await SupplyChainService.getProducts(contractAddress, businessId);

  res.json({
    success: true,
    data: products,
    count: products.length
  });
});

/**
 * GET /api/supply-chain/products/:productId/events
 * Get events for a specific product
 */
export const getProductEvents = asyncHandler(async (
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.userId!;
  const { productId } = req.params;

  const brandSettings = await BrandSettings.findOne({ business: businessId });
  if (!brandSettings?.web3Settings?.supplyChainContract) {
    res.status(404).json({
      success: false,
      error: 'No supply chain contract deployed',
      code: 'NO_CONTRACT_FOUND'
    });
    return;
  }

  const contractAddress = brandSettings.web3Settings.supplyChainContract;
  const events = await SupplyChainService.getProductEvents(contractAddress, productId, businessId);

  res.json({
    success: true,
    data: events,
    count: events.length
  });
});

/**
 * POST /api/supply-chain/scan-qr
 * Scan QR code and log supply chain event
 */
export const scanQrCode = asyncHandler(async (
  req: QrScanRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId!;
  const { qrCodeData, eventType, eventData } = req.validatedBody;

  try {
    // Parse QR code data
    const parsedData = qrCodeService.parseQrCodeData(qrCodeData);
    
    // Validate QR code data
    if (!qrCodeService.validateQrCodeData(parsedData)) {
      throw createAppError('Invalid QR code data format', 400, 'INVALID_QR_DATA');
    }

    // Check if it's a supply chain tracking QR code
    if (parsedData.type !== 'supply_chain_tracking') {
      throw createAppError('QR code is not for supply chain tracking', 400, 'INVALID_QR_TYPE');
    }

    // Verify product ownership
    const product = await Product.findById(parsedData.productId);
    if (!product) {
      throw createAppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    if (!product.isOwnedBy(manufacturerId, 'manufacturer')) {
      throw createAppError('Product not owned by manufacturer', 403, 'PRODUCT_ACCESS_DENIED');
    }

    // Check rate limits
    const manufacturer = await Manufacturer.findById(manufacturerId).select('plan');
    const plan = manufacturer?.plan || 'starter';
    const { MANUFACTURER_PLAN_DEFINITIONS } = await import('../constants/manufacturerPlans');
    const planDef = MANUFACTURER_PLAN_DEFINITIONS[plan as keyof typeof MANUFACTURER_PLAN_DEFINITIONS];
    const limits = planDef.supplyChain;

    // Check rate limits
    const now = Date.now();
    const minuteKey = `sc:${manufacturerId}:min:${Math.floor(now / 60000)}`;
    const hourKey = `sc:${manufacturerId}:hour:${Math.floor(now / 3600000)}`;
    const dayKey = `sc:${manufacturerId}:day:${Math.floor(now / 86400000)}`;
    const cooldownKey = `sc:${manufacturerId}:cooldown`;

    const [minuteUsage, hourUsage, dayUsage, lastEventTime] = await Promise.all([
      redisClient.get(minuteKey) || '0',
      redisClient.get(hourKey) || '0',
      redisClient.get(dayKey) || '0',
      redisClient.get(cooldownKey)
    ]);

    const cooldownRemaining = lastEventTime ? 
      Math.max(0, limits.cooldownPeriod - Math.floor((now - parseInt(lastEventTime)) / 1000)) : 0;

    if (cooldownRemaining > 0) {
      throw createAppError(
        `Rate limit: ${cooldownRemaining} seconds remaining`,
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    if (parseInt(minuteUsage) >= limits.eventsPerMinute) {
      throw createAppError('Minute rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
    }

    if (parseInt(hourUsage) >= limits.eventsPerHour) {
      throw createAppError('Hourly rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
    }

    if (parseInt(dayUsage) >= limits.eventsPerDay) {
      throw createAppError('Daily rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
    }

    // Create supply chain event
    const event = new SupplyChainEvent({
      product: parsedData.productId,
      manufacturer: manufacturerId,
      eventType,
      eventData: {
        ...eventData,
        scannedAt: new Date().toISOString(),
        qrCodeData: qrCodeData // Store original QR data for audit
      }
    });

    // Log to blockchain if contract exists
    const brandSettings = await BrandSettings.findOne({ business: manufacturerId });
    if (brandSettings?.web3Settings?.supplyChainContract) {
      try {
        await event.logToBlockchain();
      } catch (blockchainError) {
        logger.warn('Failed to log to blockchain:', blockchainError);
        // Continue without blockchain logging
      }
    }

    await event.save();

    // Update rate limit counters
    const pipeline = redisClient.pipeline();
    pipeline.incr(minuteKey);
    pipeline.expire(minuteKey, 60);
    pipeline.incr(hourKey);
    pipeline.expire(hourKey, 3600);
    pipeline.incr(dayKey);
    pipeline.expire(dayKey, 86400);
    pipeline.set(cooldownKey, now.toString(), 'EX', limits.cooldownPeriod);
    await pipeline.exec();

    // Track analytics
    await analyticsService.trackEvent('supply_chain_qr_scanned', {
      userId: manufacturerId,
      eventType,
      productId: parsedData.productId,
      location: eventData?.location
    });

    res.status(201).json({
      success: true,
      data: {
        event: {
          id: event._id,
          eventType: event.eventType,
          timestamp: hasCreatedAt(event) ? event.createdAt : new Date(),
          location: event.eventData?.location,
          txHash: event.txHash
        },
        product: {
          id: product._id,
          name: product.title,
          qrCodeGenerated: !!product.supplyChainQrCode?.isActive
        },
        rateLimits: {
          remaining: {
            minute: Math.max(0, limits.eventsPerMinute - parseInt(minuteUsage) - 1),
            hour: Math.max(0, limits.eventsPerHour - parseInt(hourUsage) - 1),
            day: Math.max(0, limits.eventsPerDay - parseInt(dayUsage) - 1)
          }
        }
      },
      message: 'Supply chain event logged successfully via QR scan'
    });

  } catch (error: any) {
    logger.error('QR scan error:', error);
    next(error);
  }
});

/**
 * POST /api/supply-chain/qr-codes/batch
 * Generate QR codes for multiple products as a batch
 * Useful for tracking multiple products together (e.g., 50 T-shirts shipped together)
 */
export const generateBatchQrCodes = asyncHandler(async (
  req: BatchQrCodeRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId!;
  const { productIds, batchName, batchDescription, batchMetadata } = req.validatedBody;

  try {
    // Validate product ownership for all products
    const products = await Product.find({
      _id: { $in: productIds },
      manufacturer: manufacturerId
    });

    if (products.length !== productIds.length) {
      const foundIds = products.map(p => p._id.toString());
      const missingIds = productIds.filter(id => !foundIds.includes(id));
      throw createAppError(
        `Some products not found or access denied. Missing: ${missingIds.join(', ')}`,
        404,
        'PRODUCTS_NOT_FOUND'
      );
    }

    // Check if any products already have active QR codes
    const productsWithQrCodes = products.filter(p => p.supplyChainQrCode?.isActive);
    if (productsWithQrCodes.length > 0) {
      const productNames = productsWithQrCodes.map(p => p.title).join(', ');
      throw createAppError(
        `Some products already have active QR codes: ${productNames}`,
        409,
        'PRODUCTS_ALREADY_HAVE_QR_CODES'
      );
    }

    // Generate batch QR code data
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const batchQrData = {
      type: 'supply_chain_batch_tracking',
      batchId,
      manufacturerId,
      productIds,
      batchName: batchName || `Batch ${products.length} Products`,
      batchDescription: batchDescription || `Batch containing ${products.length} products`,
      batchMetadata: {
        ...batchMetadata,
        batchSize: products.length,
        createdAt: new Date().toISOString(),
        productNames: products.map(p => p.title)
      }
    };

    // Generate QR code
    const qrCodeDataUrl = await qrCodeService.generateQrCode(JSON.stringify(batchQrData), {
      size: 300,
      margin: 2,
      errorCorrectionLevel: 'M'
    });

    // Create batch tracking record
    const batchRecord = {
      batchId,
      manufacturer: manufacturerId,
      productIds,
      batchName: batchName || `Batch ${products.length} Products`,
      batchDescription: batchDescription || `Batch containing ${products.length} products`,
      batchMetadata: {
        ...batchMetadata,
        batchSize: products.length,
        createdAt: new Date(),
        productNames: products.map(p => p.title),
        productTitles: products.map(p => p.title)
      },
      qrCode: {
        data: qrCodeDataUrl,
        imageUrl: qrCodeDataUrl,
        isActive: true,
        generatedAt: new Date()
      },
      status: 'active',
      createdAt: new Date()
    };

    // Store batch record in Redis for quick access
    await redisClient.setex(
      `batch_qr:${batchId}`,
      86400 * 30, // 30 days
      JSON.stringify(batchRecord)
    );

    // Update all products with batch QR code reference
    const updatePromises = products.map(product => 
      Product.findByIdAndUpdate(product._id, {
        $set: {
          'supplyChainQrCode.batchId': batchId,
          'supplyChainQrCode.isActive': true,
          'supplyChainQrCode.generatedAt': new Date(),
          'supplyChainQrCode.batchQrData': batchQrData
        }
      })
    );

    await Promise.all(updatePromises);

    // Track analytics
    await analyticsService.trackEvent('supply_chain_batch_qr_generated', {
      userId: manufacturerId,
      batchId,
      productCount: products.length,
      batchSize: products.length,
      productTypes: [...new Set(products.map(p => p.category))],
      totalValue: products.reduce((sum, p) => sum + (p.price || 0), 0)
    });

    // Get rate limit info
    const rateLimitKey = `rate_limit:supply_chain:${manufacturerId}`;
    const rateLimitInfo = await redisClient.hgetall(rateLimitKey);

    res.status(201).json({
      success: true,
      data: {
        batch: {
          id: batchId,
          name: batchName || `Batch ${products.length} Products`,
          description: batchDescription || `Batch containing ${products.length} products`,
          productCount: products.length,
          status: 'active',
          createdAt: new Date()
        },
        qrCode: {
          data: qrCodeDataUrl,
          imageUrl: qrCodeDataUrl,
          batchId,
          isActive: true,
          generatedAt: new Date()
        },
        products: products.map(product => ({
          id: product._id,
          title: product.title,
          category: product.category,
          price: product.price,
          batchQrLinked: true
        })),
        batchMetadata: {
          ...batchMetadata,
          batchSize: products.length,
          createdAt: new Date(),
          productNames: products.map(p => p.title)
        },
        rateLimits: {
          remaining: {
            batchQrGeneration: Math.max(0, (parseInt(rateLimitInfo.batchQrGenerationLimit || '10') - parseInt(rateLimitInfo.batchQrGenerationUsed || '0')))
          },
          resetTime: rateLimitInfo.resetTime
        }
      },
      message: `Batch QR code generated successfully for ${products.length} products`
    });

  } catch (error: any) {
    logger.error('Batch QR code generation error:', error);
    next(error);
  }
});

/**
 * POST /api/supply-chain/locations
 * Create a new location for supply chain tracking
 */
export const createLocation = asyncHandler(async (
  req: LocationRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId!;
  const locationData = req.validatedBody;

  // Create location
  const location = new Location({
    ...locationData,
    manufacturer: manufacturerId
  });

  await location.save();

  // Track analytics
  await analyticsService.trackEvent('supply_chain_location_created', {
    userId: manufacturerId,
    locationType: locationData.locationType,
    eventTypes: locationData.allowedEventTypes
  });

  res.status(201).json({
    success: true,
    data: location,
    message: 'Location created successfully'
  });
});

/**
 * GET /api/supply-chain/locations
 * Get all locations for the manufacturer
 */
export const getLocations = asyncHandler(async (
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId!;
  const { eventType, locationType, active } = req.query;

  let query: any = { manufacturer: manufacturerId };
  
  if (active !== undefined) {
    query.isActive = active === 'true';
  }
  
  if (eventType) {
    query.allowedEventTypes = eventType;
  }
  
  if (locationType) {
    query.locationType = locationType;
  }

  const locations = await Location.find(query).sort({ name: 1 });

  res.json({
    success: true,
    data: locations,
    count: locations.length,
    filters: {
      eventType,
      locationType,
      active
    }
  });
});

/**
 * GET /api/supply-chain/locations/:id
 * Get specific location details
 */
export const getLocation = asyncHandler(async (
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId!;
  const { id } = req.params;

  const location = await Location.findOne({
    _id: id,
    manufacturer: manufacturerId
  });

  if (!location) {
    throw createAppError('Location not found', 404, 'LOCATION_NOT_FOUND');
  }

  res.json({
    success: true,
    data: location
  });
});

/**
 * PUT /api/supply-chain/locations/:id
 * Update location
 */
export const updateLocation = asyncHandler(async (
  req: LocationRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId!;
  const { id } = req.params;
  const updateData = req.validatedBody;

  const location = await Location.findOneAndUpdate(
    { _id: id, manufacturer: manufacturerId },
    updateData,
    { new: true, runValidators: true }
  );

  if (!location) {
    throw createAppError('Location not found', 404, 'LOCATION_NOT_FOUND');
  }

  res.json({
    success: true,
    data: location,
    message: 'Location updated successfully'
  });
});

/**
 * DELETE /api/supply-chain/locations/:id
 * Deactivate location (soft delete)
 */
export const deleteLocation = asyncHandler(async (
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId!;
  const { id } = req.params;

  const location = await Location.findOneAndUpdate(
    { _id: id, manufacturer: manufacturerId },
    { isActive: false },
    { new: true }
  );

  if (!location) {
    throw createAppError('Location not found', 404, 'LOCATION_NOT_FOUND');
  }

  res.json({
    success: true,
    message: 'Location deactivated successfully'
  });
});

/**
 * GET /api/supply-chain/locations/nearby
 * Find locations within radius of given coordinates
 */
export const getNearbyLocations = asyncHandler(async (
  req: UnifiedAuthRequest & { query: { lat: string; lng: string; radius?: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId!;
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseFloat(req.query.radius || '50'); // Default 50km radius

  if (isNaN(lat) || isNaN(lng)) {
    throw createAppError('Invalid coordinates', 400, 'INVALID_COORDINATES');
  }

  const locations = await Location.find({ manufacturer: manufacturerId, isActive: true });
  const nearbyLocations = locations.filter(location => 
    location.isWithinRadius({ lat, lng }, radius)
  );

  res.json({
    success: true,
    data: nearbyLocations,
    count: nearbyLocations.length,
    searchParams: {
      coordinates: { lat, lng },
      radiusKm: radius
    }
  });
});

/**
 * GET /api/supply-chain/locations/stats
 * Get location statistics for manufacturer
 */
export const getLocationStats = asyncHandler(async (
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId!;

  const stats = await Location.aggregate([
    { $match: { manufacturer: manufacturerId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: ['$isActive', 1, 0] } },
        totalEvents: { $sum: '$eventCount' },
        byType: {
          $push: {
            type: '$locationType',
            eventCount: '$eventCount',
            isActive: '$isActive'
          }
        }
      }
    }
  ]);

  const result = stats[0] || {
    total: 0,
    active: 0,
    totalEvents: 0,
    byType: []
  };

  // Group by location type
  const byType = result.byType.reduce((acc: any, item: any) => {
    if (!acc[item.type]) {
      acc[item.type] = { count: 0, events: 0, active: 0 };
    }
    acc[item.type].count++;
    acc[item.type].events += item.eventCount;
    if (item.isActive) acc[item.type].active++;
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      summary: {
        total: result.total,
        active: result.active,
        inactive: result.total - result.active,
        totalEvents: result.totalEvents
      },
      byType,
      generatedAt: new Date()
    }
  });
});

/**
 * GET /api/supply-chain/rate-limits
 * Get current rate limit information for the manufacturer
 */
export async function getRateLimitInfo(
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const manufacturerId = req.userId!;
    
    // Get manufacturer's plan
    const manufacturer = await Manufacturer.findById(manufacturerId).select('plan');
    const plan = manufacturer?.plan || 'starter';
    
    // Get rate limits from manufacturer plan definitions
    const { MANUFACTURER_PLAN_DEFINITIONS } = await import('../constants/manufacturerPlans');
    const planDef = MANUFACTURER_PLAN_DEFINITIONS[plan as keyof typeof MANUFACTURER_PLAN_DEFINITIONS];
    const limits = planDef.supplyChain;
    
    // Get current usage from Redis
    const now = Date.now();
    const minuteKey = `sc:${manufacturerId}:min:${Math.floor(now / 60000)}`;
    const hourKey = `sc:${manufacturerId}:hour:${Math.floor(now / 3600000)}`;
    const dayKey = `sc:${manufacturerId}:day:${Math.floor(now / 86400000)}`;
    const cooldownKey = `sc:${manufacturerId}:cooldown`;
    
    const [minuteUsage, hourUsage, dayUsage, lastEventTime] = await Promise.all([
      redisClient.get(minuteKey) || '0',
      redisClient.get(hourKey) || '0',
      redisClient.get(dayKey) || '0',
      redisClient.get(cooldownKey)
    ]);
    
    const cooldownRemaining = lastEventTime ? 
      Math.max(0, limits.cooldownPeriod - Math.floor((now - parseInt(lastEventTime)) / 1000)) : 0;
    
    res.json({
      success: true,
      data: {
        plan: plan,
        limits: {
          eventsPerMinute: limits.eventsPerMinute,
          eventsPerHour: limits.eventsPerHour,
          eventsPerDay: limits.eventsPerDay,
          cooldownPeriod: limits.cooldownPeriod,
          burstAllowance: limits.burstAllowance
        },
        currentUsage: {
          minute: parseInt(minuteUsage),
          hour: parseInt(hourUsage),
          day: parseInt(dayUsage),
          cooldownRemaining: cooldownRemaining
        },
        remaining: {
          minute: Math.max(0, limits.eventsPerMinute - parseInt(minuteUsage)),
          hour: Math.max(0, limits.eventsPerHour - parseInt(hourUsage)),
          day: Math.max(0, limits.eventsPerDay - parseInt(dayUsage))
        },
        utilization: {
          minute: Math.round((parseInt(minuteUsage) / limits.eventsPerMinute) * 100),
          hour: Math.round((parseInt(hourUsage) / limits.eventsPerHour) * 100),
          day: Math.round((parseInt(dayUsage) / limits.eventsPerDay) * 100)
        },
        nextReset: {
          minute: new Date(Math.ceil(now / 60000) * 60000),
          hour: new Date(Math.ceil(now / 3600000) * 3600000),
          day: new Date(Math.ceil(now / 86400000) * 86400000)
        },
        canLogEvent: cooldownRemaining === 0 && 
          parseInt(minuteUsage) < limits.eventsPerMinute &&
          parseInt(hourUsage) < limits.eventsPerHour &&
          parseInt(dayUsage) < limits.eventsPerDay
      }
    });
  } catch (error) {
    logger.error('Get rate limit info error:', error);
    next(error);
  }
}
