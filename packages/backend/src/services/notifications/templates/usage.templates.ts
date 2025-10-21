import { TemplateContext, UsageLimitTemplateContext, PaymentFailureTemplateContext, PlanChangeTemplateContext, VerificationSubmissionTemplateContext, AccountDeactivationTemplateContext, ProfileChangeTemplateContext, AccessControlTemplateContext } from '../types/templateContext';
import { TemplateOutput } from './templateTypes';
import { NotificationCategory } from '../types/notificationCategory';
import { NotificationPriority } from '../types/notificationPriority';

export const usageTemplates = {
  'usage.limit_warning': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as unknown as UsageLimitTemplateContext;
    const urgencyLevel = context.percentage >= 90 ? 'urgent' : context.percentage >= 80 ? 'important' : 'notice';
    const urgencyColor = context.percentage >= 90 ? '#dc3545' : context.percentage >= 80 ? '#fd7e14' : '#ffc107';
    
    return {
      email: {
        subject: `${context.limitType.charAt(0).toUpperCase() + context.limitType.slice(1)} Usage Warning - ${context.percentage}% of Limit Reached`,
        text: `You've used ${context.usage} of ${context.limit} ${context.limitType} (${context.percentage}%).\n\n${context.percentage >= 90 ? 'URGENT: ' : ''}Consider upgrading your plan to avoid service interruption.\n\nUpgrade now to continue enjoying uninterrupted service.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${urgencyColor}; text-align: center;">Usage Warning ${context.percentage >= 90 ? '🚨' : '⚠️'}</h2>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">Current Usage</h3>
              <div style="background: #e9ecef; border-radius: 10px; padding: 3px;">
                <div style="background: ${urgencyColor}; height: 20px; width: ${context.percentage}%; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">
                  ${context.percentage}%
                </div>
              </div>
              <p style="margin: 10px 0 0 0; color: #666;">
                <strong>${context.usage}</strong> of <strong>${context.limit}</strong> ${context.limitType} used
              </p>
            </div>
            ${context.percentage >= 90 ? `
              <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #721c24;">
                  <strong>URGENT:</strong> You're approaching your limit. Service may be interrupted if you exceed your quota.
                </p>
              </div>
            ` : ''}
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/billing/upgrade" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Upgrade Plan</a>
            </div>
            <p style="color: #666; font-size: 14px;">
              Upgrade now to continue enjoying uninterrupted service.
            </p>
          </div>
        `
      },
      inApp: {
        message: `${context.limitType.charAt(0).toUpperCase() + context.limitType.slice(1)} usage warning: ${context.percentage}% of limit reached`,
        actionUrl: `${process.env.FRONTEND_URL}/billing/upgrade`,
      },
      metadata: { 
        category: NotificationCategory.Usage, 
        priority: context.percentage >= 90 ? NotificationPriority.Urgent : NotificationPriority.High 
      },
    };
  },

  'usage.limit_exceeded': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as unknown as UsageLimitTemplateContext;
    
    return {
      email: {
        subject: `${context.limitType.charAt(0).toUpperCase() + context.limitType.slice(1)} Limit Exceeded - Service Restricted`,
        text: `URGENT: You've exceeded your ${context.limitType} limit.\n\nCurrent Usage: ${context.usage}/${context.limit}\n\nYour service has been restricted. Please upgrade your plan immediately to restore full functionality.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545; text-align: center;">Service Restricted</h2>
            <p><strong>URGENT:</strong> You've exceeded your ${context.limitType} limit.</p>
            
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #721c24;">Current Usage</h3>
              <p style="margin: 0; color: #721c24;">
                <strong>${context.usage}</strong> of <strong>${context.limit}</strong> ${context.limitType} used
              </p>
            </div>
            
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #721c24;">
                <strong>Service Restricted:</strong> Your service has been restricted. Please upgrade your plan immediately to restore full functionality.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/billing/upgrade" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Upgrade Now</a>
            </div>
          </div>
        `
      },
      inApp: {
        message: `${context.limitType.charAt(0).toUpperCase() + context.limitType.slice(1)} limit exceeded - service restricted`,
        actionUrl: `${process.env.FRONTEND_URL}/billing/upgrade`,
      },
      metadata: { 
        category: NotificationCategory.Usage, 
        priority: NotificationPriority.Urgent 
      },
    };
  },

  'billing.payment_failed': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as unknown as PaymentFailureTemplateContext;
    const reasonText = context.reason ? ` Reason: ${context.reason}` : '';
    const retryInfo = context.nextRetryDate 
      ? `\n\nWe will automatically retry the payment on ${context.nextRetryDate.toLocaleDateString()}.`
      : '';
    
    return {
      email: {
        subject: `Payment Failed - Action Required${context.attemptCount && context.attemptCount > 1 ? ` (Attempt ${context.attemptCount})` : ''}`,
        text: `Your payment of ${context.amount} failed.${reasonText}${retryInfo}\n\nPlease update your payment method to ensure continued service.\n\nIf you need assistance, please contact our support team.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545; text-align: center;">Payment Failed</h2>
            <p>Your payment of <strong>${context.amount}</strong> failed.${reasonText}</p>
            ${context.nextRetryDate ? `
              <p style="color: #666;">We will automatically retry the payment on <strong>${context.nextRetryDate.toLocaleDateString()}</strong>.</p>
            ` : ''}
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>Action Required:</strong> Please update your payment method to ensure continued service.
              </p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/billing" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Update Payment Method</a>
            </div>
            <p style="color: #666; font-size: 14px;">
              If you need assistance, please contact our support team.
            </p>
          </div>
        `
      },
      inApp: {
        message: `Payment failed: ${context.amount}`,
        actionUrl: `${process.env.FRONTEND_URL}/billing`,
      },
      metadata: { 
        category: NotificationCategory.Billing, 
        priority: NotificationPriority.High 
      },
    };
  },

  'billing.plan_change': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as unknown as PlanChangeTemplateContext;
    
    return {
      email: {
        subject: `Plan Updated: Welcome to ${context.newPlan.charAt(0).toUpperCase() + context.newPlan.slice(1)}!`,
        text: `Your plan has been updated from ${context.oldPlan} to ${context.newPlan}.\n\nChange Type: ${context.changeType}\nEffective Date: ${context.effectiveDate}\n\nNew Features:\n${context.newFeatures.map(f => `• ${f}`).join('\n')}\n\nThank you for upgrading!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">Plan Updated: Welcome to ${context.newPlan.charAt(0).toUpperCase() + context.newPlan.slice(1)}!</h2>
            <p>Your plan has been updated from <strong>${context.oldPlan}</strong> to <strong>${context.newPlan}</strong>.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">Change Details</h3>
              <p style="margin: 0 0 10px 0;"><strong>Change Type:</strong> ${context.changeType}</p>
              <p style="margin: 0 0 10px 0;"><strong>Effective Date:</strong> ${context.effectiveDate}</p>
            </div>

            <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #155724;">New Features:</h3>
              <ul style="margin: 0; color: #155724;">
                ${context.newFeatures.map(feature => `<li>${feature}</li>`).join('')}
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Access Dashboard</a>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center;">
              Thank you for upgrading!
            </p>
          </div>
        `
      },
      inApp: {
        message: `Plan updated from ${context.oldPlan} to ${context.newPlan}`,
        actionUrl: `${process.env.FRONTEND_URL}/dashboard`,
      },
      metadata: { 
        category: NotificationCategory.Billing, 
        priority: NotificationPriority.Medium 
      },
    };
  },

  'account.verification_submitted': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as unknown as VerificationSubmissionTemplateContext;
    const typeLabels = {
      business: 'Business Verification',
      identity: 'Identity Verification', 
      wallet: 'Wallet Verification'
    };
    
    const typeLabel = typeLabels[context.verificationType as keyof typeof typeLabels] || 'Verification';
    const estimatedTime = context.estimatedReviewTime || '2-3 business days';
    const referenceId = context.referenceId || `VER_${Date.now()}`;

    return {
      email: {
        subject: `${typeLabel} Submitted Successfully`,
        text: `Your ${typeLabel.toLowerCase()} has been submitted successfully.\n\nReference ID: ${referenceId}\nEstimated Review Time: ${estimatedTime}\nDocuments Uploaded: ${context.documentsCount}\n\nWe'll email you once the review is complete. You can check the status anytime in your dashboard.\n\nThank you for your patience!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333; text-align: center;">${typeLabel} Submitted</h2>
            <p>Your <strong>${typeLabel.toLowerCase()}</strong> has been submitted successfully.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Reference ID:</strong> ${referenceId}</p>
              <p style="margin: 0 0 10px 0;"><strong>Estimated Review Time:</strong> ${estimatedTime}</p>
              <p style="margin: 0;"><strong>Documents Uploaded:</strong> ${context.documentsCount}</p>
            </div>

            <p>We'll email you once the review is complete. You can check the status anytime in your dashboard.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/account/verification" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Check Status</a>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center;">
              Thank you for your patience!
            </p>
          </div>
        `
      },
      inApp: {
        message: `${typeLabel} submitted successfully`,
        actionUrl: `${process.env.FRONTEND_URL}/account/verification`,
      },
      metadata: { 
        category: NotificationCategory.Account, 
        priority: NotificationPriority.Medium 
      },
    };
  },

  'account.deactivated': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as unknown as AccountDeactivationTemplateContext;
    const reactivationInfo = context.reactivationPossible 
      ? `Your account can be reactivated within ${context.dataRetentionPeriod || 30} days by contacting our support team.`
      : 'This deactivation is permanent and your data will be deleted.';

    return {
      email: {
        subject: 'Account Deactivated - We\'re Sorry to See You Go',
        text: `Dear ${context.businessName},\n\nYour account has been successfully deactivated as requested.\n\nDeactivation Details:\n• Date: ${context.deactivatedAt.toLocaleDateString()}\n• Reference: ${context.id}\n${context.reason ? `• Reason: ${context.reason}` : ''}\n\n${reactivationInfo}\n\nIf you have any questions, please contact our support team.\n\nThank you for being part of our community.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">Account Deactivated</h2>
            <p>Dear <strong>${context.businessName}</strong>,</p>
            
            <p>Your account has been successfully deactivated as requested.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #555;">Deactivation Details</h3>
              <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${context.deactivatedAt.toLocaleDateString()}</p>
              <p style="margin: 0 0 10px 0;"><strong>Reference:</strong> ${context.id}</p>
              ${context.reason ? `<p style="margin: 0;"><strong>Reason:</strong> ${context.reason}</p>` : ''}
            </div>

            <div style="background: ${context.reactivationPossible ? '#d4edda' : '#f8d7da'}; border: 1px solid ${context.reactivationPossible ? '#c3e6cb' : '#f5c6cb'}; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: ${context.reactivationPossible ? '#155724' : '#721c24'};">
                ${reactivationInfo}
              </p>
            </div>

            ${context.reactivationPossible ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@yourcompany.com'}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Contact Support</a>
              </div>
            ` : ''}
            
            <p style="color: #666; font-size: 14px;">
              If you have any questions, please contact our support team.<br>
              Thank you for being part of our community.
            </p>
          </div>
        `
      },
      inApp: {
        message: `Account deactivated successfully`,
      },
      metadata: { 
        category: NotificationCategory.Account, 
        priority: NotificationPriority.High 
      },
    };
  },

  'account.profile_updated': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as unknown as ProfileChangeTemplateContext;
    const fieldLabels: Record<string, string> = {
      businessName: 'Business Name',
      email: 'Email Address',
      walletAddress: 'Wallet Address', 
      contactEmail: 'Contact Email',
      industry: 'Industry'
    };

    const changedFieldsList = context.changedFields.map(field => fieldLabels[field] || field).join(', ');

    return {
      email: {
        subject: `Profile Updated - ${context.businessName}`,
        text: `Your profile has been updated.\n\nChanges Made:\n${context.changedFields.map(field => `• ${fieldLabels[field] || field}`).join('\n')}\n\nChange Date: ${context.changeDate}\nChanged By: ${context.changeSource}\n\n${context.securityRelevant ? 'This change affects your account security. If you didn\'t make this change, please contact support immediately.' : 'If you didn\'t make this change, please contact support.'}\n\nView your profile in the dashboard to see all details.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">Profile Updated</h2>
            <p>Hello <strong>${context.businessName}</strong>,</p>
            
            <p>Your profile has been updated with the following changes:</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #555;">Changes Made</h3>
              <ul style="margin: 0; padding-left: 20px;">
                ${context.changedFields.map(field => `<li>${fieldLabels[field] || field}</li>`).join('')}
              </ul>
              <p style="margin: 15px 0 0 0; font-size: 14px; color: #666;">
                <strong>Change Date:</strong> ${context.changeDate}<br>
                <strong>Changed By:</strong> ${context.changeSource}
              </p>
            </div>

            ${context.securityRelevant ? `
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                  <strong>Security Notice:</strong> This change affects your account security. If you didn't make this change, please contact support immediately.
                </p>
              </div>
            ` : `
              <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #0c5460;">
                  If you didn't make this change, please contact support.
                </p>
              </div>
            `}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/account/profile" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-right: 10px;">View Profile</a>
              <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@yourcompany.com'}" style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Contact Support</a>
            </div>
          </div>
        `
      },
      inApp: {
        message: `Profile updated: ${changedFieldsList}`,
        actionUrl: `${process.env.FRONTEND_URL}/account/profile`,
      },
      metadata: { 
        category: NotificationCategory.Account, 
        priority: context.securityRelevant ? NotificationPriority.High : NotificationPriority.Medium 
      },
    };
  },

  'account.access_revoked': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as unknown as AccessControlTemplateContext;
    const reasonText = context.reason || 'Access revoked by administrator';
    
    return {
      email: {
        subject: 'Access Revoked - Voting Platform',
        text: `Your access to our voting platform has been revoked.\n\nReason: ${reasonText}\nDate: ${context.date}\n\nIf you believe this was done in error, please contact our support team.\n\nBest regards,\nThe Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545; text-align: center;">Access Revoked</h2>
            <p>Your access to our voting platform has been revoked.</p>
            
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #721c24;">Revocation Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #f5c6cb;">
                  <td style="padding: 8px 0; font-weight: bold; color: #721c24;">Reason:</td>
                  <td style="padding: 8px 0; color: #721c24;">${reasonText}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #721c24;">Date:</td>
                  <td style="padding: 8px 0; color: #721c24;">${context.date}</td>
                </tr>
              </table>
            </div>

            <p>If you believe this was done in error, please contact our support team.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@yourcompany.com'}" style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Contact Support</a>
            </div>
            
            <p style="font-size: 14px; color: #666; text-align: center;">
              Best regards,<br>The Team
            </p>
          </div>
        `
      },
      inApp: {
        message: `Access revoked: ${reasonText}`,
      },
      metadata: { 
        category: NotificationCategory.Security, 
        priority: NotificationPriority.High 
      },
    };
  },

  'account.access_restored': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as unknown as AccessControlTemplateContext;
    
    return {
      email: {
        subject: 'Access Restored - Welcome Back!',
        text: `Great news! Your access to our voting platform has been restored.\n\nYou can now participate in product voting and access all platform features.\n\nDate Restored: ${context.date}\n\nThank you for being a valued customer!\n\nBest regards,\nThe Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745; text-align: center;">🎉 Access Restored - Welcome Back!</h2>
            <p>Great news! Your access to our voting platform has been restored.</p>
            
            <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #155724;">You Can Now:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #155724;">
                <li>Participate in product voting</li>
                <li>Access all platform features</li>
                <li>View your voting history</li>
                <li>Receive voting notifications</li>
              </ul>
            </div>

            <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #495057;">
                <strong>Date Restored:</strong> ${context.date}
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || '#'}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Start Voting</a>
              <a href="${process.env.FRONTEND_URL}/profile" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Profile</a>
            </div>
            
            <p style="font-size: 16px; text-align: center; color: #28a745; font-weight: bold;">
              Thank you for being a valued customer!
            </p>
            
            <p style="font-size: 14px; color: #666; text-align: center;">
              Best regards,<br>The Team
            </p>
          </div>
        `
      },
      inApp: {
        message: `Access restored - welcome back!`,
        actionUrl: `${process.env.FRONTEND_URL}`,
      },
      metadata: { 
        category: NotificationCategory.Security, 
        priority: NotificationPriority.Medium 
      },
    };
  },
};
