// src/controllers/supplyChain.controller.ts
import { Response, NextFunction } from 'express';
import { ManufacturerAuthRequest } from '../middleware/manufacturerAuth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { SupplyChainEvent } from '../models/supplyChainEvent.model';
import { AnalyticsBusinessService } from '../services/business/analytics.service';
import { SupplyChainService } from '../services/blockchain/supplyChain.service';
import { BrandSettings } from '../models/brandSettings.model';
import { Manufacturer } from '../models/manufacturer.model';
import redis from 'ioredis';

// Initialize services
const analyticsService = new AnalyticsBusinessService();
const redisClient = new redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface SupplyChainRequest extends ManufacturerAuthRequest, ValidatedRequest {
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

interface ContractDeploymentRequest extends ManufacturerAuthRequest, ValidatedRequest {
  body: {
    manufacturerName: string;
  };
}

interface EndpointRequest extends ManufacturerAuthRequest, ValidatedRequest {
  body: {
    name: string;
    eventType: 'sourced' | 'manufactured' | 'quality_checked' | 'packaged' | 'shipped' | 'delivered';
    location: string;
  };
}

interface ProductRequest extends ManufacturerAuthRequest, ValidatedRequest {
  body: {
    productId: string;
    name: string;
    description: string;
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
  req: ManufacturerAuthRequest,
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
  req: ManufacturerAuthRequest,
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
      timestamp: (event as any).createdAt,
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
  req: ManufacturerAuthRequest,
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
      deployedAt: (brandSettings as any).supplyChainSettings?.contractDeployedAt
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
  req: ManufacturerAuthRequest,
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
  req: ManufacturerAuthRequest,
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
  req: ManufacturerAuthRequest,
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
 * GET /api/supply-chain/rate-limits
 * Get current rate limit information for the manufacturer
 */
export async function getRateLimitInfo(
  req: ManufacturerAuthRequest,
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
    console.error('Get rate limit info error:', error);
    next(error);
  }
}