const Person = require('../models/Person');
const MATCH_THRESHOLD = 0.5;
const MIN_MATCH_MARGIN = 0.07;
const DUPLICATE_EPS = 0.05;
const MAX_REFERENCE_EMBEDDINGS = 8;

function euclideanDistance(first, second) {
  if (
    !Array.isArray(first) ||
    !Array.isArray(second) ||
    first.length !== second.length
  ) {
    return Infinity;
  }

  let sum = 0;

  for (let i = 0; i < first.length; i += 1) {
    const difference = first[i] - second[i];
    sum += difference * difference;
  }

  return Math.sqrt(sum);
}

// Distance from a descriptor to a person = best (smallest) distance across
// ALL of that person's stored reference embeddings, not just one.
function distanceToPerson(descriptor, person) {
  let best = Infinity;

  for (const reference of person.embeddings || []) {
    if (
      !Array.isArray(reference) ||
      reference.length !== descriptor.length
    ) {
      continue;
    }

    const distance = euclideanDistance(descriptor, reference);

    if (distance < best) {
      best = distance;
    }
  }

  return best;
}

// Adds a new reference embedding to a person's set, keeping the set small
// and diverse rather than letting it grow forever or drift toward a
// single blended average.
function addReferenceEmbedding(person, descriptor) {
  const existing = person.embeddings || [];

  // Idempotency: if this descriptor is basically the same as one we
  // already have (e.g. the same photo was rescanned), don't store it
  // again.
  const isDuplicate = existing.some(
    (reference) => euclideanDistance(reference, descriptor) <= DUPLICATE_EPS
  );

  if (isDuplicate) {
    return;
  }

  if (existing.length < MAX_REFERENCE_EMBEDDINGS) {
    existing.push(descriptor);
    person.embeddings = existing;
    person.markModified('embeddings');
    return;
  }

  // At capacity: replace whichever embedding is most redundant (closest
  // to some other embedding in the set) so the reference set stays
  // spread out and representative of the person's real variation, rather
  // than just accumulating the most recent N faces.
  let mostRedundantIndex = 0;
  let smallestNearestDistance = Infinity;

  for (let i = 0; i < existing.length; i += 1) {
    let nearest = Infinity;

    for (let j = 0; j < existing.length; j += 1) {
      if (i === j) continue;

      const distance = euclideanDistance(existing[i], existing[j]);

      if (distance < nearest) {
        nearest = distance;
      }
    }

    if (nearest < smallestNearestDistance) {
      smallestNearestDistance = nearest;
      mostRedundantIndex = i;
    }
  }

  existing[mostRedundantIndex] = descriptor;
  person.embeddings = existing;
  person.markModified('embeddings');
}

/**
 * Matches every detected face in ONE photo against the room's known
 * people, and creates new people for faces that don't confidently match
 * anyone.
 *
 * This is intentionally done as a single batch per photo (instead of
 * resolving each face independently, one at a time) for one crucial
 * reason: within a single photo, two different detected faces must never
 * be assigned to the same person. Resolving faces one-by-one against a
 * database that gets updated in between comparisons is exactly what let
 * unrelated people in the same photo collapse into a single Person
 * before. Batching guarantees mutual exclusion: once a person has been
 * used for one face in this photo, they are removed from the candidate
 * pool for the rest of the photo's faces.
 *
 * @param {string} roomId
 * @param {{ descriptor: number[], box: object|null }[]} faceInputs
 * @param {string} mediaId - photo these faces were detected in, used as
 *   the representative photo for any newly created people.
 * @returns {{ person: Document, distance: number, created: boolean, box: object|null }[]}
 */
async function matchFacesForPhoto(roomId, faceInputs, mediaId) {
  const people = await Person.find({ room: roomId }).select('+embeddings');

  // Build a candidate list of every (face, person) pair that is at least
  // within the match threshold, sorted best-distance-first. We then walk
  // this list greedily, assigning each face to its best available person,
  // skipping any pair where either side has already been claimed.
  const candidates = [];

  faceInputs.forEach((face, faceIndex) => {
    people.forEach((person, personIndex) => {
      const distance = distanceToPerson(face.descriptor, person);

      if (distance <= MATCH_THRESHOLD) {
        candidates.push({ faceIndex, personIndex, distance });
      }
    });
  });

  candidates.sort((a, b) => a.distance - b.distance);

  // Second-best distance per face, used for the ambiguity margin check:
  // if two different existing people are both plausible matches for this
  // face, and neither is clearly better than the other, we treat the
  // match as too uncertain and let a new person be created instead of
  // guessing.
  const secondBestByFace = new Map();

  faceInputs.forEach((_, faceIndex) => {
    const distances = candidates
      .filter((candidate) => candidate.faceIndex === faceIndex)
      .map((candidate) => candidate.distance);

    if (distances.length >= 2) {
      secondBestByFace.set(faceIndex, distances[1]);
    }
  });

  const claimedFaces = new Set();
  const claimedPeople = new Set();
  const results = new Array(faceInputs.length).fill(null);

  for (const candidate of candidates) {
    if (
      claimedFaces.has(candidate.faceIndex) ||
      claimedPeople.has(candidate.personIndex)
    ) {
      continue;
    }

    const secondBest = secondBestByFace.get(candidate.faceIndex);

    if (
      secondBest !== undefined &&
      secondBest - candidate.distance < MIN_MATCH_MARGIN
    ) {
      // Too ambiguous to confidently pick this person over the next-best
      // candidate — leave this face unmatched rather than risk merging
      // two different people.
      continue;
    }

    claimedFaces.add(candidate.faceIndex);
    claimedPeople.add(candidate.personIndex);

    const person = people[candidate.personIndex];

    addReferenceEmbedding(person, faceInputs[candidate.faceIndex].descriptor);

    results[candidate.faceIndex] = {
      person,
      distance: candidate.distance,
      created: false,
      box: faceInputs[candidate.faceIndex].box || null,
    };
  }

  // Anything left unmatched becomes a brand new person. New people
  // created from the SAME photo are, by construction, always different
  // Person records from each other (each gets its own document).
  const newPeople = [];

  for (let faceIndex = 0; faceIndex < faceInputs.length; faceIndex += 1) {
    if (results[faceIndex]) {
      continue;
    }

    const face = faceInputs[faceIndex];

    const newPerson = new Person({
      room: roomId,
      name: 'Unknown person',
      embeddings: [face.descriptor],
      memoryCount: 0,
      representativeMedia: mediaId,
      representativeFaceBox: face.box || undefined,
    });

    results[faceIndex] = {
      person: newPerson,
      distance: 0,
      created: true,
      box: face.box || null,
    };

    newPeople.push(newPerson);
  }

  // Persist all changes. Matched people had embeddings mutated in place;
  // new people haven't been saved yet.
  const matchedPeopleToSave = people.filter((person) =>
    results.some(
      (result) =>
        result && !result.created && result.person._id.equals(person._id)
    )
  );

  for (const person of matchedPeopleToSave) {
    await person.save();
  }

  for (const person of newPeople) {
    await person.save();
  }

  return results;
}

module.exports = {
  matchFacesForPhoto,
  euclideanDistance,
  distanceToPerson,
};
