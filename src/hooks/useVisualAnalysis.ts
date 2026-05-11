"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Types defined locally to avoid early MediaPipe import
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
  isTutorialMode?: boolean;
};

const VISION_WASM_PATH = "/wasm";
const CDN_BASE_URL = "https://assets.bigkas.site/Models";
const FACE_MODEL_PATH = `${CDN_BASE_URL}/face_landmarker.task`;
const GESTURE_MODEL_PATH = `${CDN_BASE_URL}/gesture_recognizer.task`;
const LANDMARKS_STORAGE_KEY = "bigkas_show_ai_landmarks";

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
  const isAnalyzingRef = useRef(false);
  const [isAnalyzing, setIsAnalyzingState] = useState(false);

  const setIsAnalyzing = useCallback((val: boolean) => {
    isAnalyzingRef.current = val;
    setIsAnalyzingState(val);
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<VisualAnalysisResult | null>(null);
  const [liveScores, setLiveScores] = useState<LiveVisualScores>({
    eye_contact_score: 0,
    gesture_score: 0,
  });

  const [showLandmarks, setShowLandmarksState] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(LANDMARKS_STORAGE_KEY);
    return saved === null ? true : saved === "true";
  });
  const showLandmarksRef = useRef(showLandmarks);

  const setShowLandmarks = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setShowLandmarksState((prev) => {
      const next = typeof val === "function" ? val(prev) : !!val;
      showLandmarksRef.current = next;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LANDMARKS_STORAGE_KEY, String(next));
      }
      return next;
    });
  }, []);

  // Use dynamic refs for MediaPipe classes to avoid bundling them in the initial parse
  const faceLandmarkerRef = useRef<any>(null);
  const gestureRecognizerRef = useRef<any>(null);
  const drawingUtilsClassRef = useRef<any>(null);
  const faceLandmarkerClassRef = useRef<any>(null);

  const rafRef = useRef<number | null>(null);
  const drawingUtilsRef = useRef<any>(null);
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  const metricsRef = useRef({
    frameCount: 0,
    eyeContactAccum: 0,
    gestureAccum: 0,
    prevHandCenter: null as { x: number; y: number } | null,
    lastProcessedTime: 0,
    isTutorialMode: false,
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

    // PERFORMANCE OPTIMIZATION: Dynamically import MediaPipe only when needed.
    // This moves 'vision_bundle.mjs' out of the critical path / initial Script Evaluation.
    const { FaceLandmarker, FilesetResolver, GestureRecognizer, DrawingUtils } = await import("@mediapipe/tasks-vision");
    
    // Store classes for use in analyzeFrame loop without closures
    drawingUtilsClassRef.current = DrawingUtils;
    faceLandmarkerClassRef.current = FaceLandmarker;

    const vision = await FilesetResolver.forVisionTasks(VISION_WASM_PATH);
    
    // Check if we were stopped while waiting for the resolver
    if (!isAnalyzingRef.current && !faceLandmarkerRef.current) {
      setIsReady(false);
      return;
    }

    const initErrors: string[] = [];

    try {
      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: FACE_MODEL_PATH,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
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
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
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
      cancelAnimationFrame(rafRef.current as any);
      clearTimeout(rafRef.current as any);
      rafRef.current = null;
    }
    setIsAnalyzing(false);
  }, []);

  const analyzeFrame = useCallback(() => {
    const videoElement = videoElementRef.current;
    const canvasElement = canvasElementRef.current;
    const faceLandmarker = faceLandmarkerRef.current;
    const gestureRecognizer = gestureRecognizerRef.current;

    if (!isAnalyzingRef.current || !videoElement || (!faceLandmarker && !gestureRecognizer)) {
      stopLoop();
      return;
    }

    if (videoElement.readyState < 2 || videoElement.videoWidth <= 0 || videoElement.videoHeight <= 0) {
      rafRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    const nowMs = performance.now();
    
    // Dynamic throttling: 
    // 5 FPS during tutorial (200ms) to save CPU for animations.
    // 25 FPS during training (40ms) for smooth tracking.
    const THROTTLE_MS = metricsRef.current.isTutorialMode ? 200 : 40;

    metricsRef.current.lastProcessedTime = nowMs;
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

    // Only update React state for live scores every 500ms to avoid excessive re-renders
    const lastScoreUpdate = (metricsRef.current as any).lastScoreUpdate || 0;
    if (nowMs - lastScoreUpdate > 500) {
      setLiveScores({
        eye_contact_score: eyeContactFrameScore,
        gesture_score: gestureFrameScore,
      });
      (metricsRef.current as any).lastScoreUpdate = nowMs;
    }

    if (canvasElement && canvasCtxRef.current) {
      const ctx = canvasCtxRef.current;
      const width = videoElement.videoWidth;
      const height = videoElement.videoHeight;
      if (canvasElement.width !== width || canvasElement.height !== height) {
        canvasElement.width = width;
        canvasElement.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      if (showLandmarksRef.current) {
        if (!drawingUtilsRef.current && drawingUtilsClassRef.current) {
          drawingUtilsRef.current = new drawingUtilsClassRef.current(ctx);
        }
        const drawingUtils = drawingUtilsRef.current;

        if (faceResult?.faceLandmarks?.length) {
          faceResult.faceLandmarks.forEach((landmarks: any) => {
            if (drawingUtils) {
              drawingUtils.drawConnectors(
                landmarks,
                (faceLandmarkerClassRef.current as any).FACE_LANDMARKS_CONTOURS || [],
                { color: "rgba(80,200,120,0.7)", lineWidth: 1 },
              );
            }
          });
        }

        if (handLandmarks.length && drawingUtils) {
          handLandmarks.forEach((points: any) => {
            drawHandConnections(ctx, points, width, height);
            drawingUtils.drawLandmarks(points, {
              color: "rgba(255, 212, 106, 0.95)",
              radius: 2,
            });
          });
        }
      }
    }

    // Use setTimeout for throttling instead of requestAnimationFrame polling.
    const elapsed = performance.now() - nowMs;
    const delay = Math.max(0, THROTTLE_MS - elapsed);
    (rafRef.current as any) = setTimeout(() => {
      requestAnimationFrame(analyzeFrame);
    }, delay);
  }, [stopLoop]);

  const startAnalysis = useCallback(async ({ videoElement, canvasElement, isTutorialMode = false }: StartAnalysisArgs) => {
    try {
      setError(null);
      stopLoop();
      setIsAnalyzing(true);
      await init();
      videoElementRef.current = videoElement;
      canvasElementRef.current = canvasElement || null;
      canvasCtxRef.current = canvasElement?.getContext("2d") || null;
      metricsRef.current = {
        frameCount: 0,
        eyeContactAccum: 0,
        gestureAccum: 0,
        prevHandCenter: null,
        lastProcessedTime: 0,
        isTutorialMode,
      };
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
    setLiveScores((prev) => {
      if (prev.eye_contact_score === 0 && prev.gesture_score === 0) return prev;
      return { eye_contact_score: 0, gesture_score: 0 };
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
    showLandmarks,
    setShowLandmarks,
    startAnalysis,
    stopAnalysis,
  };
}

export type { VisualAnalysisResult };
