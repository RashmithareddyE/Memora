const Human = require('@vladmandic/human').default;
const tf = require('@tensorflow/tfjs');

const Person = require('../models/Person');
const Media = require('../models/Media');

const humanConfig = {
  backend: 'cpu',

  face: {
    enabled: true,

    detector: {
      enabled: true,
      rotation: true,
      maxDetected: 20,
    },

    mesh: {
      enabled: true,
    },

    description: {
      enabled: true,
    },
  },

  body: {
    enabled: false,
  },

  hand: {
    enabled: false,
  },

  object: {
    enabled: false,
  },

  gesture: {
    enabled: false,
  },
};

let human = null;

async function getHuman() {
  if (human) {
    return human;
  }

  await tf.ready();

  human = new Human(humanConfig);

  await human.load();
  await human.warmup();

  return human;
}

async function fetchImageBuffer(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Could not download image for face analysis (${response.status})`
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

async function detectFaces(imageBuffer) {
  const humanInstance = await getHuman();

  const result = await humanInstance.detect(imageBuffer);

  return result.face || [];
}

function calculateSimilarity(firstEmbedding, secondEmbedding) {
  if (
    !Array.isArray(firstEmbedding) ||
    !Array.isArray(secondEmbedding) ||
    firstEmbedding.length !== secondEmbedding.length ||
    firstEmbedding.length === 0
  ) {
    return 0;
  }

  let dotProduct = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;

  for (let i = 0; i < firstEmbedding.length; i += 1) {
    dotProduct += firstEmbedding[i] * secondEmbedding[i];
    firstMagnitude += firstEmbedding[i] ** 2;
    secondMagnitude += secondEmbedding[i] ** 2;
  }

  if (firstMagnitude === 0 || secondMagnitude === 0) {
    return 0;
  }

  return (
    dotProduct /
    (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude))
  );
}

async function findMatchingPerson(roomId, embedding) {
  const people = await Person.find({ room: roomId }).select('+embedding');

  let bestPerson = null;
  let bestSimilarity = 0;

  for (const person of people) {
    if (!person.embedding || person.embedding.length === 0) {
      continue;
    }

    const score = calculateSimilarity(
      embedding,
      person.embedding
    );

    if (score > bestSimilarity) {
      bestSimilarity = score;
      bestPerson = person;
    }
  }

  // Conservative threshold to avoid incorrectly grouping
  // two different people together.
  const MATCH_THRESHOLD = 0.65;

  if (!bestPerson || bestSimilarity < MATCH_THRESHOLD) {
    return null;
  }

  return {
    person: bestPerson,
    similarity: bestSimilarity,
  };
}

async function findOrCreatePerson(roomId, embedding, mediaId) {
  const match = await findMatchingPerson(roomId, embedding);

  if (match) {
    return {
      person: match.person,
      similarity: match.similarity,
      created: false,
    };
  }

  const person = await Person.create({
    room: roomId,
    embedding: Array.from(embedding),
    memoryCount: 0,
    representativeMedia: mediaId,
  });

  return {
    person,
    similarity: 1,
    created: true,
  };
}

async function analyzeFacesForMedia(mediaId) {
  const media = await Media.findById(mediaId);

  if (!media) {
    throw new Error(`Media ${mediaId} not found`);
  }

  // Face detection is currently only for images.
  if (media.mediaType !== 'image') {
    return media;
  }

  const imageBuffer = await fetchImageBuffer(media.publicUrl);

  const faces = await detectFaces(imageBuffer);

  if (!faces.length) {
    media.faces = [];
    await media.save();

    return media;
  }

  const detectedFaces = [];

  for (const face of faces) {
    if (!face.embedding || face.embedding.length === 0) {
      continue;
    }

    const result = await findOrCreatePerson(
      media.room,
      face.embedding,
      media._id
    );

    detectedFaces.push({
      person: result.person._id,
      confidence: result.similarity,
    });

    await Person.findByIdAndUpdate(
      result.person._id,
      {
        $inc: {
          memoryCount: 1,
        },
      }
    );
  }

  media.faces = detectedFaces;

  await media.save();

  return media;
}

module.exports = {
  analyzeFacesForMedia,
};