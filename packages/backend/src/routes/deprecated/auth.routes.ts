// src/routes/auth.routes.ts

import { Router, RequestHandler } from 'express';
import { validateBody } from '../../middleware/deprecated/validation.middleware';
import { asRouteHandler, asRateLimitHandler } from '../../utils/routeHelpers';
import { strictRateLimiter } from '../../middleware/deprecated/rateLimiter.middleware';
import * as authCtrl from '../../controllers/deprecated/auth.controller';
import { authValidationSchemas } from '../../validation/auth.validation';

const router = Router();

const brandContextMiddleware: RequestHandler = (req, _res, next) => {
  const slug = req.params?.brandSlug;
  if (slug) {
    (req as any).brandSlug = slug;
    if ((req as any).validatedBody) {
      (req as any).validatedBody.brandSlug = slug;
    }
  }
  next();
};

// Business auth routes
router.post(
  '/register/business',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(authValidationSchemas.registerBusiness),
  asRouteHandler(authCtrl.registerBusinessHandler)
);

router.post(
  '/register/manufacturer',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(authValidationSchemas.registerManufacturer),
  asRouteHandler(authCtrl.registerManufacturerHandler)
);

router.post(
  '/verify/manufacturer',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(authValidationSchemas.verifyManufacturer),
  asRouteHandler(authCtrl.verifyManufacturerHandler)
);

router.post(
  '/login/manufacturer',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(authValidationSchemas.loginManufacturer),
  asRouteHandler(authCtrl.loginManufacturerHandler)
);

router.post(
  '/verify/business',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(authValidationSchemas.verifyBusiness),
  asRouteHandler(authCtrl.verifyBusinessHandler)
);

router.post(
  '/login/business',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(authValidationSchemas.loginBusiness),
  asRouteHandler(authCtrl.loginBusinessHandler)
);

// User auth routes
router.post(
  '/register/user/:brandSlug',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(authValidationSchemas.registerUser),
  brandContextMiddleware,
  asRouteHandler(authCtrl.registerUserHandler)
);

router.post(
  '/register/user',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(authValidationSchemas.registerUser),
  asRouteHandler(authCtrl.registerUserHandler)
);

router.post(
  '/verify/user',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(authValidationSchemas.verifyUser),
  asRouteHandler(authCtrl.verifyUserHandler)
);

router.post(
  '/login/user',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(authValidationSchemas.loginUser),
  asRouteHandler(authCtrl.loginUserHandler)
);

// Shared auth utilities
router.post(
  '/resend-verification',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(authValidationSchemas.resendVerification),
  asRouteHandler(authCtrl.resendVerificationHandler)
);

router.post(
  '/forgot-password',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(authValidationSchemas.forgotPassword),
  asRouteHandler(authCtrl.forgotPasswordHandler)
);

router.post(
  '/reset-password',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(authValidationSchemas.resetPassword),
  asRouteHandler(authCtrl.resetPasswordHandler)
);

export default router;
