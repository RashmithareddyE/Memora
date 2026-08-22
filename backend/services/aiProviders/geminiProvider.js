const { GoogleGenAI } = require('@google/genai');

const MODEL = process.env.AI_MODEL || 'gemini-2.5-flash';

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
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  return client;
}

async function fetchImageAsBase64(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download media for analysis (status ${response.status})`
    );
  }

  const arrayBuffer = await response.arrayBuffer();

  return Buffer.from(arrayBuffer).toString('base64');
}

function parseResponse(rawText) {
  let parsed;

  try {
    const cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse AI provider response as JSON');
  }

  const toStringArray = (value) =>
    Array.isArray(value)
      ? value.filter((v) => typeof v === 'string')
      : [];

  return {
    description:
      typeof parsed.description === 'string'
        ? parsed.description
        : '',
    people: toStringArray(parsed.people),
    places: toStringArray(parsed.places),
    objects: toStringArray(parsed.objects),
    events: toStringArray(parsed.events),
    tags: toStringArray(parsed.tags),
  };
}

async function analyzeImage({ imageUrl, mimeType }) {
  const gemini = getClient();

  const base64Data = await fetchImageAsBase64(imageUrl);

  const response = await gemini.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: `${SYSTEM_PROMPT}

Analyze this photo and return ONLY the JSON object.`,
          },
        ],
      },
    ],
  });

  const text = response.text;

  if (!text) {
    throw new Error('AI provider returned no text content');
  }

  return parseResponse(text);
}

module.exports = { analyzeImage };