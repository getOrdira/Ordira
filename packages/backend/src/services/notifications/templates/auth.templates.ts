import { TemplateContext, EmailVerificationTemplateContext, PasswordResetTemplateContext, WelcomeTemplateContext } from '../types/templateContext';
import { TemplateOutput } from './templateTypes';
import { NotificationCategory } from '../types/notificationCategory';
import { NotificationPriority } from '../types/notificationPriority';

export const authTemplates = {
  'auth.email_verification_code': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as EmailVerificationTemplateContext;
    
    return {
      email: {
        subject: 'Your Ordira Verification Code',
        text: `Your verification code is: ${context.code}\n\nThis code will expire in ${context.expiresIn} for security reasons.\n\nIf you didn't request this code, please ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">Verification Code</h2>
            <p>Your verification code is:</p>
            <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
              ${context.code}
            </div>
            <p style="color: #666; font-size: 14px;">
              This code will expire in ${context.expiresIn} for security reasons.<br>
              If you didn't request this code, please ignore this email.
            </p>
          </div>
        `
      },
      inApp: {
        message: `Verification code sent to ${context.email}`,
      },
      metadata: { 
        category: NotificationCategory.Auth, 
        priority: NotificationPriority.High 
      },
    };
  },

  'auth.password_reset_link': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as PasswordResetTemplateContext;
    
    return {
      email: {
        subject: 'Reset Your Ordira Password',
        text: `You requested a password reset for your Ordira account.\n\nClick the link below to reset your password:\n${context.resetUrl}\n\nThis link will expire in ${context.expiresIn}.\n\nIf you didn't request this reset, please ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">Password Reset</h2>
            <p>You requested a password reset for your Ordira account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${context.resetUrl}" style="background: #FF6900; color: black; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              This link will expire in ${context.expiresIn} for security reasons.<br>
              If you didn't request this reset, please ignore this email and your password will remain unchanged.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${context.resetUrl}" style="color: #FF6900;">${context.resetUrl}</a>
            </p>
          </div>
        `
      },
      inApp: {
        message: 'Password reset link sent to your email',
      },
      metadata: { 
        category: NotificationCategory.Auth, 
        priority: NotificationPriority.High 
      },
    };
  },

  'auth.welcome_email': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as WelcomeTemplateContext;
    
    const platformName = context.userType === 'brand' ? 'brand dashboard' : 
                         context.userType === 'manufacturer' ? 'manufacturer portal' : 
                         'customer portal';
    const features = context.userType === 'brand' 
      ? ['Create voting campaigns', 'Connect with manufacturers', 'Track customer engagement', 'Generate NFT certificates', 'Web3 wallet integration (Premium)']
      : context.userType === 'manufacturer'
      ? ['Connect with brands', 'Access voting analytics', 'View partnership opportunities', 'Track performance']
      : ['Vote on product proposals', 'Follow your favorite brands', 'Discover new products', 'Influence production decisions'];

    return {
      email: {
        subject: `Welcome to Ordira, ${context.name}!`,
        text: `Welcome to Ordira, ${context.name}!\n\nYour ${context.userType} account has been created successfully. You can now access your ${platformName} and start connecting with partners.\n\nGet started with:\n${features.map(f => `• ${f}`).join('\n')}\n\nBest regards,\nThe Ordira Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">Welcome to Ordira, ${context.name}!</h2>
            <p>Your ${context.userType} account has been created successfully. You can now access your ${platformName} and start connecting with partners.</p>
            <h3 style="color: #555;">Get started with:</h3>
            <ul style="color: #666;">
              ${features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${context.dashboardUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Access Your Dashboard</a>
            </div>
            <p style="color: #666; font-size: 14px;">
              Best regards,<br>
              The Ordira Team
            </p>
          </div>
        `
      },
      inApp: {
        message: `Welcome to Ordira! Your ${context.userType} account is ready.`,
        actionUrl: context.dashboardUrl,
      },
      metadata: { 
        category: NotificationCategory.Auth, 
        priority: NotificationPriority.Medium 
      },
    };
  },
};
