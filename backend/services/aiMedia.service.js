const Media = require('../models/Media');
const { getProvider, isAiConfigured } = require('./aiProviders');

/**
 * Analyzes a single media item and persists the result on the Media
 * document itself (aiStatus / aiAnalysis / aiError).
 *
 * Never throws for "expected" outcomes (not configured, not an image,
 * provider error) — those are recorded on the document and returned
 * normally, so the original upload is never affected by an AI failure.
 * Only throws for unexpected conditions (e.g. the media was deleted out
 * from under us), which callers should log defensively.
 */
async function analyzeMedia(mediaId) {
  const media = await Media.findById(mediaId);

  if (!media) {
    throw new Error(`Cannot analyze media ${mediaId}: not found`);
  }

  // Only images are analyzed for now — sensible video analysis would need
  // frame extraction, which is out of scope for this phase.
  if (media.mediaType !== 'image') {
    media.aiStatus = 'not_analyzed';
    media.aiError = 'AI analysis is only available for images right now';
    await media.save();
    return media;
  }

  if (!isAiConfigured()) {
    media.aiStatus = 'not_analyzed';
    media.aiError = 'AI provider not configured';
    await media.save();
    return media;
  }

  media.aiStatus = 'pending';
  media.aiError = null;
  await media.save();

  try {
    const provider = getProvider();
    const result = await provider.analyzeImage({
      imageUrl: media.publicUrl,
      mimeType: media.mimeType,
    });

    media.aiAnalysis = {
      description: result.description,
      people: result.people,
      places: result.places,
      objects: result.objects,
      events: result.events,
      tags: result.tags,
      analyzedAt: new Date(),
    };
    media.aiStatus = 'completed';
    media.aiError = null;
  } catch (error) {
    console.error(`AI analysis failed for media ${mediaId}:`, error);
    media.aiStatus = 'failed';
    media.aiError = error.message || 'AI analysis failed';
  }

  await media.save();
  return media;
}

module.exports = { analyzeMedia, isAiConfigured };