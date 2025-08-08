// src/services/external/domainMapping.service.ts

import { DomainMapping, IDomainMapping } from '../../models/domainMapping.model';

/**
 * What we return to the controller so the UI can show the exact
 * CNAME record your brand needs to create.
 */
export interface CnameInstruction {
  /** Your brand's custom hostname (e.g. "vote.acme.com") */
  hostname: string;
  /** The DNS record to add: always a CNAME from `hostname` → your frontend. */
  record: {
    type: 'CNAME';
    name: string;  // same as hostname
    value: string; // e.g. YOUR_APP_HOSTNAME from env
    ttl?: number;  // optional TTL in seconds
  };
}

export class DomainMappingService {

  /**
   * Create a new domain‐mapping row in Mongo, then return
   * exactly one CNAME record for your customer to add.
   */
  async createDomainMapping(businessId: string, hostname: string): Promise<CnameInstruction> {
    // Check if hostname is already mapped
    const existing = await DomainMapping.findOne({ hostname });
    if (existing) {
      throw { statusCode: 409, message: 'Domain already mapped' };
    }

    // Validate hostname format
    if (!this.isValidHostname(hostname)) {
      throw { statusCode: 400, message: 'Invalid hostname format' };
    }

    // 1️⃣ Persist the mapping in your own DB
    const mapping = await DomainMapping.create({
      business: businessId,
      hostname
    });

    // 2️⃣ Build the CNAME that the brand will add at THEIR DNS provider
    //    We point <hostname> at your single frontend entrypoint
    const frontendHost = process.env.FRONTEND_HOSTNAME!;
    if (!frontendHost) {
      throw new Error('Missing FRONTEND_HOSTNAME in environment');
    }

    return {
      hostname: mapping.hostname,
      record: {
        type: 'CNAME',
        name: mapping.hostname,
        value: frontendHost,
        ttl: 3600
      }
    };
  }

  async getDomainMapping(businessId: string): Promise<IDomainMapping | null> {
    return DomainMapping.findOne({ business: businessId });
  }

  async getDomainMappingByHostname(hostname: string): Promise<IDomainMapping | null> {
    return DomainMapping.findOne({ hostname });
  }

  async updateDomainMapping(businessId: string, newHostname: string): Promise<CnameInstruction> {
    // Check if new hostname is already taken by someone else
    const existing = await DomainMapping.findOne({ 
      hostname: newHostname,
      business: { $ne: businessId }
    });
    if (existing) {
      throw { statusCode: 409, message: 'Domain already mapped by another business' };
    }

    // Validate hostname format
    if (!this.isValidHostname(newHostname)) {
      throw { statusCode: 400, message: 'Invalid hostname format' };
    }

    const mapping = await DomainMapping.findOneAndUpdate(
      { business: businessId },
      { hostname: newHostname },
      { new: true, upsert: true }
    ) as IDomainMapping;

    const frontendHost = process.env.FRONTEND_HOSTNAME!;
    return {
      hostname: mapping.hostname,
      record: {
        type: 'CNAME',
        name: mapping.hostname,
        value: frontendHost,
        ttl: 3600
      }
    };
  }

  async removeDomainMapping(businessId: string): Promise<void> {
    const result = await DomainMapping.deleteOne({ business: businessId });
    if (result.deletedCount === 0) {
      throw { statusCode: 404, message: 'Domain mapping not found' };
    }
  }

  async listAllDomainMappings(): Promise<IDomainMapping[]> {
    return DomainMapping.find().populate('business', 'businessName');
  }

  async verifyDomainSetup(hostname: string): Promise<{
    cnameConfigured: boolean;
    pointsToFrontend: boolean;
    sslReady: boolean;
  }> {
    // TODO: Implement DNS resolution checks
    // This would use DNS lookup to verify the CNAME is properly configured
    
    try {
      // Example: const dns = require('dns').promises;
      // const records = await dns.resolveCname(hostname);
      // Check if records point to your frontend hostname
      
      return {
        cnameConfigured: false, // Replace with actual DNS check
        pointsToFrontend: false, // Replace with actual verification
        sslReady: false // Replace with SSL certificate check
      };
    } catch (error) {
      return {
        cnameConfigured: false,
        pointsToFrontend: false,
        sslReady: false
      };
    }
  }

  private isValidHostname(hostname: string): boolean {
    // Basic hostname validation
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return hostnameRegex.test(hostname) && hostname.length <= 253;
  }

  async getDomainStats(): Promise<{
    totalMappings: number;
    verifiedMappings: number;
    pendingMappings: number;
  }> {
    const total = await DomainMapping.countDocuments();
    
    // TODO: Add verification status to your DomainMapping model
    // For now, return basic stats
    return {
      totalMappings: total,
      verifiedMappings: 0, // Replace when you add verification tracking
      pendingMappings: total
    };
  }
}

