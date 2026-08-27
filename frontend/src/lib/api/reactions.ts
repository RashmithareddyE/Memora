import { apiClient } from '../apiClient';

export const REACTION_TYPES = [
  '❤️',
  '👍',
  '😂',
  '😮',
  '😢',
  '🔥',
] as const;

export type ReactionType =
  (typeof REACTION_TYPES)[number];

export interface ReactionCounts {
  '❤️': number;
  '👍': number;
  '😂': number;
  '😮': number;
  '😢': number;
  '🔥': number;
}

export interface ReactionState {
  counts: ReactionCounts;
  mine: ReactionType | null;
}

export const reactionsApi = {
  get: (mediaId: string) =>
    apiClient.get<ReactionState>(
      `/media/${mediaId}/reactions`
    ),

  set: (
    mediaId: string,
    type: ReactionType
  ) =>
    apiClient.put<ReactionState>(
      `/media/${mediaId}/reactions`,
      { type }
    ),

  remove: (mediaId: string) =>
    apiClient.delete<ReactionState>(
      `/media/${mediaId}/reactions`
    ),
};