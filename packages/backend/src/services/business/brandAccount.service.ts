// src/services/business/brandAccount.service.ts
import { Business, IBusiness } from '../../models/business.model';

export class BrandAccountService {
  
  async getBrandAccount(businessId: string): Promise<IBusiness> {
    const biz = await Business.findById(businessId).select(
      'firstName lastName businessName profilePictureUrl description industry contactEmail socialUrls'
    );
    if (!biz) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }
    return biz;
  }
  
  async updateBrandAccount(businessId: string, data: Partial<IBusiness>): Promise<IBusiness> {
    const updated = await Business.findByIdAndUpdate(
      businessId,
      {
        profilePictureUrl: data.profilePictureUrl,
        description: data.description,
        industry: data.industry,
        contactEmail: data.contactEmail,
        socialUrls: data.socialUrls
      },
      { new: true }
    );
    if (!updated) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }
    return updated;
  }

  async getBrandBasicInfo(businessId: string): Promise<Pick<IBusiness, 'businessName' | 'profilePictureUrl'>> {
    const biz = await Business.findById(businessId).select('businessName profilePictureUrl');
    if (!biz) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }
    return biz;
  }

  async updateContactInfo(businessId: string, contactEmail: string): Promise<IBusiness> {
    const updated = await Business.findByIdAndUpdate(
      businessId,
      { contactEmail },
      { new: true }
    );
    if (!updated) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }
    return updated;
  }

  async getComprehensiveBrandAccount(businessId: string): Promise<any> {
  try {
    const [business, brandSettings, billing, analytics] = await Promise.all([
      Business.findById(businessId).select('-password'),
      BrandSettings.findOne({ business: businessId }),
      this.getBillingInfo(businessId),
      this.getAccountAnalytics(businessId)
    ]);

    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    return {
      business: business.toObject(),
      brandSettings: brandSettings?.toObject() || null,
      billing: billing || null,
      analytics: analytics || null,
      verification: await this.getVerificationStatus(businessId),
      profileCompleteness: business.getProfileCompleteness?.() || 0,
      lastActivity: business.lastLoginAt || business.updatedAt,
      accountAge: this.getAccountAge(business.createdAt),
      features: this.getAvailableFeatures(billing?.plan || 'foundation')
    };
  } catch (error) {
    console.error('Error getting comprehensive brand account:', error);
    throw error;
  }
}

async getVerificationStatus(businessId: string): Promise<any> {
  try {
    const business = await Business.findById(businessId).select('isEmailVerified isPhoneVerified');
    const brandSettings = await BrandSettings.findOne({ business: businessId });

    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    return {
      email: {
        verified: business.isEmailVerified,
        verifiedAt: business.emailVerifiedAt || null
      },
      phone: {
        verified: business.isPhoneVerified || false,
        verifiedAt: business.phoneVerifiedAt || null
      },
      business: {
        verified: brandSettings?.businessVerified || false,
        verifiedAt: brandSettings?.businessVerifiedAt || null,
        documents: brandSettings?.verificationDocuments || []
      },
      wallet: {
        verified: brandSettings?.web3Settings?.walletVerified || false,
        verifiedAt: brandSettings?.web3Settings?.walletVerifiedAt || null,
        address: brandSettings?.web3Settings?.certificateWallet || null
      },
      overallStatus: this.calculateOverallVerificationStatus(business, brandSettings)
    };
  } catch (error) {
    console.error('Error getting verification status:', error);
    throw error;
  }
}

async submitVerification(businessId: string, verificationData: any): Promise<any> {
  try {
    const { type, documents, additionalInfo } = verificationData;

    const business = await Business.findById(businessId);
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    const verification = {
      type,
      status: 'pending',
      submittedAt: new Date(),
      documents: documents || [],
      additionalInfo: additionalInfo || {},
      businessId
    };

    // Store verification request (you might want to create a Verification model)
    const verificationRecord = await this.createVerificationRecord(verification);

    // Update business/brand settings based on verification type
    if (type === 'business') {
      await BrandSettings.updateOne(
        { business: businessId },
        {
          $set: {
            businessVerificationStatus: 'pending',
            businessVerificationSubmittedAt: new Date(),
            verificationDocuments: documents
          }
        },
        { upsert: true }
      );
    }

    // Send notification to admins about new verification request
    await this.notifyAdminsOfVerificationSubmission(businessId, type);

    return {
      verificationId: verificationRecord.id,
      status: 'pending',
      submittedAt: verification.submittedAt,
      estimatedReviewTime: '3-5 business days',
      nextSteps: this.getVerificationNextSteps(type)
    };
  } catch (error) {
    console.error('Error submitting verification:', error);
    throw error;
  }
}

async getDetailedVerificationStatus(businessId: string): Promise<any> {
  try {
    const baseStatus = await this.getVerificationStatus(businessId);
    const verificationHistory = await this.getVerificationHistory(businessId);
    const pendingVerifications = await this.getPendingVerifications(businessId);

    return {
      ...baseStatus,
      history: verificationHistory,
      pending: pendingVerifications,
      requirements: this.getVerificationRequirements(),
      tips: this.getVerificationTips()
    };
  } catch (error) {
    console.error('Error getting detailed verification status:', error);
    throw error;
  }
}

async getVerificationHistory(businessId: string): Promise<any[]> {
  try {
    // This would query a VerificationHistory model if you have one
    // For now, return a basic structure
    const business = await Business.findById(businessId);
    const brandSettings = await BrandSettings.findOne({ business: businessId });

    const history = [];

    if (business?.isEmailVerified) {
      history.push({
        type: 'email',
        status: 'verified',
        completedAt: business.emailVerifiedAt || business.createdAt,
        method: 'email_confirmation'
      });
    }

    if (business?.isPhoneVerified) {
      history.push({
        type: 'phone',
        status: 'verified',
        completedAt: business.phoneVerifiedAt || business.createdAt,
        method: 'sms_verification'
      });
    }

    if (brandSettings?.businessVerified) {
      history.push({
        type: 'business',
        status: 'verified',
        completedAt: brandSettings.businessVerifiedAt,
        method: 'document_review'
      });
    }

    return history.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  } catch (error) {
    console.error('Error getting verification history:', error);
    return [];
  }
}

async verifyPassword(businessId: string, password: string): Promise<boolean> {
  try {
    const business = await Business.findById(businessId).select('+password');
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    const isValid = await business.comparePassword(password);
    
    // Log password verification attempt
    console.log(`Password verification attempt for business ${businessId}: ${isValid ? 'success' : 'failed'}`);
    
    return isValid;
  } catch (error) {
    console.error('Error verifying password:', error);
    throw error;
  }
}

async deactivateAccount(businessId: string, reason: string): Promise<any> {
  try {
    const business = await Business.findById(businessId);
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    // Update business status
    await Business.updateOne(
      { _id: businessId },
      {
        $set: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivationReason: reason,
          status: 'deactivated'
        }
      }
    );

    // Cancel any active subscriptions
    await this.cancelActiveSubscriptions(businessId);

    // Archive brand settings
    await BrandSettings.updateOne(
      { business: businessId },
      {
        $set: {
          isActive: false,
          archivedAt: new Date()
        }
      }
    );

    // Send deactivation confirmation
    await this.sendDeactivationConfirmation(business.email, reason);

    return {
      deactivatedAt: new Date(),
      reason,
      reactivationPossible: true,
      dataRetentionPeriod: '90 days'
    };
  } catch (error) {
    console.error('Error deactivating account:', error);
    throw error;
  }
}

async getAccountAnalytics(businessId: string): Promise<any> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Get basic usage analytics
    const analytics = {
      apiUsage: await this.getApiUsage(businessId, thirtyDaysAgo),
      certificateUsage: await this.getCertificateUsage(businessId, thirtyDaysAgo),
      votingActivity: await this.getVotingActivity(businessId, thirtyDaysAgo),
      loginActivity: await this.getLoginActivity(businessId, thirtyDaysAgo),
      profileViews: await this.getProfileViews(businessId, thirtyDaysAgo)
    };

    return {
      ...analytics,
      period: {
        start: thirtyDaysAgo,
        end: new Date()
      },
      summary: {
        totalActiveDays: analytics.loginActivity.activeDays || 0,
        mostActiveFeature: this.getMostActiveFeature(analytics),
        growthTrend: this.calculateGrowthTrend(analytics)
      }
    };
  } catch (error) {
    console.error('Error getting account analytics:', error);
    return {};
  }
}

async getProfilePerformance(businessId: string): Promise<any> {
  try {
    const business = await Business.findById(businessId);
    const brandSettings = await BrandSettings.findOne({ business: businessId });

    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    const completeness = business.getProfileCompleteness?.() || 0;
    const performance = {
      completeness,
      score: this.calculateProfileScore(business, brandSettings),
      missingFields: this.getMissingProfileFields(business, brandSettings),
      recommendations: this.getProfileRecommendations(completeness),
      lastUpdated: business.updatedAt,
      visibility: this.calculateProfileVisibility(business, brandSettings)
    };

    return performance;
  } catch (error) {
    console.error('Error getting profile performance:', error);
    throw error;
  }
}

async exportAccountData(businessId: string, format: string = 'json'): Promise<any> {
  try {
    const comprehensive = await this.getComprehensiveBrandAccount(businessId);
    
    const exportData = {
      exportedAt: new Date(),
      format,
      data: {
        business: comprehensive.business,
        brandSettings: comprehensive.brandSettings,
        verification: comprehensive.verification,
        analytics: comprehensive.analytics
      }
    };

    // Log export request
    console.log(`Data export requested for business ${businessId} in ${format} format`);

    if (format === 'csv') {
      return this.convertToCSV(exportData);
    } else if (format === 'pdf') {
      return this.generatePDFReport(exportData);
    }

    return exportData;
  } catch (error) {
    console.error('Error exporting account data:', error);
    throw error;
  }
}

async getAccountCreationDate(businessId: string): Promise<Date> {
  try {
    const business = await Business.findById(businessId).select('createdAt');
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }
    return business.createdAt;
  } catch (error) {
    console.error('Error getting account creation date:', error);
    throw error;
  }
}

async getLastLogin(businessId: string): Promise<Date | null> {
  try {
    const business = await Business.findById(businessId).select('lastLoginAt');
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }
    return business.lastLoginAt || null;
  } catch (error) {
    console.error('Error getting last login:', error);
    return null;
  }
}

async getAccountSummary(businessId: string): Promise<any> {
  try {
    const [business, brandSettings, billing] = await Promise.all([
      Business.findById(businessId).select('-password'),
      BrandSettings.findOne({ business: businessId }),
      this.getBillingInfo(businessId)
    ]);

    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    return {
      id: businessId,
      businessName: business.businessName,
      email: business.email,
      plan: billing?.plan || 'foundation',
      status: business.isActive ? 'active' : 'inactive',
      verified: business.isEmailVerified,
      createdAt: business.createdAt,
      lastLoginAt: business.lastLoginAt,
      profileCompleteness: business.getProfileCompleteness?.() || 0,
      walletConnected: !!brandSettings?.web3Settings?.certificateWallet,
      industry: business.industry
    };
  } catch (error) {
    console.error('Error getting account summary:', error);
    throw error;
  }
}

async getCustomizationOptions(businessId: string): Promise<any> {
  try {
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    const billing = await this.getBillingInfo(businessId);
    const plan = billing?.plan || 'foundation';

    const availableOptions = {
      themes: this.getAvailableThemes(plan),
      branding: this.getBrandingOptions(plan),
      features: this.getCustomizableFeatures(plan),
      integrations: this.getAvailableIntegrations(plan)
    };

    const currentSettings = {
      theme: brandSettings?.customization?.theme || 'default',
      primaryColor: brandSettings?.customization?.primaryColor || '#007bff',
      logo: brandSettings?.customization?.logoUrl || null,
      customDomain: brandSettings?.customization?.customDomain || null
    };

    return {
      available: availableOptions,
      current: currentSettings,
      plan,
      upgradeRequired: this.getUpgradeRequiredFeatures(plan)
    };
  } catch (error) {
    console.error('Error getting customization options:', error);
    throw error;
  }
}

async verifyWalletOwnership(businessId: string, walletAddress: string, signature: string): Promise<boolean> {
  try {
    // Implement wallet signature verification logic
    const message = `Verify wallet ownership for business: ${businessId}`;
    const isValid = await this.verifyWalletSignature(walletAddress, message, signature);

    if (isValid) {
      // Update brand settings with verified wallet
      await BrandSettings.updateOne(
        { business: businessId },
        {
          $set: {
            'web3Settings.certificateWallet': walletAddress,
            'web3Settings.walletVerified': true,
            'web3Settings.walletVerifiedAt': new Date(),
            'web3Settings.walletSignature': signature
          }
        },
        { upsert: true }
      );

      console.log(`Wallet verified for business ${businessId}: ${walletAddress}`);
    }

    return isValid;
  } catch (error) {
    console.error('Error verifying wallet ownership:', error);
    return false;
  }
}

async updateTokenDiscounts(businessId: string): Promise<any> {
  try {
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    
    if (!brandSettings?.web3Settings?.certificateWallet || !brandSettings.web3Settings.walletVerified) {
      return { hasDiscounts: false, message: 'No verified wallet found' };
    }

    // Check for token-based discounts
    const tokenService = new TokenDiscountService();
    const discounts = await tokenService.getAvailableDiscounts(brandSettings.web3Settings.certificateWallet);

    // Update brand settings with current discounts
    await BrandSettings.updateOne(
      { business: businessId },
      {
        $set: {
          'web3Settings.tokenDiscounts': discounts,
          'web3Settings.discountsUpdatedAt': new Date()
        }
      }
    );

    return {
      hasDiscounts: discounts.length > 0,
      discounts,
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('Error updating token discounts:', error);
    throw error;
  }
}

private getAccountAge(createdAt: Date): string {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - createdAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) return `${diffDays} days`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
  return `${Math.floor(diffDays / 365)} years`;
}

private getAvailableFeatures(plan: string): string[] {
  const features = {
    foundation: ['basic_api', 'community_support'],
    growth: ['advanced_api', 'email_support', 'analytics'],
    premium: ['priority_support', 'custom_branding', 'advanced_analytics'],
    enterprise: ['dedicated_support', 'custom_integrations', 'white_label']
  };
  return features[plan as keyof typeof features] || features.foundation;
}

private calculateOverallVerificationStatus(business: any, brandSettings: any): string {
  const emailVerified = business.isEmailVerified;
  const businessVerified = brandSettings?.businessVerified || false;
  const walletVerified = brandSettings?.web3Settings?.walletVerified || false;

  if (emailVerified && businessVerified && walletVerified) return 'fully_verified';
  if (emailVerified && businessVerified) return 'business_verified';
  if (emailVerified) return 'email_verified';
  return 'unverified';
}

private async createVerificationRecord(verification: any): Promise<any> {
  // Implement verification record creation
  // You might want to create a Verification model for this
  return { id: `ver_${Date.now()}`, ...verification };
}

private async notifyAdminsOfVerificationSubmission(businessId: string, type: string): Promise<void> {
  console.log(`New ${type} verification submitted for business: ${businessId}`);
}

private getVerificationNextSteps(type: string): string[] {
  const steps = {
    business: ['Wait for document review', 'Check email for updates', 'Respond to any requests for additional info'],
    identity: ['Provide government ID', 'Take verification selfie', 'Wait for review'],
    wallet: ['Sign verification message', 'Confirm wallet ownership']
  };
  return steps[type as keyof typeof steps] || ['Contact support for assistance'];
}

private async getPendingVerifications(businessId: string): Promise<any[]> {
  // Implement pending verifications lookup
  return [];
}

private getVerificationRequirements(): any {
  return {
    business: ['Business registration documents', 'Tax ID certificate', 'Proof of address'],
    identity: ['Government-issued ID', 'Recent photo', 'Proof of address'],
    wallet: ['Wallet signature', 'Token holdings (for discounts)']
  };
}

private getVerificationTips(): string[] {
  return [
    'Ensure all documents are clear and legible',
    'Use recent documents (within 3 months)',
    'Make sure your name matches across all documents',
    'Contact support if you need help with any step'
  ];
}

private async getBillingInfo(businessId: string): Promise<any> {
  // Implement billing info retrieval
  return null;
}

private async cancelActiveSubscriptions(businessId: string): Promise<void> {
  console.log(`Cancelling active subscriptions for business: ${businessId}`);
}

private async sendDeactivationConfirmation(email: string, reason: string): Promise<void> {
  console.log(`Sending deactivation confirmation to: ${email}, reason: ${reason}`);
}

private async getApiUsage(businessId: string, since: Date): Promise<any> {
  return { calls: 0, endpoints: [] };
}

private async getCertificateUsage(businessId: string, since: Date): Promise<any> {
  return { issued: 0, verified: 0 };
}

private async getVotingActivity(businessId: string, since: Date): Promise<any> {
  return { votes: 0, proposals: 0 };
}

private async getLoginActivity(businessId: string, since: Date): Promise<any> {
  return { activeDays: 0, totalSessions: 0 };
}

private async getProfileViews(businessId: string, since: Date): Promise<any> {
  return { views: 0, uniqueVisitors: 0 };
}

private getMostActiveFeature(analytics: any): string {
  return 'certificates'; // Implement logic to determine most used feature
}

private calculateGrowthTrend(analytics: any): string {
  return 'stable'; // Implement growth calculation
}

private calculateProfileScore(business: any, brandSettings: any): number {
  // Implement profile scoring logic
  return 85;
}

private getMissingProfileFields(business: any, brandSettings: any): string[] {
  const missing = [];
  if (!business.description) missing.push('description');
  if (!business.website) missing.push('website');
  if (!business.industry) missing.push('industry');
  return missing;
}

private getProfileRecommendations(completeness: number): string[] {
  if (completeness < 50) {
    return ['Add business description', 'Upload logo', 'Complete contact information'];
  }
  if (completeness < 80) {
    return ['Add social media links', 'Upload additional photos', 'Complete business verification'];
  }
  return ['Connect wallet for Web3 features', 'Enable API access'];
}

private calculateProfileVisibility(business: any, brandSettings: any): string {
  if (business.isEmailVerified && brandSettings?.businessVerified) return 'high';
  if (business.isEmailVerified) return 'medium';
  return 'low';
}

private convertToCSV(data: any): string {
  // Implement CSV conversion
  return 'CSV data here';
}

private generatePDFReport(data: any): Buffer {
  // Implement PDF generation
  return Buffer.from('PDF data');
}

private getAvailableThemes(plan: string): string[] {
  const themes = {
    foundation: ['default', 'light'],
    growth: ['default', 'light', 'dark'],
    premium: ['default', 'light', 'dark', 'corporate'],
    enterprise: ['default', 'light', 'dark', 'corporate', 'custom']
  };
  return themes[plan as keyof typeof themes] || themes.foundation;
}

private getBrandingOptions(plan: string): any {
  return {
    customLogo: ['premium', 'enterprise'].includes(plan),
    customColors: ['growth', 'premium', 'enterprise'].includes(plan),
    customDomain: plan === 'enterprise'
  };
}

private getCustomizableFeatures(plan: string): string[] {
  const features = {
    foundation: ['basic_settings'],
    growth: ['basic_settings', 'email_templates'],
    premium: ['basic_settings', 'email_templates', 'dashboard_layout'],
    enterprise: ['basic_settings', 'email_templates', 'dashboard_layout', 'api_responses']
  };
  return features[plan as keyof typeof features] || features.foundation;
}

private getAvailableIntegrations(plan: string): string[] {
  const integrations = {
    foundation: ['webhooks'],
    growth: ['webhooks', 'zapier'],
    premium: ['webhooks', 'zapier', 'slack'],
    enterprise: ['webhooks', 'zapier', 'slack', 'custom_api']
  };
  return integrations[plan as keyof typeof integrations] || integrations.foundation;
}

private getUpgradeRequiredFeatures(plan: string): string[] {
  if (plan === 'foundation') return ['Custom branding', 'Advanced analytics', 'Priority support'];
  if (plan === 'growth') return ['Custom domain', 'White label', 'Dedicated support'];
  if (plan === 'premium') return ['Custom integrations', 'White label'];
  return [];
}

private async verifyWalletSignature(walletAddress: string, message: string, signature: string): Promise<boolean> {
  // Implement wallet signature verification using ethers.js or similar
  // This is a placeholder - you'll need to implement actual signature verification
  console.log(`Verifying signature for wallet: ${walletAddress}`);
  return true; // Placeholder
}


}
