// src/lib/api/index.ts
// Main API barrel export


export * from './core';
export * from './features';
export * from './integrations';

export { api, manufacturerApi, publicApi, default as apiClient } from './client';
export type { default as ApiClient } from './client';
