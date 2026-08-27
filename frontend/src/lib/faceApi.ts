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

/** Normalized (0-1) bounding box, relative to the source image's
 * intrinsic pixel dimensions — resolution-independent so the backend
 * never needs to know the original image size. */
export interface NormalizedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceDetectionResult {
  descriptor: Float32Array;
  box: NormalizedBox;
}

/**
 * Detects every face in an image and returns each one's recognition
 * descriptor together with its normalized bounding box, so the caller can
 * (a) match/group the person and (b) later render a crop of just that
 * person's face.
 */
export async function getFaceDetections(
  image: HTMLImageElement
): Promise<FaceDetectionResult[]> {
  await loadFaceModels();

  const detections = await faceapi
    .detectAllFaces(
      image,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 512,
        // A slightly stricter score threshold than the previous 0.3
        // reduces low-quality/false-positive detections, which in turn
        // produces more discriminative descriptors (garbage-quality
        // crops are a major source of two different people accidentally
        // looking "close enough" in embedding space).
        scoreThreshold: 0.4,
      })
    )
    .withFaceLandmarks()
    .withFaceDescriptors();

  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  return detections
    .filter(() => width > 0 && height > 0)
    .map((detection) => {
      const { x, y, width: boxWidth, height: boxHeight } = detection.detection.box;

      return {
        descriptor: detection.descriptor,
        box: {
          x: x / width,
          y: y / height,
          width: boxWidth / width,
          height: boxHeight / height,
        },
      };
    });
}

/** @deprecated kept temporarily for any callers not yet migrated — prefer
 * getFaceDetections, which also returns face bounding boxes. */
export async function getFaceDescriptors(
  image: HTMLImageElement
): Promise<Float32Array[]> {
  const detections = await getFaceDetections(image);
  return detections.map((detection) => detection.descriptor);
}
