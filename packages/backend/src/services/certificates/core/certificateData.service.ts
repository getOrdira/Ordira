/**
 * Certificate Data Service
 *
 * Core CRUD operations for certificates including:
 * - Create, read, update, delete certificates
 * - List and filter certificates
 * - Query certificate data
 */

import { Certificate, ICertificate } from '../../../models/deprecated/certificate.model';
import { logger } from '../../../utils/logger';

export interface CertificateListOptions {
  status?: string;
  transferStatus?: 'relayer' | 'brand' | 'failed';
  page?: number;
  limit?: number;
  productId?: string;
  recipient?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  ownershipType?: 'relayer' | 'brand' | 'all';
  hasWeb3?: boolean;
}

export interface CertificateListResult {
  certificates: ICertificate[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class CertificateDataService {
  /**
   * Get single certificate with full details
   */
  async getCertificate(certificateId: string, businessId?: string): Promise<ICertificate> {
    const query: any = { _id: certificateId };
    if (businessId) {
      query.business = businessId;
    }

    const cert = await Certificate.findOne(query).populate('product');
    if (!cert) {
      throw new Error('Certificate not found');
    }
    return cert;
  }

  /**
   * List certificates with enhanced filtering
   */
  async listCertificates(
    businessId: string,
    options: CertificateListOptions = {}
  ): Promise<CertificateListResult> {
    const {
      status,
      transferStatus,
      page = 1,
      limit = 20,
      productId,
      recipient,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ownershipType = 'all',
      hasWeb3
    } = options;

    const offset = (page - 1) * limit;

    // Build query
    const query: any = { business: businessId };

    if (status) {
      query.status = status;
    }

    if (productId) {
      query.product = productId;
    }

    if (recipient) {
      query.recipient = new RegExp(recipient, 'i');
    }

    if (dateFrom && dateTo) {
      query.createdAt = {
        $gte: dateFrom,
        $lte: dateTo
      };
    }

    if (search) {
      query.$or = [
        { tokenId: new RegExp(search, 'i') },
        { recipient: new RegExp(search, 'i') }
      ];
    }

    if (transferStatus) {
      switch (transferStatus) {
        case 'relayer':
          query.mintedToRelayer = true;
          query.transferredToBrand = { $ne: true };
          query.transferFailed = { $ne: true };
          break;
        case 'brand':
          query.transferredToBrand = true;
          break;
        case 'failed':
          query.transferFailed = true;
          break;
      }
    }

    if (ownershipType !== 'all') {
      if (ownershipType === 'relayer') {
        query.$or = [
          { transferredToBrand: false },
          { transferredToBrand: { $exists: false } }
        ];
      } else if (ownershipType === 'brand') {
        query.transferredToBrand = true;
      }
    }

    if (hasWeb3 !== undefined) {
      query.autoTransferEnabled = hasWeb3;
    }

    const [certificates, total] = await Promise.all([
      Certificate.find(query)
        .populate('product')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(offset)
        .limit(limit),
      Certificate.countDocuments(query)
    ]);

    return {
      certificates,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Update certificate data
   */
  async updateCertificate(
    certificateId: string,
    businessId: string,
    updates: Partial<ICertificate>
  ): Promise<ICertificate> {
    const certificate = await Certificate.findOneAndUpdate(
      { _id: certificateId, business: businessId },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true }
    );

    if (!certificate) {
      throw new Error('Certificate not found or access denied');
    }

    return certificate;
  }

  /**
   * Delete certificate (soft delete)
   */
  async deleteCertificate(certificateId: string, businessId: string): Promise<void> {
    const result = await Certificate.deleteOne({
      _id: certificateId,
      business: businessId
    });

    if (result.deletedCount === 0) {
      throw new Error('Certificate not found or access denied');
    }
  }

  /**
   * Get certificates by product ID
   */
  async getCertificatesByProduct(
    businessId: string,
    productId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<ICertificate[]> {
    const { limit = 20, offset = 0 } = options;

    return Certificate.find({
      business: businessId,
      product: productId
    })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();
  }

  /**
   * Get certificates by recipient
   */
  async getCertificatesByRecipient(
    businessId: string,
    recipient: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<ICertificate[]> {
    const { limit = 20, offset = 0 } = options;

    return Certificate.find({
      business: businessId,
      recipient
    })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();
  }

  /**
   * Check if certificate exists
   */
  async certificateExists(
    businessId: string,
    productId: string,
    recipient: string
  ): Promise<boolean> {
    const count = await Certificate.countDocuments({
      business: businessId,
      product: productId,
      recipient
    });

    return count > 0;
  }

  /**
   * Get certificates by batch ID
   */
  async getCertificatesByBatch(
    businessId: string,
    batchId: string
  ): Promise<ICertificate[]> {
    return Certificate.find({
      business: businessId,
      batchId
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Get failed transfer certificates
   */
  async getFailedTransferCertificates(
    businessId: string,
    limit: number = 10
  ): Promise<ICertificate[]> {
    return Certificate.find({
      business: businessId,
      transferFailed: true,
      status: 'transfer_failed',
      transferAttempts: { $lt: 3 }
    })
      .limit(limit)
      .lean();
  }

  /**
   * Get pending transfer certificates
   */
  async getPendingTransferCertificates(
    businessId: string,
    limit: number = 10
  ): Promise<ICertificate[]> {
    return Certificate.find({
      business: businessId,
      status: 'pending_transfer',
      transferScheduled: true,
      transferredToBrand: { $ne: true }
    })
      .limit(limit)
      .lean();
  }

  /**
   * Update certificate status
   */
  async updateCertificateStatus(
    certificateId: string,
    status: string,
    additionalData?: any
  ): Promise<ICertificate> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
      ...additionalData
    };

    const certificate = await Certificate.findByIdAndUpdate(
      certificateId,
      { $set: updateData },
      { new: true }
    );

    if (!certificate) {
      throw new Error('Certificate not found');
    }

    return certificate;
  }

  /**
   * Bulk update certificates
   */
  async bulkUpdateCertificates(
    certificateIds: string[],
    updates: Partial<ICertificate>
  ): Promise<number> {
    const result = await Certificate.updateMany(
      { _id: { $in: certificateIds } },
      { $set: { ...updates, updatedAt: new Date() } }
    );

    return result.modifiedCount;
  }

  /**
   * Get certificate count by status
   */
  async getCertificateCountByStatus(businessId: string): Promise<Record<string, number>> {
    const statuses = await Certificate.aggregate([
      { $match: { business: businessId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const result: Record<string, number> = {};
    statuses.forEach(item => {
      result[item._id] = item.count;
    });

    return result;
  }

  /**
   * Get certificates created in date range
   */
  async getCertificatesInDateRange(
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ICertificate[]> {
    return Certificate.find({
      business: businessId,
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Search certificates by token ID or recipient
   */
  async searchCertificates(
    businessId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<ICertificate[]> {
    return Certificate.find({
      business: businessId,
      $or: [
        { tokenId: new RegExp(searchTerm, 'i') },
        { recipient: new RegExp(searchTerm, 'i') },
        { txHash: new RegExp(searchTerm, 'i') }
      ]
    })
      .limit(limit)
      .lean();
  }
}

export const certificateDataService = new CertificateDataService();
