export interface MonthCount {
  month: string;
  count: number;
}

export interface DayCount {
  day: string;
  count: number;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface EventCount {
  event: string;
  count: number;
}

export interface PlaceCount {
  place: string;
  count: number;
}

export interface ObjectCount {
  object: string;
  count: number;
}

export interface RoomStat {
  roomId: string;
  roomName: string;
  memberCount: number;
  memoryCount: number;
  mostRecentUpload: string | null;
}

export interface AiStatusBreakdown {
  completed: number;
  pending: number;
  failed: number;
  notAnalyzed: number;
}

/** Matches the JSON returned by GET /api/analytics/overview and
 * GET /api/analytics/room/:roomId (the latter omits roomStats). */
export interface AnalyticsOverview {
  totalMemories: number;
  photosCount: number;
  videosCount: number;
  totalRooms: number;
  totalStorageBytes: number;
  aiStatus: AiStatusBreakdown;
  uploadsOverTime: MonthCount[];
  mostActiveDays: DayCount[];
  topTags: TagCount[];
  topEvents: EventCount[];
  topPlaces: PlaceCount[];
  topObjects: ObjectCount[];
  roomStats?: RoomStat[];
}