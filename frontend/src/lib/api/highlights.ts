import { apiClient } from '../apiClient';
import type { Highlight } from '../../types/highlights';
import type { Recommendation } from '../../types/highlights';

const roomQuery = (roomId?: string) => (roomId ? `?roomId=${encodeURIComponent(roomId)}` : '');

export const highlightsApi = {
  /** GET /api/highlights?roomId= */
  highlights: (roomId?: string) => apiClient.get<{ highlights: Highlight[] }>(`/highlights${roomQuery(roomId)}`),

  /** GET /api/recommendations?roomId= */
  recommendations: (roomId?: string) =>
    apiClient.get<{ recommendations: Recommendation[] }>(`/recommendations${roomQuery(roomId)}`),
};