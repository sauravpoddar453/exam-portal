import * as faceapi from '@vladmandic/face-api';

let isModelLoaded = false;
let isModelLoading = false;

/**
 * Load face-api models from CDN with fallback gracefully.
 */
export async function loadFaceApiModels() {
  if (isModelLoaded) return true;
  if (isModelLoading) {
    // Wait for in-flight load
    let checks = 0;
    while (isModelLoading && checks < 20) {
      await new Promise(r => setTimeout(r, 250));
      checks++;
    }
    return isModelLoaded;
  }

  isModelLoading = true;
  try {
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    ]);
    isModelLoaded = true;
    console.log('[FaceProctor] face-api.js neural network models loaded successfully.');
    return true;
  } catch (err) {
    console.warn('[FaceProctor] Failed to load face-api models from CDN, falling back to Native/Canvas detection:', err.message);
    isModelLoaded = false;
    return false;
  } finally {
    isModelLoading = false;
  }
}

/**
 * Start Webcam stream for the video element.
 */
export async function initWebcamStream(videoElement) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Webcam mediaDevices API is not supported in this browser.');
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 320 },
        height: { ideal: 240 },
        facingMode: 'user',
      },
      audio: false,
    });

    if (videoElement) {
      videoElement.srcObject = stream;
      await videoElement.play().catch(() => {});
    }
    return stream;
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      throw new Error('CAMERA_PERMISSION_DENIED');
    }
    throw new Error(`Webcam access error: ${err.message}`);
  }
}

/**
 * Stop all tracks of a webcam media stream.
 */
export function stopWebcamStream(stream) {
  if (!stream) return;
  try {
    stream.getTracks().forEach(track => {
      track.stop();
      console.log('[FaceProctor] Webcam track stopped.');
    });
  } catch (err) {
    console.warn('[FaceProctor] Error stopping webcam tracks:', err.message);
  }
}

/**
 * Analyze current frame from video element.
 * Returns analysis object:
 * {
 *   faceCount: number,
 *   isLookingAway: boolean,
 *   issueType: 'NO_FACE' | 'MULTIPLE_FACES' | 'LOOKING_AWAY' | 'OK' | 'CAMERA_OFF',
 *   message: string
 * }
 */
export async function analyzeVideoFrame(videoElement) {
  if (!videoElement || videoElement.paused || videoElement.ended || !videoElement.videoWidth) {
    return { faceCount: 0, isLookingAway: false, issueType: 'CAMERA_OFF', message: 'Camera stream inactive' };
  }

  // 1. Try face-api.js neural network
  if (isModelLoaded) {
    try {
      const detections = await faceapi.detectAllFaces(
        videoElement,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
      ).withFaceLandmarks();

      const faceCount = detections.length;

      if (faceCount === 0) {
        return { faceCount: 0, isLookingAway: false, issueType: 'NO_FACE', message: 'No face detected in camera frame' };
      }

      if (faceCount > 1) {
        return { faceCount, isLookingAway: false, issueType: 'MULTIPLE_FACES', message: 'Multiple faces detected in camera frame' };
      }

      // Single face detected — analyze landmarks for head pose / gaze direction
      const landmarks = detections[0].landmarks;
      const nose = landmarks.getNose()[3]; // Tip of nose
      const leftEye = landmarks.getLeftEye()[0];
      const rightEye = landmarks.getRightEye()[3];
      const jaw = landmarks.getJawOutline();

      // Estimate bounding center
      const eyeCenterX = (leftEye.x + rightEye.x) / 2;
      const eyeWidth = Math.abs(rightEye.x - leftEye.x);
      const noseOffsetX = Math.abs(nose.x - eyeCenterX);

      // Check vertical skew (looking down/up excessively)
      const eyeCenterY = (leftEye.y + rightEye.y) / 2;
      const noseOffsetY = nose.y - eyeCenterY;

      // Thresholds: nose offset relative to eye distance
      const isYawLookingAway = noseOffsetX > eyeWidth * 0.45;
      const isPitchLookingAway = noseOffsetY < eyeWidth * 0.1 || noseOffsetY > eyeWidth * 1.3;

      const isLookingAway = isYawLookingAway || isPitchLookingAway;

      if (isLookingAway) {
        return { faceCount: 1, isLookingAway: true, issueType: 'LOOKING_AWAY', message: 'Student looking away from screen' };
      }

      return { faceCount: 1, isLookingAway: false, issueType: 'OK', message: 'Face detected and aligned' };
    } catch (err) {
      console.warn('[FaceProctor] face-api frame analysis error:', err.message);
    }
  }

  // 2. Fallback: Native ShapeDetection API if available
  if ('FaceDetector' in window) {
    try {
      const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
      const faces = await detector.detect(videoElement);
      const faceCount = faces.length;

      if (faceCount === 0) {
        return { faceCount: 0, isLookingAway: false, issueType: 'NO_FACE', message: 'No face detected in frame' };
      }
      if (faceCount > 1) {
        return { faceCount, isLookingAway: false, issueType: 'MULTIPLE_FACES', message: 'Multiple faces detected in frame' };
      }

      return { faceCount: 1, isLookingAway: false, issueType: 'OK', message: 'Face detected' };
    } catch (err) {
      console.warn('[FaceProctor] Native FaceDetector error:', err.message);
    }
  }

  // 3. Lightweight Canvas fallback: Check luminosity & pixel variance
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, 160, 120);
    const imageData = ctx.getImageData(0, 0, 160, 120);
    const data = imageData.data;

    let totalBrightness = 0;
    let skinLikePixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;

      // Broad skin tone threshold heuristic
      if (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
        skinLikePixels++;
      }
    }

    const avgBrightness = totalBrightness / (160 * 120);
    const skinRatio = skinLikePixels / (160 * 120);

    if (avgBrightness < 15 || skinRatio < 0.04) {
      return { faceCount: 0, isLookingAway: false, issueType: 'NO_FACE', message: 'Camera blocked or low light' };
    }

    return { faceCount: 1, isLookingAway: false, issueType: 'OK', message: 'Visual activity detected' };
  } catch (err) {
    return { faceCount: 1, isLookingAway: false, issueType: 'OK', message: 'Fallback monitoring active' };
  }
}
