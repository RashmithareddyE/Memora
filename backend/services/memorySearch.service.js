const Media = require('../models/Media');
const Room = require('../models/Room');

// Words that carry no discriminative meaning for a photo-album search
// ("photos of me smiling" and "smiling" should score identically).
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'of', 'with', 'at', 'in', 'on', 'for', 'to', 'from',
  'my', 'me', 'and', 'or', 'is', 'are', 'was', 'were', 'this', 'that',
  'photo', 'photos', 'picture', 'pictures', 'image', 'images', 'pic', 'pics',
  'memory', 'memories', 'show', 'find', 'some', 'any', 'all',
]);

// Small, hand-picked synonym map to broaden natural-language queries against
// the AI-generated tags/events/etc, without needing an embeddings API.
const SYNONYMS = {
  beach: ['beach', 'shore', 'seaside', 'coast', 'ocean', 'sea'],
  birthday: ['birthday', 'bday'],
  party: ['party', 'celebration', 'gathering', 'festivity'],
  celebration: ['celebration', 'party', 'festivity'],
  friend: ['friend', 'friends', 'buddies', 'group'],
  friends: ['friend', 'friends', 'buddies', 'group'],
  family: ['family', 'relatives'],
  smile: ['smile', 'smiling', 'happy', 'laughing', 'laugh'],
  smiling: ['smile', 'smiling', 'happy', 'laughing', 'laugh'],
  dog: ['dog', 'puppy', 'pet'],
  cat: ['cat', 'kitten', 'pet'],
  sunset: ['sunset', 'dusk', 'evening', 'golden hour'],
  sunrise: ['sunrise', 'dawn', 'morning'],
  college: ['college', 'university', 'campus', 'school'],
  indoor: ['indoor', 'inside', 'indoors'],
  indoors: ['indoor', 'inside', 'indoors'],
  outdoor: ['outdoor', 'outside', 'outdoors'],
  outdoors: ['outdoor', 'outside', 'outdoors'],
  trip: ['trip', 'travel', 'vacation', 'journey'],
  travel: ['trip', 'travel', 'vacation', 'journey'],
};

function expandQueryTerms(query) {
  const rawTokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !STOP_WORDS.has(token));

  const expanded = new Set();
  for (const token of rawTokens) {
    expanded.add(token);
    const synonyms = SYNONYMS[token];
    if (synonyms) {
      synonyms.forEach((synonym) => expanded.add(synonym));
    }
  }

  return Array.from(expanded);
}

function scoreMedia(media, terms) {
  const ai = media.aiAnalysis || {};
  const tagsText = (ai.tags || []).join(' ').toLowerCase();
  const eventsText = (ai.events || []).join(' ').toLowerCase();
  const peopleText = (ai.people || []).join(' ').toLowerCase();
  const placesText = (ai.places || []).join(' ').toLowerCase();
  const objectsText = (ai.objects || []).join(' ').toLowerCase();
  const descriptionText = (ai.description || '').toLowerCase();
  const nameText = (media.originalName || '').toLowerCase();

  // Names of the recognized People (face-recognition groups) tagged in
  // this photo — distinct from ai.people, which is free-text AI
  // description ("two friends smiling") rather than actual identities.
  // "Unknown person" is intentionally excluded so a query never matches
  // every unnamed person's photos.
  const recognizedPeopleText = (media.faces || [])
    .map((face) => (face && face.person && face.person.name) || '')
    .filter((personName) => personName && personName !== 'Unknown person')
    .join(' ')
    .toLowerCase();

  let score = 0;
  for (const term of terms) {
    if (recognizedPeopleText.includes(term)) score += 4;
    if (tagsText.includes(term)) score += 3;
    if (eventsText.includes(term)) score += 2.5;
    if (peopleText.includes(term)) score += 2;
    if (placesText.includes(term)) score += 2;
    if (objectsText.includes(term)) score += 1.5;
    if (descriptionText.includes(term)) score += 1;
    if (nameText.includes(term)) score += 0.5;
  }
  return score;
}

async function getAccessibleRoomIds(userId) {
  const rooms = await Room.find({ members: userId }).select('_id');
  return rooms.map((room) => room._id);
}

/**
 * Resolves which room(s) a search should be scoped to. If roomId is given,
 * verifies the user is actually a member of it (returns [] otherwise, which
 * callers should treat as "no results" rather than an error) so a user can
 * never search another room's media by guessing an ID.
 */
async function resolveSearchRoomIds(userId, roomId) {
  if (!roomId) {
    return getAccessibleRoomIds(userId);
  }

  const roomIds = await getAccessibleRoomIds(userId);
  const isMember = roomIds.some((id) => id.toString() === roomId);
  return isMember ? [roomId] : [];
}

/**
 * Natural-language-ish search over media the user can access.
 * Falls back to "most recent" when the query is empty or is only stopwords,
 * so the endpoint is always well-defined instead of erroring.
 */
async function searchMemories({ userId, query, roomId, limit = 24, page = 1 }) {
  const roomIds = await resolveSearchRoomIds(userId, roomId);

  if (roomIds.length === 0) {
    return { results: [], total: 0, page, limit, query: query || '' };
  }

  const trimmedQuery = (query || '').trim();
  const terms = trimmedQuery ? expandQueryTerms(trimmedQuery) : [];

  if (terms.length === 0) {
    const total = await Media.countDocuments({ room: { $in: roomIds } });
    const media = await Media.find({ room: { $in: roomIds } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-storageKey')
      .populate('uploader', 'name email')
      .lean();

    return {
      results: media.map((item) => ({ media: item, score: 0 })),
      total,
      page,
      limit,
      query: trimmedQuery,
    };
  }
   const candidates = await Media.find({
  room: { $in: roomIds },
})
  .select('-storageKey')
  .populate('uploader', 'name email')
  .populate('faces.person', 'name')
  .lean();

  const scored = candidates
    .map((media) => ({ media, score: scoreMedia(media, terms) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.media.createdAt) - new Date(a.media.createdAt);
    });

  const total = scored.length;
  const start = (page - 1) * limit;
  const results = scored.slice(start, start + limit);

  return { results, total, page, limit, query: trimmedQuery };
}

module.exports = { searchMemories, getAccessibleRoomIds };