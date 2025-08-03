// src/services/wix.service.ts
import axios from 'axios';
import crypto from 'crypto';
import { BrandSettings } from '../models/brandSettings.model';
import { createCertificate } from './certificate.service';

const APP_URL = process.env.APP_URL!;

/**
 * Constructs the OAuth install URL for Wix.
 */
export async function generateInstallUrl(businessId: string): Promise<string> {
  const clientId    = process.env.WIX_CLIENT_ID!;
  const redirectUri = `${APP_URL}/api/integrations/wix/oauth/callback`;
  const state       = businessId;
  const scope       = 'orders_read';
  return `https://www.wix.com/oauth/authorize?client_id=${clientId}` +
         `&redirect_uri=${encodeURIComponent(redirectUri)}` +
         `&state=${state}` +
         `&scope=${scope}`;
}

/**
 * Exchanges code for Wix OAuth token and registers order.created webhook.
 */
export async function exchangeCode(
  code: string,
  state: string
): Promise<void> {
  const clientId     = process.env.WIX_CLIENT_ID!;
  const clientSecret = process.env.WIX_CLIENT_SECRET!;
  const data = await axios.post('https://www.wixapis.com/oauth/access', {
    grant_type:    'authorization_code',
    client_id:     clientId,
    client_secret: clientSecret,
    code,
    redirect_uri:  `${APP_URL}/api/integrations/wix/oauth/callback`
  });
  const accessToken  = data.data.access_token;
  const refreshToken = data.data.refresh_token;
  const siteId       = data.data.site_id;

  // Persist credentials
  await BrandSettings.findOneAndUpdate(
    { business: state },
    {
      wixDomain:      siteId,
      wixApiKey:      accessToken
    },
    { upsert: true }
  );

  // Register order.created webhook
  await axios.post(
    'https://www.wixapis.com/orders-webhooks/v1/subscribe',
    {
      event: 'order.created',
      url:   `${APP_URL}/api/integrations/wix/webhook/orders/create`
    },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}

/**
 * Validates Wix webhook signature and issues certificates.
 */
export async function processOrderWebhook(req: any): Promise<void> {
  const signature = req.get('X-Wix-Signature');
  const data      = req.body;
  const settings  = await BrandSettings.findOne({ wixDomain: data.site_id });
  if (!settings) throw { statusCode: 404, message: 'Wix not connected.' };

  // Validate signature
  const computed = crypto
    .createHmac('sha256', settings.wixApiKey!)  
    .update(JSON.stringify(data), 'utf8')
    .digest('hex');
  if (computed !== signature) {
    throw { statusCode: 401, message: 'Invalid Wix webhook signature.' };
  }

  const order = data.order || data;
  for (const item of order.lineItems) {
    await createCertificate(settings.business.toString(), {
      productId:     item.sku,
      recipient:     order.buyerInfo.email,
      contactMethod: 'email'
    });
  }
}