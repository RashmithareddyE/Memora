import { apiClient } from '../apiClient';
import type { Media } from '../../types/media';

export interface Person {
  _id: string;
  name: string | null;
  memoryCount: number;
  representativeMedia:
    | {
        _id: string;
        publicUrl: string;
        originalName: string;
      }
    | null;
}

interface PeopleResponse {
  people: Person[];
}

interface PersonResponse {
  person: Person;
}

interface PersonMediaResponse {
  person: Person;
  media: Media[];
}

export const peopleApi = {
  /** GET /api/rooms/:roomId/people */
  list: (roomId: string) =>
    apiClient.get<PeopleResponse>(
      `/rooms/${roomId}/people`
    ),

  /** PATCH /api/people/:id */
  rename: (personId: string, name: string) =>
    apiClient.patch<PersonResponse>(
      `/people/${personId}`,
      { name }
    ),

  /** GET /api/people/:id/media */
  media: (personId: string) =>
    apiClient.get<PersonMediaResponse>(
      `/people/${personId}/media`
    ),
};