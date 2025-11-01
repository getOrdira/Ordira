// src/controllers/index.ts
// Main controller exports

import { AuthController } from '../core/auth.controller';
import { BillingController } from './features/billing.controller';
import { BrandAccountController } from '../features/brands/brandAccount.controller';
import { BrandProfileController } from '../features/brands/brandProfile.controller';
import { BrandSettingsController } from '../features/brands/brandSettings.controller';
import { CaptchaController } from '../features/security/captcha.controller';
import { CertificateController } from './features/certificates/certificate.controller';
import { DomainMappingController } from './integrations/domains/domainMapping.controller';
import { EmailGatingController } from './integrations/email/emailGating.controller';
import { InvitationController } from './integrations/invitations/invitation.controller';
import { ManufacturerController } from './features/manufacturers/manufacturer.controller';
import { ManufacturerAccountController } from '../features/manufacturers/manufacturerAccount.controller';
import { ManufacturerProfileController } from '../features/manufacturers/manufacturerProfile.controller';
import { MediaController } from './features/media/media.controller';
import { NftsController } from './features/certificates/nfts.controller';
import { NotificationController } from './features/notifications/notification.controller';
import { PendingVoteController } from './features/votes/pendingVote.controller';
import { ProductController } from './features/products/product.controller';
import { SecurityAuditController } from '../features/security/securityAudit.controller';
import { ShopifyController } from './integrations/ecommerce/shopify.controller';
import { SubscriptionController } from '../features/subscriptions/subscription.controller';
import { SupplyChainController } from './integrations/blockchain/supplyChain.controller';
import { SupplyChainDashboardController } from './integrations/blockchain/supplyChainDashboard.controller';
import { UsageTrackingController } from './features/usage/usageTracking.controller';
import { UserController } from './features/users/user.controller';
import { VotesController } from './features/votes/votes.controller';
import { WixController } from './integrations/ecommerce/wix.controller';
import { WoocommerceController } from './integrations/ecommerce/woocommerce.controller';






// Core controllers
export * from '../core';

// Feature controllers
export * from '../features';

// Integration controllers
export * from '../integrations';

// Controller utilities
export * from '../utils';

// Controller validation
export * from '../validation';

// Controller middleware
export * from '../middleware';

// Controller decorators
export * from '../decorators';

// Legacy controllers (to be migrated)
export * from './analytics.controller';
export * from './apiKey.controller';
export * from './auth.controller';
export * from './billing.controller';
export * from './brandAccount.controller';
export * from './brandProfile.controller';
export * from './brandSettings.controller';
export * from '../features/security/captcha.controller';
export * from './certificate.controller';
export * from './domainMapping.controller';
export * from './emailGating.controller';
export * from './invitation.controller';
export * from './manufacturer.controller';
export * from './manufacturerAccount.controller';
export * from './manufacturerProfile.controller';
export * from './media.controller';
export * from './nfts.controller';
export * from './notification.controller';
export * from './pendingVote.controller';
export * from './product.controller';
export * from './securityAudit.controller';
export * from './shopify.controller';
export * from './subscription.controller';
export * from './supplyChain.controller';
export * from './supplyChainDashboard.controller';
export * from './usageTracking.controller';
export * from './user.controller';
export * from './votes.controller';
export * from './wix.controller';
export * from './woocommerce.controller';
