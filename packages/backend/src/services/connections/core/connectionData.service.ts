// src/services/connections/core/connectionData.service.ts

import { BrandSettings } from '../../../models/brands/brandSettings.model';
import { Manufacturer } from '../../../models/manufacturer/manufacturer.model';
import { Invitation } from '../../../models/infrastructure/invitation.model';
import { logger } from '../../../utils/logger';

/**
 * Core data access service for Connection management
 * Handles brand-manufacturer relationship data in BrandSettings and Manufacturer models
 */
export class ConnectionDataService {
  /**
   * Create bidirectional connection between brand (business) and manufacturer
   * @param brandBusinessId - The Business ID (not BrandSettings ID)
   * @param manufacturerId - The Manufacturer ID
   */
  async createConnection(brandBusinessId: string, manufacturerId: string): Promise<void> {
    try {
      // Update both BrandSettings and Manufacturer to establish connection
      // BrandSettings stores the connection via the business field
      await Promise.all([
        BrandSettings.findOneAndUpdate(
          { business: brandBusinessId },
          { $addToSet: { manufacturers: manufacturerId } }
        ),
        Manufacturer.findByIdAndUpdate(
          manufacturerId,
          { $addToSet: { brands: brandBusinessId } }
        )
      ]);

      logger.info('Connection created', {
        brandBusinessId,
        manufacturerId
      });
    } catch (error) {
      logger.error('Failed to create connection',
        { brandBusinessId, manufacturerId }, error as Error);
      throw error;
    }
  }

  /**
   * Remove bidirectional connection between brand and manufacturer
   * @param brandBusinessId - The Business ID (not BrandSettings ID)
   * @param manufacturerId - The Manufacturer ID
   */
  async removeConnection(brandBusinessId: string, manufacturerId: string): Promise<void> {
    try {
      await Promise.all([
        BrandSettings.findOneAndUpdate(
          { business: brandBusinessId },
          { $pull: { manufacturers: manufacturerId } }
        ),
        Manufacturer.findByIdAndUpdate(
          manufacturerId,
          { $pull: { brands: brandBusinessId } }
        ),
        // Update invitation status to disconnected
        Invitation.findOneAndUpdate(
          { brand: brandBusinessId, manufacturer: manufacturerId, status: 'accepted' },
          { status: 'disconnected', respondedAt: new Date() }
        )
      ]);

      logger.info('Connection removed', {
        brandBusinessId,
        manufacturerId
      });
    } catch (error) {
      logger.error('Failed to remove connection',
        { brandBusinessId, manufacturerId }, error as Error);
      throw error;
    }
  }

  /**
   * Check if brand and manufacturer are connected
   */
  async areConnected(brandId: string, manufacturerId: string): Promise<boolean> {
    try {
      const connection = await Invitation.findOne({
        brand: brandId,
        manufacturer: manufacturerId,
        status: 'accepted'
      });

      return !!connection;
    } catch (error) {
      logger.error('Failed to check connection status',
        { brandId, manufacturerId }, error as Error);
      throw error;
    }
  }

  /**
   * Get all connected manufacturers for a brand
   */
  async getConnectedManufacturers(brandId: string): Promise<string[]> {
    try {
      const acceptedInvitations = await Invitation.find({
        brand: brandId,
        status: 'accepted'
      }).select('manufacturer');

      return acceptedInvitations.map(invitation => invitation.manufacturer.toString());
    } catch (error) {
      logger.error('Failed to get connected manufacturers',
        { brandId }, error as Error);
      throw error;
    }
  }

  /**
   * Get all connected brands for a manufacturer
   */
  async getConnectedBrands(manufacturerId: string): Promise<string[]> {
    try {
      const acceptedInvitations = await Invitation.find({
        manufacturer: manufacturerId,
        status: 'accepted'
      }).select('brand');

      return acceptedInvitations.map(invitation => invitation.brand.toString());
    } catch (error) {
      logger.error('Failed to get connected brands',
        { manufacturerId }, error as Error);
      throw error;
    }
  }

  /**
   * Get detailed connected manufacturers with info
   */
  async getConnectedManufacturersWithDetails(brandId: string): Promise<any[]> {
    try {
      const acceptedInvitations = await Invitation.find({
        brand: brandId,
        status: 'accepted'
      })
        .populate('manufacturer', 'name email industry location capabilities')
        .sort({ respondedAt: -1 });

      return acceptedInvitations.map(inv => ({
        manufacturerId: inv.manufacturer._id.toString(),
        manufacturer: inv.manufacturer,
        connectedAt: inv.respondedAt,
        invitationType: inv.invitationType
      }));
    } catch (error) {
      logger.error('Failed to get connected manufacturers with details',
        { brandId }, error as Error);
      throw error;
    }
  }

  /**
   * Get detailed connected brands with info
   */
  async getConnectedBrandsWithDetails(manufacturerId: string): Promise<any[]> {
    try {
      const acceptedInvitations = await Invitation.find({
        manufacturer: manufacturerId,
        status: 'accepted'
      })
        .populate('brand', 'businessName industry email')  // Now populates Business directly
        .sort({ respondedAt: -1 });

      return acceptedInvitations.map(inv => ({
        brandId: inv.brand._id.toString(),
        brand: inv.brand,
        connectedAt: inv.respondedAt,
        invitationType: inv.invitationType
      }));
    } catch (error) {
      logger.error('Failed to get connected brands with details',
        { manufacturerId }, error as Error);
      throw error;
    }
  }

  /**
   * Get connection count for a brand
   */
  async getBrandConnectionCount(brandId: string): Promise<number> {
    try {
      return await Invitation.countDocuments({
        brand: brandId,
        status: 'accepted'
      });
    } catch (error) {
      logger.error('Failed to get brand connection count',
        { brandId }, error as Error);
      throw error;
    }
  }

  /**
   * Get connection count for a manufacturer
   */
  async getManufacturerConnectionCount(manufacturerId: string): Promise<number> {
    try {
      return await Invitation.countDocuments({
        manufacturer: manufacturerId,
        status: 'accepted'
      });
    } catch (error) {
      logger.error('Failed to get manufacturer connection count',
        { manufacturerId }, error as Error);
      throw error;
    }
  }
}

// Export singleton instance
export const connectionDataService = new ConnectionDataService();



