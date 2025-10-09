export interface NotificationFilters {
  businessId?: string;
  manufacturerId?: string;
  type?: string;
  category?: string;
  priority?: string;
  read?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}
