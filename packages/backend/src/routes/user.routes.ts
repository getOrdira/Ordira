//user.routes.ts

import { Router } from 'express';
import * as userCtrl from '../controllers/user.controller';
import { validateBody } from '../middleware/validation.middleware';
import { registerUserSchema, verifyUserSchema, loginUserSchema } from '../validation/auth.validation';

const router = Router();

router.post(
  '/users/register',
  validateBody(registerUserSchema),
  userCtrl.registerUser
);

router.post(
  '/users/verify',
  validateBody(verifyUserSchema),
  userCtrl.verifyUser
);

router.post(
  '/users/login',
  validateBody(loginUserSchema),
  userCtrl.loginUser
);

export default router;