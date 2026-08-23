const { getScopedMedia } = require('./mediaOrganization.service');

function tagFrequency(mediaList) {
  const freq = new Map();
  for (const item of mediaList) {
    const tags = (item.aiAnalysis && item.aiAnalysis.tags) || [];
    for (const tag of tags) {
      freq.set(tag, (freq.get(tag) || 0) + 1);
    }
  }
  return freq;
}

function eventFrequency(mediaList) {
  const freq = new Map();
  for (const item of mediaList) {
    const events = (item.aiAnalysis && item.aiAnalysis.events) || [];
    for (const event of events) {
      freq.set(event, (freq.get(event) || 0) + 1);
    }
  }
  return freq;
}

/**
 * Builds highlight collections strictly from media that actually exists in
 * the user's accessible rooms. Every highlight includes only real media
 * items — nothing is fabricated.
 */
async function getHighlights(userId, roomId) {
  const media = await getScopedMedia(userId, roomId);
  const highlights = [];

  if (media.length === 0) return highlights;

  // Recently added
  const recent = media.slice(0, 8);
  highlights.push({
    title: 'Recently Added Memories',
    reason: `Your ${recent.length} most recently uploaded ${recent.length === 1 ? 'memory' : 'memories'}.`,
    media: recent,
  });

  // Most active day
  const dayBuckets = new Map();
  for (const item of media) {
    const day = new Date(item.createdAt).toISOString().slice(0, 10);
    if (!dayBuckets.has(day)) dayBuckets.set(day, []);
    dayBuckets.get(day).push(item);
  }
  const busiestDay = Array.from(dayBuckets.entries()).sort((a, b) => b[1].length - a[1].length)[0];
  if (busiestDay && busiestDay[1].length > 1) {
    const [day, items] = busiestDay;
    const formattedDay = new Date(day).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    highlights.push({
      title: 'Your Most Active Memory Day',
      reason: `You added ${items.length} memories on ${formattedDay}.`,
      media: items,
    });
  }

  // Top tag collections (need at least 3 memories sharing a tag to be worth showing)
  const tagFreq = tagFrequency(media);
  const topTags = Array.from(tagFreq.entries())
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  for (const [tag, count] of topTags) {
    const items = media.filter((item) => (item.aiAnalysis?.tags || []).includes(tag));
    highlights.push({
      title: `${titleCase(tag)} Memories`,
      reason: `${count} memories tagged "${tag}".`,
      media: items,
    });
  }

  // Busiest month
  const monthBuckets = new Map();
  for (const item of media) {
    const date = new Date(item.createdAt);
    const key = `${date.toLocaleString('en-US', { month: 'long' })} ${date.getFullYear()}`;
    if (!monthBuckets.has(key)) monthBuckets.set(key, []);
    monthBuckets.get(key).push(item);
  }
  const topMonth = Array.from(monthBuckets.entries()).sort((a, b) => b[1].length - a[1].length)[0];
  if (topMonth && topMonth[1].length >= 2) {
    highlights.push({
      title: `Your ${topMonth[0]} Memories`,
      reason: `${topMonth[1].length} memories from ${topMonth[0]}.`,
      media: topMonth[1],
    });
  }

  return highlights;
}

function titleCase(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Explainable recommendations: every entry states exactly why it was
 * surfaced (matching tag count, matching event count), computed from real
 * counts over the user's actual media — never invented.
 */
async function getRecommendations(userId, roomId) {
  const media = await getScopedMedia(userId, roomId);
  if (media.length === 0) return [];

  const recommendations = [];

  const tagFreq = tagFrequency(media);
  const topTags = Array.from(tagFreq.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  for (const [tag, count] of topTags) {
    const matching = media.filter((item) => (item.aiAnalysis?.tags || []).includes(tag));
    recommendations.push({
      title: `Revisit your "${tag}" memories`,
      explanation: `${count} of your memories share the tag "${tag}".`,
      reasonDetails: { type: 'matching_tags', tag, matchCount: count },
      media: matching.slice(0, 12),
    });
  }

  const eventFreq = eventFrequency(media);
  const topEvent = Array.from(eventFreq.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])[0];

  if (topEvent) {
    const [event, count] = topEvent;
    const matching = media.filter((item) => (item.aiAnalysis?.events || []).includes(event));
    recommendations.push({
      title: `Your ${event} memories`,
      explanation: `${count} memories are tagged with the event "${event}".`,
      reasonDetails: { type: 'matching_event', event, matchCount: count },
      media: matching.slice(0, 12),
    });
  }

  // Recent-activity nudge, only if there's been upload activity in the last 14 days.
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recentlyAdded = media.filter((item) => new Date(item.createdAt).getTime() >= twoWeeksAgo);
  if (recentlyAdded.length >= 3) {
    recommendations.push({
      title: 'Catch up on recent uploads',
      explanation: `${recentlyAdded.length} memories were added in the last two weeks.`,
      reasonDetails: { type: 'recent_activity', matchCount: recentlyAdded.length },
      media: recentlyAdded.slice(0, 12),
    });
  }

  return recommendations;
}

module.exports = { getHighlights, getRecommendations };