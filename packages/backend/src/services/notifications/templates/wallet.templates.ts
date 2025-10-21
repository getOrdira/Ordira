import { TemplateContext, TransferNotificationTemplateContext, TransferFailureTemplateContext, WalletChangeTemplateContext } from '../types/templateContext';
import { TemplateOutput } from './templateTypes';
import { NotificationCategory } from '../types/notificationCategory';
import { NotificationPriority } from '../types/notificationPriority';

export const walletTemplates = {
  'certificate.transferred': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as unknown as TransferNotificationTemplateContext;
    const formattedWallet = `${context.brandWallet.slice(0, 6)}...${context.brandWallet.slice(-4)}`;
    const gasUsed = context.gasUsed ? `${(parseFloat(context.gasUsed) / 1e18).toFixed(6)} ETH` : 'N/A';
    
    return {
      email: {
        subject: `NFT Certificate ${context.tokenId} Transferred Successfully`,
        text: `Great news! Your NFT certificate has been successfully transferred to your wallet.\n\nDetails:\n• Token ID: ${context.tokenId}\n• Your Wallet: ${formattedWallet}\n• Transaction Hash: ${context.txHash}\n• Gas Used: ${gasUsed}\n\nThe certificate is now in your wallet and you have full ownership. You can view it on blockchain explorers or in your Web3 wallet.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745; text-align: center;">🎉 Transfer Successful!</h2>
            <p>Great news! Your NFT certificate has been successfully transferred to your wallet.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">Transfer Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Token ID:</td>
                  <td style="padding: 8px 0; color: #333;">${context.tokenId}</td>
                </tr>
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Your Wallet:</td>
                  <td style="padding: 8px 0; color: #333; font-family: monospace;">${formattedWallet}</td>
                </tr>
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Gas Used:</td>
                  <td style="padding: 8px 0; color: #333;">${gasUsed}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Transaction:</td>
                  <td style="padding: 8px 0;">
                    <a href="https://basescan.io/tx/${context.txHash}" style="color: #007bff; text-decoration: none;">View on Basescan</a>
                  </td>
                </tr>
              </table>
            </div>
            
            <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #0c5460;">
                <strong>✅ Ownership Confirmed:</strong> The certificate is now in your wallet and you have full ownership.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/certificates" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-right: 10px;">View Certificate</a>
              <a href="https://basescan.io/tx/${context.txHash}" style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Transaction</a>
            </div>
          </div>
        `
      },
      inApp: {
        message: `NFT certificate ${context.tokenId} successfully transferred to your wallet`,
        actionUrl: `${process.env.FRONTEND_URL}/certificates`,
      },
      metadata: { 
        category: NotificationCategory.Wallet, 
        priority: NotificationPriority.Medium 
      },
    };
  },

  'certificate.transfer_failed': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as unknown as TransferFailureTemplateContext;
    const isLastAttempt = context.attemptNumber >= context.maxAttempts;
    const urgencyColor = isLastAttempt ? '#dc3545' : '#fd7e14';
    const urgencyIcon = isLastAttempt ? '🚨' : '⚠️';
    
    return {
      email: {
        subject: `${urgencyIcon} NFT Transfer ${isLastAttempt ? 'Failed' : 'Retry'} - Certificate ${context.tokenId}`,
        text: `${isLastAttempt ? 'URGENT: ' : ''}NFT certificate transfer ${isLastAttempt ? 'failed permanently' : 'encountered an issue'}.\n\nDetails:\n• Token ID: ${context.tokenId}\n• Attempt: ${context.attemptNumber}/${context.maxAttempts}\n• Error: ${context.error}\n\n${isLastAttempt ? 'Please contact support for manual transfer.' : `Next retry: ${context.nextRetryAt ? new Date(context.nextRetryAt).toLocaleString() : 'Not scheduled'}`}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${urgencyColor}; text-align: center;">${urgencyIcon} Transfer ${isLastAttempt ? 'Failed' : 'Issue'}</h2>
            <p>${isLastAttempt ? 'URGENT: ' : ''}NFT certificate transfer ${isLastAttempt ? 'failed permanently' : 'encountered an issue'}.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">Transfer Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Token ID:</td>
                  <td style="padding: 8px 0; color: #333;">${context.tokenId}</td>
                </tr>
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Attempt:</td>
                  <td style="padding: 8px 0; color: #333;">${context.attemptNumber} of ${context.maxAttempts}</td>
                </tr>
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Error:</td>
                  <td style="padding: 8px 0; color: #dc3545; word-break: break-word;">${context.error}</td>
                </tr>
                ${context.nextRetryAt && !isLastAttempt ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Next Retry:</td>
                  <td style="padding: 8px 0; color: #333;">${new Date(context.nextRetryAt).toLocaleString()}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            ${isLastAttempt ? `
              <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #721c24;">
                  <strong>⚠️ Action Required:</strong> All automatic retry attempts have been exhausted. Your certificate is still secure in our relayer wallet, but manual intervention is needed to complete the transfer.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/support" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Contact Support</a>
              </div>
            ` : `
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                  <strong>🔄 Automatic Retry:</strong> We'll automatically retry the transfer. Your certificate remains secure in our system.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/certificates" style="background: #fd7e14; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Status</a>
              </div>
            `}
          </div>
        `
      },
      inApp: {
        message: `NFT certificate ${context.tokenId} transfer failed (attempt ${context.attemptNumber}/${context.maxAttempts})`,
        actionUrl: `${process.env.FRONTEND_URL}/certificates`,
      },
      metadata: { 
        category: NotificationCategory.Wallet, 
        priority: isLastAttempt ? NotificationPriority.Urgent : NotificationPriority.High 
      },
    };
  },

  'certificate.transfer_retry': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as unknown as TransferFailureTemplateContext;
    
    return {
      email: {
        subject: `Retrying NFT Transfer - Certificate ${context.tokenId}`,
        text: `We're retrying the transfer of your NFT certificate.\n\nDetails:\n• Token ID: ${context.tokenId}\n• Retry Attempt: ${context.attemptNumber}/${context.maxAttempts}\n• Previous Error: ${context.error}\n\nWe'll notify you when the transfer completes or if further action is needed.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #fd7e14; text-align: center;">🔄 Transfer Retry in Progress</h2>
            <p>We're retrying the transfer of your NFT certificate.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">Retry Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Token ID:</td>
                  <td style="padding: 8px 0; color: #333;">${context.tokenId}</td>
                </tr>
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Retry Attempt:</td>
                  <td style="padding: 8px 0; color: #333;">${context.attemptNumber} of ${context.maxAttempts}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Previous Error:</td>
                  <td style="padding: 8px 0; color: #dc3545; word-break: break-word;">${context.error}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: #cce5ff; border: 1px solid #99d3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #004085;">
                <strong>🔄 In Progress:</strong> We'll notify you when the transfer completes or if further action is needed.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/certificates" style="background: #fd7e14; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Monitor Progress</a>
            </div>
          </div>
        `
      },
      inApp: {
        message: `Retrying NFT certificate ${context.tokenId} transfer (attempt ${context.attemptNumber}/${context.maxAttempts})`,
        actionUrl: `${process.env.FRONTEND_URL}/certificates`,
      },
      metadata: { 
        category: NotificationCategory.Wallet, 
        priority: NotificationPriority.Medium 
      },
    };
  },

  'wallet.connected': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as unknown as WalletChangeTemplateContext;
    const formattedWallet = `${context.newWallet.slice(0, 6)}...${context.newWallet.slice(-4)}`;
    const statusColor = context.verificationStatus === 'verified' ? '#28a745' : 
                       context.verificationStatus === 'failed' ? '#dc3545' : '#fd7e14';
    const statusText = context.verificationStatus === 'verified' ? 'Verified ✅' : 
                      context.verificationStatus === 'failed' ? 'Failed ❌' : 'Pending ⏳';

    return {
      email: {
        subject: `Web3 Wallet Connected Successfully`,
        text: `Your Web3 wallet has been connected successfully.\n\nDetails:\n• Wallet: ${formattedWallet}\n• Status: ${statusText}\n• Date: ${context.changeDate.toLocaleString()}\n\n${context.verificationStatus === 'verified' ? 'Your NFT certificates will now be automatically transferred to this wallet.' : 'Wallet verification is required before automatic transfers can begin.'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">🔐 Wallet Connected</h2>
            <p>Your Web3 wallet has been connected successfully.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">Wallet Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Wallet:</td>
                  <td style="padding: 8px 0; color: #333; font-family: monospace;">${formattedWallet}</td>
                </tr>
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Status:</td>
                  <td style="padding: 8px 0; color: ${statusColor}; font-weight: bold;">${statusText}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Date:</td>
                  <td style="padding: 8px 0; color: #333;">${context.changeDate.toLocaleString()}</td>
                </tr>
              </table>
            </div>
            
            ${context.verificationStatus === 'verified' ? `
              <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #155724;">
                  <strong>🎉 Ready for Auto-Transfers:</strong> Your NFT certificates will now be automatically transferred to this wallet.
                </p>
              </div>
            ` : `
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                  <strong>⏳ Verification Required:</strong> Wallet verification is needed before automatic transfers can begin.
                </p>
              </div>
            `}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/settings/web3" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Web3 Settings</a>
              <a href="${process.env.FRONTEND_URL}/certificates" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Certificates</a>
            </div>
            
            <div style="background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #495057;">Security Note</h4>
              <p style="margin: 0; color: #6c757d; font-size: 14px;">
                If you didn't make this change, please contact our support team immediately. Always keep your wallet private keys secure and never share them with anyone.
              </p>
            </div>
          </div>
        `
      },
      inApp: {
        message: `Web3 wallet connected successfully`,
        actionUrl: `${process.env.FRONTEND_URL}/settings/web3`,
      },
      metadata: { 
        category: NotificationCategory.Wallet, 
        priority: NotificationPriority.High 
      },
    };
  },

  'wallet.changed': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as unknown as WalletChangeTemplateContext;
    const formattedNewWallet = `${context.newWallet.slice(0, 6)}...${context.newWallet.slice(-4)}`;
    const formattedPrevWallet = context.previousWallet ? `${context.previousWallet.slice(0, 6)}...${context.previousWallet.slice(-4)}` : null;
    const statusColor = context.verificationStatus === 'verified' ? '#28a745' : 
                       context.verificationStatus === 'failed' ? '#dc3545' : '#fd7e14';
    const statusText = context.verificationStatus === 'verified' ? 'Verified ✅' : 
                      context.verificationStatus === 'failed' ? 'Failed ❌' : 'Pending ⏳';

    return {
      email: {
        subject: `Web3 Wallet Updated Successfully`,
        text: `Your Web3 wallet has been updated successfully.\n\nDetails:\n${formattedPrevWallet ? `• Previous Wallet: ${formattedPrevWallet}\n` : ''}• New Wallet: ${formattedNewWallet}\n• Status: ${statusText}\n• Date: ${context.changeDate.toLocaleString()}\n\n${context.verificationStatus === 'verified' ? 'Your NFT certificates will now be automatically transferred to this wallet.' : 'Wallet verification is required before automatic transfers can begin.'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">🔐 Wallet Updated</h2>
            <p>Your Web3 wallet has been updated successfully.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">Wallet Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                ${formattedPrevWallet ? `
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Previous Wallet:</td>
                  <td style="padding: 8px 0; color: #6c757d; font-family: monospace;">${formattedPrevWallet}</td>
                </tr>
                ` : ''}
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">New Wallet:</td>
                  <td style="padding: 8px 0; color: #333; font-family: monospace;">${formattedNewWallet}</td>
                </tr>
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Status:</td>
                  <td style="padding: 8px 0; color: ${statusColor}; font-weight: bold;">${statusText}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Date:</td>
                  <td style="padding: 8px 0; color: #333;">${context.changeDate.toLocaleString()}</td>
                </tr>
              </table>
            </div>
            
            ${context.verificationStatus === 'verified' ? `
              <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #155724;">
                  <strong>🎉 Ready for Auto-Transfers:</strong> Your NFT certificates will now be automatically transferred to this wallet.
                </p>
              </div>
            ` : `
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                  <strong>⏳ Verification Required:</strong> Wallet verification is needed before automatic transfers can begin.
                </p>
              </div>
            `}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/settings/web3" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Web3 Settings</a>
              <a href="${process.env.FRONTEND_URL}/certificates" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Certificates</a>
            </div>
            
            <div style="background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #495057;">Security Note</h4>
              <p style="margin: 0; color: #6c757d; font-size: 14px;">
                If you didn't make this change, please contact our support team immediately. Always keep your wallet private keys secure and never share them with anyone.
              </p>
            </div>
          </div>
        `
      },
      inApp: {
        message: `Web3 wallet updated successfully`,
        actionUrl: `${process.env.FRONTEND_URL}/settings/web3`,
      },
      metadata: { 
        category: NotificationCategory.Wallet, 
        priority: NotificationPriority.High 
      },
    };
  },
};
