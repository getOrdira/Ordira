// src/services/brands/utils/recommendationEngine.service.ts

import { logger } from '../../../utils/logger';
import { Business } from '../../../models/core/business.model';
import { BrandSettings } from '../../../models/brands/brandSettings.model';

export interface RecommendationContext {
  businessId: string;
  plan: string;
  industry?: string;
  completeness?: number;
  verificationStatus?: string;
  profileData?: any;
  settingsData?: any;
  behaviorData?: any;
}

export interface Recommendation {
  id: string;
  type: 'profile' | 'settings' | 'integration' | 'partnership' | 'feature' | 'improvement' | 'security' | 'growth';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  actionText: string;
  actionUrl?: string;
  benefits: string[];
  estimatedImpact: number; // 1-10 scale
  estimatedEffort: number; // 1-10 scale
  requiresPlan?: string[];
  prerequisites?: string[];
  tags: string[];
  createdAt: Date;
  expiresAt?: Date;
  metadata?: any;
}

export interface RecommendationSet {
  recommendations: Recommendation[];
  personalizedScore: number;
  context: RecommendationContext;
  generatedAt: Date;
  filters: {
    byType: { [key: string]: Recommendation[] };
    byPriority: { [key: string]: Recommendation[] };
    byCategory: { [key: string]: Recommendation[] };
  };
  summary: {
    total: number;
    highPriority: number;
    quickWins: number; // High impact, low effort
    majorImprovements: number; // High impact, high effort
  };
}

/**
 * Advanced recommendation engine service
 * Extracted and enhanced from brandProfile, brandSettings, and brandAccount services
 */
export class RecommendationEngineService {

  // ===== Core Recommendation Generation =====

  /**
   * Generate personalized recommendations for a business
   */
  async generatePersonalizedRecommendations(
    context: RecommendationContext,
    options: {
      limit?: number;
      types?: string[];
      minPriority?: string;
      includeExpired?: boolean;
    } = {}
  ): Promise<RecommendationSet> {
    try {
      const limit = options.limit || 20;

      // Get business and settings data
      const [business, brandSettings] = await Promise.all([
        Business.findById(context.businessId),
        BrandSettings.findOne({ business: context.businessId })
      ]);

      if (!business) {
        throw new Error('Business not found');
      }

      // Update context with fetched data
      const enrichedContext: RecommendationContext = {
        ...context,
        industry: business.industry,
        profileData: business.toObject(),
        settingsData: brandSettings?.toObject() || {},
        verificationStatus: this.calculateVerificationStatus(business, brandSettings)
      };

      // Generate recommendations from different sources
      const allRecommendations = await Promise.all([
        this.generateProfileRecommendations(enrichedContext),
        this.generateSettingsRecommendations(enrichedContext),
        this.generateIntegrationRecommendations(enrichedContext),
        this.generatePartnershipRecommendations(enrichedContext),
        this.generateFeatureRecommendations(enrichedContext),
        this.generateSecurityRecommendations(enrichedContext),
        this.generateGrowthRecommendations(enrichedContext)
      ]);

      // Flatten and filter recommendations
      let recommendations = allRecommendations.flat();

      // Apply filters
      if (options.types) {
        recommendations = recommendations.filter(rec => options.types!.includes(rec.type));
      }

      if (options.minPriority) {
        recommendations = this.filterByMinPriority(recommendations, options.minPriority);
      }

      if (!options.includeExpired) {
        recommendations = recommendations.filter(rec =>
          !rec.expiresAt || rec.expiresAt > new Date()
        );
      }

      // Score and sort recommendations
      recommendations = this.scoreAndSortRecommendations(recommendations, enrichedContext);

      // Limit results
      recommendations = recommendations.slice(0, limit);

      // Calculate personalized score
      const personalizedScore = this.calculatePersonalizationScore(recommendations, enrichedContext);

      // Create filters and summary
      const filters = this.createRecommendationFilters(recommendations);
      const summary = this.createRecommendationSummary(recommendations);

      return {
        recommendations,
        personalizedScore,
        context: enrichedContext,
        generatedAt: new Date(),
        filters,
        summary
      };
    } catch (error) {
      logger.error('Error generating personalized recommendations:', error);
      return this.getDefaultRecommendationSet(context);
    }
  }

  // ===== Specific Recommendation Generators =====

  /**
   * Generate profile-related recommendations
   */
  private async generateProfileRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const profile = context.profileData;

    if (!profile) return recommendations;

    // Basic profile completeness
    if (!profile.profilePictureUrl) {
      recommendations.push(this.createRecommendation({
        id: 'profile_picture',
        type: 'profile',
        priority: 'high',
        category: 'Basic Setup',
        title: 'Add Professional Profile Picture',
        description: 'A professional profile picture increases trust and recognition by 40%',
        actionText: 'Upload Photo',
        actionUrl: '/profile/picture',
        benefits: ['Increased trust', 'Better brand recognition', 'Professional appearance'],
        estimatedImpact: 7,
        estimatedEffort: 2,
        tags: ['image', 'trust', 'branding']
      }));
    }

    if (!profile.description || profile.description.length < 50) {
      recommendations.push(this.createRecommendation({
        id: 'business_description',
        type: 'profile',
        priority: 'high',
        category: 'Basic Setup',
        title: 'Complete Business Description',
        description: 'A compelling description helps partners understand your business value',
        actionText: 'Write Description',
        actionUrl: '/profile/edit',
        benefits: ['Better discovery', 'Clear value proposition', 'Partner attraction'],
        estimatedImpact: 8,
        estimatedEffort: 3,
        tags: ['content', 'discovery', 'seo']
      }));
    }

    if (!profile.socialUrls || Object.keys(profile.socialUrls).length === 0) {
      recommendations.push(this.createRecommendation({
        id: 'social_media',
        type: 'profile',
        priority: 'medium',
        category: 'Social Presence',
        title: 'Connect Social Media Accounts',
        description: 'Social links increase credibility and provide additional touchpoints',
        actionText: 'Add Social Links',
        actionUrl: '/profile/social',
        benefits: ['Enhanced credibility', 'Multi-channel presence', 'Community building'],
        estimatedImpact: 6,
        estimatedEffort: 2,
        tags: ['social', 'credibility', 'marketing']
      }));
    }

    if (!profile.certifications || profile.certifications.length === 0) {
      recommendations.push(this.createRecommendation({
        id: 'certifications',
        type: 'profile',
        priority: 'medium',
        category: 'Trust Building',
        title: 'Upload Business Certifications',
        description: 'Certifications build trust and demonstrate compliance with industry standards',
        actionText: 'Add Certifications',
        actionUrl: '/profile/certifications',
        benefits: ['Increased trust', 'Compliance demonstration', 'Competitive advantage'],
        estimatedImpact: 7,
        estimatedEffort: 4,
        tags: ['compliance', 'trust', 'verification']
      }));
    }

    // Plan-specific recommendations
    if (['premium', 'enterprise'].includes(context.plan) && !profile.walletAddress) {
      recommendations.push(this.createRecommendation({
        id: 'web3_wallet',
        type: 'profile',
        priority: 'medium',
        category: 'Web3 Features',
        title: 'Connect Web3 Wallet',
        description: 'Unlock blockchain features and token-based discounts',
        actionText: 'Connect Wallet',
        actionUrl: '/profile/wallet',
        benefits: ['Blockchain features', 'Token discounts', 'NFT capabilities'],
        estimatedImpact: 6,
        estimatedEffort: 3,
        requiresPlan: ['premium', 'enterprise'],
        tags: ['web3', 'blockchain', 'premium']
      }));
    }

    return recommendations;
  }

  /**
   * Generate settings-related recommendations
   */
  private async generateSettingsRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const settings = context.settingsData;

    if (!settings) {
      recommendations.push(this.createRecommendation({
        id: 'setup_brand_settings',
        type: 'settings',
        priority: 'critical',
        category: 'Initial Setup',
        title: 'Set Up Brand Settings',
        description: 'Configure your brand identity to stand out from competitors',
        actionText: 'Start Setup',
        actionUrl: '/settings/brand',
        benefits: ['Professional appearance', 'Brand consistency', 'Market differentiation'],
        estimatedImpact: 9,
        estimatedEffort: 4,
        tags: ['setup', 'branding', 'critical']
      }));
      return recommendations;
    }

    // Logo and theme
    if (!settings.logoUrl) {
      recommendations.push(this.createRecommendation({
        id: 'brand_logo',
        type: 'settings',
        priority: 'high',
        category: 'Brand Identity',
        title: 'Upload Brand Logo',
        description: 'A consistent logo increases brand recognition by 80%',
        actionText: 'Upload Logo',
        actionUrl: '/settings/brand/logo',
        benefits: ['Brand recognition', 'Professional look', 'Marketing consistency'],
        estimatedImpact: 8,
        estimatedEffort: 2,
        tags: ['logo', 'branding', 'visual']
      }));
    }

    if (!settings.themeColor) {
      recommendations.push(this.createRecommendation({
        id: 'theme_color',
        type: 'settings',
        priority: 'high',
        category: 'Brand Identity',
        title: 'Set Brand Theme Color',
        description: 'Consistent colors improve brand recall and create visual harmony',
        actionText: 'Choose Colors',
        actionUrl: '/settings/brand/theme',
        benefits: ['Visual consistency', 'Brand recall', 'Professional design'],
        estimatedImpact: 7,
        estimatedEffort: 1,
        tags: ['color', 'theme', 'design']
      }));
    }

    // Custom domain for premium users
    if (['premium', 'enterprise'].includes(context.plan) && !settings.customDomain) {
      recommendations.push(this.createRecommendation({
        id: 'custom_domain',
        type: 'settings',
        priority: 'medium',
        category: 'Professional Branding',
        title: 'Set Up Custom Domain',
        description: 'Custom domains increase trust and provide professional brand presence',
        actionText: 'Configure Domain',
        actionUrl: '/settings/domain',
        benefits: ['Professional URLs', 'Increased trust', 'SEO benefits'],
        estimatedImpact: 7,
        estimatedEffort: 6,
        requiresPlan: ['premium', 'enterprise'],
        tags: ['domain', 'professional', 'seo']
      }));
    }

    if (!settings.subdomain) {
      recommendations.push(this.createRecommendation({
        id: 'subdomain_setup',
        type: 'settings',
        priority: 'medium',
        category: 'Brand Presence',
        title: 'Configure Custom Subdomain',
        description: 'Get a branded URL for your public profile page',
        actionText: 'Set Subdomain',
        actionUrl: '/settings/subdomain',
        benefits: ['Branded URLs', 'Easy sharing', 'Professional presence'],
        estimatedImpact: 6,
        estimatedEffort: 2,
        tags: ['subdomain', 'url', 'sharing']
      }));
    }

    return recommendations;
  }

  /**
   * Generate integration recommendations
   */
  private async generateIntegrationRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const settings = context.settingsData;

    if (!['growth', 'premium', 'enterprise'].includes(context.plan)) {
      return recommendations;
    }

    // Shopify integration
    if (!settings?.shopifyDomain) {
      recommendations.push(this.createRecommendation({
        id: 'shopify_integration',
        type: 'integration',
        priority: 'medium',
        category: 'E-commerce',
        title: 'Connect Shopify Store',
        description: 'Sync products and enable seamless e-commerce integration',
        actionText: 'Connect Shopify',
        actionUrl: '/integrations/shopify',
        benefits: ['Product sync', 'Order management', 'Inventory tracking'],
        estimatedImpact: 8,
        estimatedEffort: 5,
        requiresPlan: ['growth', 'premium', 'enterprise'],
        tags: ['shopify', 'ecommerce', 'sync']
      }));
    }

    // WooCommerce integration
    if (!settings?.wooDomain) {
      recommendations.push(this.createRecommendation({
        id: 'woocommerce_integration',
        type: 'integration',
        priority: 'medium',
        category: 'E-commerce',
        title: 'Connect WooCommerce Store',
        description: 'Integrate with WordPress-based e-commerce platform',
        actionText: 'Connect WooCommerce',
        actionUrl: '/integrations/woocommerce',
        benefits: ['WordPress integration', 'Flexible customization', 'Plugin ecosystem'],
        estimatedImpact: 7,
        estimatedEffort: 5,
        requiresPlan: ['growth', 'premium', 'enterprise'],
        tags: ['woocommerce', 'wordpress', 'ecommerce']
      }));
    }

    // API setup for enterprise
    if (context.plan === 'enterprise') {
      recommendations.push(this.createRecommendation({
        id: 'api_setup',
        type: 'integration',
        priority: 'low',
        category: 'Developer Tools',
        title: 'Set Up API Access',
        description: 'Configure API keys for custom integrations and automation',
        actionText: 'Generate API Keys',
        actionUrl: '/settings/api',
        benefits: ['Custom integrations', 'Automation capabilities', 'Developer flexibility'],
        estimatedImpact: 6,
        estimatedEffort: 3,
        requiresPlan: ['enterprise'],
        tags: ['api', 'developer', 'automation']
      }));
    }

    return recommendations;
  }

  /**
   * Generate partnership recommendations
   */
  private async generatePartnershipRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Find potential partners in same industry
      const potentialPartners = await Business.find({
        _id: { $ne: context.businessId },
        industry: context.industry,
        isActive: true,
        isEmailVerified: true
      }).limit(5);

      if (potentialPartners.length > 0) {
        recommendations.push(this.createRecommendation({
          id: 'industry_partnerships',
          type: 'partnership',
          priority: 'medium',
          category: 'Networking',
          title: 'Explore Industry Partnerships',
          description: `Found ${potentialPartners.length} potential partners in ${context.industry}`,
          actionText: 'View Partners',
          actionUrl: '/partnerships/discover',
          benefits: ['Business growth', 'Market expansion', 'Shared resources'],
          estimatedImpact: 7,
          estimatedEffort: 6,
          tags: ['partnership', 'networking', 'growth'],
          metadata: { partnerCount: potentialPartners.length }
        }));
      }

      // Cross-industry partnerships
      const crossIndustryPartners = await Business.find({
        _id: { $ne: context.businessId },
        industry: { $ne: context.industry },
        isActive: true,
        isEmailVerified: true
      }).limit(3);

      if (crossIndustryPartners.length > 0) {
        recommendations.push(this.createRecommendation({
          id: 'cross_industry_partnerships',
          type: 'partnership',
          priority: 'low',
          category: 'Innovation',
          title: 'Cross-Industry Collaborations',
          description: 'Explore innovative partnerships outside your industry',
          actionText: 'Explore Options',
          actionUrl: '/partnerships/cross-industry',
          benefits: ['Innovation opportunities', 'New markets', 'Creative solutions'],
          estimatedImpact: 6,
          estimatedEffort: 7,
          tags: ['innovation', 'cross-industry', 'creativity']
        }));
      }
    } catch (error) {
      logger.warn('Error generating partnership recommendations:', error);
    }

    return recommendations;
  }

  /**
   * Generate feature recommendations based on plan
   */
  private async generateFeatureRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Plan upgrade recommendations
    if (context.plan === 'foundation') {
      recommendations.push(this.createRecommendation({
        id: 'upgrade_growth',
        type: 'feature',
        priority: 'medium',
        category: 'Plan Upgrade',
        title: 'Upgrade to Growth Plan',
        description: 'Unlock integrations, analytics, and enhanced branding features',
        actionText: 'View Plans',
        actionUrl: '/billing/plans',
        benefits: ['E-commerce integrations', 'Analytics dashboard', 'Priority support'],
        estimatedImpact: 8,
        estimatedEffort: 1,
        tags: ['upgrade', 'features', 'growth']
      }));
    } else if (context.plan === 'growth') {
      recommendations.push(this.createRecommendation({
        id: 'upgrade_premium',
        type: 'feature',
        priority: 'low',
        category: 'Plan Upgrade',
        title: 'Upgrade to Premium',
        description: 'Access Web3 features, custom domains, and advanced analytics',
        actionText: 'View Premium',
        actionUrl: '/billing/plans',
        benefits: ['Web3 features', 'Custom domains', 'Advanced analytics'],
        estimatedImpact: 7,
        estimatedEffort: 1,
        tags: ['upgrade', 'premium', 'web3']
      }));
    }

    // Feature adoption based on current plan
    if (['premium', 'enterprise'].includes(context.plan)) {
      recommendations.push(this.createRecommendation({
        id: 'nft_features',
        type: 'feature',
        priority: 'low',
        category: 'Web3',
        title: 'Explore NFT Capabilities',
        description: 'Create and manage NFTs for your brand and products',
        actionText: 'Learn More',
        actionUrl: '/features/nft',
        benefits: ['Digital ownership', 'Brand uniqueness', 'New revenue streams'],
        estimatedImpact: 5,
        estimatedEffort: 8,
        requiresPlan: ['premium', 'enterprise'],
        tags: ['nft', 'web3', 'innovation']
      }));
    }

    return recommendations;
  }

  /**
   * Generate security recommendations
   */
  private async generateSecurityRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Email verification
    if (context.verificationStatus !== 'fully_verified') {
      recommendations.push(this.createRecommendation({
        id: 'email_verification',
        type: 'security',
        priority: 'high',
        category: 'Account Security',
        title: 'Complete Email Verification',
        description: 'Verify your email to secure your account and enable all features',
        actionText: 'Verify Email',
        actionUrl: '/verify/email',
        benefits: ['Account security', 'Feature access', 'Trust building'],
        estimatedImpact: 9,
        estimatedEffort: 1,
        tags: ['security', 'verification', 'email']
      }));
    }

    // Business verification for higher plans
    if (['premium', 'enterprise'].includes(context.plan) && context.verificationStatus !== 'business_verified') {
      recommendations.push(this.createRecommendation({
        id: 'business_verification',
        type: 'security',
        priority: 'medium',
        category: 'Business Verification',
        title: 'Verify Business Documents',
        description: 'Complete business verification to unlock premium features',
        actionText: 'Submit Documents',
        actionUrl: '/verify/business',
        benefits: ['Premium features', 'Enhanced trust', 'Partnership eligibility'],
        estimatedImpact: 7,
        estimatedEffort: 5,
        requiresPlan: ['premium', 'enterprise'],
        tags: ['verification', 'business', 'trust']
      }));
    }

    return recommendations;
  }

  /**
   * Generate growth-focused recommendations
   */
  private async generateGrowthRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Analytics setup
    recommendations.push(this.createRecommendation({
      id: 'analytics_review',
      type: 'growth',
      priority: 'low',
      category: 'Analytics',
      title: 'Review Analytics Dashboard',
      description: 'Analyze your profile performance and optimize for better results',
      actionText: 'View Analytics',
      actionUrl: '/analytics',
      benefits: ['Performance insights', 'Optimization opportunities', 'Data-driven decisions'],
      estimatedImpact: 6,
      estimatedEffort: 2,
      tags: ['analytics', 'performance', 'optimization']
    }));

    // Content optimization
    if (context.completeness && context.completeness > 70) {
      recommendations.push(this.createRecommendation({
        id: 'content_optimization',
        type: 'growth',
        priority: 'low',
        category: 'Content',
        title: 'Optimize Profile Content',
        description: 'Enhance your profile content for better search visibility',
        actionText: 'Optimize Content',
        actionUrl: '/profile/optimize',
        benefits: ['Better discovery', 'SEO improvement', 'Increased visibility'],
        estimatedImpact: 5,
        estimatedEffort: 4,
        tags: ['seo', 'content', 'visibility']
      }));
    }

    return recommendations;
  }

  // ===== Utility Methods =====

  /**
   * Create a recommendation object with defaults
   */
  private createRecommendation(params: Partial<Recommendation> & {
    id: string;
    type: Recommendation['type'];
    priority: Recommendation['priority'];
    category: string;
    title: string;
    description: string;
    actionText: string;
  }): Recommendation {
    return {
      benefits: [],
      estimatedImpact: 5,
      estimatedEffort: 3,
      tags: [],
      createdAt: new Date(),
      ...params
    } as Recommendation;
  }

  /**
   * Calculate verification status
   */
  private calculateVerificationStatus(business: any, brandSettings: any): string {
    const emailVerified = business.isEmailVerified;
    const businessVerified = brandSettings?.businessVerified || false;
    const walletVerified = brandSettings?.web3Settings?.walletVerified || false;

    if (emailVerified && businessVerified && walletVerified) return 'fully_verified';
    if (emailVerified && businessVerified) return 'business_verified';
    if (emailVerified) return 'email_verified';
    return 'unverified';
  }

  /**
   * Filter recommendations by minimum priority
   */
  private filterByMinPriority(recommendations: Recommendation[], minPriority: string): Recommendation[] {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const minLevel = priorityOrder[minPriority as keyof typeof priorityOrder] || 1;

    return recommendations.filter(rec =>
      priorityOrder[rec.priority] >= minLevel
    );
  }

  /**
   * Score and sort recommendations based on context
   */
  private scoreAndSortRecommendations(
    recommendations: Recommendation[],
    context: RecommendationContext
  ): Recommendation[] {
    return recommendations
      .map(rec => ({
        ...rec,
        relevanceScore: this.calculateRelevanceScore(rec, context)
      }))
      .sort((a, b) => {
        // First sort by priority
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Then by relevance score
        return (b as any).relevanceScore - (a as any).relevanceScore;
      });
  }

  /**
   * Calculate relevance score for a recommendation
   */
  private calculateRelevanceScore(rec: Recommendation, context: RecommendationContext): number {
    let score = rec.estimatedImpact;

    // Boost score for plan-appropriate recommendations
    if (rec.requiresPlan && rec.requiresPlan.includes(context.plan)) {
      score += 2;
    }

    // Reduce score for effort
    score -= (rec.estimatedEffort * 0.1);

    // Boost score for critical category recommendations
    if (rec.category === 'Basic Setup' || rec.category === 'Initial Setup') {
      score += 1;
    }

    return Math.max(0, score);
  }

  /**
   * Calculate personalization score
   */
  private calculatePersonalizationScore(
    recommendations: Recommendation[],
    context: RecommendationContext
  ): number {
    if (recommendations.length === 0) return 0;

    const relevantCount = recommendations.filter(rec =>
      !rec.requiresPlan || rec.requiresPlan.includes(context.plan)
    ).length;

    return Math.round((relevantCount / recommendations.length) * 100);
  }

  /**
   * Create recommendation filters
   */
  private createRecommendationFilters(recommendations: Recommendation[]) {
    const byType: { [key: string]: Recommendation[] } = {};
    const byPriority: { [key: string]: Recommendation[] } = {};
    const byCategory: { [key: string]: Recommendation[] } = {};

    recommendations.forEach(rec => {
      // By type
      if (!byType[rec.type]) byType[rec.type] = [];
      byType[rec.type].push(rec);

      // By priority
      if (!byPriority[rec.priority]) byPriority[rec.priority] = [];
      byPriority[rec.priority].push(rec);

      // By category
      if (!byCategory[rec.category]) byCategory[rec.category] = [];
      byCategory[rec.category].push(rec);
    });

    return { byType, byPriority, byCategory };
  }

  /**
   * Create recommendation summary
   */
  private createRecommendationSummary(recommendations: Recommendation[]) {
    const total = recommendations.length;
    const highPriority = recommendations.filter(rec =>
      rec.priority === 'high' || rec.priority === 'critical'
    ).length;

    const quickWins = recommendations.filter(rec =>
      rec.estimatedImpact >= 7 && rec.estimatedEffort <= 3
    ).length;

    const majorImprovements = recommendations.filter(rec =>
      rec.estimatedImpact >= 8 && rec.estimatedEffort >= 6
    ).length;

    return {
      total,
      highPriority,
      quickWins,
      majorImprovements
    };
  }

  /**
   * Get default recommendation set for error cases
   */
  private getDefaultRecommendationSet(context: RecommendationContext): RecommendationSet {
    return {
      recommendations: [],
      personalizedScore: 0,
      context,
      generatedAt: new Date(),
      filters: {
        byType: {},
        byPriority: {},
        byCategory: {}
      },
      summary: {
        total: 0,
        highPriority: 0,
        quickWins: 0,
        majorImprovements: 0
      }
    };
  }

  // ===== Legacy Support Methods =====

  /**
   * Get simple recommendations (legacy support)
   */
  async getPersonalizedRecommendations(
    businessId: string,
    options?: { type?: string; limit?: number }
  ): Promise<any[]> {
    try {
      const context: RecommendationContext = {
        businessId,
        plan: 'foundation' // Default plan
      };

      const recommendationSet = await this.generatePersonalizedRecommendations(context, {
        limit: options?.limit || 10,
        types: options?.type ? [options.type] : undefined
      });

      return recommendationSet.recommendations.map(rec => ({
        id: rec.id,
        type: rec.type,
        title: rec.title,
        priority: rec.priority
      }));
    } catch (error) {
      logger.error('Error getting simple recommendations:', error);
      return [];
    }
  }

  /**
   * Generate improvement recommendations (legacy support)
   */
  generateImprovementRecommendations(profile: any): string[] {
    const recommendations = [
      'Great job improving your profile!',
      'Consider adding more certifications',
      'Keep your information up to date',
      'Engage with the manufacturer community'
    ];

    if (!profile.profilePictureUrl) {
      recommendations.unshift('Add a professional profile picture');
    }

    if (!profile.description) {
      recommendations.unshift('Add a compelling business description');
    }

    return recommendations.slice(0, 5);
  }
}

export const recommendationEngineService = new RecommendationEngineService();
