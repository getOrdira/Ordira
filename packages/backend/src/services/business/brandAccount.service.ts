// src/services/business/brandAccount.service.ts
import { Business, IBusiness } from '../../models/business.model';

export class BrandAccountService {
  
  async getBrandAccount(businessId: string): Promise<IBusiness> {
    const biz = await Business.findById(businessId).select(
      'firstName lastName businessName profilePictureUrl description industry contactEmail socialUrls'
    );
    if (!biz) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }
    return biz;
  }
  
  async updateBrandAccount(businessId: string, data: Partial<IBusiness>): Promise<IBusiness> {
    const updated = await Business.findByIdAndUpdate(
      businessId,
      {
        profilePictureUrl: data.profilePictureUrl,
        description: data.description,
        industry: data.industry,
        contactEmail: data.contactEmail,
        socialUrls: data.socialUrls
      },
      { new: true }
    );
    if (!updated) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }
    return updated;
  }

  async getBrandBasicInfo(businessId: string): Promise<Pick<IBusiness, 'businessName' | 'profilePictureUrl'>> {
    const biz = await Business.findById(businessId).select('businessName profilePictureUrl');
    if (!biz) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }
    return biz;
  }

  async updateContactInfo(businessId: string, contactEmail: string): Promise<IBusiness> {
    const updated = await Business.findByIdAndUpdate(
      businessId,
      { contactEmail },
      { new: true }
    );
    if (!updated) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }
    return updated;
  }
}
