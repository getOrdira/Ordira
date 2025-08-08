// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import {
  registerBusiness,
  verifyBusiness,
  loginBusiness,
  registerUser,
  verifyUser,
  loginUser,
  RegisterBusinessInput,
  VerifyBusinessInput,
  LoginBusinessInput,
  RegisterUserInput,
  VerifyUserInput,
  LoginUserInput
} from '../services/business/auth.service';

/**
 * POST /auth/register/business
 */
export async function registerBusinessHandler(
  req: Request<{}, {}, RegisterBusinessInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { businessId } = await registerBusiness(req.body);
    res.status(201).json({ businessId });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/verify/business
 */
export async function verifyBusinessHandler(
  req: Request<{}, {}, VerifyBusinessInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await verifyBusiness(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/login/business
 */
export async function loginBusinessHandler(
  req: Request<{}, {}, LoginBusinessInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await loginBusiness(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/register/user
 */
export async function registerUserHandler(
  req: Request<{}, {}, RegisterUserInput>,
  res: Response,
  next: NextFunction
) {
  try {
    await registerUser(req.body);
    res.sendStatus(201);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/verify/user
 */
export async function verifyUserHandler(
  req: Request<{}, {}, VerifyUserInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await verifyUser(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/login/user
 */
export async function loginUserHandler(
  req: Request<{}, {}, LoginUserInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await loginUser(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}



