// src/services/manufacturers/features/search.service.ts

import { Manufacturer, IManufacturer } from '../../../models/deprecated/manufacturer.model';
import { enhancedDatabaseService } from '../../external/enhanced-database.service';
import { enhancedCacheService } from '../../external/enhanced-cache.service';
import { aggregationOptimizationService } from '../../external/aggregation-optimization.service';
import { cacheService } from '../../external/cache.service';

export interface AdvancedSearchFilters {
  name?: string;
  industry?: string;
  location?: string;
  verificationStatus?: 'verified' | 'pending' | 'unverified';
  size?: 'small' | 'medium' | 'large' | 'enterprise';
  establishedYear?: { min?: number; max?: number };
  certifications?: string[];
  productCategories?: string[];
  sustainabilityRating?: { min?: number; max?: number };
  revenueRange?: { min?: number; max?: number };
  employeeCount?: { min?: number; max?: number };
  supplyChainCompliance?: boolean;
  hasBlockchainIntegration?: boolean;
  geolocation?: {
    lat: number;
    lng: number;
    radius: number; // in kilometers
  };
}

export interface SearchOptions {
  sortBy?: 'relevance' | 'name' | 'establishedYear' | 'verificationStatus' | 'sustainabilityRating' | 'distance';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  includeInactive?: boolean;
  fuzzySearch?: boolean;
  highlightMatches?: boolean;
}

export interface SearchHighlight {
  field: string;
  matches: string[];
}

export interface AdvancedSearchResult {
  manufacturer: IManufacturer;
  score: number;
  highlights?: SearchHighlight[];
  distance?: number; // in kilometers for geo searches
  matchingCriteria: string[];
}

export interface SearchSuggestion {
  text: string;
  type: 'name' | 'industry' | 'location' | 'certification';
  count: number;
}

export interface ComparisonCriteria {
  financialMetrics?: boolean;
  sustainabilityScores?: boolean;
  productPortfolio?: boolean;
  certifications?: boolean;
  supplyChainMetrics?: boolean;
  customerSatisfaction?: boolean;
  innovationIndex?: boolean;
}

export interface ManufacturerComparison {
  manufacturers: IManufacturer[];
  comparisonMatrix: {
    [manufacturerId: string]: {
      [metric: string]: any;
    };
  };
  rankings: {
    [metric: string]: Array<{
      manufacturerId: string;
      value: any;
      rank: number;
    }>;
  };
  insights: string[];
  generatedAt: Date;
}

export interface TrendAnalysis {
  metric: string;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  data: Array<{
    period: string;
    value: number;
    change: number;
    percentChange: number;
  }>;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  forecast?: Array<{
    period: string;
    predictedValue: number;
    confidence: number;
  }>;
}

export interface IndustryBenchmark {
  industry: string;
  metrics: {
    [key: string]: {
      average: number;
      median: number;
      min: number;
      max: number;
      standardDeviation: number;
      percentiles: {
        '25': number;
        '50': number;
        '75': number;
        '90': number;
        '95': number;
      };
    };
  };
  sampleSize: number;
  lastUpdated: Date;
}

class ManufacturerSearchError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ManufacturerSearchError';
  }
}

export class ManufacturerSearchService {
  private cacheTimeout = 300; // 5 minutes

  async advancedSearch(
    filters: AdvancedSearchFilters,
    options: SearchOptions = {}
  ): Promise<{
    results: AdvancedSearchResult[];
    total: number;
    page: number;
    totalPages: number;
    searchTime: number;
    suggestions?: SearchSuggestion[];
  }> {
    try {
      const startTime = Date.now();
      const cacheKey = `advanced_search:${JSON.stringify({ filters, options })}`;

      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return {
          ...(cached as any),
          searchTime: Date.now() - startTime
        };
      }

      const {
        sortBy = 'relevance',
        sortOrder = 'desc',
        page = 1,
        limit = 20,
        includeInactive = false,
        fuzzySearch = false,
        highlightMatches = false
      } = options;

      const pipeline = [];

      // Build match stage
      const matchStage: any = {};

      if (!includeInactive) {
        matchStage.isActive = true;
      }

      if (filters.name) {
        if (fuzzySearch) {
          matchStage.$text = { $search: filters.name };
        } else {
          matchStage.name = { $regex: filters.name, $options: 'i' };
        }
      }

      if (filters.industry) {
        matchStage.industry = { $regex: filters.industry, $options: 'i' };
      }

      if (filters.location) {
        matchStage['location.country'] = { $regex: filters.location, $options: 'i' };
      }

      if (filters.verificationStatus) {
        matchStage.verificationStatus = filters.verificationStatus;
      }

      if (filters.size) {
        matchStage.companySize = filters.size;
      }

      if (filters.establishedYear) {
        const yearFilter: any = {};
        if (filters.establishedYear.min) yearFilter.$gte = filters.establishedYear.min;
        if (filters.establishedYear.max) yearFilter.$lte = filters.establishedYear.max;
        if (Object.keys(yearFilter).length > 0) {
          matchStage.establishedYear = yearFilter;
        }
      }

      if (filters.certifications?.length) {
        matchStage.certifications = { $in: filters.certifications };
      }

      if (filters.productCategories?.length) {
        matchStage.productCategories = { $in: filters.productCategories };
      }

      if (filters.sustainabilityRating) {
        const ratingFilter: any = {};
        if (filters.sustainabilityRating.min) ratingFilter.$gte = filters.sustainabilityRating.min;
        if (filters.sustainabilityRating.max) ratingFilter.$lte = filters.sustainabilityRating.max;
        if (Object.keys(ratingFilter).length > 0) {
          matchStage.sustainabilityRating = ratingFilter;
        }
      }

      if (filters.revenueRange) {
        const revenueFilter: any = {};
        if (filters.revenueRange.min) revenueFilter.$gte = filters.revenueRange.min;
        if (filters.revenueRange.max) revenueFilter.$lte = filters.revenueRange.max;
        if (Object.keys(revenueFilter).length > 0) {
          matchStage.annualRevenue = revenueFilter;
        }
      }

      if (filters.employeeCount) {
        const employeeFilter: any = {};
        if (filters.employeeCount.min) employeeFilter.$gte = filters.employeeCount.min;
        if (filters.employeeCount.max) employeeFilter.$lte = filters.employeeCount.max;
        if (Object.keys(employeeFilter).length > 0) {
          matchStage.employeeCount = employeeFilter;
        }
      }

      if (filters.supplyChainCompliance !== undefined) {
        matchStage.supplyChainCompliance = filters.supplyChainCompliance;
      }

      if (filters.hasBlockchainIntegration !== undefined) {
        matchStage.hasBlockchainIntegration = filters.hasBlockchainIntegration;
      }

      pipeline.push({ $match: matchStage });

      // Geolocation filtering
      if (filters.geolocation) {
        pipeline.push({
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [filters.geolocation.lng, filters.geolocation.lat]
            },
            distanceField: 'distance',
            maxDistance: filters.geolocation.radius * 1000, // Convert km to meters
            spherical: true
          }
        });
      }

      // Add scoring for relevance
      if (sortBy === 'relevance') {
        pipeline.push({
          $addFields: {
            score: {
              $add: [
                { $cond: [{ $eq: ['$verificationStatus', 'verified'] }, 10, 0] },
                { $multiply: ['$sustainabilityRating', 0.1] },
                { $cond: [{ $gte: ['$establishedYear', 2010] }, 5, 0] },
                { $size: { $ifNull: ['$certifications', []] } }
              ]
            }
          }
        });
      }

      // Add highlights if requested
      if (highlightMatches && filters.name) {
        pipeline.push({
          $addFields: {
            highlights: {
              $cond: [
                { $regexMatch: { input: '$name', regex: filters.name, options: 'i' } },
                [{ field: 'name', matches: ['$name'] }],
                []
              ]
            }
          }
        });
      }

      // Sorting
      const sortStage: any = {};
      switch (sortBy) {
        case 'name':
          sortStage.name = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'establishedYear':
          sortStage.establishedYear = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'verificationStatus':
          sortStage.verificationStatus = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'sustainabilityRating':
          sortStage.sustainabilityRating = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'distance':
          if (filters.geolocation) {
            sortStage.distance = sortOrder === 'asc' ? 1 : -1;
          }
          break;
        case 'relevance':
        default:
          sortStage.score = -1;
          break;
      }
      pipeline.push({ $sort: sortStage });

      // Pagination
      const skip = (page - 1) * limit;
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });

      // Execute search
      const results = await aggregationOptimizationService.executeOptimizedAggregation(
        'manufacturers',
        pipeline
      );

      // Get total count
      const countPipeline = pipeline.slice(0, -2); // Remove skip and limit
      countPipeline.push({ $count: 'total' });
      const countResult = await aggregationOptimizationService.executeOptimizedAggregation(
        'manufacturers',
        countPipeline
      );
      const total = countResult[0]?.total || 0;

      // Generate suggestions if no results
      let suggestions: SearchSuggestion[] | undefined;
      if (results.length === 0) {
        suggestions = await this.generateSearchSuggestions(filters);
      }

      const searchResult = {
        results: results.map((r: any) => ({
          manufacturer: r,
          score: r.score || 0,
          highlights: r.highlights,
          distance: r.distance ? r.distance / 1000 : undefined, // Convert back to km
          matchingCriteria: this.extractMatchingCriteria(r, filters)
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
        searchTime: Date.now() - startTime,
        suggestions
      };

      await cacheService.set(cacheKey, searchResult, { ttl: this.cacheTimeout });
      return searchResult;

    } catch (error) {
      throw new ManufacturerSearchError(`Advanced search failed: ${error.message}`);
    }
  }

  async compareManufacturers(
    manufacturerIds: string[],
    criteria: ComparisonCriteria = {}
  ): Promise<ManufacturerComparison> {
    try {
      const cacheKey = `manufacturer_comparison:${manufacturerIds.sort().join(',')}:${JSON.stringify(criteria)}`;

      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached as ManufacturerComparison;
      }

      if (manufacturerIds.length < 2 || manufacturerIds.length > 5) {
        throw new ManufacturerSearchError('Can only compare between 2 and 5 manufacturers');
      }

      const manufacturers = await Manufacturer.find({
        _id: { $in: manufacturerIds },
        isActive: true
      });

      if (manufacturers.length !== manufacturerIds.length) {
        throw new ManufacturerSearchError('One or more manufacturers not found');
      }

      const comparisonMatrix: any = {};
      const rankings: any = {};

      // Initialize comparison matrix
      manufacturers.forEach(manufacturer => {
        comparisonMatrix[manufacturer._id] = {};
      });

      // Financial metrics comparison
      if (criteria.financialMetrics) {
        const metrics = ['annualRevenue', 'profitMargin', 'growthRate', 'marketShare'];
        metrics.forEach(metric => {
          const values = manufacturers.map(m => ({
            manufacturerId: m._id,
            value: m[metric] || 0
          }));

          values.forEach(v => {
            comparisonMatrix[v.manufacturerId][metric] = v.value;
          });

          rankings[metric] = values
            .sort((a, b) => b.value - a.value)
            .map((v, index) => ({
              ...v,
              rank: index + 1
            }));
        });
      }

      // Sustainability scores
      if (criteria.sustainabilityScores) {
        const sustainabilityMetrics = ['sustainabilityRating', 'carbonFootprint', 'renewableEnergyUsage'];
        sustainabilityMetrics.forEach(metric => {
          const values = manufacturers.map(m => ({
            manufacturerId: m._id,
            value: m[metric] || 0
          }));

          values.forEach(v => {
            comparisonMatrix[v.manufacturerId][metric] = v.value;
          });

          const isLowerBetter = metric === 'carbonFootprint';
          rankings[metric] = values
            .sort((a, b) => isLowerBetter ? a.value - b.value : b.value - a.value)
            .map((v, index) => ({
              ...v,
              rank: index + 1
            }));
        });
      }

      // Product portfolio comparison
      if (criteria.productPortfolio) {
        manufacturers.forEach(manufacturer => {
        comparisonMatrix[manufacturer._id].productCount = (manufacturer as any).productCategories?.length || 0;
        comparisonMatrix[manufacturer._id].productCategories = (manufacturer as any).productCategories || [];
        });

        const productCountValues = manufacturers.map(m => ({
          manufacturerId: m._id,
          value: (m as any).productCategories?.length || 0
        }));

        rankings.productCount = productCountValues
          .sort((a, b) => b.value - a.value)
          .map((v, index) => ({
            ...v,
            rank: index + 1
          }));
      }

      // Certifications comparison
      if (criteria.certifications) {
        manufacturers.forEach(manufacturer => {
          comparisonMatrix[manufacturer._id].certificationCount = manufacturer.certifications?.length || 0;
          comparisonMatrix[manufacturer._id].certifications = manufacturer.certifications || [];
        });

        const certificationValues = manufacturers.map(m => ({
          manufacturerId: m._id,
          value: m.certifications?.length || 0
        }));

        rankings.certificationCount = certificationValues
          .sort((a, b) => b.value - a.value)
          .map((v, index) => ({
            ...v,
            rank: index + 1
          }));
      }

      // Generate insights
      const insights = this.generateComparisonInsights(manufacturers, comparisonMatrix, rankings);

      const comparison: ManufacturerComparison = {
        manufacturers,
        comparisonMatrix,
        rankings,
        insights,
        generatedAt: new Date()
      };

      await cacheService.set(cacheKey, comparison, { ttl: this.cacheTimeout });
      return comparison;

    } catch (error) {
      throw new ManufacturerSearchError(`Manufacturer comparison failed: ${error.message}`);
    }
  }

  async getTrendAnalysis(
    manufacturerId: string,
    metric: string,
    timeframe: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  ): Promise<TrendAnalysis> {
    try {
      const cacheKey = `trend_analysis:${manufacturerId}:${metric}:${timeframe}`;

      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached as TrendAnalysis;
      }

      // Get historical data
      const endDate = new Date();
      const startDate = new Date();

      switch (timeframe) {
        case 'daily':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case 'weekly':
          startDate.setDate(endDate.getDate() - 84); // 12 weeks
          break;
        case 'monthly':
          startDate.setMonth(endDate.getMonth() - 12);
          break;
        case 'quarterly':
          startDate.setMonth(endDate.getMonth() - 24);
          break;
        case 'yearly':
          startDate.setFullYear(endDate.getFullYear() - 5);
          break;
      }

      // Fetch trend data from analytics collection
      const trendData = await Manufacturer.find({
        _id: manufacturerId,
        [`analytics.${metric}`]: { $exists: true }
      }).select(`analytics.${metric} createdAt`);

      // Process data into periods
      const data = trendData.map((point: any, index: number) => {
        const previousValue = index > 0 ? (trendData[index - 1] as any).value : (point as any).value;
        const change = (point as any).value - previousValue;
        const percentChange = previousValue !== 0 ? (change / previousValue) * 100 : 0;

        return {
          period: point.date.toISOString().split('T')[0],
          value: (point as any).value,
          change,
          percentChange
        };
      });

      // Determine trend
      const recentValues = data.slice(-5).map(d => d.value);
      const trend = this.determineTrend(recentValues);

      // Generate forecast (simple moving average)
      const forecast = this.generateForecast(data, timeframe);

      const analysis: TrendAnalysis = {
        metric,
        timeframe,
        data,
        trend,
        forecast
      };

      await cacheService.set(cacheKey, analysis, { ttl: this.cacheTimeout });
      return analysis;

    } catch (error) {
      throw new ManufacturerSearchError(`Trend analysis failed: ${error.message}`);
    }
  }

  async getIndustryBenchmarks(industry: string): Promise<IndustryBenchmark> {
    try {
      const cacheKey = `industry_benchmarks:${industry}`;

      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached as IndustryBenchmark;
      }

      const manufacturers = await Manufacturer.find({
        industry,
        isActive: true,
        verificationStatus: 'verified'
      });

      if (manufacturers.length < 5) {
        throw new ManufacturerSearchError('Insufficient data for industry benchmarks');
      }

      const metrics = ['sustainabilityRating', 'annualRevenue', 'employeeCount', 'growthRate'];
      const benchmarkMetrics: any = {};

      metrics.forEach(metric => {
        const values = manufacturers
          .map(m => m[metric])
          .filter(v => v !== null && v !== undefined && !isNaN(v))
          .sort((a, b) => a - b);

        if (values.length > 0) {
          const sum = values.reduce((acc, val) => acc + val, 0);
          const average = sum / values.length;
          const median = values[Math.floor(values.length / 2)];
          const min = Math.min(...values);
          const max = Math.max(...values);

          // Calculate standard deviation
          const variance = values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / values.length;
          const standardDeviation = Math.sqrt(variance);

          // Calculate percentiles
          const percentiles = {
            '25': values[Math.floor(values.length * 0.25)],
            '50': median,
            '75': values[Math.floor(values.length * 0.75)],
            '90': values[Math.floor(values.length * 0.90)],
            '95': values[Math.floor(values.length * 0.95)]
          };

          benchmarkMetrics[metric] = {
            average,
            median,
            min,
            max,
            standardDeviation,
            percentiles
          };
        }
      });

      const benchmark: IndustryBenchmark = {
        industry,
        metrics: benchmarkMetrics,
        sampleSize: manufacturers.length,
        lastUpdated: new Date()
      };

      await cacheService.set(cacheKey, benchmark, { ttl: 3600 }); // Cache for 1 hour
      return benchmark;

    } catch (error) {
      throw new ManufacturerSearchError(`Industry benchmarks failed: ${error.message}`);
    }
  }

  private async generateSearchSuggestions(filters: AdvancedSearchFilters): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];

    try {
      // Industry suggestions
      if (filters.industry) {
        const industries = await Manufacturer.distinct('industry', {
          industry: { $regex: filters.industry, $options: 'i' },
          isActive: true
        });

        industries.forEach(industry => {
          suggestions.push({
            text: industry,
            type: 'industry',
            count: 0 // Would need separate query to get exact count
          });
        });
      }

      // Location suggestions
      if (filters.location) {
        const locations = await Manufacturer.distinct('location.country', {
          'location.country': { $regex: filters.location, $options: 'i' },
          isActive: true
        });

        locations.forEach(location => {
          suggestions.push({
            text: location,
            type: 'location',
            count: 0
          });
        });
      }

      return suggestions.slice(0, 10); // Limit to 10 suggestions
    } catch (error) {
      return [];
    }
  }

  private extractMatchingCriteria(manufacturer: any, filters: AdvancedSearchFilters): string[] {
    const criteria: string[] = [];

    if (filters.name && manufacturer.name?.toLowerCase().includes(filters.name.toLowerCase())) {
      criteria.push('Name match');
    }
    if (filters.industry && manufacturer.industry?.toLowerCase().includes(filters.industry.toLowerCase())) {
      criteria.push('Industry match');
    }
    if (filters.verificationStatus && manufacturer.verificationStatus === filters.verificationStatus) {
      criteria.push('Verification status');
    }
    if (filters.certifications?.some(cert => manufacturer.certifications?.includes(cert))) {
      criteria.push('Certifications');
    }

    return criteria;
  }

  private generateComparisonInsights(
    manufacturers: any[],
    comparisonMatrix: any,
    rankings: any
  ): string[] {
    const insights: string[] = [];

    // Find top performer overall
    const topPerformer = manufacturers.reduce((top, current) => {
      const topScore = this.calculateOverallScore(comparisonMatrix[top._id]);
      const currentScore = this.calculateOverallScore(comparisonMatrix[current._id]);
      return currentScore > topScore ? current : top;
    });

    insights.push(`${topPerformer.name} shows the strongest overall performance across metrics`);

    // Sustainability leader
    if (rankings.sustainabilityRating) {
      const sustainabilityLeader = manufacturers.find(m =>
        m._id === rankings.sustainabilityRating[0].manufacturerId
      );
      insights.push(`${sustainabilityLeader.name} leads in sustainability with a rating of ${rankings.sustainabilityRating[0].value}`);
    }

    // Revenue leader
    if (rankings.annualRevenue) {
      const revenueLeader = manufacturers.find(m =>
        m._id === rankings.annualRevenue[0].manufacturerId
      );
      insights.push(`${revenueLeader.name} has the highest annual revenue`);
    }

    return insights;
  }

  private calculateOverallScore(metrics: any): number {
    let score = 0;
    let count = 0;

    Object.values(metrics).forEach((value: any) => {
      if (typeof value === 'number' && !isNaN(value)) {
        score += value;
        count++;
      }
    });

    return count > 0 ? score / count : 0;
  }

  private determineTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' | 'volatile' {
    if (values.length < 3) return 'stable';

    const differences = values.slice(1).map((val, i) => val - values[i]);
    const avgDifference = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
    const variance = differences.reduce((sum, diff) => sum + Math.pow(diff - avgDifference, 2), 0) / differences.length;

    if (variance > Math.abs(avgDifference) * 2) {
      return 'volatile';
    } else if (avgDifference > 0.1) {
      return 'increasing';
    } else if (avgDifference < -0.1) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  private generateForecast(
    data: any[],
    timeframe: string
  ): Array<{ period: string; predictedValue: number; confidence: number; }> {
    if (data.length < 5) return [];

    const recentValues = data.slice(-5).map(d => d.value);
    const average = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const trend = recentValues[recentValues.length - 1] - recentValues[0];

    const forecast = [];
    for (let i = 1; i <= 3; i++) {
      const predictedValue = average + (trend * i);
      const confidence = Math.max(0.3, 1 - (i * 0.2)); // Decreasing confidence

      forecast.push({
        period: `Future ${i}`,
        predictedValue: Math.max(0, predictedValue),
        confidence
      });
    }

    return forecast;
  }
}

export const manufacturerSearchService = new ManufacturerSearchService();