const { getScopedMedia } = require('./mediaOrganization.service');

// ============================================================
// Highlight configuration
// ============================================================

const MIN_TAG_COUNT = 3;
const MIN_HIGHLIGHT_MEDIA = 2;
const MAX_MEDIA_PER_HIGHLIGHT = 4;
const MAX_TAG_HIGHLIGHTS = 4;

const MIN_RECOMMENDATION_COUNT = 2;
const MAX_MEDIA_PER_RECOMMENDATION = 4;
const MAX_TAG_RECOMMENDATIONS = 3;

// These tags don't provide enough useful meaning to deserve
// their own highlight section.
const GENERIC_TAGS = new Set([
  'photo',
  'photos',
  'picture',
  'pictures',
  'image',
  'images',
  'pic',
  'pics',
  'person',
  'people',
  'human',
  'humans',
  'face',
  'faces',
  'indoor',
  'inside',
  'outdoor',
  'outside',
  'object',
  'objects',
]);

// ============================================================
// Helpers
// ============================================================

function normalizeTag(tag) {
  return String(tag || '').trim().toLowerCase();
}

function titleCase(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getMediaId(media) {
  return media?._id?.toString();
}

function tagFrequency(mediaList) {
  const freq = new Map();

  for (const item of mediaList) {
    const tags = (item.aiAnalysis && item.aiAnalysis.tags) || [];

    for (const rawTag of tags) {
      const tag = normalizeTag(rawTag);

      if (!tag || GENERIC_TAGS.has(tag)) {
        continue;
      }

      freq.set(tag, (freq.get(tag) || 0) + 1);
    }
  }

  return freq;
}

function eventFrequency(mediaList) {
  const freq = new Map();

  for (const item of mediaList) {
    const events = (item.aiAnalysis && item.aiAnalysis.events) || [];

    for (const rawEvent of events) {
      const event = String(rawEvent || '').trim();

      if (!event) {
        continue;
      }

      freq.set(event, (freq.get(event) || 0) + 1);
    }
  }

  return freq;
}

/**
 * Returns media belonging to a tag.
 */
function mediaForTag(mediaList, tag) {
  const normalizedTag = normalizeTag(tag);

  return mediaList.filter((item) =>
    (item.aiAnalysis?.tags || []).some(
      (itemTag) => normalizeTag(itemTag) === normalizedTag
    )
  );
}

/**
 * Selects media that haven't already appeared in another
 * highlight/recommendation section.
 *
 * This is the main anti-repetition mechanism.
 */
function selectUniqueMedia(items, usedIds, maxItems) {
  const selected = [];

  for (const item of items) {
    const id = getMediaId(item);

    if (!id || usedIds.has(id)) {
      continue;
    }

    selected.push(item);
    usedIds.add(id);

    if (selected.length >= maxItems) {
      break;
    }
  }

  return selected;
}

/**
 * For small libraries, we deliberately keep the number of
 * sections small instead of repeatedly showing the same few
 * memories.
 */
function getTagHighlightLimit(mediaCount) {
  if (mediaCount <= 5) return 2;
  if (mediaCount <= 10) return 3;
  return MAX_TAG_HIGHLIGHTS;
}

// ============================================================
// Highlights
// ============================================================

/**
 * Builds highlight collections strictly from media that actually
 * exists in the user's accessible rooms.
 *
 * Important behavior:
 * - Generic AI tags don't create sections.
 * - A tag needs at least 3 matching memories.
 * - Each section contains at most 4 memories.
 * - A memory is not repeatedly reused across tag sections.
 * - Small libraries produce fewer sections instead of repetitive UI.
 */
async function getHighlights(userId, roomId) {
  const media = await getScopedMedia(userId, roomId);

  if (media.length === 0) {
    return [];
  }

  const highlights = [];

  // ----------------------------------------------------------
  // Recently Added
  // ----------------------------------------------------------

  // Keep this compact so it doesn't consume the whole small
  // library and prevent meaningful highlights from appearing.
  const recentLimit = media.length <= 5 ? media.length : 4;

  const recent = media.slice(0, recentLimit);

  highlights.push({
    title: 'Recently Added Memories',
    reason: `Your ${recent.length} most recently uploaded ${
      recent.length === 1 ? 'memory' : 'memories'
    }.`,
    media: recent,
  });

  // Track memories already used by the highlight sections.
  // We intentionally start tracking AFTER Recent Memories,
  // because repeating the exact same images everywhere is what
  // we're trying to avoid.
  const usedHighlightIds = new Set(
    recent
      .map(getMediaId)
      .filter(Boolean)
  );

  // ----------------------------------------------------------
  // Most Active Day
  // ----------------------------------------------------------

  const dayBuckets = new Map();

  for (const item of media) {
    const day = new Date(item.createdAt)
      .toISOString()
      .slice(0, 10);

    if (!dayBuckets.has(day)) {
      dayBuckets.set(day, []);
    }

    dayBuckets.get(day).push(item);
  }

  const busiestDay = Array.from(dayBuckets.entries())
    .sort((a, b) => b[1].length - a[1].length)[0];

  if (busiestDay) {
    const [day, items] = busiestDay;

    const availableItems = items.filter(
      (item) => !usedHighlightIds.has(getMediaId(item))
    );

    // Only create the section if it still has enough unique
    // memories to be useful.
    if (availableItems.length >= MIN_HIGHLIGHT_MEDIA) {
      const selected = selectUniqueMedia(
        availableItems,
        usedHighlightIds,
        MAX_MEDIA_PER_HIGHLIGHT
      );

      if (selected.length >= MIN_HIGHLIGHT_MEDIA) {
        const formattedDay = new Date(day).toLocaleDateString(
          undefined,
          {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }
        );

        highlights.push({
          title: 'Your Most Active Memory Day',
          reason: `You added ${selected.length} memories on ${formattedDay}.`,
          media: selected,
        });
      }
    }
  }

  // ----------------------------------------------------------
  // Top Tag Collections
  // ----------------------------------------------------------

  const tagFreq = tagFrequency(media);

  const topTags = Array.from(tagFreq.entries())
    .filter(([, count]) => count >= MIN_TAG_COUNT)
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      return a[0].localeCompare(b[0]);
    })
    .slice(0, getTagHighlightLimit(media.length));

  let tagHighlightsCreated = 0;

  for (const [tag, count] of topTags) {
    if (tagHighlightsCreated >= getTagHighlightLimit(media.length)) {
      break;
    }

    const matching = mediaForTag(media, tag);

    // Prefer memories that haven't appeared in an earlier
    // highlight section.
    const uniqueMatching = matching.filter(
      (item) => !usedHighlightIds.has(getMediaId(item))
    );

    if (uniqueMatching.length < MIN_HIGHLIGHT_MEDIA) {
      continue;
    }

    const selected = selectUniqueMedia(
      uniqueMatching,
      usedHighlightIds,
      MAX_MEDIA_PER_HIGHLIGHT
    );

    if (selected.length < MIN_HIGHLIGHT_MEDIA) {
      continue;
    }

    highlights.push({
      title: `${titleCase(tag)} Memories`,
      reason: `${count} memories tagged "${tag}".`,
      media: selected,
    });

    tagHighlightsCreated += 1;
  }

  // ----------------------------------------------------------
  // Busiest Month
  // ----------------------------------------------------------

  const monthBuckets = new Map();

  for (const item of media) {
    const date = new Date(item.createdAt);

    const key = `${date.toLocaleString('en-US', {
      month: 'long',
    })} ${date.getFullYear()}`;

    if (!monthBuckets.has(key)) {
      monthBuckets.set(key, []);
    }

    monthBuckets.get(key).push(item);
  }

  const topMonth = Array.from(monthBuckets.entries())
    .sort((a, b) => b[1].length - a[1].length)[0];

  if (topMonth) {
    const [month, items] = topMonth;

    const availableItems = items.filter(
      (item) => !usedHighlightIds.has(getMediaId(item))
    );

    if (availableItems.length >= MIN_HIGHLIGHT_MEDIA) {
      const selected = selectUniqueMedia(
        availableItems,
        usedHighlightIds,
        MAX_MEDIA_PER_HIGHLIGHT
      );

      if (selected.length >= MIN_HIGHLIGHT_MEDIA) {
        highlights.push({
          title: `Your ${month} Memories`,
          reason: `${selected.length} memories from ${month}.`,
          media: selected,
        });
      }
    }
  }

  return highlights;
}

// ============================================================
// Recommendations
// ============================================================

/**
 * Explainable recommendations.
 *
 * Recommendations now deliberately diversify their media:
 * the same memory isn't repeatedly returned for every matching
 * tag/event/recent-activity recommendation.
 */
async function getRecommendations(userId, roomId) {
  const media = await getScopedMedia(userId, roomId);

  if (media.length === 0) {
    return [];
  }

  const recommendations = [];

  // Track memories already surfaced by recommendation cards.
  const usedRecommendationIds = new Set();

  // ----------------------------------------------------------
  // Tag recommendations
  // ----------------------------------------------------------

  const tagFreq = tagFrequency(media);

  const topTags = Array.from(tagFreq.entries())
    .filter(([, count]) => count >= MIN_RECOMMENDATION_COUNT)
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      return a[0].localeCompare(b[0]);
    })
    .slice(
      0,
      media.length <= 5 ? 2 : MAX_TAG_RECOMMENDATIONS
    );

  let tagRecommendationsCreated = 0;

  for (const [tag, count] of topTags) {
    if (
      tagRecommendationsCreated >=
      (media.length <= 5 ? 2 : MAX_TAG_RECOMMENDATIONS)
    ) {
      break;
    }

    const matching = mediaForTag(media, tag);

    const uniqueMatching = matching.filter(
      (item) => !usedRecommendationIds.has(getMediaId(item))
    );

    if (uniqueMatching.length < MIN_RECOMMENDATION_COUNT) {
      continue;
    }

    const selected = selectUniqueMedia(
      uniqueMatching,
      usedRecommendationIds,
      MAX_MEDIA_PER_RECOMMENDATION
    );

    if (selected.length < MIN_RECOMMENDATION_COUNT) {
      continue;
    }

    recommendations.push({
      title: `Revisit your "${tag}" memories`,
      explanation: `${count} of your memories share the tag "${tag}".`,
      reasonDetails: {
        type: 'matching_tags',
        tag,
        matchCount: count,
      },
      media: selected,
    });

    tagRecommendationsCreated += 1;
  }

  // ----------------------------------------------------------
  // Event recommendation
  // ----------------------------------------------------------

  const eventFreq = eventFrequency(media);

  const topEvent = Array.from(eventFreq.entries())
    .filter(([, count]) => count >= MIN_RECOMMENDATION_COUNT)
    .sort((a, b) => b[1] - a[1])[0];

  if (topEvent) {
    const [event, count] = topEvent;

    const matching = media.filter(
      (item) =>
        (item.aiAnalysis?.events || []).includes(event)
    );

    const uniqueMatching = matching.filter(
      (item) => !usedRecommendationIds.has(getMediaId(item))
    );

    if (uniqueMatching.length >= MIN_RECOMMENDATION_COUNT) {
      const selected = selectUniqueMedia(
        uniqueMatching,
        usedRecommendationIds,
        MAX_MEDIA_PER_RECOMMENDATION
      );

      if (selected.length >= MIN_RECOMMENDATION_COUNT) {
        recommendations.push({
          title: `Your ${event} memories`,
          explanation: `${count} memories are tagged with the event "${event}".`,
          reasonDetails: {
            type: 'matching_event',
            event,
            matchCount: count,
          },
          media: selected,
        });
      }
    }
  }

  // ----------------------------------------------------------
  // Recent activity
  // ----------------------------------------------------------

  const twoWeeksAgo =
    Date.now() - 14 * 24 * 60 * 60 * 1000;

  const recentlyAdded = media.filter(
    (item) =>
      new Date(item.createdAt).getTime() >= twoWeeksAgo
  );

  const uniqueRecent = recentlyAdded.filter(
    (item) => !usedRecommendationIds.has(getMediaId(item))
  );

  if (uniqueRecent.length >= MIN_RECOMMENDATION_COUNT) {
    const selected = selectUniqueMedia(
      uniqueRecent,
      usedRecommendationIds,
      MAX_MEDIA_PER_RECOMMENDATION
    );

    if (selected.length >= MIN_RECOMMENDATION_COUNT) {
      recommendations.push({
        title: 'Catch up on recent uploads',
        explanation: `${recentlyAdded.length} memories were added in the last two weeks.`,
        reasonDetails: {
          type: 'recent_activity',
          matchCount: recentlyAdded.length,
        },
        media: selected,
      });
    }
  }

  return recommendations;
}

module.exports = {
  getHighlights,
  getRecommendations,
};