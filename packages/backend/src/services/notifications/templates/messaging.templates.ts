import { TemplateContext, MessageTemplateContext, VotingTemplateContext, ContractDeploymentTemplateContext } from '../types/templateContext';
import { TemplateOutput } from './templateTypes';
import { NotificationCategory } from '../types/notificationCategory';
import { NotificationPriority } from '../types/notificationPriority';

export const messagingTemplates = {
  'message.received': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as unknown as MessageTemplateContext;
    const preview = context.messagePreview ? `\n\nMessage preview: "${context.messagePreview.substring(0, 100)}${context.messagePreview.length > 100 ? '...' : ''}"` : '';
    
    return {
      email: {
        subject: `New Message from ${context.senderName}`,
        text: `You have a new message from ${context.senderName} on Ordira.${preview}\n\nLog in to read the full message and reply.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">New Message 💬</h2>
            <p>You have a new message from <strong>${context.senderName}</strong> on Ordira.</p>
            ${context.messagePreview ? `
              <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
                <p style="margin: 0; color: #666; font-style: italic;">
                  "${context.messagePreview.substring(0, 100)}${context.messagePreview.length > 100 ? '...' : ''}"
                </p>
              </div>
            ` : ''}
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/messages" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Read & Reply</a>
            </div>
          </div>
        `
      },
      inApp: {
        message: `New message from ${context.senderName}`,
        actionUrl: `${process.env.FRONTEND_URL}/messages`,
      },
      metadata: { 
        category: NotificationCategory.Messaging, 
        priority: NotificationPriority.Medium 
      },
    };
  },

  'vote.received': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as unknown as VotingTemplateContext;
    const voteInfo = context.voteType ? `\n\nVote Details:\n• Vote Type: ${context.voteType}\n• Total Votes: ${context.totalVotes}\n• Unique Voters: ${context.voterCount}` : '';
    
    return {
      email: {
        subject: `New Vote Received - Proposal ${context.proposalId}`,
        text: `A customer just cast a vote on proposal ${context.proposalId}.${voteInfo}\n\nCheck your dashboard for detailed analytics and insights.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">New Vote Received 📊</h2>
            <p>A customer just cast a vote on proposal <strong>${context.proposalId}</strong>.</p>
            ${context.voteType ? `
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #555;">Vote Details:</h4>
                <ul style="margin: 0; color: #666;">
                  <li>Vote Type: <strong>${context.voteType}</strong></li>
                  <li>Total Votes: <strong>${context.totalVotes}</strong></li>
                  <li>Unique Voters: <strong>${context.voterCount}</strong></li>
                </ul>
              </div>
            ` : ''}
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/analytics" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Analytics</a>
            </div>
          </div>
        `
      },
      inApp: {
        message: `New vote received on proposal ${context.proposalId}`,
        actionUrl: `${process.env.FRONTEND_URL}/analytics`,
      },
      metadata: { 
        category: NotificationCategory.Vote, 
        priority: NotificationPriority.Medium 
      },
    };
  },

  'proposal.created': ({ payload }: TemplateContext): TemplateOutput => {
    const proposalId = payload.proposalId as string;
    const description = payload.description as string;
    
    return {
      email: {
        subject: `New Proposal Created - ${proposalId}`,
        text: `A new proposal has been created: ${description}\n\nProposal ID: ${proposalId}\n\nYou can now start collecting votes from your customers.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">New Proposal Created 📋</h2>
            <p>A new proposal has been created:</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">Proposal Details</h3>
              <p style="margin: 0 0 10px 0;"><strong>Proposal ID:</strong> ${proposalId}</p>
              <p style="margin: 0;"><strong>Description:</strong> ${description}</p>
            </div>
            
            <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #0c5460;">
                <strong>🚀 Ready for Voting:</strong> You can now start collecting votes from your customers.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/proposals/${proposalId}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-right: 10px;">View Proposal</a>
              <a href="${process.env.FRONTEND_URL}/analytics" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Analytics</a>
            </div>
          </div>
        `
      },
      inApp: {
        message: `New proposal created: ${description}`,
        actionUrl: `${process.env.FRONTEND_URL}/proposals/${proposalId}`,
      },
      metadata: { 
        category: NotificationCategory.Vote, 
        priority: NotificationPriority.Medium 
      },
    };
  },

  'voting.contract_deployed': ({ payload }: TemplateContext): TemplateOutput => {
    const context = payload as unknown as ContractDeploymentTemplateContext;
    
    return {
      email: {
        subject: `Voting Contract Deployed Successfully`,
        text: `Your voting contract has been deployed successfully on the blockchain.\n\nContract Address: ${context.contractAddress}\nTransaction Hash: ${context.txHash}\nDeployment Date: ${context.deploymentDate}\n\nYou can now start creating proposals and collecting votes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">Contract Deployed Successfully </h2>
            <p>Your voting contract has been deployed successfully on the blockchain.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">Deployment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Contract Address:</td>
                  <td style="padding: 8px 0; color: #333; font-family: monospace;">${context.contractAddress}</td>
                </tr>
                <tr style="border-bottom: 1px solid #dee2e6;">
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Transaction Hash:</td>
                  <td style="padding: 8px 0;">
                    <a href="https://basescan.io/tx/${context.txHash}" style="color: #007bff; text-decoration: none;">View on Basescan</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Deployment Date:</td>
                  <td style="padding: 8px 0; color: #333;">${context.deploymentDate}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #155724;">
                <strong>🚀 Ready to Use:</strong> You can now start creating proposals and collecting votes from your customers.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/voting" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Create Proposal</a>
              <a href="https://basescan.io/address/${context.contractAddress}" style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Contract</a>
            </div>
          </div>
        `
      },
      inApp: {
        message: `Voting contract deployed successfully`,
        actionUrl: `${process.env.FRONTEND_URL}/voting`,
      },
      metadata: { 
        category: NotificationCategory.Vote, 
        priority: NotificationPriority.Medium 
      },
    };
  },
};
