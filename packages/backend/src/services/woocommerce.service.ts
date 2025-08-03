// src/services/woocommerce.service.ts
import axios from 'axios';
import crypto from 'crypto';
import { BrandSettings } from '../models/brandSettings.model';
import { createCertificate } from './certificate.service';

const APP_URL = process.env.APP_URL!;

type WooCreds = { domain: string; consumerKey: string; consumerSecret: string };

/**
 * Returns a UI URL where the merchant can enter their WooCommerce credentials.
 */
export async function generateInstallUrl(businessId: string): Promise<string> {
  return `${APP_URL}/settings/integrations/woocommerce?businessId=${businessId}`;
}

/**
 * Stores WooCommerce credentials and registers the orders/create webhook.
 */
export async function exchangeCode(
  domain: string,
  consumerKey: string,
  consumerSecret: string,
  state: string
): Promise<void> {
  // Persist credentials
  await BrandSettings.findOneAndUpdate(
    { business: state },
    {
      wooDomain:         domain,
      wooConsumerKey:    consumerKey,
      wooConsumerSecret: consumerSecret
    },
    { upsert: true }
  );

  // Register order.created webhook
  const url = `${domain.replace(/\/$/, '')}/wp-json/wc/v3/webhooks`;
  const deliveryUrl = `${APP_URL}/api/integrations/woocommerce/webhook/orders/create`;

  await axios.post(
    url,
    {
      name:        'Order Created',
      topic:       'order.created',
      delivery_url: deliveryUrl,
      secret:      consumerSecret
    },
    {
      auth: { username: consumerKey, password: consumerSecret },
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Validates WooCommerce webhook signature and issues certificates for new orders.
 */
export async function processOrderWebhook(req: any): Promise<void> {
  const hmacHeader = req.get('X-WC-Webhook-Signature');
  const domain = req.get('X-WC-Webhook-Source');
  const settings = await BrandSettings.findOne({ wooDomain: domain });
  if (!settings) throw { statusCode: 404, message: 'WooCommerce not connected.' };

  const rawBody = req.rawBody;
  const computed = crypto
    .createHmac('sha256', settings.wooConsumerSecret!)  
    .update(rawBody, 'utf8')
    .digest('base64');
  if (computed !== hmacHeader) {
    throw { statusCode: 401, message: 'Invalid WooCommerce webhook signature.' };
  }

  const order = JSON.parse(rawBody.toString());
  for (const item of order.line_items) {
    await createCertificate(settings.business.toString(), {
      productId:     item.sku,
      recipient:     order.billing.email,
      contactMethod: 'email'
    });
  }
}