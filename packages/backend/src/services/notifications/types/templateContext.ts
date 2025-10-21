export interface TemplateContext {
  payload: Record<string, unknown>;
}

// Specific template contexts for different notification types
export interface EmailVerificationTemplateContext {
  code: string;
  email: string;
  expiresIn: string;
}

export interface PasswordResetTemplateContext {
  resetToken: string;
  email: string;
  resetUrl: string;
  expiresIn: string;
}

export interface WelcomeTemplateContext {
  name: string;
  userType: 'brand' | 'manufacturer' | 'user';
  email: string;
  dashboardUrl: string;
}

export interface TransferNotificationTemplateContext {
  tokenId: string;
  certificateId: string;
  brandWallet: string;
  txHash?: string;
  transferredAt?: Date;
  gasUsed?: string;
  transferTime?: number;
}

export interface TransferFailureTemplateContext {
  tokenId: string;
  certificateId: string;
  error: string;
  attemptNumber: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  gasWasted?: string;
}

export interface WalletChangeTemplateContext {
  previousWallet?: string;
  newWallet: string;
  changeDate: Date;
  verificationStatus?: 'verified' | 'pending' | 'failed';
}

export interface PaymentFailureTemplateContext {
  amount: string;
  reason?: string;
  attemptCount?: number;
  nextRetryDate?: Date;
  paymentMethodLast4?: string;
  invoiceId?: string;
}

export interface PlanChangeTemplateContext {
  oldPlan: string;
  newPlan: string;
  changeType: 'upgrade' | 'downgrade';
  changeDate: string;
  effectiveDate: string;
  newFeatures: string[];
}

export interface UsageLimitTemplateContext {
  limitType: 'votes' | 'certificates' | 'transfers';
  usage: number;
  limit: number;
  percentage: number;
  currentPlan: string;
  warningDate: string;
}

export interface VerificationSubmissionTemplateContext {
  verificationType: 'business' | 'identity' | 'wallet';
  submissionDate: string;
  referenceId?: string;
  estimatedReviewTime?: string;
  documentsCount: number;
}

export interface AccountDeactivationTemplateContext {
  businessName: string;
  deactivatedAt: Date;
  reason?: string;
  reactivationPossible: boolean;
  dataRetentionPeriod?: number;
  id: string;
}

export interface ProfileChangeTemplateContext {
  businessName: string;
  changedFields: string[];
  changeDate: string;
  changeSource: 'user' | 'admin' | 'system';
  securityRelevant: boolean;
  ipAddress?: string;
}

export interface AccessControlTemplateContext {
  email: string;
  reason?: string;
  date: string;
}

export interface MessageTemplateContext {
  senderName: string;
  messagePreview?: string;
  messageDate: string;
}

export interface VotingTemplateContext {
  proposalId: string;
  voteType?: 'for' | 'against' | 'abstain';
  voterCount?: number;
  totalVotes?: number;
}

export interface ContractDeploymentTemplateContext {
  contractAddress: string;
  txHash: string;
  deploymentDate: string;
}

export interface BulkNotificationTemplateContext {
  totalRecipients: number;
  sent: number;
  failed: number;
  successRate: number;
  batchId: string;
}