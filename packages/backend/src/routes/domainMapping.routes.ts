// src/routes/domainMapping.routes.ts
import { Router } from 'express';
import Joi from 'joi';
import { validateBody } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { addDomain }    from '../controllers/domainMapping.controller';

const router = Router();

const schema = Joi.object({
  domain: Joi.string().hostname().required()
});

router.post(
  '/',
  authenticate,
  validateBody(schema),
  addDomain
);

export default router;
