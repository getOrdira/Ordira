// src/controllers/features/votes/votesContract.controller.ts
// Controller exposing blockchain voting contract operations

import { Response } from 'express';
import { VotesBaseController, VotesBaseRequest } from './votesBase.controller';

interface ContractInfoRequest extends VotesBaseRequest {
  validatedQuery?: {
    contractAddress?: string;
  };
  validatedParams?: {
    contractAddress?: string;
  };
}

/**
 * VotesContractController maps HTTP requests to voting contract service calls.
 */
export class VotesContractController extends VotesBaseController {
  /**
   * Retrieve current contract statistics for a voting contract.
   */
  async getContractInfo(req: ContractInfoRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_CONTRACT_INFO');

      const contractAddress =
        req.validatedParams?.contractAddress ??
        req.validatedQuery?.contractAddress ??
        this.parseString((req.params as any)?.contractAddress) ??
        this.parseString((req.query as any)?.contractAddress);

      if (!contractAddress) {
        throw { statusCode: 400, message: 'Contract address is required' };
      }

      const info = await this.votingContractService.getContractInfo(contractAddress);

      this.logAction(req, 'VOTING_CONTRACT_INFO_SUCCESS', {
        contractAddress,
        totalProposals: info.totalProposals,
        totalVotes: info.totalVotes,
      });

      return {
        contractAddress,
        info,
      };
    }, res, 'Voting contract info retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve proposal events emitted by the voting contract.
   */
  async getProposalEvents(req: ContractInfoRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_CONTRACT_PROPOSAL_EVENTS');

      const contractAddress =
        req.validatedParams?.contractAddress ??
        req.validatedQuery?.contractAddress ??
        this.parseString((req.params as any)?.contractAddress) ??
        this.parseString((req.query as any)?.contractAddress);

      if (!contractAddress) {
        throw { statusCode: 400, message: 'Contract address is required' };
      }

      const events = await this.votingContractService.getProposalEvents(contractAddress);

      this.logAction(req, 'VOTING_CONTRACT_PROPOSAL_EVENTS_SUCCESS', {
        contractAddress,
        eventCount: events.length,
      });

      return {
        contractAddress,
        events,
      };
    }, res, 'Voting contract proposal events retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve vote events emitted by the voting contract.
   */
  async getVoteEvents(req: ContractInfoRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_CONTRACT_VOTE_EVENTS');

      const contractAddress =
        req.validatedParams?.contractAddress ??
        req.validatedQuery?.contractAddress ??
        this.parseString((req.params as any)?.contractAddress) ??
        this.parseString((req.query as any)?.contractAddress);

      if (!contractAddress) {
        throw { statusCode: 400, message: 'Contract address is required' };
      }

      const events = await this.votingContractService.getVoteEvents(contractAddress);

      this.logAction(req, 'VOTING_CONTRACT_VOTE_EVENTS_SUCCESS', {
        contractAddress,
        eventCount: events.length,
      });

      return {
        contractAddress,
        events,
      };
    }, res, 'Voting contract vote events retrieved successfully', this.getRequestMeta(req));
  }
}

export const votesContractController = new VotesContractController();

