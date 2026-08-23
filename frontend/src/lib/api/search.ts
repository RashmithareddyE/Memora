import { apiClient } from '../apiClient';
import type { SearchResponse } from '../../types/search';

interface SearchParams {
  query: string;
  roomId?: string;
  page?: number;
  limit?: number;
}

export const searchApi = {
  /** GET /api/memories/search?q=&roomId=&page=&limit= */
  search: ({ query, roomId, page = 1, limit = 24 }: SearchParams) => {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (roomId) params.set('roomId', roomId);

    return apiClient.get<SearchResponse>(`/memories/search?${params.toString()}`);
  },
};