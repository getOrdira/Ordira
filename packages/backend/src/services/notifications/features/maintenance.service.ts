import { notificationDataService } from '../core/notificationData.service';

export class MaintenanceService {
  async cleanupOldNotifications(daysToKeep: number = 90): Promise<{ deleted: number }> {
    const deleted = await notificationDataService.cleanupOlderThan(daysToKeep);
    return { deleted };
  }
}

export const maintenanceService = new MaintenanceService();
