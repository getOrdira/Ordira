// src/services/business/manufacturer.service.ts

import bcrypt from 'bcrypt';
import { logger } from '../../utils/logger';
import jwt from 'jsonwebtoken';
import { Manufacturer } from '../../models/manufacturer.model';
import { BrandSettings } from '../../models/brandSettings.model';
import { AnalyticsBusinessService } from './analytics.service';
import { UtilsService } from '../utils/utils.service';
import { VotingRecord } from '../../models/votingRecord.model';
import { NftCertificate } from '../../models/nftCertificate.model';
import { Invitation } from '../../models/invitation.model';
import { Business } from '../../models/business.model';

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
    logger.info(`[MANUFACTURER] ${event} - ${maskedIdentifier} - ${success ? 'SUCCESS' : 'FAILED'}`);
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

  private async getManufacturerMetric(brandIds: string[], metric: string, startDate: Date): Promise<number> {
  switch (metric) {
    case 'connections':
      return brandIds.length;
    
    case 'product_selections':
      return VotingRecord.countDocuments({
        business: { $in: brandIds },
        timestamp: { $gte: startDate }
      });
    
    case 'certificates':
      return NftCertificate.countDocuments({
        business: { $in: brandIds },
        mintedAt: { $gte: startDate }
      });
    
    case 'orders':
      // You'd implement this based on your order/collaboration model
      return 0; // Placeholder
    
    default:
      return 0;
  }
}

private async getActiveBrandCollaborations(manufacturerId: string, startDate: Date): Promise<number> {
  // Implementation depends on your collaboration model
  // This is a placeholder - you'd query your actual collaboration/order data
  return 3; // Placeholder
}

private async getNewBrandConnections(manufacturerId: string, startDate: Date): Promise<number> {
  // Get manufacturer and check when brands were connected
  const manufacturer = await Manufacturer.findById(manufacturerId);
  if (!manufacturer || !manufacturer.brands) return 0;

  // You'd need to track connection dates in your manufacturer-brand relationship
  // This is a placeholder implementation
  return 1; // Placeholder
}

private async getPendingCollaborations(manufacturerId: string): Promise<number> {
  // Implementation based on your collaboration/order system
  return 2; // Placeholder
}

private async getCompletedCollaborations(manufacturerId: string, startDate: Date): Promise<number> {
  // Implementation based on your collaboration/order system
  return 5; // Placeholder
}

private async getProductDemandAnalysis(brandIds: string[], startDate?: Date): Promise<any> {
  try {
    // Get product selection data for all connected brands
    const matchQuery: any = { business: { $in: brandIds } };
    if (startDate) {
      matchQuery.timestamp = { $gte: startDate };
    }

    // Get top products across all brands
    const topProducts = await VotingRecord.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            productId: '$selectedProductId',
            businessId: '$business'
          },
          totalSelections: { $sum: 1 },
          productName: { $first: '$productName' },
          uniqueVoters: { $addToSet: '$voterAddress' },
          lastSelectedAt: { $max: '$timestamp' }
        }
      },
      {
        $addFields: {
          uniqueVoterCount: { $size: '$uniqueVoters' }
        }
      },
      { $sort: { totalSelections: -1 } },
      { $limit: 20 }
    ]);

    // Identify high-demand products
    const opportunities = topProducts
      .filter(product => product.totalSelections > 10) // Threshold for production consideration
      .map(product => ({
        productId: product._id.productId,
        productName: product.productName,
        businessId: product._id.businessId,
        demand: product.totalSelections,
        uniqueVoters: product.uniqueVoterCount,
        lastActivity: product.lastSelectedAt,
        priority: product.totalSelections > 50 ? 'high' : product.totalSelections > 25 ? 'medium' : 'low'
      }));

    return {
      totalProducts: topProducts.length,
      opportunities,
      demandTrends: {
        increasing: opportunities.filter(o => o.priority === 'high').length,
        stable: opportunities.filter(o => o.priority === 'medium').length,
        declining: opportunities.filter(o => o.priority === 'low').length
      },
      recommendedForProduction: opportunities.slice(0, 5) // Top 5 recommendations
    };
  } catch (error) {
    logger.error('Get product demand analysis error:', error);
    return {
      totalProducts: 0,
      opportunities: [],
      demandTrends: { increasing: 0, stable: 0, declining: 0 },
      recommendedForProduction: []
    };
  }
}

private async getMarketInsights(brandIds: string[], timeframe: string): Promise<any> {
  try {
    // Calculate market trends based on voting/selection data
    const days = this.getTimeframeDays(timeframe);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const currentPeriodSelections = await VotingRecord.countDocuments({
      business: { $in: brandIds },
      timestamp: { $gte: startDate }
    });

    const previousPeriodStart = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);
    const previousPeriodSelections = await VotingRecord.countDocuments({
      business: { $in: brandIds },
      timestamp: { $gte: previousPeriodStart, $lt: startDate }
    });

    const growthRate = previousPeriodSelections > 0 
      ? ((currentPeriodSelections - previousPeriodSelections) / previousPeriodSelections) * 100 
      : 0;

    return {
      trends: {
        growthRate: growthRate.toFixed(2) + '%',
        direction: growthRate > 0 ? 'growing' : growthRate < 0 ? 'declining' : 'stable',
        currentActivity: currentPeriodSelections,
        previousActivity: previousPeriodSelections
      },
      marketPosition: this.calculateMarketPosition(brandIds.length, currentPeriodSelections),
      competitiveAnalysis: {
        // You'd implement competitive analysis based on your business requirements
        position: 'strong', // Placeholder
        marketShare: '12.5%' // Placeholder
      }
    };
  } catch (error) {
    logger.error('Get market insights error:', error);
    return {
      trends: { growthRate: '0%', direction: 'stable' },
      marketPosition: 'unknown',
      competitiveAnalysis: { position: 'unknown', marketShare: '0%' }
    };
  }
}

private async getBrandAnalyticsForManufacturer(brandId: string): Promise<any> {
  // Get analytics specific to this brand from manufacturer perspective
  const votingData = await VotingRecord.getProductSelectionStats(brandId);
  const certificateData = await NftCertificate.countDocuments({ business: brandId });

  return {
    voting: votingData,
    certificates: certificateData,
    engagement: {
      totalInteractions: votingData.length,
      activeUsers: 'unknown' // You'd calculate this
    }
  };
}

private async getBrandCollaborationHistory(manufacturerId: string, brandId: string): Promise<any> {
  // Implementation based on your collaboration tracking system
  return {
    totalCollaborations: 3,
    successfulProjects: 2,
    ongoingProjects: 1,
    lastCollaboration: new Date(),
    collaborationRating: 4.5
  };
}

private generateManufacturerRecommendations(brandAnalytics: any, productDemand: any): string[] {
  const recommendations = [];

  if (productDemand.opportunities && productDemand.opportunities.length > 0) {
    recommendations.push(`Consider producing ${productDemand.opportunities[0].productName} - highest demand`);
  }

  if (productDemand.demandTrends.increasing > 3) {
    recommendations.push('Strong market growth detected - expand production capacity');
  }

  recommendations.push('Monitor product selection trends for optimal production timing');

  return recommendations;
}

private identifyProductionOpportunities(productDemand: any): any[] {
  if (!productDemand.opportunities) return [];

  return productDemand.opportunities
    .filter((opp: any) => opp.priority === 'high')
    .map((opp: any) => ({
      ...opp,
      estimatedROI: 'high', // You'd calculate this based on your business model
      timeToMarket: '2-4 weeks', // Based on your production capabilities
      riskLevel: 'low' // Based on demand stability
    }));
}

private calculateMarketPosition(brandCount: number, activity: number): string {
  // Simple market position calculation
  if (brandCount > 10 && activity > 100) return 'market_leader';
  if (brandCount > 5 && activity > 50) return 'strong_player';
  if (brandCount > 2 && activity > 20) return 'growing_presence';
  return 'emerging_player';
}

private getTimeframeDays(timeframe: string): number {
  switch (timeframe) {
    case '24h': return 1;
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '1y': return 365;
    default: return 30;
  }
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

  /**
 * Refresh manufacturer authentication token
 */
async refreshToken(manufacturerId: string): Promise<{ 
  token: string; 
  expiresAt: string;
}> {
  try {
    // Verify manufacturer exists and is active
    const manufacturer = await Manufacturer.findById(manufacturerId);
    
    if (!manufacturer) {
      throw { statusCode: 404, message: 'Manufacturer not found' };
    }

    if (!manufacturer.isActive) {
      throw { statusCode: 403, message: 'Account is not active' };
    }

    // Generate new JWT token
    const token = jwt.sign(
      { 
        sub: manufacturer._id.toString(),
        type: 'manufacturer',
        email: manufacturer.email,
        verified: manufacturer.isVerified
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Update last login time
    manufacturer.lastLoginAt = new Date();
    await manufacturer.save();

    this.logSecurityEvent('REFRESH_TOKEN', manufacturer.email, true);

    return { token, expiresAt };

  } catch (error: any) {
    this.logSecurityEvent('REFRESH_TOKEN', manufacturerId, false);
    throw error;
  }
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
 * Get connection status with enhanced metrics
 */
async getConnectionStatus(manufacturerId: string, brandId: string): Promise<{
  status: 'none' | 'pending' | 'connected' | 'rejected';
  connectedAt?: Date;
  history: any[];
}> {
  try {
    // First check for any invitation between this manufacturer and brand
    const invitation = await Invitation.findOne({
      manufacturer: manufacturerId,
      brand: brandId
    }).sort({ createdAt: -1 }); // Get the most recent invitation

    // Build history array
    const history: any[] = [];

    if (invitation) {
      // Add invitation creation event
      history.push({
        event: 'invitation_sent',
        timestamp: invitation.createdAt,
        details: 'Connection invitation was sent'
      });

      // Add response event if responded
      if (invitation.respondedAt) {
        const eventType = invitation.status === 'accepted' 
          ? 'connection_accepted' 
          : invitation.status === 'declined' 
            ? 'connection_declined'
            : 'connection_updated';
        
        history.push({
          event: eventType,
          timestamp: invitation.respondedAt,
          details: `Invitation was ${invitation.status}`
        });
      }

      // Return status based on invitation
      switch (invitation.status) {
        case 'accepted':
          return {
            status: 'connected',
            connectedAt: invitation.respondedAt || invitation.createdAt,
            history
          };

        case 'pending':
          return {
            status: 'pending',
            connectedAt: undefined,
            history
          };

        case 'declined':
        case 'cancelled':
        case 'expired':
        case 'disconnected':
          return {
            status: 'rejected',
            connectedAt: undefined,
            history
          };

        default:
          return {
            status: 'none',
            connectedAt: undefined,
            history
          };
      }
    }

    // No invitation found - check if connected via the manufacturer's brands array
    const mfg = await Manufacturer.findById(manufacturerId);
    if (!mfg) {
      throw { statusCode: 404, message: 'Manufacturer not found' };
    }

    // Check if this brand is in the manufacturer's connected brands array
    const isConnectedViaBrandsArray = mfg.brands?.some((brandObjectId: any) => 
      brandObjectId.toString() === brandId
    );

    if (isConnectedViaBrandsArray) {
      // Connected but no invitation record (might be legacy connection)
      return {
        status: 'connected',
        connectedAt: mfg.createdAt, // Fallback to manufacturer creation date
        history: [
          {
            event: 'connection_established',
            timestamp: mfg.createdAt,
            details: 'Connection established (legacy)'
          }
        ]
      };
    }

    // No connection found
    return {
      status: 'none',
      connectedAt: undefined,
      history: []
    };

  } catch (error) {
    logger.error('Error getting connection status:', error);
    return {
      status: 'none',
      connectedAt: undefined,
      history: []
    };
  }
}

  /**
 * Check if a manufacturer can connect to a specific brand
 */
async canConnectToBrand(manufacturerId: string, brandId: string): Promise<{
  canConnect: boolean;
  reason?: string;
  requirements?: string[];
}> {
  try {
    // Check if manufacturer exists
    const manufacturer = await Manufacturer.findById(manufacturerId);
    if (!manufacturer) {
      return {
        canConnect: false,
        reason: 'Manufacturer not found'
      };
    }

    // Check if brand exists
    const brand = await Business.findById(brandId);
    if (!brand) {
      return {
        canConnect: false,
        reason: 'Brand not found'
      };
    }

    // Check if brand is active
    if (!brand.isActive) {
      return {
        canConnect: false,
        reason: 'Brand account is not active'
      };
    }

    // Check if already connected
    const connectionStatus = await this.getConnectionStatus(manufacturerId, brandId);
    if (connectionStatus.status === 'connected') {
      return {
        canConnect: false,
        reason: 'Already connected to this brand'
      };
    }

    // Check if there's a pending invitation
    if (connectionStatus.status === 'pending') {
      return {
        canConnect: false,
        reason: 'Connection request already pending'
      };
    }

    // Check manufacturer profile completeness
    const requirements = [];
    if (!manufacturer.isEmailVerified) {
      requirements.push('Email verification required');
    }

    if (!manufacturer.description || manufacturer.description.trim().length < 50) {
      requirements.push('Complete profile description (minimum 50 characters)');
    }

    if (!manufacturer.industry) {
      requirements.push('Industry selection required');
    }

    if (!manufacturer.servicesOffered || manufacturer.servicesOffered.length === 0) {
      requirements.push('Services offered must be specified');
    }

    // Check if manufacturer has minimum profile completeness
    const profileCompleteness = this.calculateManufacturerProfileCompleteness(manufacturer);
    if (profileCompleteness < 60) {
      requirements.push('Profile must be at least 60% complete');
    }

    // If there are requirements, cannot connect yet
    if (requirements.length > 0) {
      return {
        canConnect: false,
        reason: 'Profile requirements not met',
        requirements
      };
    }

    // All checks passed
    return {
      canConnect: true
    };

  } catch (error) {
    logger.error('Error checking if manufacturer can connect to brand:', error);
    return {
      canConnect: false,
      reason: 'Error checking connection eligibility'
    };
  }
}

/**
 * Create a connection request from manufacturer to brand
 */
async createConnectionRequest(
  manufacturerId: string, 
  brandId: string,
  requestData: {
    message?: string;
    proposedServices?: string[];
    timeline?: string;
    budget?: string;
    portfolio?: string; // Add portfolio if you need it
  }
): Promise<{
  success: boolean;
  connectionRequestId?: string;
  message: string;
  nextSteps?: string[];
}> {
  try {
    // First check if connection is allowed
    const canConnect = await this.canConnectToBrand(manufacturerId, brandId);
    if (!canConnect.canConnect) {
      return {
        success: false,
        message: canConnect.reason || 'Cannot create connection request',
        nextSteps: canConnect.requirements
      };
    }

    // Get manufacturer and brand details
    const [manufacturer, brand] = await Promise.all([
      Manufacturer.findById(manufacturerId),
      Business.findById(brandId)
    ]);

    if (!manufacturer || !brand) {
      return {
        success: false,
        message: 'Manufacturer or brand not found'
      };
    }

    // Create connection request ID
    const connectionRequestId = `CR_${Date.now()}_${manufacturerId.slice(-6)}_${brandId.slice(-6)}`;

    // For now, we'll simulate creating the connection request
    // In a real implementation, you'd create a ConnectionRequest model
     const connectionRequest = {
    id: connectionRequestId,
    manufacturerId,
    brandId,
    manufacturerName: manufacturer.name,
    brandName: brand.businessName,
    message: requestData.message || `${manufacturer.name} would like to connect and explore partnership opportunities.`,
    proposedServices: requestData.proposedServices || manufacturer.servicesOffered || [],
    timeline: requestData.timeline || 'To be discussed',
    budget: requestData.budget || 'To be discussed',
    portfolio: requestData.portfolio || null, // Handle portfolio
    status: 'pending',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  };

    // TODO: Save to ConnectionRequest model when implemented
    // await ConnectionRequest.create(connectionRequest);

    // For now, just log the request
    logger.info('Connection request created:', connectionRequest);

    // Send notification to brand (you might want to use your notifications service)
    // await notificationsService.sendConnectionRequestNotification(brandId, connectionRequest);

    return {
      success: true,
      connectionRequestId,
      message: `Connection request sent to ${brand.businessName}`,
      nextSteps: [
        'Wait for brand response (typically 7-14 days)',
        'Prepare project requirements and timeline',
        'Review brand\'s existing partnerships',
        'Monitor request status in your dashboard'
      ]
    };

  } catch (error) {
    logger.error('Error creating connection request:', error);
    return {
      success: false,
      message: 'Failed to create connection request'
    };
  }
}

async getConnectionRequestStatus(manufacturerId: string, brandId: string): Promise<{
  hasActiveRequest: boolean;
  requestId?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt?: Date;
  expiresAt?: Date;
}> {
  try {
    // TODO: Implement with ConnectionRequest model
    // const request = await ConnectionRequest.findOne({
    //   manufacturerId,
    //   brandId,
    //   status: { $in: ['pending', 'approved'] }
    // });

    // For now, return no active request
    return {
      hasActiveRequest: false
    };

  } catch (error) {
    logger.error('Error getting connection request status:', error);
    return {
      hasActiveRequest: false
    };
  }
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
 * Get connection statistics for a manufacturer
 */
async getConnectionStats(manufacturerId: string): Promise<{
  totalConnections: number;
  pendingInvitations: number;
  acceptedInvitations: number;
  declinedInvitations: number;
}> {
  const [total, pending, accepted, declined] = await Promise.all([
    Invitation.countDocuments({ manufacturer: manufacturerId }),
    Invitation.countDocuments({ manufacturer: manufacturerId, status: 'pending' }),
    Invitation.countDocuments({ manufacturer: manufacturerId, status: 'accepted' }),
    Invitation.countDocuments({ 
      manufacturer: manufacturerId, 
      status: { $in: ['declined', 'cancelled', 'expired', 'disconnected'] }
    })
  ]);

  return {
    totalConnections: total,
    pendingInvitations: pending,
    acceptedInvitations: accepted,
    declinedInvitations: declined
  };
}

/**
 * Get comprehensive manufacturer analytics
 */
async getManufacturerAnalytics(
  manufacturerId: string,
  options?: {
    timeframe?: string;
    brandId?: string;
    metrics?: string[];
    includeProductDemand?: boolean;
    includeMarketInsights?: boolean;
  }
): Promise<any> {
  try {
    const { 
      timeframe = '30d',
      brandId,
      metrics = ['connections', 'orders', 'certificates', 'product_selections'],
      includeProductDemand = true,
      includeMarketInsights = true 
    } = options || {};

    const days = this.getTimeframeDays(timeframe);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get manufacturer's connected brands
    const manufacturer = await Manufacturer.findById(manufacturerId).populate('brands');
    if (!manufacturer) {
      throw new Error('Manufacturer not found');
    }

    const connectedBrands = manufacturer.brands || [];
    
    // Fix: Convert ObjectIds to strings
    const brandIds: string[] = brandId 
      ? [brandId] 
      : connectedBrands.map(b => b._id.toString()); // Convert ObjectId to string

    // Initialize analytics result
    const analytics: any = {
      summary: {},
      brandMetrics: {},
      collaborationMetrics: {},
      productDemand: {},
      marketData: {}
    };

    // Get brand-specific metrics
    for (const metric of metrics) {
      analytics.summary[metric] = await this.getManufacturerMetric(brandIds, metric, startDate);
    }

    // Brand connection metrics
    analytics.brandMetrics = {
      totalConnected: connectedBrands.length,
      activeCollaborations: await this.getActiveBrandCollaborations(manufacturerId, startDate),
      newConnectionsInPeriod: await this.getNewBrandConnections(manufacturerId, startDate)
    };

    // Collaboration metrics
    analytics.collaborationMetrics = {
      active: analytics.brandMetrics.activeCollaborations,
      pending: await this.getPendingCollaborations(manufacturerId),
      completed: await this.getCompletedCollaborations(manufacturerId, startDate)
    };

    // Product demand analysis
    if (includeProductDemand) {
      analytics.productDemand = await this.getProductDemandAnalysis(brandIds, startDate);
    }

    // Market insights
    if (includeMarketInsights) {
      analytics.marketData = await this.getMarketInsights(brandIds, timeframe);
    }

    return analytics;
  } catch (error) {
    logger.error('Get manufacturer analytics error:', error);
    throw new Error(`Failed to get manufacturer analytics: ${error.message}`);
  }
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
      .select('name email industry description servicesOffered moq isVerified totalConnections createdAt plan')
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
    
    // Profile completeness bonus (more important than plan)
    score += this.calculateProfileCompleteness(manufacturer) * 0.2;
    
    // Verification bonus (more important than plan)
    if (manufacturer.isVerified) {
      score += 15;
    }
    
    // Connection success bonus (social proof)
    if (manufacturer.totalConnections > 0) {
      score += Math.min(manufacturer.totalConnections * 2, 20); // Cap at 20 points
    }
    
    // Plan-based ranking boost (moderate influence)
    const planBoost = this.getPlanRankingBoost(manufacturer.plan);
    score += planBoost;
    
    return score;
  }

  /**
   * Get plan-based ranking boost for search results
   */
  private getPlanRankingBoost(plan: string): number {
    const { MANUFACTURER_PLAN_DEFINITIONS } = require('../../constants/manufacturerPlans');
    const planDef = MANUFACTURER_PLAN_DEFINITIONS[plan as keyof typeof MANUFACTURER_PLAN_DEFINITIONS];
    return planDef?.searchVisibility?.rankingBoost || 0;
  }

  /**
 * Calculate manufacturer profile completeness
 */
private calculateManufacturerProfileCompleteness(manufacturer: any): number {
  let completeness = 0;
  const totalFields = 10;

  // Basic info (30 points)
  if (manufacturer.name) completeness += 3;
  if (manufacturer.email) completeness += 3;
  if (manufacturer.isEmailVerified) completeness += 4;

  // Profile details (40 points)
  if (manufacturer.description && manufacturer.description.length >= 50) completeness += 10;
  if (manufacturer.industry) completeness += 5;
  if (manufacturer.contactEmail) completeness += 3;
  if (manufacturer.servicesOffered && manufacturer.servicesOffered.length > 0) completeness += 7;

  // Business info (20 points)
  if (manufacturer.moq && manufacturer.moq > 0) completeness += 5;
  if (manufacturer.location) completeness += 5;
  if (manufacturer.website) completeness += 5;
  if (manufacturer.certifications && manufacturer.certifications.length > 0) completeness += 5;

  // Additional features (10 points)
  if (manufacturer.profilePictureUrl) completeness += 3;
  if (manufacturer.socialUrls && manufacturer.socialUrls.length > 0) completeness += 2;

  return Math.min(completeness * 10, 100); // Convert to percentage
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
