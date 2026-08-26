import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;

const MODEL_URL = '/models';

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) {
    return;
  }

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
}

export async function getFaceDescriptors(
  image: HTMLImageElement
): Promise<Float32Array[]> {
  await loadFaceModels();

  const detections = await faceapi
    .detectAllFaces(
      image,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.5,
      })
    )
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections.map((detection) => detection.descriptor);
}