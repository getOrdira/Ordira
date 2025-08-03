// src/routes/notification.routes.ts

import { Router } from 'express';
import {
  getNotifications,
  readNotification
} from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authenticateManufacturer } from '../middleware/manufacturerAuth.middleware';

const brandRouter = Router();
brandRouter.use(authenticate);

brandRouter.get('/', getNotifications);
brandRouter.post('/:id/read', readNotification);


const mfgRouter = Router();
mfgRouter.use(authenticateManufacturer);

mfgRouter.get('/', getNotifications);
mfgRouter.post('/:id/read', readNotification);


// You can mount both under the same path prefix if desired:
const router = Router();
router.use('/brand', brandRouter);
router.use('/manufacturer', mfgRouter);

export default router;

