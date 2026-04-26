"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  GestureRecognizer,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

type VisualAnalysisResult = {
  overall_score: number;
  eye_contact_score: number;
  gesture_score: number;
};

type LiveVisualScores = {
  eye_contact_score: number;
  gesture_score: number;
};

type StartAnalysisArgs = {
  videoElement: HTMLVideoElement;
  canvasElement?: HTMLCanvasElement | null;
};

const VISION_WASM_PATH = "/models/wasm";
const FACE_MODEL_PATH = "/models/face_landmarker.task";
const GESTURE_MODEL_PATH = "/models/gesture_recognizer.task";

// Fallback hand skeleton connections for canvas drawing.
const HAND_CONNECTIONS: number[][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function averagePoint(landmarks: Array<{ x: number; y: number }>, indexes: number[]) {
  const points = indexes
    .map((index) => landmarks[index])
    .filter(Boolean);

  if (!points.length) return { x: 0, y: 0 };
  const x = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const y = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  return { x, y };
}

function drawHandConnections(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  width: number,
  height: number,
) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 190, 60, 0.95)";
  ctx.lineWidth = 2;
  HAND_CONNECTIONS.forEach(([start, end]) => {
    const a = points[start];
    const b = points[end];
    if (!a || !b) return;
    ctx.beginPath();
    ctx.moveTo(a.x * width, a.y * height);
    ctx.lineTo(b.x * width, b.y * height);
    ctx.stroke();
  });
  ctx.restore();
}

export function useVisualAnalysis() {
  const [isReady, setIsReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<VisualAnalysisResult | null>(null);
  const [liveScores, setLiveScores] = useState<LiveVisualScores>({
    eye_contact_score: 0,
    gesture_score: 0,
  });

  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const rafRef = useRef<number | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  const metricsRef = useRef({
    frameCount: 0,
    eyeContactAccum: 0,
    gestureAccum: 0,
    prevHandCenter: null as { x: number; y: number } | null,
  });

  const closeTasks = useCallback(() => {
    try {
      faceLandmarkerRef.current?.close();
    } catch {
      // Ignore close errors.
    }
    try {
      gestureRecognizerRef.current?.close();
    } catch {
      // Ignore close errors.
    }
    faceLandmarkerRef.current = null;
    gestureRecognizerRef.current = null;
    setIsReady(false);
  }, []);

  const clearOverlay = useCallback(() => {
    const canvas = canvasElementRef.current;
    const ctx = canvasCtxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const init = useCallback(async () => {
    if (faceLandmarkerRef.current || gestureRecognizerRef.current) {
      setIsReady(true);
      return;
    }

    const vision = await FilesetResolver.forVisionTasks(VISION_WASM_PATH);
    const initErrors: string[] = [];

    try {
      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: FACE_MODEL_PATH,
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    } catch (err) {
      initErrors.push(`Face tracker failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      faceLandmarkerRef.current = null;
    }

    try {
      gestureRecognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: GESTURE_MODEL_PATH,
        },
        runningMode: "VIDEO",
        numHands: 2,
      });
    } catch (err) {
      initErrors.push(`Gesture tracker failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      gestureRecognizerRef.current = null;
    }

    const hasAtLeastOneTracker = Boolean(faceLandmarkerRef.current || gestureRecognizerRef.current);
    setIsReady(hasAtLeastOneTracker);

    if (!hasAtLeastOneTracker) {
      throw new Error(initErrors.join(" | ") || "MediaPipe visual analysis failed to initialize.");
    }

    if (initErrors.length > 0) {
      setError(initErrors.join(" | "));
    }
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsAnalyzing(false);
  }, []);

  const analyzeFrame = useCallback(() => {
    const videoElement = videoElementRef.current;
    const canvasElement = canvasElementRef.current;
    const faceLandmarker = faceLandmarkerRef.current;
    const gestureRecognizer = gestureRecognizerRef.current;

    if (!videoElement || (!faceLandmarker && !gestureRecognizer)) {
      stopLoop();
      return;
    }

    if (videoElement.readyState < 2 || videoElement.videoWidth <= 0 || videoElement.videoHeight <= 0) {
      rafRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    const nowMs = performance.now();
    const faceResult = faceLandmarker
      ? faceLandmarker.detectForVideo(videoElement, nowMs)
      : null;
    const gestureResult = gestureRecognizer
      ? gestureRecognizer.recognizeForVideo(videoElement, nowMs)
      : null;

    let eyeContactFrameScore = 0;
    let gestureFrameScore = 0;

    if (faceResult?.faceLandmarks?.length) {
      const face = faceResult.faceLandmarks[0];
      const leftEye = averagePoint(face, [33, 133]);
      const rightEye = averagePoint(face, [362, 263]);
      const noseTip = face[1] || averagePoint(face, [1, 4, 6]);
      const eyeMid = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
      const interEyeDistance = Math.max(0.0001, Math.abs(rightEye.x - leftEye.x));
      const yawOffset = Math.abs(eyeMid.x - noseTip.x) / interEyeDistance;
      eyeContactFrameScore = clampScore((1 - Math.min(1, yawOffset / 0.35)) * 100);
    }

    const handLandmarks = gestureResult?.landmarks || [];
    if (handLandmarks.length > 0) {
      const firstHand = handLandmarks[0];
      const wrist = firstHand?.[0];
      let movementBoost = 0;
      if (wrist && metricsRef.current.prevHandCenter) {
        const dx = wrist.x - metricsRef.current.prevHandCenter.x;
        const dy = wrist.y - metricsRef.current.prevHandCenter.y;
        const delta = Math.sqrt((dx * dx) + (dy * dy));
        movementBoost = Math.min(40, delta * 1600);
      }
      if (wrist) {
        metricsRef.current.prevHandCenter = { x: wrist.x, y: wrist.y };
      }
      gestureFrameScore = clampScore(60 + movementBoost);
    } else {
      metricsRef.current.prevHandCenter = null;
      gestureFrameScore = 0;
    }

    metricsRef.current.frameCount += 1;
    metricsRef.current.eyeContactAccum += eyeContactFrameScore;
    metricsRef.current.gestureAccum += gestureFrameScore;
    setLiveScores({
      eye_contact_score: eyeContactFrameScore,
      gesture_score: gestureFrameScore,
    });

    if (canvasElement && canvasCtxRef.current) {
      const ctx = canvasCtxRef.current;
      const width = videoElement.videoWidth;
      const height = videoElement.videoHeight;
      if (canvasElement.width !== width || canvasElement.height !== height) {
        canvasElement.width = width;
        canvasElement.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      if (!drawingUtilsRef.current) {
        drawingUtilsRef.current = new DrawingUtils(ctx);
      }
      const drawingUtils = drawingUtilsRef.current;

      if (faceResult?.faceLandmarks?.length) {
        faceResult.faceLandmarks.forEach((landmarks) => {
          // Draw face mesh for visual debugging.
          // FACE_LANDMARKS_TESSELATION is exposed by the FaceLandmarker task bundle.
          drawingUtils.drawConnectors(
            landmarks,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (FaceLandmarker as any).FACE_LANDMARKS_TESSELATION || [],
            { color: "rgba(90,120,99,0.85)", lineWidth: 1 },
          );
          drawingUtils.drawLandmarks(landmarks, {
            color: "rgba(80,200,120,0.9)",
            radius: 1.1,
          });
        });
      }

      if (handLandmarks.length) {
        handLandmarks.forEach((points) => {
          drawHandConnections(ctx, points, width, height);
          drawingUtils.drawLandmarks(points, {
            color: "rgba(255, 212, 106, 0.95)",
            radius: 2,
          });
        });
      }
    }

    rafRef.current = requestAnimationFrame(analyzeFrame);
  }, [stopLoop]);

  const startAnalysis = useCallback(async ({ videoElement, canvasElement }: StartAnalysisArgs) => {
    try {
      setError(null);
      await init();
      videoElementRef.current = videoElement;
      canvasElementRef.current = canvasElement || null;
      canvasCtxRef.current = canvasElement?.getContext("2d") || null;
      metricsRef.current = {
        frameCount: 0,
        eyeContactAccum: 0,
        gestureAccum: 0,
        prevHandCenter: null,
      };
      stopLoop();
      setIsAnalyzing(true);
      rafRef.current = requestAnimationFrame(analyzeFrame);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start visual analysis.");
      setIsAnalyzing(false);
    }
  }, [analyzeFrame, init, stopLoop]);

  const stopAnalysis = useCallback((): VisualAnalysisResult => {
    stopLoop();
    clearOverlay();

    const frames = Math.max(1, metricsRef.current.frameCount);
    const eyeAvg = clampScore(metricsRef.current.eyeContactAccum / frames);
    const gestureAvg = clampScore(metricsRef.current.gestureAccum / frames);
    const overall = clampScore((eyeAvg * 0.6) + (gestureAvg * 0.4));

    const result: VisualAnalysisResult = {
      overall_score: overall,
      eye_contact_score: eyeAvg,
      gesture_score: gestureAvg,
    };
    setLiveScores({
      eye_contact_score: 0,
      gesture_score: 0,
    });
    setLastResult(result);
    return result;
  }, [clearOverlay, stopLoop]);

  useEffect(() => {
    return () => {
      stopLoop();
      clearOverlay();

      const videoElement = videoElementRef.current;
      const stream = videoElement?.srcObject as MediaStream | null;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        if (videoElement) {
          videoElement.srcObject = null;
        }
      }

      closeTasks();
    };
  }, [clearOverlay, closeTasks, stopLoop]);

  return {
    isReady,
    isAnalyzing,
    error,
    lastResult,
    liveScores,
    startAnalysis,
    stopAnalysis,
  };
}

export type { VisualAnalysisResult };
