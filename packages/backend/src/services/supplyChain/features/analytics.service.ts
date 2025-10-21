// src/services/supplyChain/features/analytics.service.ts
import { logger } from '../../../utils/logger';
import { ContractReadService } from '../core/contractRead.service';
import { AssociationService } from '../core/association.service';
import { SupplyChainValidationService } from '../validation/supplyChainValidation.service';
import { SupplyChainMappers } from '../utils/mappers';
import {
  ISupplyChainAnalytics,
  ISupplyChainEvent,
  ISupplyChainProduct,
  ISupplyChainEndpoint,
  SupplyChainEventType,
  IApiResponse,
  IPaginatedResponse
} from '../utils/types';

// ===== INTERFACES =====

export interface IAnalyticsRequest {
  businessId: string;
  contractAddress: string;
  startDate?: Date;
  endDate?: Date;
  groupBy?: 'day' | 'week' | 'month' | 'year';
  includeInactive?: boolean;
}

export interface IAnalyticsResponse {
  analytics: ISupplyChainAnalytics;
  timeframe: {
    startDate: Date;
    endDate: Date;
    groupBy: string;
  };
  generatedAt: Date;
}

export interface IEventAnalytics {
  totalEvents: number;
  eventsByType: Record<SupplyChainEventType, number>;
  eventsByLocation: Record<string, number>;
  eventsByTimeframe: {
    daily: Record<string, number>;
    weekly: Record<string, number>;
    monthly: Record<string, number>;
  };
  averageEventsPerProduct: number;
  peakActivityTime: string;
}

export interface IProductAnalytics {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  averageEventsPerProduct: number;
  productsByStatus: Record<string, number>;
  topProductsByEvents: Array<{
    productId: string;
    name: string;
    eventCount: number;
  }>;
}

export interface IEndpointAnalytics {
  totalEndpoints: number;
  activeEndpoints: number;
  inactiveEndpoints: number;
  endpointsByType: Record<SupplyChainEventType, number>;
  topEndpointsByActivity: Array<{
    id: number;
    name: string;
    eventCount: number;
  }>;
}

export interface IPerformanceMetrics {
  averageTimeToDelivery: number;
  completionRate: number;
  bottleneckLocations: string[];
  efficiencyScore: number;
  throughputRate: number;
}

export interface ITrendAnalysis {
  eventTrend: 'increasing' | 'decreasing' | 'stable';
  productTrend: 'increasing' | 'decreasing' | 'stable';
  efficiencyTrend: 'improving' | 'declining' | 'stable';
  trendData: Array<{
    date: string;
    events: number;
    products: number;
    efficiency: number;
  }>;
}

// ===== ERROR CLASS =====

class AnalyticsError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'AnalyticsError';
    this.statusCode = statusCode;
  }
}

// ===== MAIN SERVICE CLASS =====

export class SupplyChainAnalyticsService {
  private static instance: SupplyChainAnalyticsService;
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

  public static getInstance(): SupplyChainAnalyticsService {
    if (!SupplyChainAnalyticsService.instance) {
      SupplyChainAnalyticsService.instance = new SupplyChainAnalyticsService();
    }
    return SupplyChainAnalyticsService.instance;
  }

  /**
   * Get comprehensive analytics
   */
  async getAnalytics(
    request: IAnalyticsRequest
  ): Promise<IApiResponse<IAnalyticsResponse>> {
    try {
      // Validate input
      const validation = await this.validationService.validateAll({
        contractAddress: request.contractAddress,
        businessId: request.businessId,
        dateRange: {
          startDate: request.startDate,
          endDate: request.endDate
        }
      });

      if (!validation.valid) {
        throw new AnalyticsError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Set default date range if not provided
      const endDate = request.endDate || new Date();
      const startDate = request.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      // Get all data for analytics
      const [products, endpoints, events] = await Promise.all([
        this.getAllProducts(request.contractAddress, request.businessId, request.includeInactive),
        this.getAllEndpoints(request.contractAddress, request.businessId, request.includeInactive),
        this.getAllEvents(request.contractAddress, request.businessId, startDate, endDate)
      ]);

      // Build analytics
      const analytics: ISupplyChainAnalytics = {
        totalProducts: products.length,
        totalEvents: events.length,
        totalEndpoints: endpoints.length,
        eventsByType: this.calculateEventsByType(events),
        eventsByLocation: this.calculateEventsByLocation(events),
        eventsByTimeframe: this.calculateEventsByTimeframe(events, request.groupBy || 'day'),
        productLifecycleStats: this.calculateProductLifecycleStats(events)
      };

      const response: IAnalyticsResponse = {
        analytics,
        timeframe: {
          startDate,
          endDate,
          groupBy: request.groupBy || 'day'
        },
        generatedAt: new Date()
      };

      logger.info('Analytics generated successfully', {
        businessId: request.businessId,
        contractAddress: request.contractAddress,
        totalProducts: products.length,
        totalEvents: events.length,
        totalEndpoints: endpoints.length
      });

      return this.mappers.mapToApiResponse(response);

    } catch (error: any) {
      logger.error('Get analytics error:', error);
      
      if (error instanceof AnalyticsError) {
        throw error;
      }

      throw new AnalyticsError(`Failed to get analytics: ${error.message}`, 500);
    }
  }

  /**
   * Get event analytics
   */
  async getEventAnalytics(
    businessId: string,
    contractAddress: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<IApiResponse<IEventAnalytics>> {
    try {
      const endDateActual = endDate || new Date();
      const startDateActual = startDate || new Date(endDateActual.getTime() - 30 * 24 * 60 * 60 * 1000);

      const events = await this.getAllEvents(contractAddress, businessId, startDateActual, endDateActual);

      const analytics: IEventAnalytics = {
        totalEvents: events.length,
        eventsByType: this.calculateEventsByType(events),
        eventsByLocation: this.calculateEventsByLocation(events),
        eventsByTimeframe: this.calculateEventsByTimeframe(events, 'day'),
        averageEventsPerProduct: this.calculateAverageEventsPerProduct(events),
        peakActivityTime: this.calculatePeakActivityTime(events)
      };

      return this.mappers.mapToApiResponse(analytics);

    } catch (error: any) {
      logger.error('Get event analytics error:', error);
      throw new AnalyticsError(`Failed to get event analytics: ${error.message}`, 500);
    }
  }

  /**
   * Get product analytics
   */
  async getProductAnalytics(
    businessId: string,
    contractAddress: string
  ): Promise<IApiResponse<IProductAnalytics>> {
    try {
      const products = await this.getAllProducts(contractAddress, businessId, true);

      const analytics: IProductAnalytics = {
        totalProducts: products.length,
        activeProducts: products.filter(p => p.isActive).length,
        inactiveProducts: products.filter(p => !p.isActive).length,
        averageEventsPerProduct: products.reduce((sum, p) => sum + p.totalEvents, 0) / products.length,
        productsByStatus: this.calculateProductsByStatus(products),
        topProductsByEvents: this.getTopProductsByEvents(products, 10)
      };

      return this.mappers.mapToApiResponse(analytics);

    } catch (error: any) {
      logger.error('Get product analytics error:', error);
      throw new AnalyticsError(`Failed to get product analytics: ${error.message}`, 500);
    }
  }

  /**
   * Get endpoint analytics
   */
  async getEndpointAnalytics(
    businessId: string,
    contractAddress: string
  ): Promise<IApiResponse<IEndpointAnalytics>> {
    try {
      const endpoints = await this.getAllEndpoints(contractAddress, businessId, true);

      const analytics: IEndpointAnalytics = {
        totalEndpoints: endpoints.length,
        activeEndpoints: endpoints.filter(e => e.isActive).length,
        inactiveEndpoints: endpoints.filter(e => !e.isActive).length,
        endpointsByType: this.calculateEndpointsByType(endpoints),
        topEndpointsByActivity: this.getTopEndpointsByActivity(endpoints, 10)
      };

      return this.mappers.mapToApiResponse(analytics);

    } catch (error: any) {
      logger.error('Get endpoint analytics error:', error);
      throw new AnalyticsError(`Failed to get endpoint analytics: ${error.message}`, 500);
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(
    businessId: string,
    contractAddress: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<IApiResponse<IPerformanceMetrics>> {
    try {
      const endDateActual = endDate || new Date();
      const startDateActual = startDate || new Date(endDateActual.getTime() - 30 * 24 * 60 * 60 * 1000);

      const events = await this.getAllEvents(contractAddress, businessId, startDateActual, endDateActual);

      const metrics: IPerformanceMetrics = {
        averageTimeToDelivery: this.calculateAverageTimeToDelivery(events),
        completionRate: this.calculateCompletionRate(events),
        bottleneckLocations: this.calculateBottleneckLocations(events),
        efficiencyScore: this.calculateEfficiencyScore(events),
        throughputRate: this.calculateThroughputRate(events, startDateActual, endDateActual)
      };

      return this.mappers.mapToApiResponse(metrics);

    } catch (error: any) {
      logger.error('Get performance metrics error:', error);
      throw new AnalyticsError(`Failed to get performance metrics: ${error.message}`, 500);
    }
  }

  /**
   * Get trend analysis
   */
  async getTrendAnalysis(
    businessId: string,
    contractAddress: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<IApiResponse<ITrendAnalysis>> {
    try {
      const endDateActual = endDate || new Date();
      const startDateActual = startDate || new Date(endDateActual.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days

      const events = await this.getAllEvents(contractAddress, businessId, startDateActual, endDateActual);

      const trendData = this.calculateTrendData(events, startDateActual, endDateActual);
      const trends = this.calculateTrends(trendData);

      const analysis: ITrendAnalysis = {
        eventTrend: trends.eventTrend,
        productTrend: trends.productTrend,
        efficiencyTrend: trends.efficiencyTrend,
        trendData
      };

      return this.mappers.mapToApiResponse(analysis);

    } catch (error: any) {
      logger.error('Get trend analysis error:', error);
      throw new AnalyticsError(`Failed to get trend analysis: ${error.message}`, 500);
    }
  }

  /**
   * Get all products
   */
  private async getAllProducts(
    contractAddress: string,
    businessId: string,
    includeInactive: boolean = false
  ): Promise<ISupplyChainProduct[]> {
    try {
      const result = await this.contractReadService.getProducts(
        contractAddress,
        businessId,
        { includeInactive, limit: 1000 }
      );

      return result.success ? result.data || [] : [];
    } catch (error: any) {
      logger.error('Failed to get all products:', error);
      return [];
    }
  }

  /**
   * Get all endpoints
   */
  private async getAllEndpoints(
    contractAddress: string,
    businessId: string,
    includeInactive: boolean = false
  ): Promise<ISupplyChainEndpoint[]> {
    try {
      const result = await this.contractReadService.getEndpoints(
        contractAddress,
        businessId,
        { includeInactive, limit: 1000 }
      );

      return result.success ? result.data || [] : [];
    } catch (error: any) {
      logger.error('Failed to get all endpoints:', error);
      return [];
    }
  }

  /**
   * Get all events within date range
   */
  private async getAllEvents(
    contractAddress: string,
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ISupplyChainEvent[]> {
    try {
      const products = await this.getAllProducts(contractAddress, businessId);
      const allEvents: ISupplyChainEvent[] = [];

      for (const product of products) {
        try {
          const result = await this.contractReadService.getProductEvents(
            contractAddress,
            product.productId,
            businessId,
            { limit: 1000 }
          );

          if (result.success && result.data) {
            // Filter events by date range
            const filteredEvents = result.data.filter(event => {
              const eventDate = new Date(event.timestamp * 1000);
              return eventDate >= startDate && eventDate <= endDate;
            });

            allEvents.push(...filteredEvents);
          }
        } catch (error: any) {
          logger.warn('Failed to get events for product', { 
            productId: product.productId, 
            error: error.message 
          });
        }
      }

      return allEvents;
    } catch (error: any) {
      logger.error('Failed to get all events:', error);
      return [];
    }
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
    groupBy: 'day' | 'week' | 'month' | 'year' = 'day'
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

    // Find bottleneck locations
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
   * Calculate average events per product
   */
  private calculateAverageEventsPerProduct(events: ISupplyChainEvent[]): number {
    const productEventCounts = new Map<string, number>();
    
    events.forEach(event => {
      productEventCounts.set(
        event.productId,
        (productEventCounts.get(event.productId) || 0) + 1
      );
    });

    const totalEvents = events.length;
    const uniqueProducts = productEventCounts.size;
    
    return uniqueProducts > 0 ? totalEvents / uniqueProducts : 0;
  }

  /**
   * Calculate peak activity time
   */
  private calculatePeakActivityTime(events: ISupplyChainEvent[]): string {
    const hourCounts: Record<number, number> = {};
    
    events.forEach(event => {
      const hour = new Date(event.timestamp * 1000).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    return peakHour ? `${peakHour}:00` : 'Unknown';
  }

  /**
   * Calculate products by status
   */
  private calculateProductsByStatus(products: ISupplyChainProduct[]): Record<string, number> {
    const counts: Record<string, number> = {};
    
    products.forEach(product => {
      const status = product.isActive ? 'active' : 'inactive';
      counts[status] = (counts[status] || 0) + 1;
    });

    return counts;
  }

  /**
   * Get top products by events
   */
  private getTopProductsByEvents(products: ISupplyChainProduct[], limit: number): Array<{
    productId: string;
    name: string;
    eventCount: number;
  }> {
    return products
      .sort((a, b) => b.totalEvents - a.totalEvents)
      .slice(0, limit)
      .map(product => ({
        productId: product.productId,
        name: product.name,
        eventCount: product.totalEvents
      }));
  }

  /**
   * Calculate endpoints by type
   */
  private calculateEndpointsByType(endpoints: ISupplyChainEndpoint[]): Record<SupplyChainEventType, number> {
    const counts: Record<string, number> = {};
    
    endpoints.forEach(endpoint => {
      counts[endpoint.eventType] = (counts[endpoint.eventType] || 0) + 1;
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
   * Get top endpoints by activity
   */
  private getTopEndpointsByActivity(endpoints: ISupplyChainEndpoint[], limit: number): Array<{
    id: number;
    name: string;
    eventCount: number;
  }> {
    return endpoints
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, limit)
      .map(endpoint => ({
        id: endpoint.id,
        name: endpoint.name,
        eventCount: endpoint.eventCount
      }));
  }

  /**
   * Calculate average time to delivery
   */
  private calculateAverageTimeToDelivery(events: ISupplyChainEvent[]): number {
    const productEvents = new Map<string, ISupplyChainEvent[]>();
    
    events.forEach(event => {
      if (!productEvents.has(event.productId)) {
        productEvents.set(event.productId, []);
      }
      productEvents.get(event.productId)!.push(event);
    });

    let totalTime = 0;
    let completedProducts = 0;

    productEvents.forEach(productEventList => {
      const sortedEvents = productEventList.sort((a, b) => a.timestamp - b.timestamp);
      
      if (sortedEvents.length > 1) {
        const firstEvent = sortedEvents[0];
        const lastEvent = sortedEvents[sortedEvents.length - 1];
        
        if (lastEvent.eventType === SupplyChainEventType.DELIVERED) {
          totalTime += lastEvent.timestamp - firstEvent.timestamp;
          completedProducts++;
        }
      }
    });

    return completedProducts > 0 ? totalTime / completedProducts : 0;
  }

  /**
   * Calculate completion rate
   */
  private calculateCompletionRate(events: ISupplyChainEvent[]): number {
    const productEvents = new Map<string, ISupplyChainEvent[]>();
    
    events.forEach(event => {
      if (!productEvents.has(event.productId)) {
        productEvents.set(event.productId, []);
      }
      productEvents.get(event.productId)!.push(event);
    });

    let completedProducts = 0;

    productEvents.forEach(productEventList => {
      const hasDelivery = productEventList.some(
        event => event.eventType === SupplyChainEventType.DELIVERED
      );
      
      if (hasDelivery) {
        completedProducts++;
      }
    });

    return productEvents.size > 0 ? (completedProducts / productEvents.size) * 100 : 0;
  }

  /**
   * Calculate bottleneck locations
   */
  private calculateBottleneckLocations(events: ISupplyChainEvent[]): string[] {
    const locationCounts: Record<string, number> = {};
    
    events.forEach(event => {
      locationCounts[event.location] = (locationCounts[event.location] || 0) + 1;
    });

    return Object.entries(locationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([location]) => location);
  }

  /**
   * Calculate efficiency score
   */
  private calculateEfficiencyScore(events: ISupplyChainEvent[]): number {
    // Simple efficiency score based on completion rate and event distribution
    const completionRate = this.calculateCompletionRate(events);
    const eventsByType = this.calculateEventsByType(events);
    
    // Calculate distribution score (more balanced = higher score)
    const totalEvents = events.length;
    const expectedPerType = totalEvents / 6; // 6 event types
    const distributionScore = Object.values(eventsByType).reduce((score, count) => {
      const deviation = Math.abs(count - expectedPerType) / expectedPerType;
      return score + (1 - deviation);
    }, 0) / 6;

    return (completionRate + distributionScore * 100) / 2;
  }

  /**
   * Calculate throughput rate
   */
  private calculateThroughputRate(
    events: ISupplyChainEvent[],
    startDate: Date,
    endDate: Date
  ): number {
    const timeSpanMs = endDate.getTime() - startDate.getTime();
    const timeSpanDays = timeSpanMs / (1000 * 60 * 60 * 24);
    
    return timeSpanDays > 0 ? events.length / timeSpanDays : 0;
  }

  /**
   * Calculate trend data
   */
  private calculateTrendData(
    events: ISupplyChainEvent[],
    startDate: Date,
    endDate: Date
  ): Array<{
    date: string;
    events: number;
    products: number;
    efficiency: number;
  }> {
    const trendData: Array<{
      date: string;
      events: number;
      products: number;
      efficiency: number;
    }> = [];

    // Group events by day
    const dailyEvents = new Map<string, ISupplyChainEvent[]>();
    const dailyProducts = new Map<string, Set<string>>();

    events.forEach(event => {
      const date = new Date(event.timestamp * 1000);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!dailyEvents.has(dateKey)) {
        dailyEvents.set(dateKey, []);
        dailyProducts.set(dateKey, new Set());
      }
      
      dailyEvents.get(dateKey)!.push(event);
      dailyProducts.get(dateKey)!.add(event.productId);
    });

    // Generate trend data for each day
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayEvents = dailyEvents.get(dateKey) || [];
      const dayProducts = dailyProducts.get(dateKey) || new Set();
      
      const efficiency = this.calculateEfficiencyScore(dayEvents);

      trendData.push({
        date: dateKey,
        events: dayEvents.length,
        products: dayProducts.size,
        efficiency
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return trendData;
  }

  /**
   * Calculate trends from trend data
   */
  private calculateTrends(trendData: Array<{
    date: string;
    events: number;
    products: number;
    efficiency: number;
  }>): {
    eventTrend: 'increasing' | 'decreasing' | 'stable';
    productTrend: 'increasing' | 'decreasing' | 'stable';
    efficiencyTrend: 'improving' | 'declining' | 'stable';
  } {
    if (trendData.length < 2) {
      return {
        eventTrend: 'stable',
        productTrend: 'stable',
        efficiencyTrend: 'stable'
      };
    }

    const firstHalf = trendData.slice(0, Math.floor(trendData.length / 2));
    const secondHalf = trendData.slice(Math.floor(trendData.length / 2));

    const avgEventsFirst = firstHalf.reduce((sum, d) => sum + d.events, 0) / firstHalf.length;
    const avgEventsSecond = secondHalf.reduce((sum, d) => sum + d.events, 0) / secondHalf.length;
    
    const avgProductsFirst = firstHalf.reduce((sum, d) => sum + d.products, 0) / firstHalf.length;
    const avgProductsSecond = secondHalf.reduce((sum, d) => sum + d.products, 0) / secondHalf.length;
    
    const avgEfficiencyFirst = firstHalf.reduce((sum, d) => sum + d.efficiency, 0) / firstHalf.length;
    const avgEfficiencySecond = secondHalf.reduce((sum, d) => sum + d.efficiency, 0) / secondHalf.length;

    const eventTrend = this.determineTrend(avgEventsFirst, avgEventsSecond);
    const productTrend = this.determineTrend(avgProductsFirst, avgProductsSecond);
    const efficiencyTrend = this.determineTrend(avgEfficiencyFirst, avgEfficiencySecond);

    return {
      eventTrend,
      productTrend,
      efficiencyTrend: efficiencyTrend === 'increasing' ? 'improving' : 
                      efficiencyTrend === 'decreasing' ? 'declining' : 'stable'
    };
  }

  /**
   * Determine trend direction
   */
  private determineTrend(first: number, second: number): 'increasing' | 'decreasing' | 'stable' {
    const threshold = 0.1; // 10% change threshold
    const change = (second - first) / first;
    
    if (change > threshold) return 'increasing';
    if (change < -threshold) return 'decreasing';
    return 'stable';
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
