import { apiClient } from '../apiClient';

export interface CommentUser {
  _id: string;
  name: string;
  email: string;
}

export interface MemoryComment {
  _id: string;
  room: string;
  media: string;
  user: CommentUser;
  text: string;
  createdAt: string;
  updatedAt: string;
}

interface CommentsResponse {
  comments: MemoryComment[];
}

interface CommentResponse {
  comment: MemoryComment;
}

export const commentsApi = {
  list: (mediaId: string) =>
    apiClient.get<CommentsResponse>(
      `/media/${mediaId}/comments`
    ),

  create: (mediaId: string, text: string) =>
    apiClient.post<CommentResponse>(
      `/media/${mediaId}/comments`,
      { text }
    ),

  remove: (commentId: string) =>
    apiClient.delete<{ message: string }>(
      `/comments/${commentId}`
    ),
};