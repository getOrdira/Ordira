// src/validation/votes.validation.ts
import Joi from 'joi';

/**
 * Complete voting validation with comprehensive governance and security features
 */

/**
 * Schema for deploying voting contract
 */
export const deployVotingContractSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .pattern(/^[a-zA-Z0-9\s\-_'\.]+$/)
    .required()
    .custom((value, helpers) => {
      // Check for professional naming
      const professionalKeywords = ['voting', 'governance', 'dao', 'proposal', 'decision'];
      const hasContext = professionalKeywords.some(keyword => 
        value.toLowerCase().includes(keyword)
      );
      
      if (!hasContext) {
        helpers.state.path.push('addGovernanceContext');
      }
      
      return value;
    })
    .messages({
      'string.min': 'Contract name must be at least 3 characters',
      'string.max': 'Contract name cannot exceed 100 characters',
      'string.pattern.base': 'Contract name can only contain letters, numbers, spaces, hyphens, underscores, apostrophes, and periods',
      'any.required': 'Contract name is required'
    }),

  symbol: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z0-9]{2,10}$/)
    .required()
    .custom((value, helpers) => {
      // Check for reserved symbols
      const reserved = ['ETH', 'BTC', 'USDC', 'USDT', 'DAI', 'WETH'];
      if (reserved.includes(value)) {
        return helpers.error('string.reservedSymbol');
      }
      return value;
    })
    .messages({
      'string.pattern.base': 'Symbol must be 2-10 uppercase letters and numbers',
      'string.reservedSymbol': 'This symbol is reserved and cannot be used',
      'any.required': 'Contract symbol is required'
    }),

  votingRules: Joi.object({
    quorumPercentage: Joi.number()
      .min(1)
      .max(100)
      .precision(2)
      .default(50)
      .messages({
        'number.min': 'Quorum must be at least 1%',
        'number.max': 'Quorum cannot exceed 100%'
      }),

    votingPeriodDays: Joi.number()
      .integer()
      .min(1)
      .max(365)
      .default(7)
      .messages({
        'number.integer': 'Voting period must be an integer',
        'number.min': 'Voting period must be at least 1 day',
        'number.max': 'Voting period cannot exceed 365 days'
      }),

    proposalThreshold: Joi.number()
      .min(0)
      .max(100)
      .precision(2)
      .default(1)
      .messages({
        'number.min': 'Proposal threshold cannot be negative',
        'number.max': 'Proposal threshold cannot exceed 100%'
      }),

    allowDelegation: Joi.boolean().default(true),
    allowAbstain: Joi.boolean().default(true),
    requireVerification: Joi.boolean().default(false),
    enableWeightedVoting: Joi.boolean().default(false)
  }).optional(),

  initialConfiguration: Joi.object({
    adminAddress: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{40}$/)
      .required()
      .messages({
        'string.pattern.base': 'Admin address must be a valid Base address',
        'any.required': 'Admin address is required'
      }),

    treasuryAddress: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{40}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Treasury address must be a valid Base address'
      }),

    tokenAddress: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{40}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Token address must be a valid Base address'
      })
  }).optional()
});

/**
 * Enhanced proposal creation schema
 */
export const createProposalSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(5)
    .max(200)
    .required()
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
        return helpers.error('string.spamDetected');
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
    .messages({
      'string.min': 'Proposal title must be at least 5 characters',
      'string.max': 'Proposal title cannot exceed 200 characters',
      'string.insufficientWords': 'Proposal title should contain at least 3 words',
      'string.spamDetected': 'Proposal title contains inappropriate promotional language',
      'any.required': 'Proposal title is required'
    }),

  description: Joi.string()
    .trim()
    .min(50)
    .max(10000)
    .required()
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
    .messages({
      'string.min': 'Proposal description must be at least 50 characters',
      'string.max': 'Proposal description cannot exceed 10,000 characters',
      'string.insufficientContent': 'Proposal description should contain at least 25 words',
      'any.required': 'Proposal description is required'
    }),

  category: Joi.string()
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
      'any.only': 'Please select a valid proposal category',
      'any.required': 'Proposal category is required'
    }),

  votingOptions: Joi.array()
    .items(
      Joi.object({
        id: Joi.string()
          .alphanum()
          .max(20)
          .required()
          .messages({
            'string.alphanum': 'Option ID must be alphanumeric',
            'string.max': 'Option ID cannot exceed 20 characters',
            'any.required': 'Option ID is required'
          }),

        text: Joi.string()
          .trim()
          .min(1)
          .max(200)
          .required()
          .messages({
            'string.min': 'Option text must be at least 1 character',
            'string.max': 'Option text cannot exceed 200 characters',
            'any.required': 'Option text is required'
          }),

        description: Joi.string()
          .trim()
          .max(1000)
          .optional()
          .messages({
            'string.max': 'Option description cannot exceed 1000 characters'
          })
      })
    )
    .min(2)
    .max(10)
    .unique('id')
    .default([
      { id: 'yes', text: 'Yes', description: 'Vote in favor of this proposal' },
      { id: 'no', text: 'No', description: 'Vote against this proposal' },
      { id: 'abstain', text: 'Abstain', description: 'Abstain from voting' }
    ])
    .messages({
      'array.min': 'Proposal must have at least 2 voting options',
      'array.max': 'Proposal cannot have more than 10 voting options',
      'array.unique': 'Option IDs must be unique'
    }),

  startDate: Joi.date()
    .min('now')
    .optional()
    .messages({
      'date.min': 'Start date cannot be in the past'
    }),

  endDate: Joi.date()
    .greater(Joi.ref('startDate'))
    .min(Date.now() + 24 * 60 * 60 * 1000) // At least 24 hours from now
    .optional()
    .messages({
      'date.greater': 'End date must be after start date',
      'date.min': 'End date must be at least 24 hours from now'
    }),

  implementation: Joi.object({
    timeline: Joi.string()
      .trim()
      .max(2000)
      .optional()
      .messages({
        'string.max': 'Timeline cannot exceed 2000 characters'
      }),

    budget: Joi.object({
      amount: Joi.number()
        .min(0)
        .precision(2)
        .optional()
        .messages({
          'number.min': 'Budget amount cannot be negative'
        }),

      currency: Joi.string()
        .valid('USD', 'EUR', 'ETH', 'USDC', 'DAI', 'BTC')
        .optional()
        .messages({
          'any.only': 'Currency must be one of: USD, EUR, ETH, USDC, DAI, BTC'
        }),

      breakdown: Joi.string()
        .trim()
        .max(5000)
        .optional()
        .messages({
          'string.max': 'Budget breakdown cannot exceed 5000 characters'
        })
    }).optional(),

    milestones: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().trim().min(5).max(200).required(),
          description: Joi.string().trim().max(1000).optional(),
          dueDate: Joi.date().min('now').optional(),
          deliverables: Joi.array()
            .items(Joi.string().trim().max(200))
            .max(10)
            .optional()
            .messages({
              'array.max': 'Cannot have more than 10 deliverables per milestone'
            })
        })
      )
      .max(20)
      .optional()
      .messages({
        'array.max': 'Cannot have more than 20 milestones'
      }),

    dependencies: Joi.array()
      .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
      .max(10)
      .optional()
      .messages({
        'array.max': 'Cannot have more than 10 proposal dependencies',
        'string.pattern.base': 'Each dependency must be a valid proposal ID'
      })
  }).optional(),

  attachments: Joi.array()
    .items(
      Joi.object({
        type: Joi.string()
          .valid('document', 'image', 'link', 'video')
          .required()
          .messages({
            'any.only': 'Attachment type must be one of: document, image, link, video',
            'any.required': 'Attachment type is required'
          }),

        url: Joi.string()
          .uri()
          .required()
          .messages({
            'string.uri': 'Attachment URL must be a valid URI',
            'any.required': 'Attachment URL is required'
          }),

        title: Joi.string()
          .trim()
          .max(200)
          .required()
          .messages({
            'string.max': 'Attachment title cannot exceed 200 characters',
            'any.required': 'Attachment title is required'
          }),

        description: Joi.string()
          .trim()
          .max(500)
          .optional()
          .messages({
            'string.max': 'Attachment description cannot exceed 500 characters'
          })
      })
    )
    .max(20)
    .optional()
    .messages({
      'array.max': 'Cannot attach more than 20 files to a proposal'
    }),

  tags: Joi.array()
    .items(
      Joi.string()
        .trim()
        .lowercase()
        .min(2)
        .max(50)
        .pattern(/^[a-z0-9\-_]+$/)
        .messages({
          'string.min': 'Each tag must be at least 2 characters',
          'string.max': 'Each tag cannot exceed 50 characters',
          'string.pattern.base': 'Tags can only contain lowercase letters, numbers, hyphens, and underscores'
        })
    )
    .max(20)
    .unique()
    .optional()
    .messages({
      'array.max': 'Cannot have more than 20 tags',
      'array.unique': 'Tags must be unique'
    }),

  isEmergency: Joi.boolean()
    .default(false)
    .when('category', {
      is: 'security',
      then: Joi.boolean().optional(),
      otherwise: Joi.boolean().valid(false).messages({
        'any.only': 'Emergency proposals are only allowed for security category'
      })
    }),

  requireQuorum: Joi.boolean().default(true),
  isPublic: Joi.boolean().default(true),
  allowComments: Joi.boolean().default(true),
  allowDelegation: Joi.boolean().default(true)
});

/**
 * Schema for updating proposal
 */
export const updateProposalSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(5)
    .max(200)
    .optional()
    .messages({
      'string.min': 'Proposal title must be at least 5 characters',
      'string.max': 'Proposal title cannot exceed 200 characters'
    }),

  description: Joi.string()
    .trim()
    .min(50)
    .max(10000)
    .optional()
    .messages({
      'string.min': 'Proposal description must be at least 50 characters',
      'string.max': 'Proposal description cannot exceed 10,000 characters'
    }),

  category: createProposalSchema.extract(['category']).optional(),
  tags: createProposalSchema.extract(['tags']).optional(),
  attachments: createProposalSchema.extract(['attachments']).optional(),
  implementation: createProposalSchema.extract(['implementation']).optional(),
  allowComments: createProposalSchema.extract(['allowComments']).optional(),

  updateReason: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'Update reason must be at least 10 characters',
      'string.max': 'Update reason cannot exceed 500 characters',
      'any.required': 'Update reason is required'
    })
});

/**
 * Schema for submitting a vote
 */
export const submitVoteSchema = Joi.object({
  proposalId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Proposal ID must be a valid MongoDB ObjectId',
      'any.required': 'Proposal ID is required'
    }),

  optionId: Joi.string()
    .alphanum()
    .max(20)
    .required()
    .messages({
      'string.alphanum': 'Option ID must be alphanumeric',
      'string.max': 'Option ID cannot exceed 20 characters',
      'any.required': 'Vote option is required'
    }),

  voteId: Joi.string()
    .alphanum()
    .length(32)
    .required()
    .messages({
      'string.alphanum': 'Vote ID must be alphanumeric',
      'string.length': 'Vote ID must be exactly 32 characters',
      'any.required': 'Vote ID is required'
    }),

  voterAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .custom((value, helpers) => {
      const address = value.toLowerCase();
      
      // Check for invalid addresses
      const invalidAddresses = [
        '0x0000000000000000000000000000000000000000',
        '0x000000000000000000000000000000000000dead',
        '0xffffffffffffffffffffffffffffffffffffffff'
      ];
      
      if (invalidAddresses.includes(address)) {
        return helpers.error('string.invalidVoterAddress');
      }
      
      return value;
    })
    .messages({
      'string.pattern.base': 'Voter address must be a valid Ethereum address',
      'string.invalidVoterAddress': 'Invalid voter address',
      'any.required': 'Voter address is required'
    }),

  signature: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{130}$/)
    .required()
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
    .messages({
      'string.pattern.base': 'Signature must be a valid hex string',
      'string.invalidSignatureFormat': 'Signature must start with 0x',
      'string.invalidSignatureLength': 'Signature must be exactly 65 bytes',
      'any.required': 'Vote signature is required'
    }),

  voteWeight: Joi.number()
    .min(0)
    .precision(6)
    .optional()
    .messages({
      'number.min': 'Vote weight cannot be negative'
    }),

  delegation: Joi.object({
    delegatedFrom: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{40}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Delegated address must be a valid Ethereum address'
      }),

    delegationProof: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{130}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Delegation proof must be a valid signature'
      })
  }).optional(),

  reasoning: Joi.string()
    .trim()
    .max(2000)
    .optional()
    .custom((value, helpers) => {
      if (value && value.length > 0) {
        const wordCount = value.trim().split(/\s+/).length;
        if (wordCount < 3) {
          return helpers.error('string.insufficientReasoning');
        }
      }
      return value;
    })
    .messages({
      'string.max': 'Vote reasoning cannot exceed 2000 characters',
      'string.insufficientReasoning': 'Vote reasoning should contain at least 3 words if provided'
    }),

  isPublic: Joi.boolean().default(true),

  timestamp: Joi.number()
    .integer()
    .min(Date.now() - 300000) // 5 minutes ago
    .max(Date.now() + 60000)  // 1 minute in future
    .required()
    .messages({
      'number.integer': 'Timestamp must be an integer',
      'number.min': 'Vote timestamp is too old',
      'number.max': 'Vote timestamp is in the future',
      'any.required': 'Timestamp is required'
    }),

  nonce: Joi.string()
    .alphanum()
    .length(32)
    .required()
    .messages({
      'string.alphanum': 'Nonce must be alphanumeric',
      'string.length': 'Nonce must be exactly 32 characters',
      'any.required': 'Nonce is required'
    })
});

/**
 * Schema for batch vote submission
 */
export const batchSubmitVoteSchema = Joi.object({
  votes: Joi.array()
    .items(submitVoteSchema)
    .min(1)
    .max(100)
    .required()
    .unique((a, b) => a.proposalId === b.proposalId && a.voterAddress === b.voterAddress)
    .messages({
      'array.min': 'At least one vote must be provided',
      'array.max': 'Cannot submit more than 100 votes at once',
      'array.unique': 'Duplicate votes for same proposal and voter are not allowed',
      'any.required': 'Votes array is required'
    }),

  batchId: Joi.string()
    .alphanum()
    .length(32)
    .required()
    .messages({
      'string.alphanum': 'Batch ID must be alphanumeric',
      'string.length': 'Batch ID must be exactly 32 characters',
      'any.required': 'Batch ID is required'
    }),

  batchSignature: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{130}$/)
    .required()
    .messages({
      'string.pattern.base': 'Batch signature must be a valid signature',
      'any.required': 'Batch signature is required'
    })
});

/**
 * Schema for proposal route parameters
 */
export const proposalParamsSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Proposal ID must be a valid MongoDB ObjectId',
      'any.required': 'Proposal ID is required'
    })
});

/**
 * Schema for vote route parameters
 */
export const voteParamsSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Vote ID must be a valid MongoDB ObjectId',
      'any.required': 'Vote ID is required'
    })
});

/**
 * Schema for listing proposals with query parameters
 */
export const listProposalsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),

  status: Joi.string()
    .valid('draft', 'active', 'ended', 'executed', 'cancelled', 'expired')
    .optional()
    .messages({
      'any.only': 'Status must be one of: draft, active, ended, executed, cancelled, expired'
    }),

  category: Joi.string()
    .valid(
      'governance', 'protocol_upgrade', 'parameter_change', 'treasury',
      'grants', 'partnerships', 'community', 'technical', 'security',
      'product_development', 'marketing', 'operations', 'finance',
      'human_resources', 'legal', 'compliance', 'strategy',
      'feature_request', 'bug_fix', 'improvement', 'integration',
      'policy_change', 'terms_update', 'fee_structure', 'other'
    )
    .optional()
    .messages({
      'any.only': 'Category must be a valid proposal category'
    }),

  search: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Search term cannot exceed 100 characters'
    }),

  tags: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Tags filter cannot exceed 200 characters'
    }),

  startDate: Joi.date().optional(),
  
  endDate: Joi.date()
    .greater(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.greater': 'End date must be after start date'
    }),

  sortBy: Joi.string()
    .valid('createdAt', 'startDate', 'endDate', 'title', 'category', 'voteCount', 'status')
    .default('createdAt')
    .messages({
      'any.only': 'Sort by must be one of: createdAt, startDate, endDate, title, category, voteCount, status'
    }),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either "asc" or "desc"'
    }),

  includeEnded: Joi.boolean().default(true),
  myVotesOnly: Joi.boolean().default(false),
  isEmergency: Joi.boolean().optional()
});

/**
 * Schema for listing votes with query parameters
 */
export const listVotesQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),

  proposalId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Proposal ID must be a valid MongoDB ObjectId'
    }),

  voterAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Voter address must be a valid Ethereum address'
    }),

  optionId: Joi.string()
    .alphanum()
    .max(20)
    .optional()
    .messages({
      'string.alphanum': 'Option ID must be alphanumeric',
      'string.max': 'Option ID cannot exceed 20 characters'
    }),

  isPublic: Joi.boolean().optional(),

  startDate: Joi.date().optional(),
  
  endDate: Joi.date()
    .greater(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.greater': 'End date must be after start date'
    }),

  sortBy: Joi.string()
    .valid('createdAt', 'proposalId', 'optionId', 'voterAddress', 'voteWeight')
    .default('createdAt')
    .messages({
      'any.only': 'Sort by must be one of: createdAt, proposalId, optionId, voterAddress, voteWeight'
    }),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either "asc" or "desc"'
    })
});

export const votingStatsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d', '1y', 'all')
    .default('30d')
    .optional(),
  groupBy: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .default('day')
    .optional(),
  proposalId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),
  includeDetails: Joi.boolean().default(false).optional()
});

/**
 * Schema for vote delegation
 */
export const delegateVoteSchema = Joi.object({
  delegateTo: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .custom((value, helpers) => {
      const context = helpers.state.ancestors[0];
      if (value === context.delegatorAddress) {
        return helpers.error('string.selfDelegation');
      }
      return value;
    })
    .messages({
      'string.pattern.base': 'Delegate address must be a valid Ethereum address',
      'string.selfDelegation': 'Cannot delegate to yourself',
      'any.required': 'Delegate address is required'
    }),

  delegatorAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .messages({
      'string.pattern.base': 'Delegator address must be a valid Ethereum address',
      'any.required': 'Delegator address is required'
    }),

  scope: Joi.string()
    .valid('all_proposals', 'category_specific', 'single_proposal')
    .required()
    .messages({
      'any.only': 'Scope must be one of: all_proposals, category_specific, single_proposal',
      'any.required': 'Delegation scope is required'
    }),

  category: Joi.string()
    .valid(
      'governance', 'protocol_upgrade', 'parameter_change', 'treasury',
      'grants', 'partnerships', 'community', 'technical', 'security',
      'product_development', 'marketing', 'operations', 'finance',
      'human_resources', 'legal', 'compliance', 'strategy',
      'feature_request', 'bug_fix', 'improvement', 'integration',
      'policy_change', 'terms_update', 'fee_structure', 'other'
    )
    .when('scope', {
      is: 'category_specific',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.only': 'Category must be a valid proposal category',
      'any.required': 'Category is required for category-specific delegation'
    }),

  proposalId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .when('scope', {
      is: 'single_proposal',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.pattern.base': 'Proposal ID must be a valid MongoDB ObjectId',
      'any.required': 'Proposal ID is required for single-proposal delegation'
    }),

  expiresAt: Joi.date()
    .min('now')
    .optional()
    .messages({
      'date.min': 'Expiration date cannot be in the past'
    }),

  signature: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{130}$/)
    .required()
    .messages({
      'string.pattern.base': 'Signature must be a valid Ethereum signature',
      'any.required': 'Delegation signature is required'
    }),

  nonce: Joi.string()
    .alphanum()
    .length(32)
    .required()
    .messages({
      'string.alphanum': 'Nonce must be alphanumeric',
      'string.length': 'Nonce must be exactly 32 characters',
      'any.required': 'Nonce is required'
    })
});

/**
 * Schema for voting analytics
 */
export const voteAnalyticsSchema = Joi.object({
  proposalId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Proposal ID must be a valid MongoDB ObjectId'
    }),

  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d', '1y', 'all')
    .default('30d')
    .messages({
      'any.only': 'Timeframe must be one of: 24h, 7d, 30d, 90d, 1y, all'
    }),

  groupBy: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .default('day')
    .messages({
      'any.only': 'Group by must be one of: hour, day, week, month'
    }),

  metrics: Joi.array()
    .items(
      Joi.string().valid(
        'participation_rate', 'vote_distribution', 'voter_turnout',
        'proposal_success_rate', 'delegation_rate', 'vote_weight_distribution',
        'engagement_metrics', 'voting_patterns', 'quorum_achievement'
      )
    )
    .min(1)
    .max(10)
    .default(['participation_rate', 'vote_distribution'])
    .messages({
      'array.min': 'At least one metric must be selected',
      'array.max': 'Cannot select more than 10 metrics',
      'any.only': 'Invalid metric selected'
    }),

  filterBy: Joi.object({
    category: Joi.string()
      .valid(
        'governance', 'protocol_upgrade', 'parameter_change', 'treasury',
        'grants', 'partnerships', 'community', 'technical', 'security',
        'product_development', 'marketing', 'operations', 'finance',
        'human_resources', 'legal', 'compliance', 'strategy',
        'feature_request', 'bug_fix', 'improvement', 'integration',
        'policy_change', 'terms_update', 'fee_structure', 'other'
      )
      .optional(),

    voterType: Joi.string()
      .valid('individual', 'delegated', 'all')
      .default('all')
      .optional(),

    proposalStatus: Joi.string()
      .valid('active', 'passed', 'failed', 'expired', 'executed')
      .optional(),

    minVoteWeight: Joi.number().min(0).optional(),
    maxVoteWeight: Joi.number().min(0).optional()
  }).optional()
});

/**
 * Schema for vote verification
 */
export const verifyVoteSchema = Joi.object({
  voteId: Joi.string()
    .alphanum()
    .length(32)
    .required()
    .messages({
      'string.alphanum': 'Vote ID must be alphanumeric',
      'string.length': 'Vote ID must be exactly 32 characters',
      'any.required': 'Vote ID is required'
    }),

  signature: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{130}$/)
    .required()
    .messages({
      'string.pattern.base': 'Signature must be a valid Ethereum signature',
      'any.required': 'Signature is required'
    }),

  voterAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Voter address must be a valid Ethereum address'
    })
});

/**
 * Schema for checking voting eligibility
 */
export const votingEligibilitySchema = Joi.object({
  proposalId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Proposal ID must be a valid MongoDB ObjectId',
      'any.required': 'Proposal ID is required'
    }),

  voterAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .messages({
      'string.pattern.base': 'Voter address must be a valid Ethereum address',
      'any.required': 'Voter address is required'
    }),

  blockNumber: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.integer': 'Block number must be an integer',
      'number.min': 'Block number cannot be negative'
    })
});

/**
 * Schema for updating voting rules
 */
export const updateVotingRulesSchema = Joi.object({
  quorumPercentage: Joi.number()
    .min(1)
    .max(100)
    .precision(2)
    .optional()
    .messages({
      'number.min': 'Quorum must be at least 1%',
      'number.max': 'Quorum cannot exceed 100%'
    }),

  votingPeriodDays: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .optional()
    .messages({
      'number.integer': 'Voting period must be an integer',
      'number.min': 'Voting period must be at least 1 day',
      'number.max': 'Voting period cannot exceed 365 days'
    }),

  proposalThreshold: Joi.number()
    .min(0)
    .max(100)
    .precision(2)
    .optional()
    .messages({
      'number.min': 'Proposal threshold cannot be negative',
      'number.max': 'Proposal threshold cannot exceed 100%'
    }),

  allowDelegation: Joi.boolean().optional(),
  allowAbstain: Joi.boolean().optional(),
  requireVerification: Joi.boolean().optional(),
  enableWeightedVoting: Joi.boolean().optional(),

  updateReason: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'Update reason must be at least 10 characters',
      'string.max': 'Update reason cannot exceed 500 characters',
      'any.required': 'Update reason is required'
    })
});

/**
 * All votes validation schemas
 */
export const votesValidationSchemas = {
  createProposal: createProposalSchema,
  updateProposal: updateProposalSchema,
  submitVote: submitVoteSchema,
  batchSubmitVote: batchSubmitVoteSchema,
  proposalParams: proposalParamsSchema,
  voteParams: voteParamsSchema,
  listProposalsQuery: listProposalsQuerySchema,
  listVotesQuery: listVotesQuerySchema,
  delegateVote: delegateVoteSchema,
  voteAnalytics: voteAnalyticsSchema,
  verifyVote: verifyVoteSchema,
  votingEligibility: votingEligibilitySchema,
  updateVotingRules: updateVotingRulesSchema
};