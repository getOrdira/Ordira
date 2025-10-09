export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  recent: number;
}
