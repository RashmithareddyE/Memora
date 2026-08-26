const mongoose = require('mongoose');
const Media = require('../models/Media');
const Room = require('../models/Room');
const { getAccessibleRoomIds } = require('./memorySearch.service');
const { resolveRoomIds } = require('./mediaOrganization.service');

function emptyStats() {
  return {
    totalMemories: 0,
    photosCount: 0,
    videosCount: 0,
    totalStorageBytes: 0,
    aiStatus: { completed: 0, pending: 0, failed: 0, notAnalyzed: 0 },
    uploadsOverTime: [],
    mostActiveDays: [],
    topTags: [],
    topEvents: [],
    topPlaces: [],
    topObjects: [],
  };
}

/**
 * Single round trip to MongoDB using $facet to compute every metric at
 * once, rather than loading every media document into Node and looping
 * over it in JavaScript. Each facet branch is its own small aggregation
 * over the same already-matched set of documents.
 */
async function runAnalyticsAggregation(roomIds) {
  if (roomIds.length === 0) return emptyStats();

  const objectIdRoomIds = roomIds.map((id) =>
    id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id)
  );

  const [result] = await Media.aggregate([
    { $match: { room: { $in: objectIdRoomIds } } },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalMemories: { $sum: 1 },
              photosCount: { $sum: { $cond: [{ $eq: ['$mediaType', 'image'] }, 1, 0] } },
              videosCount: { $sum: { $cond: [{ $eq: ['$mediaType', 'video'] }, 1, 0] } },
              totalStorageBytes: { $sum: { $ifNull: ['$size', 0] } },
            },
          },
        ],
        aiStatusBreakdown: [{ $group: { _id: '$aiStatus', count: { $sum: 1 } } }],
        uploadsOverTime: [
          { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ],
        mostActiveDays: [
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ],
        topTags: [
          { $match: { 'aiAnalysis.tags.0': { $exists: true } } },
          { $unwind: '$aiAnalysis.tags' },
          { $group: { _id: '$aiAnalysis.tags', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ],
        topEvents: [
          { $match: { 'aiAnalysis.events.0': { $exists: true } } },
          { $unwind: '$aiAnalysis.events' },
          { $group: { _id: '$aiAnalysis.events', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ],
        topPlaces: [
          { $match: { 'aiAnalysis.places.0': { $exists: true } } },
          { $unwind: '$aiAnalysis.places' },
          { $group: { _id: '$aiAnalysis.places', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ],
        topObjects: [
          { $match: { 'aiAnalysis.objects.0': { $exists: true } } },
          { $unwind: '$aiAnalysis.objects' },
          { $group: { _id: '$aiAnalysis.objects', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ],
        roomBreakdown: [
          {
            $group: {
              _id: '$room',
              memoryCount: { $sum: 1 },
              mostRecentUpload: { $max: '$createdAt' },
            },
          },
        ],
      },
    },
  ]);

  const totals = result.totals[0] || {
    totalMemories: 0,
    photosCount: 0,
    videosCount: 0,
    totalStorageBytes: 0,
  };

  const aiStatus = { completed: 0, pending: 0, failed: 0, notAnalyzed: 0 };
  for (const entry of result.aiStatusBreakdown) {
    if (entry._id === 'completed') aiStatus.completed = entry.count;
    else if (entry._id === 'pending') aiStatus.pending = entry.count;
    else if (entry._id === 'failed') aiStatus.failed = entry.count;
    else aiStatus.notAnalyzed += entry.count; // covers 'not_analyzed' and any null/missing value
  }

  return {
    totalMemories: totals.totalMemories,
    photosCount: totals.photosCount,
    videosCount: totals.videosCount,
    totalStorageBytes: totals.totalStorageBytes,
    aiStatus,
    uploadsOverTime: result.uploadsOverTime.map((entry) => ({ month: entry._id, count: entry.count })),
    mostActiveDays: result.mostActiveDays.map((entry) => ({ day: entry._id, count: entry.count })),
    topTags: result.topTags.map((entry) => ({ tag: entry._id, count: entry.count })),
    topEvents: result.topEvents.map((entry) => ({ event: entry._id, count: entry.count })),
    topPlaces: result.topPlaces.map((entry) => ({ place: entry._id, count: entry.count })),
    topObjects: result.topObjects.map((entry) => ({ object: entry._id, count: entry.count })),
    // Kept internal — buildOverview() turns this into the public roomStats
    // shape below; the single-room endpoint doesn't need it.
    _roomBreakdown: result.roomBreakdown,
  };
}

/** Cross-room overview: every room the user belongs to. */
async function buildOverview(userId) {
  const roomIds = await getAccessibleRoomIds(userId);
  if (roomIds.length === 0) {
    return { ...emptyStats(), totalRooms: 0, roomStats: [] };
  }

  const stats = await runAnalyticsAggregation(roomIds);
  const { _roomBreakdown, ...publicStats } = stats;

  const rooms = await Room.find({ _id: { $in: roomIds } })
    .select('name members')
    .lean();

  const breakdownByRoomId = new Map(_roomBreakdown.map((entry) => [entry._id.toString(), entry]));

  const roomStats = rooms
    .map((room) => {
      const breakdown = breakdownByRoomId.get(room._id.toString());
      return {
        roomId: room._id.toString(),
        roomName: room.name,
        memberCount: room.members.length,
        memoryCount: breakdown ? breakdown.memoryCount : 0,
        mostRecentUpload: breakdown ? breakdown.mostRecentUpload : null,
      };
    })
    .sort((a, b) => b.memoryCount - a.memoryCount);

  return { ...publicStats, totalRooms: roomIds.length, roomStats };
}

/**
 * Single-room analytics. Returns null if the user isn't actually a member
 * of roomId — callers should treat that as 403, never fall back to any
 * other room's data.
 */
async function buildRoomAnalytics(userId, roomId) {
  const scopedRoomIds = await resolveRoomIds(userId, roomId);
  if (scopedRoomIds.length === 0) return null;

  const stats = await runAnalyticsAggregation(scopedRoomIds);
  const { _roomBreakdown, ...publicStats } = stats;
  return { ...publicStats, totalRooms: 1 };
}

module.exports = { buildOverview, buildRoomAnalytics };