export enum NotificationEventType {
  // Connection events
  ConnectionRequested = 'connection.requested',
  ConnectionAccepted = 'connection.accepted',
  ConnectionDeclined = 'connection.declined',
  
  // Certificate events
  CertificateMinted = 'certificate.minted',
  CertificateMintFailed = 'certificate.mint_failed',
  CertificateBatchCompleted = 'certificate.batch_completed',
  CertificateTransferred = 'certificate.transferred',
  CertificateTransferFailed = 'certificate.transfer_failed',
  CertificateTransferPending = 'certificate.transfer_pending',
  CertificateRevoked = 'certificate.revoked',
  CertificateRevocationFailed = 'certificate.revocation_failed',
  CertificateDelivered = 'certificate.delivered',
  CertificateDeliveryFailed = 'certificate.delivery_failed',
  CertificateExpiringSoon = 'certificate.expiring_soon',
  CertificateExpired = 'certificate.expired',
  CertificateVerified = 'certificate.verified',
  
  // Subscription events
  SubscriptionRenewalUpcoming = 'subscription.renewal_upcoming',
  SubscriptionRenewed = 'subscription.renewed',
  SubscriptionCancelled = 'subscription.cancelled',
  SubscriptionPlanChanged = 'subscription.plan_changed',
  SubscriptionWelcome = 'subscription.welcome',
  
  // Billing events
  PaymentFailed = 'billing.payment_failed',
  
  // Account events
  AccountSecurityAlert = 'account.security_alert',
  AccountProfileUpdated = 'account.profile_updated',
  AccountVerificationSubmitted = 'account.verification_submitted',
  AccountDeletionConfirmed = 'account.deletion_confirmed',
}


