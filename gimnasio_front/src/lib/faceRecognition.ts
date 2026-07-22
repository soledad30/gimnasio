import * as faceapi from '@vladmandic/face-api'

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model'

let modelsReady: Promise<void> | null = null

export function loadFaceModels(): Promise<void> {
  if (!modelsReady) {
    modelsReady = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).then(() => undefined)
  }
  return modelsReady
}

export async function extractFaceEmbedding(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
): Promise<number[] | null> {
  await loadFaceModels()
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor()
  if (!detection) return null
  return Array.from(detection.descriptor)
}
