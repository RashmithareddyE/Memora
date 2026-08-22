const Anthropic = require('@anthropic-ai/sdk');

// Model is configurable so it can be upgraded without a code change.
const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are analyzing a single photo uploaded to a private, shared photo album app called Memora. Describe what is actually visible. Do not guess at real identities of any people - describe them generically (e.g. "two friends", "a child").

Respond with ONLY raw JSON (no markdown code fences, no extra commentary) matching exactly this shape:
{
  "description": "one short sentence describing the photo",
  "people": ["short phrases about who/how many people appear, e.g. 'two friends', 'a large group'"],
  "places": ["short phrases about the setting/location type, e.g. 'beach', 'city street'"],
  "objects": ["notable objects visible in the photo"],
  "events": ["short phrases about the occasion/scene, e.g. 'sunset', 'birthday celebration'"],
  "tags": ["5-8 short lowercase single-or-two-word tags summarizing the photo"]
}

If a category has nothing relevant, return an empty array for it. Keep every array short (at most 5 items).`;

let client = null;

function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

async function fetchImageAsBase64(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download media for analysis (status ${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

function parseResponse(rawText) {
  let parsed;

  try {
    // Defensive: strip markdown fences in case the model adds them despite instructions.
    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse AI provider response as JSON');
  }

  const toStringArray = (value) => (Array.isArray(value) ? value.filter((v) => typeof v === 'string') : []);

  return {
    description: typeof parsed.description === 'string' ? parsed.description : '',
    people: toStringArray(parsed.people),
    places: toStringArray(parsed.places),
    objects: toStringArray(parsed.objects),
    events: toStringArray(parsed.events),
    tags: toStringArray(parsed.tags),
  };
}

/**
 * Analyzes a single image and returns structured metadata.
 * Throws on any failure (network, provider error, unparseable response) —
 * callers (aiMedia.service.js) are responsible for catching and recording it.
 */
async function analyzeImage({ imageUrl, mimeType }) {
  const anthropic = getClient();
  const base64Data = await fetchImageAsBase64(imageUrl);

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64Data },
          },
          { type: 'text', text: 'Analyze this photo.' },
        ],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');

  if (!textBlock) {
    throw new Error('AI provider returned no text content');
  }

  return parseResponse(textBlock.text);
}

module.exports = { analyzeImage };