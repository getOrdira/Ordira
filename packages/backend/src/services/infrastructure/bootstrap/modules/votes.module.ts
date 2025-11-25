/**
 * Votes Feature Module
 * 
 * Handles voting system routes and middleware registration.
 */

import { Application, Router } from 'express';
import { BaseFeatureModule } from './base.module';
import { ServiceToken } from './types';
import { SERVICE_TOKENS } from '../../dependency-injection/core/diContainer.service';
import { logger } from '../../logging';

export class VotesModule extends BaseFeatureModule {
  readonly name = 'votes';

  getDependencies(): ServiceToken[] {
    return [
      SERVICE_TOKENS.VOTING_RECORD_MODEL,
      SERVICE_TOKENS.TENANT_SERVICE
    ];
  }

  async registerRoutes(app: Application): Promise<void> {
    logger.info(`📦 Registering ${this.name} module routes...`);

    // Import vote route modules
    const voteRoutesModule = await import('../../../../routes/features/votes');
    const { Router } = await import('express');

    // Combine modular routes into unified router
    const votesRoutes = Router();
    votesRoutes.use('/', voteRoutesModule.votesDataRoutes);
    votesRoutes.use('/contract', voteRoutesModule.votesContractRoutes);
    votesRoutes.use('/stats', voteRoutesModule.votesStatsRoutes);
    votesRoutes.use('/analytics', voteRoutesModule.votesAnalyticsRoutes);
    votesRoutes.use('/dashboard', voteRoutesModule.votesDashboardRoutes);
    votesRoutes.use('/proposals', voteRoutesModule.votesProposalsRoutes);
    votesRoutes.use('/proposals/management', voteRoutesModule.votesProposalManagementRoutes);
    votesRoutes.use('/deployment', voteRoutesModule.votesDeploymentRoutes);

    // Voting system - all plans have access, quantity limits enforced by enforcePlanLimits middleware
    app.use('/api/votes', votesRoutes);

    logger.info(`✅ ${this.name} module routes registered`);
  }
}

