import { apiClient } from '../apiClient';
import type { Media } from '../../types/media';
import type { NormalizedBox } from '../faceApi';

interface MediaListResponse {
  media: Media[];
}

interface MediaResponse {
  media: Media;
}

interface SaveFacesResponse {
  media: Media;
}

export const mediaApi = {
  /** GET /api/rooms/:roomId/media */
  list: (roomId: string) =>
    apiClient.get<MediaListResponse>(`/rooms/${roomId}/media`),

  /**
   * POST /api/rooms/:roomId/media
   * Sends the file as multipart/form-data under the field name "file".
   */
  upload: (roomId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.post<MediaResponse>(
      `/rooms/${roomId}/media`,
      formData
    );
  },

  /**
   * POST /api/media/:id/faces
   * Saves the faces (descriptor + bounding box) detected in the browser
   * for this media item. Safe to call again for the same media — it
   * replaces that media's face list rather than appending to it.
   */
  saveFaces: (
    mediaId: string,
    faces: { descriptor: number[]; box: NormalizedBox }[]
  ) =>
    apiClient.post<SaveFacesResponse>(
      `/media/${mediaId}/faces`,
      { faces }
    ),

  /** DELETE /api/media/:id */
  remove: (mediaId: string) =>
    apiClient.delete<{ message: string }>(`/media/${mediaId}`),

  /** POST /api/media/:id/analyze — trigger or retry AI analysis. */
  analyze: (mediaId: string) =>
    apiClient.post<MediaResponse>(`/media/${mediaId}/analyze`),
};