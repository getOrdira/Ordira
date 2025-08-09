// src/services/business/manufacturer.service.ts

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Manufacturer } from '../../models/manufacturer.model';
import { BrandSettings } from '../../models/brandSettings.model';
import { AnalyticsBusinessService } from './analytics.service';
import { UtilsService } from '../utils/utils.service';

const JWT_SECRET = process.env.MFG_JWT_SECRET!;

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  industry?: string;
  contactEmail?: string;
  description?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type UpdateProfileInput = {
  name?: string;
  description?: string;
  industry?: string;
  contactEmail?: string;
  servicesOffered?: string[];
  moq?: number;
};

export interface ConnectedBrand {
  id: string;
  businessId: string;
  businessName: string;
  logoUrl?: string;
  connectionDate: Date;
  industry?: string;
  verified?: boolean;
}

export interface ManufacturerProfile {
  id: string;
  name: string;
  email: string;
  industry?: string;
  description?: string;
  contactEmail?: string;
  servicesOffered?: string[];
  moq?: number;
  profileCompleteness: number;
  isVerified: boolean;
  totalConnections: number;
  joinDate: Date;
  lastActive?: Date;
}

export interface ManufacturerSearchResult {
  id: string;
  name: string;
  email: string;
  industry?: string;
  description?: string;
  servicesOffered?: string[];
  profileCompleteness: number;
  isVerified: boolean;
  matchScore?: number;
}

/**
 * Enhanced manufacturer authentication and data access service
 */
export class ManufacturerService {
  private analyticsService = new AnalyticsBusinessService();

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Private Utility Methods                                                   */
  /** ─────────────────────────────────────────────────────────────────────────── */

  private validateRegistrationInput(data: RegisterInput): void {
    if (!UtilsService.isValidEmail(data.email)) {
      throw { statusCode: 400, message: 'Invalid email format' };
    }

    if (data.contactEmail && !UtilsService.isValidEmail(data.contactEmail)) {
      throw { statusCode: 400, message: 'Invalid contact email format' };
    }

    if (!data.name || data.name.trim().length < 2) {
      throw { statusCode: 400, message: 'Name must be at least 2 characters long' };
    }

    if (!data.password || data.password.length < 8) {
      throw { statusCode: 400, message: 'Password must be at least 8 characters long' };
    }
  }

  private normalizeRegistrationInput(data: RegisterInput): RegisterInput {
    return {
      ...data,
      name: UtilsService.titleCase(data.name.trim()),
      email: UtilsService.normalizeEmail(data.email),
      contactEmail: data.contactEmail ? UtilsService.normalizeEmail(data.contactEmail) : undefined,
      industry: data.industry ? UtilsService.titleCase(data.industry.trim()) : undefined,
      description: data.description?.trim()
    };
  }

  private logSecurityEvent(event: string, identifier: string, success: boolean): void {
    const maskedIdentifier = UtilsService.maskEmail(identifier);
    console.log(`[MANUFACTURER] ${event} - ${maskedIdentifier} - ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  private calculateProfileCompleteness(manufacturer: any): number {
    const fields = [
      'name', 'email', 'description', 'industry', 
      'contactEmail', 'servicesOffered', 'moq'
    ];
    
    const completedFields = fields.filter(field => {
      const value = manufacturer[field];
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined && value !== '';
    });
    
    return Math.round((completedFields.length / fields.length) * 100);
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Authentication Methods                                                    */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Register a new manufacturer with enhanced validation and security
   */
  async register(data: RegisterInput): Promise<{ 
    token: string; 
    manufacturerId: string;
    profile: ManufacturerProfile;
  }> {
    // Validate and normalize input
    this.validateRegistrationInput(data);
    const normalizedData = this.normalizeRegistrationInput(data);

    // Check if email already exists
    const existing = await Manufacturer.findOne({ 
      email: normalizedData.email 
    });
    
    if (existing) {
      this.logSecurityEvent('REGISTER', normalizedData.email, false);
      throw { statusCode: 409, message: 'Email already in use' };
    }

    // Create manufacturer with enhanced security
    const hash = await bcrypt.hash(normalizedData.password, 12);
    const mfg = await Manufacturer.create({
      name: normalizedData.name,
      email: normalizedData.email,
      password: hash,
      industry: normalizedData.industry,
      contactEmail: normalizedData.contactEmail,
      description: normalizedData.description,
      isActive: true,
      isVerified: false,
      totalConnections: 0
    });

    // Generate JWT with enhanced payload
    const token = jwt.sign(
      { 
        sub: mfg._id.toString(),
        type: 'manufacturer',
        email: mfg.email,
        verified: mfg.isVerified
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    // Create profile response
    const profile: ManufacturerProfile = {
      id: mfg._id.toString(),
      name: mfg.name,
      email: mfg.email,
      industry: mfg.industry,
      description: mfg.description,
      contactEmail: mfg.contactEmail,
      profileCompleteness: this.calculateProfileCompleteness(mfg),
      isVerified: mfg.isVerified || false,
      totalConnections: 0,
      joinDate: mfg.createdAt,
      lastActive: mfg.lastLoginAt
    };

    this.logSecurityEvent('REGISTER', normalizedData.email, true);
    
    return { 
      token, 
      manufacturerId: mfg._id.toString(),
      profile
    };
  }

  /**
   * Authenticate a manufacturer with enhanced security
   */
  async login(data: LoginInput): Promise<{ 
    token: string; 
    manufacturerId: string;
    profile: ManufacturerProfile;
  }> {
    const { email, password } = data;
    const normalizedEmail = UtilsService.normalizeEmail(email);
    
    const mfg = await Manufacturer.findOne({ email: normalizedEmail });
    
    if (!mfg) {
      this.logSecurityEvent('LOGIN', normalizedEmail, false);
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    if (!mfg.isActive) {
      this.logSecurityEvent('LOGIN', normalizedEmail, false);
      throw { statusCode: 403, message: 'Account has been deactivated' };
    }

    const validPassword = await bcrypt.compare(password, mfg.password);
    if (!validPassword) {
      this.logSecurityEvent('LOGIN', normalizedEmail, false);
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    // Update last login
    mfg.lastLoginAt = new Date();
    await mfg.save();

    // Generate JWT
    const token = jwt.sign(
      { 
        sub: mfg._id.toString(),
        type: 'manufacturer',
        email: mfg.email,
        verified: mfg.isVerified
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    // Create profile response
    const profile: ManufacturerProfile = {
      id: mfg._id.toString(),
      name: mfg.name,
      email: mfg.email,
      industry: mfg.industry,
      description: mfg.description,
      contactEmail: mfg.contactEmail,
      servicesOffered: mfg.servicesOffered,
      moq: mfg.moq,
      profileCompleteness: this.calculateProfileCompleteness(mfg),
      isVerified: mfg.isVerified || false,
      totalConnections: mfg.totalConnections || 0,
      joinDate: mfg.createdAt,
      lastActive: mfg.lastLoginAt
    };

    this.logSecurityEvent('LOGIN', normalizedEmail, true);
    
    return { 
      token, 
      manufacturerId: mfg._id.toString(),
      profile
    };
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Profile Management Methods                                                */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Update manufacturer profile with validation
   */
  async updateProfile(mfgId: string, data: UpdateProfileInput): Promise<ManufacturerProfile> {
    // Validate input
    if (data.contactEmail && !UtilsService.isValidEmail(data.contactEmail)) {
      throw { statusCode: 400, message: 'Invalid contact email format' };
    }

    if (data.moq && data.moq < 0) {
      throw { statusCode: 400, message: 'Minimum order quantity must be positive' };
    }

    // Normalize data
    const updateData: any = {};
    if (data.name) updateData.name = UtilsService.titleCase(data.name.trim());
    if (data.industry) updateData.industry = UtilsService.titleCase(data.industry.trim());
    if (data.contactEmail) updateData.contactEmail = UtilsService.normalizeEmail(data.contactEmail);
    if (data.description) updateData.description = data.description.trim();
    if (data.servicesOffered) updateData.servicesOffered = data.servicesOffered.map(s => s.trim());
    if (data.moq !== undefined) updateData.moq = data.moq;

    const mfg = await Manufacturer.findByIdAndUpdate(mfgId, updateData, { new: true });
    if (!mfg) {
      throw { statusCode: 404, message: 'Manufacturer not found' };
    }

    return {
      id: mfg._id.toString(),
      name: mfg.name,
      email: mfg.email,
      industry: mfg.industry,
      description: mfg.description,
      contactEmail: mfg.contactEmail,
      servicesOffered: mfg.servicesOffered,
      moq: mfg.moq,
      profileCompleteness: this.calculateProfileCompleteness(mfg),
      isVerified: mfg.isVerified || false,
      totalConnections: mfg.totalConnections || 0,
      joinDate: mfg.createdAt,
      lastActive: mfg.lastLoginAt
    };
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Brand Connection Methods                                                  */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * List all brands this manufacturer is connected to with enhanced data
   */
  async listBrandsForManufacturer(mfgId: string): Promise<ConnectedBrand[]> {
    const mfg = await Manufacturer.findById(mfgId).populate({
      path: 'brands',
      populate: {
        path: 'business',
        select: 'businessName industry profilePictureUrl'
      }
    });

    if (!mfg) {
      throw { statusCode: 404, message: 'Manufacturer not found' };
    }

    return mfg.brands.map((brand: any) => ({
      id: brand._id.toString(),
      businessId: brand.business._id.toString(),
      businessName: brand.business.businessName,
      logoUrl: brand.logoUrl || brand.business.profilePictureUrl,
      connectionDate: brand.createdAt || new Date(),
      industry: brand.business.industry,
      verified: brand.business.isVerified || false
    }));
  }

  /**
   * Get connection stats with enhanced metrics
   */
  async getConnectionStats(mfgId: string): Promise<{
    totalConnectedBrands: number;
    recentConnections: number;
    analyticsAccess: number;
    topIndustries: Array<{ industry: string; count: number }>;
    connectionTrend: Array<{ month: string; connections: number }>;
  }> {
    const mfg = await Manufacturer.findById(mfgId).populate({
      path: 'brands',
      populate: {
        path: 'business',
        select: 'industry createdAt'
      }
    });

    if (!mfg) {
      throw { statusCode: 404, message: 'Manufacturer not found' };
    }

    const totalConnectedBrands = mfg.brands?.length || 0;
    
    // Count recent connections (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentConnections = mfg.brands.filter((brand: any) => 
      brand.createdAt && brand.createdAt > thirtyDaysAgo
    ).length;

    // Get industry distribution
    const industryCount = new Map<string, number>();
    mfg.brands.forEach((brand: any) => {
      const industry = brand.business?.industry || 'Other';
      industryCount.set(industry, (industryCount.get(industry) || 0) + 1);
    });

    const topIndustries = Array.from(industryCount.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Generate connection trend (simplified - you might want to track this differently)
    const connectionTrend = this.generateConnectionTrend(mfg.brands);

    return {
      totalConnectedBrands,
      recentConnections,
      analyticsAccess: totalConnectedBrands,
      topIndustries,
      connectionTrend
    };
  }

  private generateConnectionTrend(brands: any[]): Array<{ month: string; connections: number }> {
    const monthCounts = new Map<string, number>();
    
    brands.forEach(brand => {
      if (brand.createdAt) {
        const monthKey = UtilsService.formatDate(brand.createdAt, { 
          year: 'numeric', 
          month: 'short' 
        });
        monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
      }
    });

    return Array.from(monthCounts.entries())
      .map(([month, connections]) => ({ month, connections }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-6); // Last 6 months
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Analytics Methods                                                         */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Fetch vote analytics for a given brand, ensuring authorization
   */
  async getResultsForBrand(mfgId: string, brandSettingsId: string) {
    // Ensure this manufacturer is connected to that BrandSettings
    const mfg = await Manufacturer.findOne({
      _id: mfgId,
      brands: brandSettingsId
    });
    
    if (!mfg) {
      throw { statusCode: 403, message: 'Not authorized for this brand' };
    }

    // Load the BrandSettings to get its Business ID
    const settings = await BrandSettings.findById(brandSettingsId).select('business');
    if (!settings) {
      throw { statusCode: 404, message: 'Brand settings not found' };
    }

    const businessId = settings.business.toString();

    // Delegate to analytics service
    return this.analyticsService.getVotingAnalytics(businessId);
  }

  /**
   * Get comprehensive analytics for a brand with enhanced metrics
   */
  async getComprehensiveAnalyticsForBrand(mfgId: string, brandSettingsId: string) {
    // Verify authorization first
    const hasAccess = await this.hasAccessToBrand(mfgId, brandSettingsId);
    if (!hasAccess) {
      throw { statusCode: 403, message: 'Not authorized for this brand' };
    }

    const settings = await BrandSettings.findById(brandSettingsId).select('business');
    if (!settings) {
      throw { statusCode: 404, message: 'Brand settings not found' };
    }

    const businessId = settings.business.toString();

    // Get comprehensive analytics
    const [votingAnalytics, nftAnalytics] = await Promise.all([
      this.analyticsService.getVotingAnalytics(businessId),
      this.analyticsService.getNftAnalytics(businessId)
    ]);

    return {
      voting: votingAnalytics,
      nft: nftAnalytics,
      brand: {
        id: brandSettingsId,
        businessId
      },
      accessLevel: 'full', // Could be based on subscription or connection type
      lastUpdated: new Date()
    };
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Search and Discovery Methods                                              */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Enhanced search for manufacturers with scoring and filtering
   */
  async searchManufacturers(
    query: string, 
    options: {
      industry?: string;
      verified?: boolean;
      minMoq?: number;
      maxMoq?: number;
      services?: string[];
      limit?: number;
      sortBy?: 'relevance' | 'name' | 'completeness' | 'connections';
    } = {}
  ): Promise<ManufacturerSearchResult[]> {
    const limit = options.limit || 20;
    
    // Build search filter
    const filter: any = {
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { servicesOffered: { $in: [new RegExp(query, 'i')] } }
      ]
    };

    if (options.industry) {
      filter.industry = { $regex: options.industry, $options: 'i' };
    }

    if (options.verified !== undefined) {
      filter.isVerified = options.verified;
    }

    if (options.minMoq !== undefined || options.maxMoq !== undefined) {
      filter.moq = {};
      if (options.minMoq !== undefined) filter.moq.$gte = options.minMoq;
      if (options.maxMoq !== undefined) filter.moq.$lte = options.maxMoq;
    }

    if (options.services && options.services.length > 0) {
      filter.servicesOffered = { $in: options.services.map(s => new RegExp(s, 'i')) };
    }

    // Execute search
    const manufacturers = await Manufacturer.find(filter)
      .select('name email industry description servicesOffered moq isVerified totalConnections createdAt')
      .limit(limit)
      .lean();

    // Calculate match scores and format results
    return manufacturers.map(m => {
      const result: ManufacturerSearchResult = {
        id: m._id.toString(),
        name: m.name,
        email: UtilsService.maskEmail(m.email), // Mask email for privacy
        industry: m.industry,
        description: m.description,
        servicesOffered: m.servicesOffered,
        profileCompleteness: this.calculateProfileCompleteness(m),
        isVerified: m.isVerified || false,
        matchScore: this.calculateMatchScore(m, query, options)
      };
      return result;
    }).sort((a, b) => {
      // Sort by selected criteria
      switch (options.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'completeness':
          return b.profileCompleteness - a.profileCompleteness;
        case 'connections':
          return (b.matchScore || 0) - (a.matchScore || 0); // Use matchScore as proxy
        case 'relevance':
        default:
          return (b.matchScore || 0) - (a.matchScore || 0);
      }
    });
  }

  private calculateMatchScore(manufacturer: any, query: string, options: any): number {
    let score = 0;
    
    // Name match (highest weight)
    if (manufacturer.name.toLowerCase().includes(query.toLowerCase())) {
      score += 50;
    }
    
    // Services match
    if (manufacturer.servicesOffered) {
      const serviceMatches = manufacturer.servicesOffered.filter((service: string) =>
        service.toLowerCase().includes(query.toLowerCase())
      ).length;
      score += serviceMatches * 20;
    }
    
    // Description match
    if (manufacturer.description && manufacturer.description.toLowerCase().includes(query.toLowerCase())) {
      score += 15;
    }
    
    // Profile completeness bonus
    score += this.calculateProfileCompleteness(manufacturer) * 0.1;
    
    // Verification bonus
    if (manufacturer.isVerified) {
      score += 10;
    }
    
    return score;
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Utility Methods                                                           */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Verify JWT token with enhanced validation
   */
  verifyToken(token: string): { manufacturerId: string; email?: string; verified?: boolean } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { 
        sub: string; 
        email?: string; 
        verified?: boolean 
      };
      return { 
        manufacturerId: decoded.sub,
        email: decoded.email,
        verified: decoded.verified
      };
    } catch (error) {
      throw { statusCode: 401, message: 'Invalid token' };
    }
  }

  /**
   * Get manufacturer by ID with enhanced profile data
   */
  async getManufacturerById(mfgId: string): Promise<ManufacturerProfile> {
    const manufacturer = await Manufacturer.findById(mfgId).select('-password');
    if (!manufacturer) {
      throw { statusCode: 404, message: 'Manufacturer not found' };
    }

    return {
      id: manufacturer._id.toString(),
      name: manufacturer.name,
      email: manufacturer.email,
      industry: manufacturer.industry,
      description: manufacturer.description,
      contactEmail: manufacturer.contactEmail,
      servicesOffered: manufacturer.servicesOffered,
      moq: manufacturer.moq,
      profileCompleteness: this.calculateProfileCompleteness(manufacturer),
      isVerified: manufacturer.isVerified || false,
      totalConnections: manufacturer.totalConnections || 0,
      joinDate: manufacturer.createdAt,
      lastActive: manufacturer.lastLoginAt
    };
  }

  /**
   * Check if manufacturer has access to a specific brand
   */
  async hasAccessToBrand(mfgId: string, brandSettingsId: string): Promise<boolean> {
    const mfg = await Manufacturer.findOne({
      _id: mfgId,
      brands: brandSettingsId,
      isActive: true
    });
    return !!mfg;
  }

  /**
   * Get manufacturer dashboard stats
   */
  async getDashboardStats(mfgId: string): Promise<{
    profile: ManufacturerProfile;
    connectionStats: any;
    recentActivity: Array<{
      type: string;
      description: string;
      date: Date;
    }>;
    notifications: Array<{
      type: 'info' | 'warning' | 'success';
      message: string;
      actionRequired?: boolean;
    }>;
  }> {
    const [profile, connectionStats] = await Promise.all([
      this.getManufacturerById(mfgId),
      this.getConnectionStats(mfgId)
    ]);

    // Generate notifications based on profile state
    const notifications = [];
    if (profile.profileCompleteness < 80) {
      notifications.push({
        type: 'warning' as const,
        message: 'Complete your profile to attract more brand partnerships',
        actionRequired: true
      });
    }

    if (!profile.isVerified) {
      notifications.push({
        type: 'info' as const,
        message: 'Verify your account to unlock premium features',
        actionRequired: true
      });
    }

    // Mock recent activity - you'd implement based on your activity tracking
    const recentActivity = [
      {
        type: 'connection',
        description: 'New brand connection request',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    return {
      profile,
      connectionStats,
      recentActivity,
      notifications
    };
  }
}
