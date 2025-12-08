import { apiClient } from './api-client';

export interface AuditStats {
  total_entries: number;
  entries_today: number;
  entries_this_week: number;
  entries_this_month: number;
  top_actions: Array<{
    action: string;
    count: number;
  }>;
  top_entities: Array<{
    entity: string;
    count: number;
  }>;
  top_users: Array<{
    user_id: string;
    count: number;
  }>;
  severity_breakdown: Record<string, number>;
}

export interface AuditService {
  getAuditStats(): Promise<AuditStats>;
}

class AuditServiceImpl implements AuditService {
  async getAuditStats(): Promise<AuditStats> {
    const response = await apiClient.get<AuditStats>('/audit/logs/statistics');
    return response;
  }
}

export const auditService = new AuditServiceImpl();