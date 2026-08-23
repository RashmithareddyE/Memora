import type { Media } from './media';

export interface SearchResultItem {
  media: Media;
  score: number;
}

/** Matches the JSON returned by GET /api/memories/search exactly. */
export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
  query: string;
}