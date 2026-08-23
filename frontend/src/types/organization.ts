import type { Media } from './media';

export interface EventGroup {
  event: string;
  count: number;
  media: Media[];
}

export interface TimelineMonth {
  month: string;
  count: number;
  media: Media[];
}

export interface TimelineYear {
  year: number;
  months: TimelineMonth[];
}

export interface DuplicateGroup {
  count: number;
  media: Media[];
}