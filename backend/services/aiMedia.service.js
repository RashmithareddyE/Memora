const Media = require('../models/Media');
const { getProvider, isAiConfigured } = require('./aiProviders');
const { emitMediaAnalysisUpdate } = require('../socket');
const { analyzeFacesForMedia } = require('./face.service');

async function analyzeMedia(mediaId) {
  const media = await Media.findById(mediaId);

  if (!media) {
    throw new Error(`Cannot analyze media ${mediaId}: not found`);
  }

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
  try {
  await analyzeFacesForMedia(media._id);
} catch (faceError) {
  console.error(
    `Face analysis failed for media ${media._id}:`,
    faceError
  );
}

  // Notify anyone currently viewing this media's room, in real time, once
  // analysis lands. This is the only place the pending -> completed/failed
  // transition happens, so it's the only place that can emit it. The
  // try/catch means a socket problem can never affect analysis itself.
  try {
    emitMediaAnalysisUpdate(media);
  } catch (socketError) {
    console.error('Socket emit error (media analysis update):', socketError);
  }

  return media;
}

module.exports = { analyzeMedia, isAiConfigured };