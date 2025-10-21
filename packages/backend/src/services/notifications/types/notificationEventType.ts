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
  CertificateTransferRetry = 'certificate.transfer_retry',
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
  PaymentFailedRetry = 'billing.payment_failed_retry',
  
  // Account events
  AccountSecurityAlert = 'account.security_alert',
  AccountProfileUpdated = 'account.profile_updated',
  AccountVerificationSubmitted = 'account.verification_submitted',
  AccountDeletionConfirmed = 'account.deletion_confirmed',
  AccountDeactivated = 'account.deactivated',
  AccountAccessRevoked = 'account.access_revoked',
  AccountAccessRestored = 'account.access_restored',
  
  // Authentication events
  AuthEmailVerificationCode = 'auth.email_verification_code',
  AuthPasswordResetLink = 'auth.password_reset_link',
  AuthWelcomeEmail = 'auth.welcome_email',
  
  // Web3 & Wallet events
  WalletConnected = 'wallet.connected',
  WalletChanged = 'wallet.changed',
  WalletVerificationPending = 'wallet.verification_pending',
  WalletVerificationFailed = 'wallet.verification_failed',
  
  // Voting & Proposals
  VoteReceived = 'vote.received',
  ProposalCreated = 'proposal.created',
  VotingContractDeployed = 'voting.contract_deployed',
  
  // Messaging
  MessageReceived = 'message.received',
  
  // Usage & Limits
  UsageLimitWarning = 'usage.limit_warning',
  UsageLimitExceeded = 'usage.limit_exceeded',
  
  // Settings & Configuration
  SettingsChanged = 'settings.changed',
  
  // Bulk & System
  BulkNotificationSent = 'bulk.notification_sent',
  SystemMaintenance = 'system.maintenance',
}


