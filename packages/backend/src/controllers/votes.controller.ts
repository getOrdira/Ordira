// src/controllers/votes.controller.ts

import { Request, Response, NextFunction } from 'express';
import * as votesService from '../services/votes.service';
import { PendingVote } from '../models/pendingVote.model';
import mongoose from 'mongoose';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

interface TenantRequest extends Request {
  tenant?: { business: { toString(): string } };
}

interface BatchVote {
  proposalId: string;
  voteId:     string;
  signature:  string;
}

type VoteBody = { proposalIds: string[] };

/**
 * POST /votes/deploy
 * Deploy a new Voting contract for the brand
 */
export async function deployVotingContract(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const result     = await votesService.deployVotingContract(businessId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /votes/proposals
 * Create a new proposal on-chain
 */
export async function createProposal(
  req: TenantRequest & { body: { description: string } },
  res: Response,
  next: NextFunction
) {
  try {
    const businessId  = req.tenant!.business.toString();
    const { description } = req.body;
    const proposal    = await votesService.createProposal(businessId, description);
    res.status(201).json(proposal);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /votes/proposals
 * List all proposals for the brand
 */
export async function listProposals(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const proposals  = await votesService.listProposals(businessId);
    res.json({ proposals });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /votes
 * Record user votes off-chain and batch-submit when threshold is met
 */
export const submitVote = [
  authenticate,
  async (
    req: AuthRequest & TenantRequest & { body: { proposalIds: string[] } },
    res: Response,
    next: NextFunction
  ) => {
    try {
      const businessId   = req.tenant!.business.toString();
      const userId       = req.userId!;
      const { proposalIds } = req.body;

      if (!Array.isArray(proposalIds) || proposalIds.length === 0) {
        return res.status(400).json({ error: 'proposalIds must be a non-empty array' });
      }

      // 1) Save each vote as pending, ensuring one vote per user/proposal
      for (const pid of proposalIds) {
        const voteId = new mongoose.Types.ObjectId().toString();
        try {
          await PendingVote.create({ businessId, proposalId: pid, userId, voteId });
        } catch (e: any) {
          if (e.code === 11000) {
            return res.status(400).json({ error: `Already voted for proposal ${pid}` });
          }
          throw e;
        }
      }

      // 2) Check if threshold reached
      const pending = await PendingVote.find({ businessId });
      const THRESHOLD = 20;
      if (pending.length >= THRESHOLD) {
        const pids       = pending.map(v => v.proposalId);
        const voteIds    = pending.map(v => v.voteId);
        // For web2, our master signer will generate all signatures in the service,
        // so we can pass an empty array here (service will ignore it or re-sign).
        const signatures = voteIds.map(() => '');

        // 3) Batch‐submit all pending votes on-chain
        const result = await votesService.batchSubmitVotes(
          businessId,
          pids,
          voteIds,
          signatures
        );

        // 4) Clear pending votes
        await PendingVote.deleteMany({ businessId });

        return res.status(201).json(result);
      }

      // 5) If not yet at threshold, acknowledge receipt
      res.status(202).json({ message: 'Vote recorded; will batch when threshold reached' });
    } catch (err) {
      next(err);
    }
  }
];

/**
 * GET /votes
 * List all votes cast for the brand
 */
export async function listVotes(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const votes      = await votesService.listVotes(businessId);
    res.json({ votes });
  } catch (err) {
    next(err);
  }
}

