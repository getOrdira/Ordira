export enum NotificationEventType {
  ConnectionRequested = 'connection.requested',
  ConnectionAccepted = 'connection.accepted',
  ConnectionDeclined = 'connection.declined',
  CertificateMinted = 'certificate.minted',
  CertificateTransferFailed = 'certificate.transfer_failed',
  SubscriptionRenewalUpcoming = 'subscription.renewal_upcoming',
  SubscriptionRenewed = 'subscription.renewed',
  SubscriptionCancelled = 'subscription.cancelled',
  SubscriptionPlanChanged = 'subscription.plan_changed',
  SubscriptionWelcome = 'subscription.welcome',
  PaymentFailed = 'billing.payment_failed',
  AccountSecurityAlert = 'account.security_alert',
  AccountProfileUpdated = 'account.profile_updated',
  AccountVerificationSubmitted = 'account.verification_submitted',
  AccountDeletionConfirmed = 'account.deletion_confirmed',
}


