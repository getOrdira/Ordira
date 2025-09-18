// src/controllers/supplyChainDashboard.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { ManufacturerAccountService } from '../services/business/manufacturerAccount.service';
import { Location } from '../models/location.model';
import { SupplyChainEvent } from '../models/supplyChainEvent.model';
import { Product } from '../models/product.model';
import { hasCreatedAt, hasMongoDocumentProperties } from '../utils/typeGuards';

// Initialize service
const manufacturerAccountService = new ManufacturerAccountService();

/**
 * GET /api/manufacturer/supply-chain/overview
 * Get comprehensive supply chain overview for manufacturer dashboard
 */
export const getSupplyChainOverview = asyncHandler(async (
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId!;

  try {
    // Get all supply chain data in parallel
    const [
      dashboardData,
      locations,
      products,
      recentEvents,
      locationStats
    ] = await Promise.all([
      manufacturerAccountService.getSupplyChainDashboard(manufacturerId),
      Location.find({ manufacturer: manufacturerId, isActive: true }).sort({ name: 1 }),
      Product.find({ manufacturer: manufacturerId }).select('title supplyChainQrCode createdAt'),
      SupplyChainEvent.find({ manufacturer: manufacturerId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('product', 'title'),
      Location.aggregate([
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
      ])
    ]);

    // Calculate product QR code statistics
    const productsWithQrCodes = products.filter(p => p.supplyChainQrCode?.isActive);
    const qrCodeStats = {
      total: products.length,
      withQrCodes: productsWithQrCodes.length,
      withoutQrCodes: products.length - productsWithQrCodes.length,
      percentage: products.length > 0 ? Math.round((productsWithQrCodes.length / products.length) * 100) : 0
    };

    // Calculate recent activity
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentActivity = {
      last24Hours: recentEvents.filter(e => hasCreatedAt(e) && e.createdAt >= last24Hours).length,
      last7Days: recentEvents.filter(e => hasCreatedAt(e) && e.createdAt >= last7Days).length,
      total: recentEvents.length
    };

    // Group events by type
    const eventsByType = recentEvents.reduce((acc: any, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {});

    // Get location statistics
    const locationStatsResult = locationStats[0] || {
      total: 0,
      active: 0,
      totalEvents: 0,
      byType: []
    };

    // Group locations by type
    const locationsByType = locationStatsResult.byType.reduce((acc: any, item: any) => {
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
        overview: {
          contractDeployed: !!dashboardData.contractInfo,
          contractAddress: dashboardData.contractInfo?.contractAddress,
          totalProducts: products.length,
          totalLocations: locations.length,
          totalEvents: dashboardData.stats.totalEvents,
          eventsThisMonth: dashboardData.stats.eventsThisMonth
        },
        qrCodeStats,
        recentActivity,
        eventsByType,
        locationsByType,
        recentEvents: recentEvents.map(event => ({
          id: event._id,
          eventType: event.eventType,
          productName: (event as Record<string, any>).product?.title || 'Unknown Product',
          location: event.eventData?.location,
          timestamp: hasCreatedAt(event) ? event.createdAt : new Date(),
          txHash: event.txHash
        })),
        locations: locations.map(location => ({
          id: location._id,
          name: location.name,
          locationType: location.locationType,
          city: location.city,
          country: location.country,
          eventCount: location.eventCount,
          allowedEventTypes: location.allowedEventTypes,
          isActive: location.isActive
        })),
        products: products.map(product => ({
          id: product._id,
          title: product.title,
          hasQrCode: !!product.supplyChainQrCode?.isActive,
          qrCodeGeneratedAt: product.supplyChainQrCode?.generatedAt,
          createdAt: hasCreatedAt(product) ? product.createdAt : new Date()
        })),
        dashboard: dashboardData,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Supply chain overview error:', error);
    next(error);
  }
});

/**
 * GET /api/manufacturer/supply-chain/analytics
 * Get detailed analytics for supply chain operations
 */
export const getSupplyChainAnalytics = asyncHandler(async (
  req: UnifiedAuthRequest & { query: { timeframe?: string; groupBy?: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId!;
  const { timeframe = '30d', groupBy = 'day' } = req.query;

  try {
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get events in date range
    const events = await SupplyChainEvent.find({
      manufacturer: manufacturerId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    // Group events by time period
    const groupedEvents: Record<string, any[]> = {};
    events.forEach(event => {
      const eventDate = new Date(hasCreatedAt(event) ? event.createdAt : new Date());
      let key: string;
      
      switch (groupBy) {
        case 'hour':
          key = eventDate.toISOString().slice(0, 13) + ':00:00.000Z';
          break;
        case 'day':
          key = eventDate.toISOString().slice(0, 10);
          break;
        case 'week':
          const weekStart = new Date(eventDate);
          weekStart.setDate(eventDate.getDate() - eventDate.getDay());
          key = weekStart.toISOString().slice(0, 10);
          break;
        case 'month':
          key = eventDate.toISOString().slice(0, 7);
          break;
        default:
          key = eventDate.toISOString().slice(0, 10);
      }
      
      if (!groupedEvents[key]) {
        groupedEvents[key] = [];
      }
      groupedEvents[key].push(event);
    });

    // Calculate analytics
    const analytics = {
      timeframe,
      groupBy,
      totalEvents: events.length,
      eventsByType: events.reduce((acc: any, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      }, {}),
      eventsByLocation: events.reduce((acc: any, event) => {
        const location = event.eventData?.location || 'Unknown';
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      }, {}),
      timeline: Object.entries(groupedEvents).map(([date, eventGroup]) => ({
        date,
        count: eventGroup.length,
        events: eventGroup.map(event => ({
          eventType: event.eventType,
          location: event.eventData?.location,
          timestamp: hasCreatedAt(event) ? event.createdAt : new Date()
        }))
      })),
      trends: {
        averageEventsPerDay: events.length / Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))),
        peakDay: Object.entries(groupedEvents).reduce((max, [date, eventGroup]) => 
          eventGroup.length > max.count ? { date, count: eventGroup.length } : max,
          { date: '', count: 0 }
        )
      }
    };

    res.json({
      success: true,
      data: analytics,
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Supply chain analytics error:', error);
    next(error);
  }
});

/**
 * GET /api/manufacturer/supply-chain/quick-actions
 * Get available quick actions for the manufacturer
 */
export const getQuickActions = asyncHandler(async (
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const manufacturerId = req.userId!;

  try {
    // Get current state
    const [contractInfo, locations, products, productsWithQrCodes] = await Promise.all([
      manufacturerAccountService.getSupplyChainContractInfo(manufacturerId),
      Location.countDocuments({ manufacturer: manufacturerId, isActive: true }),
      Product.countDocuments({ manufacturer: manufacturerId }),
      Product.countDocuments({ 
        manufacturer: manufacturerId, 
        'supplyChainQrCode.isActive': true 
      })
    ]);

    const quickActions = [];

    // Contract deployment action
    if (!contractInfo) {
      quickActions.push({
        id: 'deploy-contract',
        title: 'Deploy Supply Chain Contract',
        description: 'Deploy your blockchain contract to start tracking',
        action: 'deploy',
        priority: 'high',
        icon: 'contract',
        url: '/supply-chain/deploy'
      });
    }

    // Location creation action
    if (locations === 0) {
      quickActions.push({
        id: 'create-location',
        title: 'Add Your First Location',
        description: 'Create locations where supply chain events occur',
        action: 'create',
        priority: 'high',
        icon: 'location',
        url: '/supply-chain/locations/new'
      });
    } else if (locations < 3) {
      quickActions.push({
        id: 'add-more-locations',
        title: 'Add More Locations',
        description: 'Expand your supply chain network',
        action: 'create',
        priority: 'medium',
        icon: 'location',
        url: '/supply-chain/locations/new'
      });
    }

    // Product QR code generation
    const productsWithoutQrCodes = products - productsWithQrCodes;
    if (productsWithoutQrCodes > 0) {
      quickActions.push({
        id: 'generate-qr-codes',
        title: `Generate QR Codes for ${productsWithoutQrCodes} Products`,
        description: 'Create QR codes for product tracking',
        action: 'generate',
        priority: 'medium',
        icon: 'qr-code',
        url: '/supply-chain/products/qr-codes'
      });
    }

    // Recent activity action
    quickActions.push({
      id: 'view-recent-activity',
      title: 'View Recent Activity',
      description: 'See your latest supply chain events',
      action: 'view',
      priority: 'low',
      icon: 'activity',
      url: '/supply-chain/events'
    });

    res.json({
      success: true,
      data: {
        quickActions,
        stats: {
          contractDeployed: !!contractInfo,
          locationsCount: locations,
          productsCount: products,
          productsWithQrCodes
        }
      }
    });

  } catch (error: any) {
    console.error('Quick actions error:', error);
    next(error);
  }
});
