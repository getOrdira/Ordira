/**
 * Core Models Export Hub
 * 
 * Core models are foundational models used across multiple domains:
 * - Business: Brand/Business accounts
 * - Manufacturer: Manufacturer accounts
 * 
 * Note: User model has been moved to models/user/ following modular architecture
 */

export { Business, IBusiness } from './business.model';
export { Manufacturer, IManufacturer } from './manufacturer.model';

// Re-export User from new location for backward compatibility
export { User, IUser, IUserModel } from '../user';

