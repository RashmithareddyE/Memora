import type { Media } from './media';

export interface Highlight {
  title: string;
  reason: string;
  media: Media[];
}

export interface RecommendationReasonDetails {
  type: 'matching_tags' | 'matching_event' | 'recent_activity';
  matchCount: number;
  tag?: string;
  event?: string;
}

export interface Recommendation {
  title: string;
  explanation: string;
  reasonDetails: RecommendationReasonDetails;
  media: Media[];
}