// src/routes/auth.routes.ts
import { Router } from 'express';
import {
  registerBusinessHandler,
  verifyBusinessHandler,
  loginBusinessHandler,
  registerUserHandler,
  verifyUserHandler,
  loginUserHandler
} from '../controllers/auth.controller';
import {
  registerBusinessSchema,
  verifyBusinessSchema,
  loginBusinessSchema,
  registerUserSchema,
  verifyUserSchema,
  loginUserSchema
} from '../validation/auth.validation';
import { validateBody } from '../middleware/validation.middleware'; 

const router = Router();

// Business flows
router.post('/register/business', validateBody(registerBusinessSchema), registerBusinessHandler);
router.post('/verify/business',   validateBody(verifyBusinessSchema),   verifyBusinessHandler);
router.post('/login/business',    validateBody(loginBusinessSchema),    loginBusinessHandler);

// User flows
router.post('/register/user',     validateBody(registerUserSchema),     registerUserHandler);
router.post('/verify/user',       validateBody(verifyUserSchema),       verifyUserHandler);
router.post('/login/user',        validateBody(loginUserSchema),        loginUserHandler);

export default router;


