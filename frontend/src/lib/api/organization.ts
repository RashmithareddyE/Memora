import { apiClient } from '../apiClient';
import type { EventGroup, TimelineYear, DuplicateGroup } from '../../types/organization';

const roomQuery = (roomId?: string) => (roomId ? `?roomId=${encodeURIComponent(roomId)}` : '');

export const organizationApi = {
  /** GET /api/organization/events?roomId= */
  events: (roomId?: string) => apiClient.get<{ events: EventGroup[] }>(`/organization/events${roomQuery(roomId)}`),

  /** GET /api/organization/timeline?roomId= */
  timeline: (roomId?: string) =>
    apiClient.get<{ timeline: TimelineYear[] }>(`/organization/timeline${roomQuery(roomId)}`),

  /** GET /api/organization/duplicates?roomId= */
  duplicates: (roomId?: string) =>
    apiClient.get<{ duplicates: DuplicateGroup[] }>(`/organization/duplicates${roomQuery(roomId)}`),
};