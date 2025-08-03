// src/services/manufacturerAccount.service.ts
import { Manufacturer, IManufacturer } from '../models/manufacturer.model';

export async function getManufacturerAccount(mfgId: string): Promise<IManufacturer> {
    const m = await Manufacturer.findById(mfgId).select(
      'name email profilePictureUrl description servicesOffered moq industry contactEmail socialUrls'
    );
    if (!m) throw { statusCode: 404, message: 'Manufacturer not found.' };
    return m;
  }
  
  export async function updateManufacturerAccount(
    mfgId: string,
    data: Partial<IManufacturer>
  ): Promise<IManufacturer> {
    const updated = await Manufacturer.findByIdAndUpdate(
      mfgId,
      {
        profilePictureUrl: data.profilePictureUrl,
        description:       data.description,
        servicesOffered:   data.servicesOffered,
        moq:               data.moq,
        industry:          data.industry,
        contactEmail:      data.contactEmail,
        socialUrls:        data.socialUrls
      },
      { new: true }
    );
    if (!updated) throw { statusCode: 404, message: 'Manufacturer not found.' };
    return updated;
  }
  
