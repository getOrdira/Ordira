// src/services/business/manufacturer.service.ts

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Manufacturer } from '../../models/manufacturer.model';
import { BrandSettings } from '../../models/brandSettings.model';
import { AnalyticsBusinessService } from './analytics.service';

const JWT_SECRET = process.env.MFG_JWT_SECRET!;

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

export interface ConnectedBrand {
  id: string;
  businessId: string;
  businessName: string;
  logoUrl?: string;
  connectionDate: Date;
}

/**
 * Core manufacturer authentication and data access service
 */
export class ManufacturerService {
  private analyticsService = new AnalyticsBusinessService();

  /**
   * Register a new manufacturer and issue JWT.
   */
  async register(data: RegisterInput): Promise<{ token: string; manufacturerId: string }> {
    const { name, email, password } = data;
    
    // Check if email already exists
    const existing = await Manufacturer.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw { statusCode: 409, message: 'Email already in use' };
    }

    const hash = await bcrypt.hash(password, 10);
    const mfg = await Manufacturer.create({
      name,
      email: email.toLowerCase(),
      password: hash
    });

    const token = jwt.sign({ sub: mfg._id.toHexString() }, JWT_SECRET, { expiresIn: '7d' });
    
    return { 
      token, 
      manufacturerId: mfg._id.toString() 
    };
  }

  /**
   * Authenticate a manufacturer and issue JWT.
   */
  async login(data: LoginInput): Promise<{ token: string; manufacturerId: string }> {
    const { email, password } = data;
    const mfg = await Manufacturer.findOne({ email: email.toLowerCase() });
    
    if (!mfg || !(await bcrypt.compare(password, mfg.password))) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    const token = jwt.sign({ sub: mfg._id.toHexString() }, JWT_SECRET, { expiresIn: '7d' });
    
    return { 
      token, 
      manufacturerId: mfg._id.toString() 
    };
  }

  /**
   * List all brands this manufacturer is connected to with rich data
   */
  async listBrandsForManufacturer(mfgId: string): Promise<ConnectedBrand[]> {
    const mfg = await Manufacturer.findById(mfgId).populate({
      path: 'brands',
      populate: {
        path: 'business',
        select: 'businessName'
      }
    });

    if (!mfg) {
      throw { statusCode: 404, message: 'Manufacturer not found' };
    }

    return mfg.brands.map((brand: any) => ({
      id: brand._id.toString(),
      businessId: brand.business._id.toString(),
      businessName: brand.business.businessName,
      logoUrl: brand.logoUrl,
      connectionDate: brand.createdAt || new Date()
    }));
  }

  /**
   * Fetch vote analytics for a given brand, ensuring authorization.
   */
  async getResultsForBrand(mfgId: string, brandSettingsId: string) {
    // 1️⃣ ensure this manufacturer is connected to that BrandSettings
    const mfg = await Manufacturer.findOne({
      _id: mfgId,
      brands: brandSettingsId
    });
    if (!mfg) {
      throw { statusCode: 403, message: 'Not authorized for this brand' };
    }

    // 2️⃣ load the BrandSettings to get its Business ID
    const settings = await BrandSettings.findById(brandSettingsId).select('business');
    if (!settings) {
      throw { statusCode: 404, message: 'Brand settings not found' };
    }

    // 3️⃣ convert ObjectId → string
    const businessId = settings.business.toHexString();

    // 4️⃣ delegate to analytics service
    return this.analyticsService.getVotingAnalytics(businessId);
  }

  /**
   * Get comprehensive analytics for a brand (voting + NFT data)
   */
  async getComprehensiveAnalyticsForBrand(mfgId: string, brandSettingsId: string) {
    // Verify authorization first
    const mfg = await Manufacturer.findOne({
      _id: mfgId,
      brands: brandSettingsId
    });
    if (!mfg) {
      throw { statusCode: 403, message: 'Not authorized for this brand' };
    }

    const settings = await BrandSettings.findById(brandSettingsId).select('business');
    if (!settings) {
      throw { statusCode: 404, message: 'Brand settings not found' };
    }

    const businessId = settings.business.toHexString();

    // Get both voting and NFT analytics
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
      }
    };
  }

  /**
   * Verify JWT token and return manufacturer ID
   */
  verifyToken(token: string): { manufacturerId: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
      return { manufacturerId: decoded.sub };
    } catch (error) {
      throw { statusCode: 401, message: 'Invalid token' };
    }
  }

  /**
   * Get manufacturer by ID
   */
  async getManufacturerById(mfgId: string) {
    const manufacturer = await Manufacturer.findById(mfgId).select('-password');
    if (!manufacturer) {
      throw { statusCode: 404, message: 'Manufacturer not found' };
    }
    return manufacturer;
  }

  /**
   * Check if manufacturer has access to a specific brand
   */
  async hasAccessToBrand(mfgId: string, brandSettingsId: string): Promise<boolean> {
    const mfg = await Manufacturer.findOne({
      _id: mfgId,
      brands: brandSettingsId
    });
    return !!mfg;
  }

  /**
   * Get connection stats for a manufacturer
   */
  async getConnectionStats(mfgId: string): Promise<{
    totalConnectedBrands: number;
    recentConnections: number;
    analyticsAccess: number;
  }> {
    const mfg = await Manufacturer.findById(mfgId);
    if (!mfg) {
      throw { statusCode: 404, message: 'Manufacturer not found' };
    }

    const totalConnectedBrands = mfg.brands?.length || 0;
    
    // Count connections from last 30 days (you'd need to track connection dates)
    const recentConnections = 0; // Implement based on your invitation tracking

    return {
      totalConnectedBrands,
      recentConnections,
      analyticsAccess: totalConnectedBrands // All connected brands provide analytics access
    };
  }

  /**
   * Search for manufacturers by name
   */
  async searchManufacturers(query: string, limit: number = 20): Promise<Array<{
    id: string;
    name: string;
    email: string;
    industry?: string;
  }>> {
    const manufacturers = await Manufacturer.find({
      name: { $regex: query, $options: 'i' }
    })
    .select('name email industry')
    .limit(limit)
    .lean();

    return manufacturers.map(m => ({
      id: m._id.toString(),
      name: m.name,
      email: m.email,
      industry: m.industry
    }));
  }
}

