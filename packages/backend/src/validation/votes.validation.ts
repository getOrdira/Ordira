// src/validation/votes.validation.ts
import Joi from 'joi';
import { commonSchemas, customJoi } from '../middleware/validation.middleware';

/**
 * Enhanced voting validation with comprehensive governance and security features
 */

// Enhanced proposal creation validation
export const createProposalSchema = Joi.object({
  // Basic proposal information
  title: Joi.string()
    .trim()
    .min(5)
    .max(200)
    .custom((value, helpers) => {
      // Check for meaningful proposal titles
      const wordCount = value.trim().split(/\s+/).length;
      if (wordCount < 3) {
        return helpers.error('string.insufficientWords');
      }
      
      // Check for spam patterns
      const spamPatterns = [
        /(.)\1{3,}/g, // Repeated characters
        /!!+/g,       // Multiple exclamation marks
        /(URGENT|VOTE NOW|ACT FAST)/i,
        /(FREE|WIN|PRIZE).*!/i
      ];
      
      if (spamPatterns.some(pattern => pattern.test(value))) {
        return helpers.error('string.spamTitle');
      }
      
      // Check for governance-appropriate language
      const governanceKeywords = [
        'proposal', 'vote', 'decision', 'change', 'update', 'implement',
        'approve', 'fund', 'allocate', 'modify', 'establish', 'create'
      ];
      
      const hasGovernanceContext = governanceKeywords.some(keyword => 
        value.toLowerCase().includes(keyword)
      );
      
      if (!hasGovernanceContext) {
        helpers.state.path.push('addGovernanceContext');
      }
      
      return value;
    })
    .required()
    .messages({
      'string.min': 'Proposal title must be at least 5 characters',
      'string.max': 'Proposal title cannot exceed 200 characters',
      'string.insufficientWords': 'Proposal title should contain at least 3 words',
      'string.spamTitle': 'Proposal title contains inappropriate promotional language'
    }),

  description: commonSchemas.longText
    .min(50)
    .max(5000)
    .custom((value, helpers) => {
      // Check for comprehensive proposal content
      const wordCount = value.trim().split(/\s+/).length;
      if (wordCount < 25) {
        return helpers.error('string.insufficientContent');
      }
      
      // Check for structured proposal elements
      const structureKeywords = [
        'background', 'rationale', 'implementation', 'timeline',
        'budget', 'impact', 'benefit', 'risk', 'consideration'
      ];
      
      const hasStructure = structureKeywords.some(keyword => 
        value.toLowerCase().includes(keyword)
      );
      
      if (!hasStructure) {
        helpers.state.path.push('improveStructure');
      }
      
      // Check for action items or clear outcomes
      const actionWords = [
        'will', 'shall', 'propose', 'implement', 'execute',
        'allocate', 'establish', 'create', 'modify', 'update'
      ];
      
      const hasActionItems = actionWords.some(word => 
        value.toLowerCase().includes(word)
      );
      
      if (!hasActionItems) {
        helpers.state.path.push('addActionItems');
      }
      
      return value;
    })
    .required()
    .messages({
      'string.min': 'Proposal description must be at least 50 characters',
      'string.max': 'Proposal description cannot exceed 5000 characters',
      'string.insufficientContent': 'Proposal description should contain at least 25 words'
    }),

  // Proposal categorization
  category: Joi.string()
    .trim()
    .valid(
      // Governance Categories
      'governance', 'protocol_upgrade', 'parameter_change', 'treasury',
      'grants', 'partnerships', 'community', 'technical', 'security',
      
      // Business Categories
      'product_development', 'marketing', 'operations', 'finance',
      'human_resources', 'legal', 'compliance', 'strategy',
      
      // Platform Categories
      'feature_request', 'bug_fix', 'improvement', 'integration',
      'policy_change', 'terms_update', 'fee_structure',
      
      // Other
      'other'
    )
    .required()
    .messages({
      'any.only': 'Please select a valid proposal category'
    }),

  // Voting configuration
  votingConfig: Joi.object({
    votingPeriod: Joi.number()
      .integer()
      .min(1)
      .max(30)
      .default(7)
      .messages({
        'number.min': 'Voting period must be at least 1 day',
        'number.max': 'Voting period cannot exceed 30 days'
      }),

    quorumThreshold: Joi.number()
      .min(1)
      .max(100)
      .precision(2)
      .default(10)
      .messages({
        'number.min': 'Quorum threshold must be at least 1%',
        'number.max': 'Quorum threshold cannot exceed 100%'
      }),

    approvalThreshold: Joi.number()
      .min(50)
      .max(100)
      .precision(2)
      .default(50)
      .messages({
        'number.min': 'Approval threshold must be at least 50%',
        'number.max': 'Approval threshold cannot exceed 100%'
      }),

    allowDelegation: Joi.boolean().default(true),
    
    votingType: Joi.string()
      .valid('simple', 'weighted', 'quadratic', 'ranked_choice')
      .default('simple'),

    options: Joi.array()
      .items(
        Joi.string()
          .trim()
          .min(1)
          .max(100)
          .custom((value, helpers) => {
            // Validate voting options
            const inappropriateOptions = ['maybe', 'unsure', 'dunno'];
            if (inappropriateOptions.includes(value.toLowerCase())) {
              return helpers.error('string.inappropriateOption');
            }
            return value;
          })
      )
      .min(2)
      .max(10)
      .unique()
      .default(['For', 'Against', 'Abstain'])
      .messages({
        'array.min': 'At least 2 voting options are required',
        'array.max': 'Maximum 10 voting options allowed',
        'array.unique': 'Voting options must be unique',
        'string.inappropriateOption': 'Voting option is not appropriate for governance'
      })
  }).optional(),

  // Implementation details
  implementation: Joi.object({
    timeline: Joi.string()
      .trim()
      .max(1000)
      .optional(),

    budget: Joi.object({
      amount: Joi.number().min(0).precision(2).optional(),
      currency: Joi.string().valid('USD', 'EUR', 'ETH', 'USDC', 'DAI').optional(),
      breakdown: Joi.string().max(2000).optional()
    }).optional(),

    dependencies: Joi.array()
      .items(commonSchemas.mongoId)
      .max(10)
      .optional()
      .messages({
        'array.max': 'Maximum 10 proposal dependencies allowed'
      }),

    milestones: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().trim().min(5).max(200).required(),
          description: Joi.string().trim().max(1000).optional(),
          dueDate: commonSchemas.futureDate.optional(),
          deliverables: Joi.array().items(Joi.string().max(200)).max(10).optional()
        })
      )
      .max(20)
      .optional()
  }).optional(),

  // Attachments and supporting materials
  attachments: Joi.array()
    .items(
      Joi.alternatives().try(
        commonSchemas.mongoId, // File uploads
        commonSchemas.url       // External links
      )
    )
    .max(20)
    .optional()
    .messages({
      'array.max': 'Maximum 20 attachments allowed per proposal'
    }),

  // Proposal metadata
  tags: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(2)
        .max(30)
        .pattern(/^[a-zA-Z0-9\-_]+$/)
    )
    .max(15)
    .unique()
    .optional()
    .messages({
      'array.max': 'Maximum 15 tags allowed',
      'string.pattern.base': 'Tags can only contain letters, numbers, hyphens, and underscores'
    }),

  // Emergency proposal flag
  isEmergency: Joi.boolean()
    .default(false)
    .when(Joi.ref('category'), {
      is: 'security',
      then: Joi.boolean().optional(),
      otherwise: Joi.boolean().valid(false).messages({
        'any.only': 'Emergency proposals are only allowed for security category'
      })
    })
});

// Enhanced vote submission validation
export const submitVoteSchema = Joi.object({
  proposalId: commonSchemas.mongoId,

  // Vote choice with validation
  choice: Joi.alternatives()
    .try(
      Joi.string().valid('for', 'against', 'abstain'), // Simple voting
      Joi.number().integer().min(0).max(10),           // Option index
      Joi.array().items(Joi.number().integer().min(0).max(10)).max(10) // Ranked choice
    )
    .required()
    .messages({
      'alternatives.match': 'Vote choice must be a valid option'
    }),

  // Voter identification and verification
  voterAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .custom((value, helpers) => {
      const address = value.toLowerCase();
      
      // Check for invalid addresses
      const invalidAddresses = [
        '0x0000000000000000000000000000000000000000',
        '0x000000000000000000000000000000000000dead'
      ];
      
      if (invalidAddresses.includes(address)) {
        return helpers.error('string.invalidVoterAddress');
      }
      
      return value;
    })
    .required()
    .messages({
      'string.pattern.base': 'Voter address must be a valid Ethereum address',
      'string.invalidVoterAddress': 'Invalid voter address'
    }),

  // Digital signature for vote verification
  signature: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{130}$/)
    .custom((value, helpers) => {
      // Basic signature format validation
      if (!value.startsWith('0x')) {
        return helpers.error('string.invalidSignatureFormat');
      }
      
      // Check signature length (65 bytes = 130 hex chars + 0x)
      if (value.length !== 132) {
        return helpers.error('string.invalidSignatureLength');
      }
      
      return value;
    })
    .required()
    .messages({
      'string.pattern.base': 'Signature must be a valid hex string',
      'string.invalidSignatureFormat': 'Signature must start with 0x',
      'string.invalidSignatureLength': 'Signature must be exactly 65 bytes'
    }),

  // Vote weight and delegation
  voteWeight: Joi.number()
    .min(0)
    .precision(6)
    .optional()
    .messages({
      'number.min': 'Vote weight cannot be negative'
    }),

  // Delegation information
  delegation: Joi.object({
    delegatedFrom: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
    delegationProof: Joi.string().pattern(/^0x[a-fA-F0-9]{130}$/).optional()
  }).optional(),

  // Optional vote reasoning
  reasoning: Joi.string()
    .trim()
    .max(2000)
    .custom((value, helpers) => {
      if (value && value.length > 0) {
        const wordCount = value.trim().split(/\s+/).length;
        if (wordCount < 3) {
          return helpers.error('string.insufficientReasoning');
        }
      }
      return value;
    })
    .optional()
    .messages({
      'string.max': 'Vote reasoning cannot exceed 2000 characters',
      'string.insufficientReasoning': 'Vote reasoning should contain at least 3 words if provided'
    }),

  // Privacy and transparency options
  isPublic: Joi.boolean().default(true),
  
  // Timestamp for replay attack prevention
  timestamp: Joi.number()
    .integer()
    .min(Date.now() - 300000) // 5 minutes ago
    .max(Date.now() + 60000)  // 1 minute in future
    .required()
    .messages({
      'number.min': 'Vote timestamp is too old',
      'number.max': 'Vote timestamp is in the future'
    }),

  // Nonce for replay protection
  nonce: Joi.string()
    .alphanum()
    .length(32)
    .required()
    .messages({
      'string.length': 'Nonce must be exactly 32 characters'
    })
});

// Enhanced batch voting validation
export const batchVoteSchema = Joi.object({
  votes: Joi.array()
    .items(
      Joi.object({
        proposalId: commonSchemas.mongoId,
        
        choice: Joi.alternatives()
          .try(
            Joi.string().valid('for', 'against', 'abstain'),
            Joi.number().integer().min(0).max(10)
          )
          .required(),

        walletAddress: Joi.string()
          .pattern(/^0x[a-fA-F0-9]{40}$/)
          .required(),

        signature: Joi.string()
          .pattern(/^0x[a-fA-F0-9]{130}$/)
          .required(),

        voteWeight: Joi.number().min(0).precision(6).optional(),
        
        reasoning: Joi.string().trim().max(1000).optional(),
        
        timestamp: Joi.number()
          .integer()
          .min(Date.now() - 300000)
          .max(Date.now() + 60000)
          .required(),

        nonce: Joi.string().alphanum().length(32).required()
      })
    )
    .min(1)
    .max(100)
    .unique((a, b) => a.proposalId === b.proposalId && a.walletAddress === b.walletAddress)
    .required()
    .messages({
      'array.min': 'At least one vote is required',
      'array.max': 'Maximum 100 votes per batch',
      'array.unique': 'Duplicate votes for same proposal and wallet are not allowed'
    }),

  // Batch metadata
  batchId: Joi.string()
    .alphanum()
    .length(32)
    .required(),

  // Total batch signature for integrity
  batchSignature: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{130}$/)
    .required()
});

// Proposal update validation (for proposal creators)
export const updateProposalSchema = Joi.object({
  proposalId: commonSchemas.mongoId,

  // Only allow updates before voting starts
  updates: Joi.object({
    title: createProposalSchema.extract('title').optional(),
    description: createProposalSchema.extract('description').optional(),
    attachments: createProposalSchema.extract('attachments'),
    tags: createProposalSchema.extract('tags'),
    implementation: createProposalSchema.extract('implementation')
  }).min(1).required(),

  updateReason: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'Update reason must be at least 10 characters',
      'string.max': 'Update reason cannot exceed 500 characters'
    })
});

// Vote delegation validation
export const delegateVoteSchema = Joi.object({
  delegateTo: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .custom((value, helpers) => {
      const context = helpers.state.ancestors[0];
      if (value === context.delegatorAddress) {
        return helpers.error('string.selfDelegation');
      }
      return value;
    })
    .required()
    .messages({
      'string.selfDelegation': 'Cannot delegate to yourself'
    }),

  delegatorAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required(),

  scope: Joi.string()
    .valid('all_proposals', 'category_specific', 'single_proposal')
    .required(),

  category: Joi.string()
    .when('scope', {
      is: 'category_specific',
      then: createProposalSchema.extract('category').required(),
      otherwise: Joi.optional()
    }),

  proposalId: commonSchemas.mongoId
    .when('scope', {
      is: 'single_proposal',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),

  expiresAt: commonSchemas.futureDate.optional(),

  signature: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{130}$/)
    .required(),

  nonce: Joi.string().alphanum().length(32).required()
});

// Voting analytics and reporting validation
export const voteAnalyticsSchema = Joi.object({
  proposalId: commonSchemas.mongoId.optional(),
  
  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d', '1y', 'all')
    .default('30d'),

  groupBy: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .default('day'),

  metrics: Joi.array()
    .items(Joi.string().valid(
      'participation_rate', 'vote_distribution', 'voter_turnout',
      'proposal_success_rate', 'delegation_rate', 'vote_weight_distribution'
    ))
    .min(1)
    .default(['participation_rate', 'vote_distribution']),

  filterBy: Joi.object({
    category: createProposalSchema.extract('category'),
    voterType: Joi.string().valid('individual', 'delegated', 'all').optional(),
    proposalStatus: Joi.string().valid('active', 'passed', 'failed', 'expired').optional()
  }).optional()
});

// Export all voting validation schemas
export const votingValidationSchemas = {
  createProposal: createProposalSchema,
  submitVote: submitVoteSchema,
  batchVote: batchVoteSchema,
  updateProposal: updateProposalSchema,
  delegateVote: delegateVoteSchema,
  voteAnalytics: voteAnalyticsSchema
};