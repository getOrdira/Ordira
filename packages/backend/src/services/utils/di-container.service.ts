// src/services/utils/di-container.service.ts
/**
 * @deprecated Use imports from services/infrastructure/dependency-injection instead
 * 
 * This file maintains backward compatibility by re-exporting
 * from the new modular infrastructure architecture.
 */

export {
  DIContainer,
  container,
  SERVICE_TOKENS,
  type ServiceToken,
  type ServiceConstructor,
  type ServiceFactory,
  type ServiceInstance
} from '../infrastructure/dependency-injection/core/diContainer.service';
