const Media = require('../models/Media');
const Room = require('../models/Room');
const MediaHash = require('../models/MediaHash');
const { computeDHashFromUrl, hammingDistance } = require('./imageHash.service');
const { getAccessibleRoomIds } = require('./memorySearch.service');

/**
 * Resolves which room(s) to scope a query to, verifying membership when a
 * specific room is requested. Returns [] if the user has no access — callers
 * should treat an empty room-id list as "no results", not an error.
 */
async function resolveRoomIds(userId, roomId) {
  if (!roomId) {
    return getAccessibleRoomIds(userId);
  }

  const room = await Room.findById(roomId);
  if (!room || !room.members.some((memberId) => memberId.toString() === userId)) {
    return [];
  }
  return [room._id];
}

async function getScopedMedia(userId, roomId) {
  const roomIds = await resolveRoomIds(userId, roomId);
  if (roomIds.length === 0) return [];

  return Media.find({ room: { $in: roomIds } })
    .select('-storageKey')
    .populate('uploader', 'name email')
    .sort({ createdAt: -1 })
    .lean();
}

function titleCase(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// --- A. Event grouping ---
// Groups by the first AI-detected "event" phrase, falling back to the first
// tag, and finally to "Ungrouped" for media with no AI analysis yet.
async function groupByEvent(userId, roomId) {
  const media = await getScopedMedia(userId, roomId);
  const groups = new Map();

  for (const item of media) {
    const ai = item.aiAnalysis;
    const key = (ai && ai.events && ai.events[0]) || (ai && ai.tags && ai.tags[0]) || null;
    const label = key ? titleCase(key) : 'Ungrouped';

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(item);
  }

  return Array.from(groups.entries())
    .map(([event, items]) => ({ event, count: items.length, media: items }))
    .sort((a, b) => {
      // Keep "Ungrouped" last regardless of count, since it isn't a real event.
      if (a.event === 'Ungrouped') return 1;
      if (b.event === 'Ungrouped') return -1;
      return b.count - a.count;
    });
}

// --- B. Timeline ---
function buildTimeline(mediaList) {
  const years = new Map();

  for (const item of mediaList) {
    const date = new Date(item.createdAt);
    const year = date.getFullYear();
    const month = date.toLocaleString('en-US', { month: 'long' });

    if (!years.has(year)) years.set(year, new Map());
    const months = years.get(year);
    if (!months.has(month)) months.set(month, []);
    months.get(month).push(item);
  }

  return Array.from(years.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, monthsMap]) => ({
      year,
      months: Array.from(monthsMap.entries())
        .sort((a, b) => new Date(`${b[0]} 1, 2000`) - new Date(`${a[0]} 1, 2000`))
        .map(([month, items]) => ({ month, count: items.length, media: items })),
    }));
}

async function getTimeline(userId, roomId) {
  const media = await getScopedMedia(userId, roomId);
  return buildTimeline(media);
}

// --- C. Duplicate detection ---
// Hamming distance out of 64 bits below which two images are treated as
// near-duplicates. Low enough to avoid false positives on unrelated photos,
// high enough to catch re-saves/re-crops/minor edits.
const DUPLICATE_THRESHOLD = 8;

async function ensureHash(media) {
  const existing = await MediaHash.findOne({ media: media._id });
  if (existing) return existing.hash;

  try {
    const hash = await computeDHashFromUrl(media.publicUrl);
    await MediaHash.create({ media: media._id, hash });
    return hash;
  } catch (error) {
    console.error(`Could not compute hash for media ${media._id}:`, error);
    return null;
  }
}

async function findDuplicates(userId, roomId) {
  const media = await getScopedMedia(userId, roomId);
  const images = media.filter((item) => item.mediaType === 'image');

  // Hashes are computed lazily here (rather than at upload time) so this
  // feature needed zero changes to the existing upload flow.
  const withHashes = [];
  for (const item of images) {
    const hash = await ensureHash(item);
    if (hash) withHashes.push({ ...item, hash });
  }

  const visited = new Set();
  const groups = [];

  for (let i = 0; i < withHashes.length; i++) {
    const a = withHashes[i];
    if (visited.has(a._id.toString())) continue;

    const cluster = [a];
    visited.add(a._id.toString());

    for (let j = i + 1; j < withHashes.length; j++) {
      const b = withHashes[j];
      if (visited.has(b._id.toString())) continue;

      if (hammingDistance(a.hash, b.hash) <= DUPLICATE_THRESHOLD) {
        cluster.push(b);
        visited.add(b._id.toString());
      }
    }

    if (cluster.length > 1) {
      groups.push({
        count: cluster.length,
        media: cluster.map(({ hash, ...rest }) => rest),
      });
    }
  }

  return groups.sort((a, b) => b.count - a.count);
}

module.exports = { groupByEvent, getTimeline, findDuplicates, getScopedMedia, resolveRoomIds };