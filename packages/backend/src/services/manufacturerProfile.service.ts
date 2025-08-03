// src/services/manufacturerProfile.service.ts

import { Manufacturer } from '../models/manufacturer.model';

export interface ManufacturerProfile {
  id:   string;
  name: string;
}

/**
 * Return a lightweight list of all manufacturers.
 */
export async function listManufacturerProfiles(): Promise<ManufacturerProfile[]> {
  const docs = await Manufacturer
    .find()
    .select('name')
    .sort('name')      // optional: alphabetical order
    .lean();

  return docs.map(m => ({
    id:   m._id.toHexString(),
    name: m.name
  }));
}

/**
 * Fetch a single manufacturer’s profile (id + name).
 */
export async function getManufacturerProfile(
  id: string
): Promise<ManufacturerProfile> {
  const m = await Manufacturer
    .findById(id)
    .select('name')
    .lean();

  if (!m) {
    throw { statusCode: 404, message: 'Manufacturer not found.' };
  }

  return {
    id:   m._id.toHexString(),
    name: m.name
  };
}

