// src/routes/analytics.routes.ts
import { Router } from 'express';
import {
  getVotesAnalytics,
  getTransactionsAnalytics
} from '../controllers/analytics.controller';

const analyticsRouter = Router();
analyticsRouter.get('/votes', getVotesAnalytics);
analyticsRouter.get('/transactions', getTransactionsAnalytics);
export default analyticsRouter;