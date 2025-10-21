// src/services/supplyChain/features/dashboard.service.ts
import { logger } from '../../../utils/logger';
import { ContractReadService } from '../core/contractRead.service';
import { AssociationService } from '../core/association.service';
import { SupplyChainValidationService } from '../validation/supplyChainValidation.service';
import { SupplyChainMappers } from '../utils/mappers';
import {
  IDashboardData,
  ISupplyChainAnalytics,
  ISupplyChainEvent,
  ISupplyChainProduct,
  ISupplyChainEndpoint,
  IContractStats,
  SupplyChainEventType,
  IApiResponse,
  IPaginatedResponse
} from '../utils/types';

// ===== INTERFACES =====

export interface IDashboardRequest {
  businessId: string;
  contractAddress: string;
  timeframe?: 'day' | 'week' | 'month' | 'year';
  includeInactive?: boolean;
}

export interface IDashboardOverview {
  totalProducts: number;
  totalEvents: number;
  activeEndpoints: number;
  lastEventTime: Date;
  contractHealth: 'healthy' | 'warning' | 'critical';
  recentActivity: ISupplyChainEvent[];
}

export interface IProductSummary {
  productId: string;
  name: string;
  eventCount: number;
  lastEventTime?: Date;
  status: 'active' | 'inactive';
  completionRate: number;
}

export interface IEndpointSummary {
  id: number;
  name: string;
  eventType: SupplyChainEventType;
  eventCount: number;
  isActive: boolean;
  lastActivity?: Date;
}

export interface IAnalyticsRequest {
  businessId: string;
  contractAddress: string;
  startDate?: Date;
  endDate?: Date;
  groupBy?: 'day' | 'week' | 'month';
}

// ===== ERROR CLASS =====

class DashboardError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'DashboardError';
    this.statusCode = statusCode;
  }
}

// ===== MAIN SERVICE CLASS =====

export class SupplyChainDashboardService {
  private static instance: SupplyChainDashboardService;
  private contractReadService: ContractReadService;
  private associationService: AssociationService;
  private validationService: SupplyChainValidationService;
  private mappers: SupplyChainMappers;

  private constructor() {
    this.contractReadService = ContractReadService.getInstance();
    this.associationService = AssociationService.getInstance();
    this.validationService = SupplyChainValidationService.getInstance();
    this.mappers = SupplyChainMappers.getInstance();
  }

  public static getInstance(): SupplyChainDashboardService {
    if (!SupplyChainDashboardService.instance) {
      SupplyChainDashboardService.instance = new SupplyChainDashboardService();
    }
    return SupplyChainDashboardService.instance;
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(
    request: IDashboardRequest
  ): Promise<IApiResponse<IDashboardData>> {
    try {
      // Validate input
      const validation = await this.validationService.validateAll({
        contractAddress: request.contractAddress,
        businessId: request.businessId
      });

      if (!validation.valid) {
        throw new DashboardError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Get contract statistics
      const statsResult = await this.contractReadService.getContractStats(
        request.contractAddress,
        request.businessId
      );

      if (!statsResult.success || !statsResult.data) {
        throw new DashboardError('Failed to get contract statistics', 500);
      }

      const stats = statsResult.data;

      // Get recent events
      const recentEvents = await this.getRecentEvents(
        request.contractAddress,
        request.businessId,
        request.timeframe || 'week'
      );

      // Get top products
      const topProducts = await this.getTopProducts(
        request.contractAddress,
        request.businessId,
        10
      );

            // Get analytics
            const analyticsResult = await this.getAnalytics({
              businessId: request.businessId,
              contractAddress: request.contractAddress,
              groupBy: request.timeframe === 'day' ? 'day' : 
                      request.timeframe === 'week' ? 'week' : 'month'
            });
      
            // Build dashboard data
            const dashboardData: IDashboardData = {
              overview: {
                totalProducts: stats.totalProducts,
                totalEvents: stats.totalEvents,
                activeEndpoints: stats.totalEndpoints,
                lastEventTime: recentEvents.length > 0 ? 
                  new Date(recentEvents[0].timestamp * 1000) : new Date()
              },
              recentActivity: recentEvents.slice(0, 5), // Last 5 events
              topProducts: topProducts.map(product => ({
                productId: product.productId,
                name: product.name,
                eventCount: product.totalEvents
              })),
              analytics: analyticsResult.data
            };

      logger.info('Dashboard data retrieved successfully', {
        businessId: request.businessId,
        contractAddress: request.contractAddress,
        totalProducts: stats.totalProducts,
        totalEvents: stats.totalEvents
      });

      return this.mappers.mapToApiResponse(dashboardData);

    } catch (error: any) {
      logger.error('Get dashboard data error:', error);
      
      if (error instanceof DashboardError) {
        throw error;
      }

      throw new DashboardError(`Failed to get dashboard data: ${error.message}`, 500);
    }
  }

  /**
   * Get dashboard overview
   */
  async getDashboardOverview(
    businessId: string,
    contractAddress: string
  ): Promise<IApiResponse<IDashboardOverview>> {
    try {
      // Get contract statistics
      const statsResult = await this.contractReadService.getContractStats(
        contractAddress,
        businessId
      );

      if (!statsResult.success || !statsResult.data) {
        throw new DashboardError('Failed to get contract statistics', 500);
      }

      const stats = statsResult.data;

      // Get recent events
      const recentEvents = await this.getRecentEvents(contractAddress, businessId, 'day');

      // Calculate contract health
      const contractHealth = this.calculateContractHealth(stats, recentEvents);

      const overview: IDashboardOverview = {
        totalProducts: stats.totalProducts,
        totalEvents: stats.totalEvents,
        activeEndpoints: stats.totalEndpoints,
        lastEventTime: recentEvents.length > 0 ? 
          new Date(recentEvents[0].timestamp * 1000) : new Date(),
        contractHealth,
        recentActivity: recentEvents.slice(0, 10)
      };

      return this.mappers.mapToApiResponse(overview);

    } catch (error: any) {
      logger.error('Get dashboard overview error:', error);
      throw new DashboardError(`Failed to get dashboard overview: ${error.message}`, 500);
    }
  }

  /**
   * Get product summaries
   */
  async getProductSummaries(
    businessId: string,
    contractAddress: string,
    limit: number = 50
  ): Promise<IPaginatedResponse<IProductSummary>> {
    try {
      // Get products
      const productsResult = await this.contractReadService.getProducts(
        contractAddress,
        businessId,
        { limit, includeInactive: true }
      );

      if (!productsResult.success || !productsResult.data) {
        throw new DashboardError('Failed to get products', 500);
      }

      const products = productsResult.data;

      // Get product summaries with additional data
      const productSummaries: IProductSummary[] = [];
      
      for (const product of products) {
        try {
          // Get events for this product
          const eventsResult = await this.contractReadService.getProductEvents(
            contractAddress,
            product.productId,
            businessId
          );

          const events = eventsResult.success ? eventsResult.data || [] : [];
          const lastEvent = events.length > 0 ? events[0] : null;

          // Calculate completion rate (simplified)
          const completionRate = this.calculateProductCompletionRate(events);

          productSummaries.push({
            productId: product.productId,
            name: product.name,
            eventCount: product.totalEvents,
            lastEventTime: lastEvent ? new Date(lastEvent.timestamp * 1000) : undefined,
            status: product.isActive ? 'active' : 'inactive',
            completionRate
          });
        } catch (error: any) {
          logger.warn('Failed to get product summary', { 
            productId: product.productId, 
            error: error.message 
          });
        }
      }

      return this.mappers.mapToPaginatedResponse(
        productSummaries,
        1,
        limit,
        productSummaries.length
      );

    } catch (error: any) {
      logger.error('Get product summaries error:', error);
      throw new DashboardError(`Failed to get product summaries: ${error.message}`, 500);
    }
  }

  /**
   * Get endpoint summaries
   */
  async getEndpointSummaries(
    businessId: string,
    contractAddress: string
  ): Promise<IApiResponse<IEndpointSummary[]>> {
    try {
      // Get endpoints
      const endpointsResult = await this.contractReadService.getEndpoints(
        contractAddress,
        businessId,
        { includeInactive: true }
      );

      if (!endpointsResult.success || !endpointsResult.data) {
        throw new DashboardError('Failed to get endpoints', 500);
      }

      const endpoints = endpointsResult.data;

      // Build endpoint summaries
      const endpointSummaries: IEndpointSummary[] = endpoints.map(endpoint => ({
        id: endpoint.id,
        name: endpoint.name,
        eventType: endpoint.eventType,
        eventCount: endpoint.eventCount,
        isActive: endpoint.isActive,
        lastActivity: endpoint.eventCount > 0 ? 
          new Date(endpoint.createdAt * 1000) : undefined
      }));

      return this.mappers.mapToApiResponse(endpointSummaries);

    } catch (error: any) {
      logger.error('Get endpoint summaries error:', error);
      throw new DashboardError(`Failed to get endpoint summaries: ${error.message}`, 500);
    }
  }

  /**
   * Get analytics data
   */
  async getAnalytics(
    request: IAnalyticsRequest
  ): Promise<IApiResponse<ISupplyChainAnalytics>> {
    try {
      // Get all products
      const productsResult = await this.contractReadService.getProducts(
        request.contractAddress,
        request.businessId,
        { includeInactive: true }
      );

      if (!productsResult.success || !productsResult.data) {
        throw new DashboardError('Failed to get products for analytics', 500);
      }

      const products = productsResult.data;

      // Get all events for analytics
      const allEvents: ISupplyChainEvent[] = [];
      
      for (const product of products) {
        try {
          const eventsResult = await this.contractReadService.getProductEvents(
            request.contractAddress,
            product.productId,
            request.businessId
          );

          if (eventsResult.success && eventsResult.data) {
            allEvents.push(...eventsResult.data);
          }
        } catch (error: any) {
          logger.warn('Failed to get events for analytics', { 
            productId: product.productId, 
            error: error.message 
          });
        }
      }

      // Build analytics
      const analytics: ISupplyChainAnalytics = {
        totalProducts: products.length,
        totalEvents: allEvents.length,
        totalEndpoints: 0, // Would need to get from endpoints
        eventsByType: this.calculateEventsByType(allEvents),
        eventsByLocation: this.calculateEventsByLocation(allEvents),
        eventsByTimeframe: this.calculateEventsByTimeframe(allEvents, request.groupBy),
        productLifecycleStats: this.calculateProductLifecycleStats(allEvents)
      };

      return this.mappers.mapToApiResponse(analytics);

    } catch (error: any) {
      logger.error('Get analytics error:', error);
      throw new DashboardError(`Failed to get analytics: ${error.message}`, 500);
    }
  }

  /**
   * Get recent events
   */
  private async getRecentEvents(
    contractAddress: string,
    businessId: string,
    timeframe: 'day' | 'week' | 'month' | 'year'
  ): Promise<ISupplyChainEvent[]> {
    try {
      // Get all products
      const productsResult = await this.contractReadService.getProducts(
        contractAddress,
        businessId
      );

      if (!productsResult.success || !productsResult.data) {
        return [];
      }

      const products = productsResult.data;
      const allEvents: ISupplyChainEvent[] = [];

      // Get events for each product
      for (const product of products) {
        try {
          const eventsResult = await this.contractReadService.getProductEvents(
            contractAddress,
            product.productId,
            businessId
          );

          if (eventsResult.success && eventsResult.data) {
            allEvents.push(...eventsResult.data);
          }
        } catch (error: any) {
          logger.warn('Failed to get events for product', { 
            productId: product.productId, 
            error: error.message 
          });
        }
      }

      // Filter by timeframe and sort by timestamp
      const cutoffDate = this.getTimeframeCutoff(timeframe);
      const recentEvents = allEvents
        .filter(event => event.timestamp >= cutoffDate.getTime() / 1000)
        .sort((a, b) => b.timestamp - a.timestamp);

      return recentEvents;

    } catch (error: any) {
      logger.error('Get recent events error:', error);
      return [];
    }
  }

  /**
   * Get top products by event count
   */
  private async getTopProducts(
    contractAddress: string,
    businessId: string,
    limit: number
  ): Promise<ISupplyChainProduct[]> {
    try {
      const productsResult = await this.contractReadService.getProducts(
        contractAddress,
        businessId,
        { limit: 100 } // Get more to sort
      );

      if (!productsResult.success || !productsResult.data) {
        return [];
      }

      const products = productsResult.data;
      
      // Sort by event count and return top N
      return products
        .sort((a, b) => b.totalEvents - a.totalEvents)
        .slice(0, limit);

    } catch (error: any) {
      logger.error('Get top products error:', error);
      return [];
    }
  }

  /**
   * Calculate contract health
   */
  private calculateContractHealth(
    stats: IContractStats,
    recentEvents: ISupplyChainEvent[]
  ): 'healthy' | 'warning' | 'critical' {
    // Simple health calculation based on activity
    const now = Date.now() / 1000;
    const lastEventTime = recentEvents.length > 0 ? recentEvents[0].timestamp : 0;
    const timeSinceLastEvent = now - lastEventTime;

    // Critical: No events in last 7 days
    if (timeSinceLastEvent > 7 * 24 * 60 * 60) {
      return 'critical';
    }

    // Warning: No events in last 24 hours
    if (timeSinceLastEvent > 24 * 60 * 60) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Calculate product completion rate
   */
  private calculateProductCompletionRate(events: ISupplyChainEvent[]): number {
    // Simple completion rate based on event types
    const eventTypes = events.map(e => e.eventType);
    const uniqueEventTypes = new Set(eventTypes);
    
    // Assume 6 event types for complete lifecycle
    return Math.min((uniqueEventTypes.size / 6) * 100, 100);
  }

  /**
   * Calculate events by type
   */
  private calculateEventsByType(events: ISupplyChainEvent[]): Record<SupplyChainEventType, number> {
    const counts: Record<string, number> = {};
    
    events.forEach(event => {
      counts[event.eventType] = (counts[event.eventType] || 0) + 1;
    });

    return {
      [SupplyChainEventType.SOURCED]: counts[SupplyChainEventType.SOURCED] || 0,
      [SupplyChainEventType.MANUFACTURED]: counts[SupplyChainEventType.MANUFACTURED] || 0,
      [SupplyChainEventType.QUALITY_CHECKED]: counts[SupplyChainEventType.QUALITY_CHECKED] || 0,
      [SupplyChainEventType.PACKAGED]: counts[SupplyChainEventType.PACKAGED] || 0,
      [SupplyChainEventType.SHIPPED]: counts[SupplyChainEventType.SHIPPED] || 0,
      [SupplyChainEventType.DELIVERED]: counts[SupplyChainEventType.DELIVERED] || 0
    };
  }

  /**
   * Calculate events by location
   */
  private calculateEventsByLocation(events: ISupplyChainEvent[]): Record<string, number> {
    const counts: Record<string, number> = {};
    
    events.forEach(event => {
      counts[event.location] = (counts[event.location] || 0) + 1;
    });

    return counts;
  }

  /**
   * Calculate events by timeframe
   */
  private calculateEventsByTimeframe(
    events: ISupplyChainEvent[],
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): {
    daily: Record<string, number>;
    weekly: Record<string, number>;
    monthly: Record<string, number>;
  } {
    const daily: Record<string, number> = {};
    const weekly: Record<string, number> = {};
    const monthly: Record<string, number> = {};

    events.forEach(event => {
      const date = new Date(event.timestamp * 1000);
      
      // Daily
      const dayKey = date.toISOString().split('T')[0];
      daily[dayKey] = (daily[dayKey] || 0) + 1;
      
      // Weekly
      const weekKey = this.getWeekKey(date);
      weekly[weekKey] = (weekly[weekKey] || 0) + 1;
      
      // Monthly
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthly[monthKey] = (monthly[monthKey] || 0) + 1;
    });

    return { daily, weekly, monthly };
  }

  /**
   * Calculate product lifecycle statistics
   */
  private calculateProductLifecycleStats(events: ISupplyChainEvent[]): {
    averageTimeToDelivery: number;
    completionRate: number;
    bottleneckLocations: string[];
  } {
    // Simplified calculations
    const productEvents = new Map<string, ISupplyChainEvent[]>();
    
    events.forEach(event => {
      if (!productEvents.has(event.productId)) {
        productEvents.set(event.productId, []);
      }
      productEvents.get(event.productId)!.push(event);
    });

    let totalTimeToDelivery = 0;
    let completedProducts = 0;
    const locationCounts: Record<string, number> = {};

    productEvents.forEach(productEventList => {
      const sortedEvents = productEventList.sort((a, b) => a.timestamp - b.timestamp);
      
      if (sortedEvents.length > 1) {
        const firstEvent = sortedEvents[0];
        const lastEvent = sortedEvents[sortedEvents.length - 1];
        
        if (lastEvent.eventType === SupplyChainEventType.DELIVERED) {
          totalTimeToDelivery += lastEvent.timestamp - firstEvent.timestamp;
          completedProducts++;
        }
      }

      // Count locations for bottleneck analysis
      sortedEvents.forEach(event => {
        locationCounts[event.location] = (locationCounts[event.location] || 0) + 1;
      });
    });

    const averageTimeToDelivery = completedProducts > 0 ? 
      totalTimeToDelivery / completedProducts : 0;
    
    const completionRate = productEvents.size > 0 ? 
      (completedProducts / productEvents.size) * 100 : 0;

    // Find bottleneck locations (simplified)
    const bottleneckLocations = Object.entries(locationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([location]) => location);

    return {
      averageTimeToDelivery,
      completionRate,
      bottleneckLocations
    };
  }

  /**
   * Get timeframe cutoff date
   */
  private getTimeframeCutoff(timeframe: 'day' | 'week' | 'month' | 'year'): Date {
    const now = new Date();
    const cutoff = new Date(now);

    switch (timeframe) {
      case 'day':
        cutoff.setDate(now.getDate() - 1);
        break;
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
    }

    return cutoff;
  }

  /**
   * Get week key for grouping
   */
  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }

  /**
   * Get week number of year
   */
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}
