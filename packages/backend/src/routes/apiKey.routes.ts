import { Router } from 'express';
import * as ctrl from '../controllers/apiKey.controller';
import { authenticate } from '../middleware/auth.middleware';

interface BrandReq extends Request {
  user: { id: string };
}

const router = Router();

router.post('/', authenticate, ctrl.createKey);
router.get('/',  authenticate, ctrl.listKeys);
router.delete('/:id', authenticate, ctrl.revokeKey);

export default router;
