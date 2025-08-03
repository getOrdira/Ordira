// src/services/manufacturer.service.ts

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Manufacturer }    from '../models/manufacturer.model';
import { BrandSettings }   from '../models/brandSettings.model';
import * as analytics      from './analytics.service';

const JWT_SECRET = process.env.MFG_JWT_SECRET!;

type RegisterInput = {
  name:     string;
  email:    string;
  password: string;
};

type LoginInput = {
  email:    string;
  password: string;
};

/**
 * Register a new manufacturer and issue JWT.
 */
export async function register(data: RegisterInput): Promise<{ token: string }> {
  const { name, email, password } = data;
  const hash = await bcrypt.hash(password, 10);
  const mfg  = await Manufacturer.create({
    name,
    email:    email.toLowerCase(),
    password: hash
  });
  const token = jwt.sign({ sub: mfg._id.toHexString() }, JWT_SECRET, { expiresIn: '7d' });
  return { token };
}

/**
 * Authenticate a manufacturer and issue JWT.
 */
export async function login(data: LoginInput): Promise<{ token: string }> {
  const { email, password } = data;
  const mfg = await Manufacturer.findOne({ email: email.toLowerCase() });
  if (!mfg || !(await bcrypt.compare(password, mfg.password))) {
    throw { statusCode: 401, message: 'Invalid credentials' };
  }
  const token = jwt.sign({ sub: mfg._id.toHexString() }, JWT_SECRET, { expiresIn: '7d' });
  return { token };
}

/**
 * List all BrandSettings documents this manufacturer is connected to.
 */
export async function listBrandsForManufacturer(
  mfgId: string
): Promise<any[]> {
  const mfg = await Manufacturer.findById(mfgId).populate('brands');
  if (!mfg) {
    throw { statusCode: 404, message: 'Manufacturer not found' };
  }
  return mfg.brands;
}

/**
 * Fetch vote analytics for a given brand, ensuring authorization.
 */
export async function getResultsForBrand(
  mfgId: string,
  brandSettingsId: string
): Promise<ReturnType<typeof analytics.getVotesAnalytics>> {
  // 1️⃣ ensure this manufacturer is connected to that BrandSettings
  const mfg = await Manufacturer.findOne({
    _id:    mfgId,
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
  return analytics.getVotesAnalytics(businessId);
}

