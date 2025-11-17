/**
 * Service Container - Main Entry Point
 * 
 * This file re-exports the container service from the optimized modular structure.
 * All functionality has been split into:
 * - container/container.service.ts - Core container class
 * - container/container.registrations.ts - Service registration logic
 * - container/container.getters.ts - Getter functions
 * 
 * This maintains backward compatibility while improving maintainability.
 * 
 * File size reduced from ~1250 lines to ~15 lines by extracting:
 * - Service registrations (300+ lines) → container.registrations.ts
 * - Getter functions (600+ lines) → container.getters.ts
 * - Core container logic (50 lines) → container.service.ts
 */

// Re-export everything from the new modular structure
export * from './container/container.service';
