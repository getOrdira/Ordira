// src/utils/routeHelpers.ts
/**
 * @deprecated Use imports from services/infrastructure/http/features instead
 * 
 * This file maintains backward compatibility by re-exporting
 * from the new modular infrastructure architecture.
 */

export {
  asRouteHandler,
  createValidatedRouteHandler,
  asRateLimitHandler,
  route
} from '../services/infrastructure/http/features/routeHelpers.service';
