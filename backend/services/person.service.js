const Person = require('../models/Person');

const FACE_MATCH_THRESHOLD = 0.6;

function cosineSimilarity(first, second) {
  if (
    !Array.isArray(first) ||
    !Array.isArray(second) ||
    first.length !== second.length ||
    first.length === 0
  ) {
    return 0;
  }

  let dot = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;

  for (let i = 0; i < first.length; i += 1) {
    dot += first[i] * second[i];
    firstMagnitude += first[i] * first[i];
    secondMagnitude += second[i] * second[i];
  }

  if (firstMagnitude === 0 || secondMagnitude === 0) {
    return 0;
  }

  return (
    dot /
    (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude))
  );
}

async function findOrCreatePerson(roomId, descriptor, mediaId) {
  const people = await Person.find({ room: roomId });

  let bestPerson = null;
  let bestSimilarity = 0;

  for (const person of people) {
    if (
      !Array.isArray(person.embedding) ||
      person.embedding.length !== descriptor.length
    ) {
      continue;
    }

    const similarity = cosineSimilarity(
      descriptor,
      person.embedding
    );

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestPerson = person;
    }
  }

  if (bestPerson && bestSimilarity >= FACE_MATCH_THRESHOLD) {
    await Person.findByIdAndUpdate(bestPerson._id, {
      $inc: { memoryCount: 1 },
    });

    return {
      person: bestPerson,
      similarity: bestSimilarity,
      created: false,
    };
  }

  const newPerson = await Person.create({
    room: roomId,
    embedding: descriptor,
    memoryCount: 1,
    representativeMedia: mediaId,
  });

  return {
    person: newPerson,
    similarity: 1,
    created: true,
  };
}

module.exports = {
  findOrCreatePerson,
  cosineSimilarity,
};