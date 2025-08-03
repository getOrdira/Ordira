// src/controllers/notification.controller.ts

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AuthRequest as AuthMfgRequest } from '../middleware/manufacturerAuth.middleware';
import * as notificationSvc from '../services/notification.service';

export async function getNotifications(
  req: AuthRequest | AuthMfgRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId!;
    const notifications = await notificationSvc.listNotifications(userId);
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
}

export async function readNotification(
  req: (AuthRequest | AuthMfgRequest) & { params: { id: string } },
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const updated = await notificationSvc.markAsRead(userId, id);
    res.json({ notification: updated });
  } catch (err) {
    next(err);
  }
}

