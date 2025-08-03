// src/controllers/user.controller.ts

import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';


export async function registerUser(
  req: Request<{}, {}, { email: string; password: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password } = req.body;
    // service signature: registerUser(email, password)
    await authService.registerUser({ email, password });
    res.status(201).json({ message: 'Registration successful. Check your email for verification code.' });
  } catch (err) {
    next(err);
  }
}


export async function verifyUser(
  req: Request<{}, {}, { email: string; emailCode: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, emailCode } = req.body;
    // service signature: verifyUser(email, code)
    const { token } = await authService.verifyUser({ email, code: emailCode });
    res.json({ token });
  } catch (err) {
    next(err);
  }
}


export async function loginUser(
  req: Request<{}, {}, { email: string; password: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password } = req.body;
    // service signature: loginUser(email, password)
    const { token } = await authService.loginUser({ email, password });
    res.json({ token });
  } catch (err) {
    next(err);
  }
}
