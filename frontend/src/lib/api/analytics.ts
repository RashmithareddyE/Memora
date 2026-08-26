import { apiClient } from '../apiClient';
import type { AnalyticsOverview } from '../../types/analytics';

export const analyticsApi = {
  /** GET /api/analytics/overview */
  overview: () => apiClient.get<{ overview: AnalyticsOverview }>('/analytics/overview'),

  /** GET /api/analytics/room/:roomId */
  room: (roomId: string) => apiClient.get<{ analytics: AnalyticsOverview }>(`/analytics/room/${roomId}`),
};