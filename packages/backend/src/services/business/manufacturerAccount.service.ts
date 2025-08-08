// src/services/business/manufacturerAccount.service.ts
import { Manufacturer, IManufacturer } from '../../models/manufacturer.model';

export class ManufacturerAccountService {

  async getManufacturerAccount(mfgId: string): Promise<IManufacturer> {
    const m = await Manufacturer.findById(mfgId).select(
      'name email profilePictureUrl description servicesOffered moq industry contactEmail socialUrls createdAt'
    );
    if (!m) {
      throw { statusCode: 404, message: 'Manufacturer not found.' };
    }
    return m;
  }

  async updateManufacturerAccount(
    mfgId: string,
    data: Partial<IManufacturer>
  ): Promise<IManufacturer> {
    const updated = await Manufacturer.findByIdAndUpdate(
      mfgId,
      {
        profilePictureUrl: data.profilePictureUrl,
        description: data.description,
        servicesOffered: data.servicesOffered,
        moq: data.moq,
        industry: data.industry,
        contactEmail: data.contactEmail,
        socialUrls: data.socialUrls
      },
      { new: true }
    );
    if (!updated) {
      throw { statusCode: 404, message: 'Manufacturer not found.' };
    }
    return updated;
  }

  async getManufacturerBasicInfo(mfgId: string): Promise<Pick<IManufacturer, 'name' | 'profilePictureUrl' | 'industry'>> {
    const m = await Manufacturer.findById(mfgId).select('name profilePictureUrl industry');
    if (!m) {
      throw { statusCode: 404, message: 'Manufacturer not found.' };
    }
    return m;
  }

  async updateContactInfo(mfgId: string, contactEmail: string): Promise<IManufacturer> {
    const updated = await Manufacturer.findByIdAndUpdate(
      mfgId,
      { contactEmail },
      { new: true }
    );
    if (!updated) {
      throw { statusCode: 404, message: 'Manufacturer not found.' };
    }
    return updated;
  }

  async updateServicesOffered(mfgId: string, servicesOffered: string[]): Promise<IManufacturer> {
    const updated = await Manufacturer.findByIdAndUpdate(
      mfgId,
      { servicesOffered },
      { new: true }
    );
    if (!updated) {
      throw { statusCode: 404, message: 'Manufacturer not found.' };
    }
    return updated;
  }

  async updateMinimumOrderQuantity(mfgId: string, moq: number): Promise<IManufacturer> {
    const updated = await Manufacturer.findByIdAndUpdate(
      mfgId,
      { moq },
      { new: true }
    );
    if (!updated) {
      throw { statusCode: 404, message: 'Manufacturer not found.' };
    }
    return updated;
  }

  async getManufacturerStats(mfgId: string): Promise<{
    profileCompleteness: number;
    accountAge: number;
    lastUpdated: Date;
  }> {
    const manufacturer = await this.getManufacturerAccount(mfgId);
    
    // Calculate profile completeness
    const fields = [
      'name', 'email', 'description', 'industry', 
      'servicesOffered', 'moq', 'contactEmail'
    ];
    const completedFields = fields.filter(field => {
      const value = manufacturer[field as keyof IManufacturer];
      return value !== null && value !== undefined && value !== '';
    });
    
    const profileCompleteness = Math.round((completedFields.length / fields.length) * 100);
    
    // Calculate account age in days
    const accountAge = Math.floor(
      (Date.now() - manufacturer.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      profileCompleteness,
      accountAge,
      lastUpdated: manufacturer.updatedAt || manufacturer.createdAt
    };
  }

  async validateManufacturerOwnership(mfgId: string, currentUserId: string): Promise<boolean> {
    return mfgId === currentUserId;
  }

  async deactivateAccount(mfgId: string): Promise<void> {
    const updated = await Manufacturer.findByIdAndUpdate(
      mfgId,
      { 
        isActive: false,
        deactivatedAt: new Date()
      }
    );
    if (!updated) {
      throw { statusCode: 404, message: 'Manufacturer not found.' };
    }
  }

  async reactivateAccount(mfgId: string): Promise<void> {
    const updated = await Manufacturer.findByIdAndUpdate(
      mfgId,
      { 
        isActive: true,
        $unset: { deactivatedAt: 1 }
      }
    );
    if (!updated) {
      throw { statusCode: 404, message: 'Manufacturer not found.' };
    }
  }
}
  
