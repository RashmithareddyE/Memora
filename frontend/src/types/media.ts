export type MediaKind = 'image' | 'video';

export type AiStatus = 'not_analyzed' | 'pending' | 'completed' | 'failed';

/** Matches the populated `uploader` field (Room.controller.js-style `name email` select). */
export interface MediaUploader {
  _id: string;
  name: string;
  email: string;
}

/** Matches Media.aiAnalysis exactly (see backend/models/Media.js). */
export interface MediaAiAnalysis {
  description: string | null;
  people: string[];
  places: string[];
  objects: string[];
  events: string[];
  tags: string[];
  analyzedAt: string | null;
}

/** Matches the `media` object returned by every media endpoint (storageKey is
 * always excluded server-side, so it's intentionally not part of this type). */
export interface Media {
  _id: string;
  room: string;
  uploader: MediaUploader;
  originalName: string;
  publicUrl: string;
  mimeType: string;
  size: number;
  mediaType: MediaKind;
  aiStatus: AiStatus;
  aiError: string | null;
  aiAnalysis: MediaAiAnalysis | null;
  createdAt: string;
}