// src/services/shopify.service.ts
import axios from 'axios';
import crypto from 'crypto';
import { BrandSettings } from '../models/brandSettings.model';
import { createCertificate } from './certificate.service';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!;
const APP_URL = process.env.APP_URL!;

/**
 * Constructs the OAuth install URL for Shopify.
 */
export async function generateInstallUrl(businessId: string): Promise<string> {
  const settings = await BrandSettings.findOne({ business: businessId });
  const shop = settings?.shopifyDomain;  // If previously set
  const state = businessId;
  const scopes = ['read_products', 'write_webhooks', 'read_orders', 'read_customers'];
  const redirectUri = `${APP_URL}/api/integrations/shopify/oauth/callback`;

  return `https://${shop}.myshopify.com/admin/oauth/authorize` +
         `?client_id=${SHOPIFY_API_KEY}` +
         `&scope=${scopes.join(',')}` +
         `&redirect_uri=${encodeURIComponent(redirectUri)}` +
         `&state=${state}`;
}

/**
 * Handles the OAuth callback: exchanges code for an access token and registers the orders/create webhook.
 */
export async function exchangeCode(
  shop: string,
  code: string,
  state: string
): Promise<void> {
  // 1) Exchange code for access token
  const tokenRes = await axios.post(`https://${shop}/admin/oauth/access_token`, {
    client_id:     SHOPIFY_API_KEY,
    client_secret: SHOPIFY_API_SECRET,
    code
  });
  const accessToken = tokenRes.data.access_token;

  // 2) Register orders/create webhook
  await axios.post(
    `https://${shop}/admin/api/2025-07/webhooks.json`,
    {
      webhook: {
        topic: 'orders/create',
        address: `${APP_URL}/api/integrations/shopify/webhook/orders/create`,
        format: 'json'
      }
    },
    {
      headers: { 'X-Shopify-Access-Token': accessToken }
    }
  );

  // 3) Persist credentials
  await BrandSettings.findOneAndUpdate(
    { business: state },
    {
      shopifyDomain:        shop,
      shopifyAccessToken:   accessToken,
      // Shopify uses HMAC secret for webhooks via header, no extra secret returned
      shopifyWebhookSecret: SHOPIFY_API_SECRET
    },
    { upsert: true }
  );
}

/**
 * Processes Shopify orders/create webhook: validates HMAC and issues certificates.
 */
export async function processOrderWebhook(req: any): Promise<void> {
  const shop = req.get('X-Shopify-Shop-Domain');
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
  const settings = await BrandSettings.findOne({ shopifyDomain: shop });
  if (!settings) throw { statusCode: 404, message: 'Shop not connected.' };

  const rawBody = req.rawBody; // populated by express.raw()
  const computed = crypto
    .createHmac('sha256', settings.shopifyWebhookSecret!)  
    .update(rawBody, 'utf8')
    .digest('base64');
  if (computed !== hmacHeader) {
    throw { statusCode: 401, message: 'Invalid Shopify webhook signature.' };
  }

  // Parse order and mint certificates
  const order = JSON.parse(rawBody.toString());
  for (const item of order.line_items) {
    await createCertificate(settings.business.toString(), {
      productId:     item.sku,
      recipient:     order.email,
      contactMethod: 'email'
    });
  }
}