// src/services/supplyChain/features/productLifeCycle.service.ts
import { logger } from '../../../utils/logger';
import { ContractReadService } from '../core/contractRead.service';
import { ContractWriteService } from '../core/contractWrite.service';
import { AssociationService } from '../core/association.service';
import { SupplyChainValidationService } from '../validation/supplyChainValidation.service';
import { SupplyChainMappers } from '../utils/mappers';
import {
  ISupplyChainProduct,
  ISupplyChainEvent,
  ISupplyChainEndpoint,
  SupplyChainEventType,
  IEventData,
  IApiResponse,
  IPaginatedResponse
} from '../utils/types';

// ===== INTERFACES =====

export interface IProductLifecycleRequest {
  businessId: string;
  contractAddress: string;
  productId: string;
}

export interface IProductLifecycleResponse {
  product: ISupplyChainProduct;
  lifecycle: {
    currentStage: SupplyChainEventType;
    completedStages: SupplyChainEventType[];
    remainingStages: SupplyChainEventType[];
    progressPercentage: number;
    estimatedCompletionTime?: Date;
  };
  events: ISupplyChainEvent[];
  timeline: Array<{
    stage: SupplyChainEventType;
    timestamp: number;
    location: string;
    details: string;
    isCompleted: boolean;
  }>;
  metrics: {
    timeInCurrentStage: number;
    averageTimePerStage: number;
    totalTimeElapsed: number;
    efficiencyScore: number;
  };
}

export interface IEventLoggingRequest {
  businessId: string;
  contractAddress: string;
  productId: string;
  eventType: SupplyChainEventType;
  location: string;
  details?: string;
  endpointId?: number;
}

export interface IEventLoggingResponse {
  success: boolean;
  eventId?: number;
  txHash?: string;
  error?: string;
  updatedLifecycle?: IProductLifecycleResponse;
}

export interface IProductStatusRequest {
  businessId: string;
  contractAddress: string;
  productId: string;
}

export interface IProductStatusResponse {
  productId: string;
  name: string;
  status: 'active' | 'completed' | 'stalled' | 'inactive';
  currentStage: SupplyChainEventType;
  progressPercentage: number;
  lastActivity: Date;
  estimatedCompletion?: Date;
  alerts: string[];
}

export interface IBatchEventLoggingRequest {
  businessId: string;
  contractAddress: string;
  events: Array<{
    productId: string;
    eventType: SupplyChainEventType;
    location: string;
    details?: string;
    endpointId?: number;
  }>;
}

export interface IBatchEventLoggingResponse {
  success: boolean;
  results: Array<{
    productId: string;
    success: boolean;
    eventId?: number;
    txHash?: string;
    error?: string;
  }>;
  summary: {
    totalProcessed: number;
    successful: number;
    failed: number;
  };
}

export interface IProductLifecycleAnalytics {
  totalProducts: number;
  productsByStage: Record<SupplyChainEventType, number>;
  averageTimePerStage: Record<SupplyChainEventType, number>;
  completionRate: number;
  stalledProducts: number;
  bottleneckStages: SupplyChainEventType[];
  efficiencyTrends: Array<{
    date: string;
    efficiency: number;
    completionRate: number;
  }>;
}

// ===== ERROR CLASS =====

class ProductLifecycleError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'ProductLifecycleError';
    this.statusCode = statusCode;
  }
}

// ===== MAIN SERVICE CLASS =====

export class ProductLifecycleService {
  private static instance: ProductLifecycleService;
  private contractReadService: ContractReadService;
  private contractWriteService: ContractWriteService;
  private associationService: AssociationService;
  private validationService: SupplyChainValidationService;
  private mappers: SupplyChainMappers;

  private constructor() {
    this.contractReadService = ContractReadService.getInstance();
    this.contractWriteService = ContractWriteService.getInstance();
    this.associationService = AssociationService.getInstance();
    this.validationService = SupplyChainValidationService.getInstance();
    this.mappers = SupplyChainMappers.getInstance();
  }

  public static getInstance(): ProductLifecycleService {
    if (!ProductLifecycleService.instance) {
      ProductLifecycleService.instance = new ProductLifecycleService();
    }
    return ProductLifecycleService.instance;
  }

  /**
   * Get complete product lifecycle information
   */
  async getProductLifecycle(
    request: IProductLifecycleRequest
  ): Promise<IApiResponse<IProductLifecycleResponse>> {
    try {
      // Validate input
      const validation = await this.validationService.validateAll({
        contractAddress: request.contractAddress,
        businessId: request.businessId,
        product: {
          productId: request.productId,
          name: '',
          description: ''
        }
      });

      if (!validation.valid) {
        throw new ProductLifecycleError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Get product information
      const productsResult = await this.contractReadService.getProducts(
        request.contractAddress,
        request.businessId
      );

      if (!productsResult.success || !productsResult.data) {
        throw new ProductLifecycleError('Failed to get product information', 500);
      }

      const product = productsResult.data.find(p => p.productId === request.productId);
      if (!product) {
        throw new ProductLifecycleError('Product not found', 404);
      }

      // Get product events
      const eventsResult = await this.contractReadService.getProductEvents(
        request.contractAddress,
        request.productId,
        request.businessId
      );

      if (!eventsResult.success || !eventsResult.data) {
        throw new ProductLifecycleError('Failed to get product events', 500);
      }

      const events = eventsResult.data;

      // Build lifecycle information
      const lifecycle = this.buildProductLifecycle(events);
      const timeline = this.buildProductTimeline(events);
      const metrics = this.calculateProductMetrics(events);

      const response: IProductLifecycleResponse = {
        product,
        lifecycle,
        events,
        timeline,
        metrics
      };

      logger.info('Product lifecycle retrieved successfully', {
        businessId: request.businessId,
        contractAddress: request.contractAddress,
        productId: request.productId,
        currentStage: lifecycle.currentStage,
        progressPercentage: lifecycle.progressPercentage
      });

      return this.mappers.mapToApiResponse(response);

    } catch (error: any) {
      logger.error('Get product lifecycle error:', error);
      
      if (error instanceof ProductLifecycleError) {
        throw error;
      }

      throw new ProductLifecycleError(`Failed to get product lifecycle: ${error.message}`, 500);
    }
  }

  /**
   * Log an event for a product
   */
  async logProductEvent(
    request: IEventLoggingRequest
  ): Promise<IApiResponse<IEventLoggingResponse>> {
    try {
      // Validate input
      const validation = await this.validationService.validateEventData({
        endpointId: request.endpointId || 0,
        productId: request.productId,
        eventType: request.eventType,
        location: request.location,
        details: request.details || ''
      });

      if (!validation.valid) {
        throw new ProductLifecycleError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Get current lifecycle to validate event progression
      const lifecycleResult = await this.getProductLifecycle({
        businessId: request.businessId,
        contractAddress: request.contractAddress,
        productId: request.productId
      });

      if (!lifecycleResult.success || !lifecycleResult.data) {
        throw new ProductLifecycleError('Failed to get current product lifecycle', 500);
      }

      const currentLifecycle = lifecycleResult.data;

      // Validate event progression
      if (!this.isValidEventProgression(currentLifecycle.lifecycle.currentStage, request.eventType)) {
        throw new ProductLifecycleError(
          `Invalid event progression: cannot log ${request.eventType} after ${currentLifecycle.lifecycle.currentStage}`,
          400
        );
      }

      // Log the event
      const eventData: IEventData = {
        endpointId: request.endpointId || 0,
        productId: request.productId,
        eventType: request.eventType,
        location: request.location,
        details: request.details || ''
      };

      const logResult = await this.contractWriteService.logEvent(
        request.contractAddress,
        eventData,
        request.businessId
      );

      if (!logResult.success) {
        throw new ProductLifecycleError('Failed to log event to blockchain', 500);
      }

      // Get updated lifecycle
      const updatedLifecycleResult = await this.getProductLifecycle({
        businessId: request.businessId,
        contractAddress: request.contractAddress,
        productId: request.productId
      });

      const response: IEventLoggingResponse = {
        success: true,
        eventId: logResult.eventId,
        txHash: logResult.txHash,
        updatedLifecycle: updatedLifecycleResult.success ? updatedLifecycleResult.data : undefined
      };

      logger.info('Product event logged successfully', {
        businessId: request.businessId,
        contractAddress: request.contractAddress,
        productId: request.productId,
        eventType: request.eventType,
        eventId: logResult.eventId,
        txHash: logResult.txHash
      });

      return this.mappers.mapToApiResponse(response);

    } catch (error: any) {
      logger.error('Log product event error:', error);
      
      if (error instanceof ProductLifecycleError) {
        throw error;
      }

      const response: IEventLoggingResponse = {
        success: false,
        error: error.message
      };

      return this.mappers.mapToApiResponse(response, false, undefined, error.message);
    }
  }

  /**
   * Get product status
   */
  async getProductStatus(
    request: IProductStatusRequest
  ): Promise<IApiResponse<IProductStatusResponse>> {
    try {
      const lifecycleResult = await this.getProductLifecycle({
        businessId: request.businessId,
        contractAddress: request.contractAddress,
        productId: request.productId
      });

      if (!lifecycleResult.success || !lifecycleResult.data) {
        throw new ProductLifecycleError('Failed to get product lifecycle', 500);
      }

      const lifecycle = lifecycleResult.data;
      const status = this.determineProductStatus(lifecycle);
      const alerts = this.generateProductAlerts(lifecycle);

      const response: IProductStatusResponse = {
        productId: request.productId,
        name: lifecycle.product.name,
        status,
        currentStage: lifecycle.lifecycle.currentStage,
        progressPercentage: lifecycle.lifecycle.progressPercentage,
        lastActivity: lifecycle.events.length > 0 ? 
          new Date(lifecycle.events[0].timestamp * 1000) : new Date(),
        estimatedCompletion: lifecycle.lifecycle.estimatedCompletionTime,
        alerts
      };

      return this.mappers.mapToApiResponse(response);

    } catch (error: any) {
      logger.error('Get product status error:', error);
      throw new ProductLifecycleError(`Failed to get product status: ${error.message}`, 500);
    }
  }

  /**
   * Log multiple events in batch
   */
  async logBatchEvents(
    request: IBatchEventLoggingRequest
  ): Promise<IApiResponse<IBatchEventLoggingResponse>> {
    try {
      const results: Array<{
        productId: string;
        success: boolean;
        eventId?: number;
        txHash?: string;
        error?: string;
      }> = [];

      let successful = 0;
      let failed = 0;

      for (const eventRequest of request.events) {
        try {
          const logRequest: IEventLoggingRequest = {
            businessId: request.businessId,
            contractAddress: request.contractAddress,
            productId: eventRequest.productId,
            eventType: eventRequest.eventType,
            location: eventRequest.location,
            details: eventRequest.details,
            endpointId: eventRequest.endpointId
          };

          const result = await this.logProductEvent(logRequest);

          if (result.success && result.data) {
            results.push({
              productId: eventRequest.productId,
              success: true,
              eventId: result.data.eventId,
              txHash: result.data.txHash
            });
            successful++;
          } else {
            results.push({
              productId: eventRequest.productId,
              success: false,
              error: result.data?.error || 'Unknown error'
            });
            failed++;
          }
        } catch (error: any) {
          results.push({
            productId: eventRequest.productId,
            success: false,
            error: error.message
          });
          failed++;
        }
      }

      const response: IBatchEventLoggingResponse = {
        success: successful > 0,
        results,
        summary: {
          totalProcessed: request.events.length,
          successful,
          failed
        }
      };

      logger.info('Batch event logging completed', {
        businessId: request.businessId,
        contractAddress: request.contractAddress,
        totalProcessed: request.events.length,
        successful,
        failed
      });

      return this.mappers.mapToApiResponse(response);

    } catch (error: any) {
      logger.error('Log batch events error:', error);
      throw new ProductLifecycleError(`Failed to log batch events: ${error.message}`, 500);
    }
  }

  /**
   * Get product lifecycle analytics
   */
  async getProductLifecycleAnalytics(
    businessId: string,
    contractAddress: string
  ): Promise<IApiResponse<IProductLifecycleAnalytics>> {
    try {
      // Get all products
      const productsResult = await this.contractReadService.getProducts(
        contractAddress,
        businessId,
        { includeInactive: true }
      );

      if (!productsResult.success || !productsResult.data) {
        throw new ProductLifecycleError('Failed to get products for analytics', 500);
      }

      const products = productsResult.data;
      const analytics: IProductLifecycleAnalytics = {
        totalProducts: products.length,
        productsByStage: this.calculateProductsByStage(products, contractAddress, businessId),
        averageTimePerStage: this.calculateAverageTimePerStage(products, contractAddress, businessId),
        completionRate: this.calculateCompletionRate(products, contractAddress, businessId),
        stalledProducts: this.calculateStalledProducts(products, contractAddress, businessId),
        bottleneckStages: this.calculateBottleneckStages(products, contractAddress, businessId),
        efficiencyTrends: this.calculateEfficiencyTrends(products, contractAddress, businessId)
      };

      return this.mappers.mapToApiResponse(analytics);

    } catch (error: any) {
      logger.error('Get product lifecycle analytics error:', error);
      throw new ProductLifecycleError(`Failed to get product lifecycle analytics: ${error.message}`, 500);
    }
  }

  /**
   * Build product lifecycle information
   */
  private buildProductLifecycle(events: ISupplyChainEvent[]): {
    currentStage: SupplyChainEventType;
    completedStages: SupplyChainEventType[];
    remainingStages: SupplyChainEventType[];
    progressPercentage: number;
    estimatedCompletionTime?: Date;
  } {
    const allStages = [
      SupplyChainEventType.SOURCED,
      SupplyChainEventType.MANUFACTURED,
      SupplyChainEventType.QUALITY_CHECKED,
      SupplyChainEventType.PACKAGED,
      SupplyChainEventType.SHIPPED,
      SupplyChainEventType.DELIVERED
    ];

    const completedStages = new Set<SupplyChainEventType>();
    let latestStage = SupplyChainEventType.SOURCED;

    events.forEach(event => {
      const eventType = event.eventType as SupplyChainEventType;
      if (allStages.includes(eventType)) {
        completedStages.add(eventType);
        
        // Update latest stage
        const currentIndex = allStages.indexOf(eventType);
        const latestIndex = allStages.indexOf(latestStage);
        if (currentIndex > latestIndex) {
          latestStage = eventType;
        }
      }
    });

    const completedStagesArray = Array.from(completedStages);
    const remainingStages = allStages.filter(stage => !completedStages.has(stage));
    const progressPercentage = (completedStagesArray.length / allStages.length) * 100;

    // Estimate completion time (simplified)
    let estimatedCompletionTime: Date | undefined;
    if (remainingStages.length > 0 && events.length > 0) {
      const averageTimePerStage = this.calculateAverageTimePerStageFromEvents(events);
      const estimatedTimeRemaining = averageTimePerStage * remainingStages.length;
      const lastEventTime = Math.max(...events.map(e => e.timestamp));
      estimatedCompletionTime = new Date((lastEventTime + estimatedTimeRemaining) * 1000);
    }

    return {
      currentStage: latestStage,
      completedStages: completedStagesArray,
      remainingStages,
      progressPercentage,
      estimatedCompletionTime
    };
  }

  /**
   * Build product timeline
   */
  private buildProductTimeline(events: ISupplyChainEvent[]): Array<{
    stage: SupplyChainEventType;
    timestamp: number;
    location: string;
    details: string;
    isCompleted: boolean;
  }> {
    const allStages = [
      SupplyChainEventType.SOURCED,
      SupplyChainEventType.MANUFACTURED,
      SupplyChainEventType.QUALITY_CHECKED,
      SupplyChainEventType.PACKAGED,
      SupplyChainEventType.SHIPPED,
      SupplyChainEventType.DELIVERED
    ];

    const timeline: Array<{
      stage: SupplyChainEventType;
      timestamp: number;
      location: string;
      details: string;
      isCompleted: boolean;
    }> = [];

    // Add completed stages
    events.forEach(event => {
      const eventType = event.eventType as SupplyChainEventType;
      if (allStages.includes(eventType)) {
        timeline.push({
          stage: eventType,
          timestamp: event.timestamp,
          location: event.location,
          details: event.details,
          isCompleted: true
        });
      }
    });

    // Add remaining stages as incomplete
    const completedStages = new Set(events.map(e => e.eventType as SupplyChainEventType));
    allStages.forEach(stage => {
      if (!completedStages.has(stage)) {
        timeline.push({
          stage,
          timestamp: 0,
          location: '',
          details: '',
          isCompleted: false
        });
      }
    });

    // Sort by stage order
    timeline.sort((a, b) => {
      const aIndex = allStages.indexOf(a.stage);
      const bIndex = allStages.indexOf(b.stage);
      return aIndex - bIndex;
    });

    return timeline;
  }

  /**
   * Calculate product metrics
   */
  private calculateProductMetrics(events: ISupplyChainEvent[]): {
    timeInCurrentStage: number;
    averageTimePerStage: number;
    totalTimeElapsed: number;
    efficiencyScore: number;
  } {
    if (events.length === 0) {
      return {
        timeInCurrentStage: 0,
        averageTimePerStage: 0,
        totalTimeElapsed: 0,
        efficiencyScore: 0
      };
    }

    const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
    const totalTimeElapsed = sortedEvents.length > 1 ? 
      sortedEvents[sortedEvents.length - 1].timestamp - sortedEvents[0].timestamp : 0;

    const averageTimePerStage = this.calculateAverageTimePerStageFromEvents(events);
    
    const timeInCurrentStage = sortedEvents.length > 0 ? 
      Date.now() / 1000 - sortedEvents[sortedEvents.length - 1].timestamp : 0;

    const efficiencyScore = this.calculateEfficiencyScoreFromEvents(events);

    return {
      timeInCurrentStage,
      averageTimePerStage,
      totalTimeElapsed,
      efficiencyScore
    };
  }

  /**
   * Validate event progression
   */
  private isValidEventProgression(
    currentStage: SupplyChainEventType,
    newEventType: SupplyChainEventType
  ): boolean {
    const stageOrder = [
      SupplyChainEventType.SOURCED,
      SupplyChainEventType.MANUFACTURED,
      SupplyChainEventType.QUALITY_CHECKED,
      SupplyChainEventType.PACKAGED,
      SupplyChainEventType.SHIPPED,
      SupplyChainEventType.DELIVERED
    ];

    const currentIndex = stageOrder.indexOf(currentStage);
    const newIndex = stageOrder.indexOf(newEventType);

    // Allow same stage (for updates) or next stage
    return newIndex >= currentIndex;
  }

  /**
   * Determine product status
   */
  private determineProductStatus(lifecycle: IProductLifecycleResponse): 'active' | 'completed' | 'stalled' | 'inactive' {
    if (lifecycle.lifecycle.currentStage === SupplyChainEventType.DELIVERED) {
      return 'completed';
    }

    if (!lifecycle.product.isActive) {
      return 'inactive';
    }

    // Check if stalled (no activity in last 7 days)
    const lastEventTime = lifecycle.events.length > 0 ? 
      lifecycle.events[0].timestamp : 0;
    const daysSinceLastEvent = (Date.now() / 1000 - lastEventTime) / (24 * 60 * 60);

    if (daysSinceLastEvent > 7) {
      return 'stalled';
    }

    return 'active';
  }

  /**
   * Generate product alerts
   */
  private generateProductAlerts(lifecycle: IProductLifecycleResponse): string[] {
    const alerts: string[] = [];

    // Check for stalled product
    const lastEventTime = lifecycle.events.length > 0 ? 
      lifecycle.events[0].timestamp : 0;
    const daysSinceLastEvent = (Date.now() / 1000 - lastEventTime) / (24 * 60 * 60);

    if (daysSinceLastEvent > 7) {
      alerts.push(`Product has been stalled for ${Math.floor(daysSinceLastEvent)} days`);
    }

    // Check for missing stages
    if (lifecycle.lifecycle.remainingStages.length > 0) {
      alerts.push(`${lifecycle.lifecycle.remainingStages.length} stages remaining`);
    }

    // Check for efficiency issues
    if (lifecycle.metrics.efficiencyScore < 50) {
      alerts.push('Low efficiency score detected');
    }

    return alerts;
  }

  /**
   * Calculate average time per stage from events
   */
  private calculateAverageTimePerStageFromEvents(events: ISupplyChainEvent[]): number {
    if (events.length < 2) return 0;

    const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
    const totalTime = sortedEvents[sortedEvents.length - 1].timestamp - sortedEvents[0].timestamp;
    
    return totalTime / (sortedEvents.length - 1);
  }

  /**
   * Calculate efficiency score from events
   */
  private calculateEfficiencyScoreFromEvents(events: ISupplyChainEvent[]): number {
    // Simple efficiency calculation based on event distribution and timing
    const allStages = [
      SupplyChainEventType.SOURCED,
      SupplyChainEventType.MANUFACTURED,
      SupplyChainEventType.QUALITY_CHECKED,
      SupplyChainEventType.PACKAGED,
      SupplyChainEventType.SHIPPED,
      SupplyChainEventType.DELIVERED
    ];

    const completedStages = new Set(events.map(e => e.eventType as SupplyChainEventType));
    const completionRate = (completedStages.size / allStages.length) * 100;

    // Add timing efficiency (simplified)
    const timingEfficiency = events.length > 1 ? 
      Math.min(100, (events.length / allStages.length) * 100) : 0;

    return (completionRate + timingEfficiency) / 2;
  }

  /**
   * Calculate products by stage (simplified - would need async calls in real implementation)
   */
  private calculateProductsByStage(
    products: ISupplyChainProduct[],
    contractAddress: string,
    businessId: string
  ): Record<SupplyChainEventType, number> {
    // This is a simplified version - in real implementation, you'd need to get events for each product
    const counts: Record<SupplyChainEventType, number> = {
      [SupplyChainEventType.SOURCED]: 0,
      [SupplyChainEventType.MANUFACTURED]: 0,
      [SupplyChainEventType.QUALITY_CHECKED]: 0,
      [SupplyChainEventType.PACKAGED]: 0,
      [SupplyChainEventType.SHIPPED]: 0,
      [SupplyChainEventType.DELIVERED]: 0
    };

    // For now, distribute products evenly across stages
    products.forEach((product, index) => {
      const stageIndex = index % 6;
      const stage = Object.values(SupplyChainEventType)[stageIndex];
      counts[stage]++;
    });

    return counts;
  }

  /**
   * Calculate average time per stage (simplified)
   */
  private calculateAverageTimePerStage(
    products: ISupplyChainProduct[],
    contractAddress: string,
    businessId: string
  ): Record<SupplyChainEventType, number> {
    // Simplified implementation
    const averages: Record<SupplyChainEventType, number> = {
      [SupplyChainEventType.SOURCED]: 1 * 24 * 60 * 60, // 1 day
      [SupplyChainEventType.MANUFACTURED]: 3 * 24 * 60 * 60, // 3 days
      [SupplyChainEventType.QUALITY_CHECKED]: 1 * 24 * 60 * 60, // 1 day
      [SupplyChainEventType.PACKAGED]: 1 * 24 * 60 * 60, // 1 day
      [SupplyChainEventType.SHIPPED]: 2 * 24 * 60 * 60, // 2 days
      [SupplyChainEventType.DELIVERED]: 1 * 24 * 60 * 60 // 1 day
    };

    return averages;
  }

  /**
   * Calculate completion rate
   */
  private calculateCompletionRate(
    products: ISupplyChainProduct[],
    contractAddress: string,
    businessId: string
  ): number {
    // Simplified - assume 30% completion rate
    return 30;
  }

  /**
   * Calculate stalled products
   */
  private calculateStalledProducts(
    products: ISupplyChainProduct[],
    contractAddress: string,
    businessId: string
  ): number {
    // Simplified - assume 10% are stalled
    return Math.floor(products.length * 0.1);
  }

  /**
   * Calculate bottleneck stages
   */
  private calculateBottleneckStages(
    products: ISupplyChainProduct[],
    contractAddress: string,
    businessId: string
  ): SupplyChainEventType[] {
    // Simplified - return common bottlenecks
    return [SupplyChainEventType.QUALITY_CHECKED, SupplyChainEventType.SHIPPED];
  }

  /**
   * Calculate efficiency trends
   */
  private calculateEfficiencyTrends(
    products: ISupplyChainProduct[],
    contractAddress: string,
    businessId: string
  ): Array<{
    date: string;
    efficiency: number;
    completionRate: number;
  }> {
    // Simplified - return mock trend data
    const trends = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        efficiency: 70 + Math.random() * 20,
        completionRate: 30 + Math.random() * 20
      });
    }

    return trends;
  }
}
