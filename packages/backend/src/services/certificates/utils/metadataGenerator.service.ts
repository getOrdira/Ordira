/**
 * Metadata Generator Service
 *
 * Handles NFT metadata generation and storage including:
 * - Generate OpenSea-compatible metadata JSON
 * - Store metadata in S3
 * - Handle custom attributes and properties
 * - Support certificate levels and templates
 */

import { Business } from '../../../models/core/business.model';
import { S3Service } from '../../media/core/s3.service';

export interface MetadataOptions {
  productId: string;
  recipient: string;
  certificateLevel: string;
  customMessage?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  expirationDate?: Date;
  imageUrl?: string;
  templateId?: string;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  properties: {
    category: string;
    type: string;
    level: string;
    business: string;
    product: string;
    template: string;
  };
}

/**
 * Generate NFT metadata with S3 assets
 */
export async function generateNFTMetadata(
  businessId: string,
  options: MetadataOptions
): Promise<NFTMetadata> {
  const business = await Business.findById(businessId).select('businessName');
  const brandName = business?.businessName || 'Brand';

  const metadata: NFTMetadata = {
    name: `${brandName} Certificate - ${options.productId}`,
    description:
      options.customMessage ||
      `Digital certificate of authenticity for ${options.productId} issued by ${brandName}`,
    image: options.imageUrl || '',
    external_url: `${process.env.FRONTEND_URL}/certificates/${options.productId}`,
    attributes: [
      {
        trait_type: 'Certificate Level',
        value: options.certificateLevel
      },
      {
        trait_type: 'Product ID',
        value: options.productId
      },
      {
        trait_type: 'Issued By',
        value: brandName
      },
      {
        trait_type: 'Recipient',
        value: options.recipient
      },
      {
        trait_type: 'Issue Date',
        value: new Date().toISOString().split('T')[0],
        display_type: 'date'
      },
      ...(options.expirationDate
        ? [
            {
              trait_type: 'Expiration Date',
              value: options.expirationDate.toISOString().split('T')[0],
              display_type: 'date' as const
            }
          ]
        : []),
      ...(options.attributes || [])
    ],
    properties: {
      category: 'certificate',
      type: 'authenticity',
      level: options.certificateLevel,
      business: businessId,
      product: options.productId,
      template: options.templateId || 'default'
    }
  };

  return metadata;
}

/**
 * Store NFT metadata JSON in S3
 */
export async function storeNFTMetadataInS3(
  businessId: string,
  productId: string,
  metadata: NFTMetadata
): Promise<string> {
  try {
    const metadataJson = JSON.stringify(metadata, null, 2);
    const buffer = Buffer.from(metadataJson, 'utf8');

    const timestamp = Date.now();
    const filename = `metadata-${productId}-${timestamp}.json`;

    const uploadResult = await S3Service.uploadFile(buffer, {
      businessId,
      resourceId: 'certificates',
      filename,
      mimeType: 'application/json',
      metadata: {
        type: 'nft-metadata',
        productId,
        createdAt: new Date().toISOString()
      },
      isPublic: true // Make public for NFT marketplaces
    });

    return uploadResult.key;
  } catch (error: any) {
    throw new Error(`Failed to store NFT metadata in S3: ${error.message}`);
  }
}

/**
 * Get metadata URI from S3 key
 */
export function getMetadataUri(s3Key: string): string {
  return `${process.env.S3_PUBLIC_URL || process.env.METADATA_BASE_URL}/${s3Key}`;
}

/**
 * Update metadata with new image URL
 */
export function updateMetadataImage(
  metadata: NFTMetadata,
  newImageUrl: string
): NFTMetadata {
  return {
    ...metadata,
    image: newImageUrl
  };
}

/**
 * Add custom attributes to metadata
 */
export function addMetadataAttributes(
  metadata: NFTMetadata,
  newAttributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>
): NFTMetadata {
  return {
    ...metadata,
    attributes: [...metadata.attributes, ...newAttributes]
  };
}

export class MetadataGeneratorService {
  generateNFTMetadata = generateNFTMetadata;
  storeNFTMetadataInS3 = storeNFTMetadataInS3;
  getMetadataUri = getMetadataUri;
  updateMetadataImage = updateMetadataImage;
  addMetadataAttributes = addMetadataAttributes;
}

export const metadataGeneratorService = new MetadataGeneratorService();
