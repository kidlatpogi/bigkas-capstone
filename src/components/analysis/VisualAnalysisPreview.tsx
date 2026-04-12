"use client";

import { useEffect, useRef, useState } from "react";
import { useVisualAnalysis } from "../../hooks/useVisualAnalysis";

type VisualAnalysisPreviewProps = {
  analyzeWhenReady?: boolean;
  className?: string;
  onResult?: (result: { overall_score: number; eye_contact_score: number; gesture_score: number }) => void;
};

export default function VisualAnalysisPreview({
  analyzeWhenReady = true,
  className = "",
  onResult,
}: VisualAnalysisPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const visualAnalysis = useVisualAnalysis();

  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraReady(true);
    };

    startCamera().catch(() => {
      setIsCameraReady(false);
    });

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  useEffect(() => {
    if (!analyzeWhenReady || !isCameraReady || !videoRef.current) return;
    visualAnalysis.startAnalysis({
      videoElement: videoRef.current,
      canvasElement: canvasRef.current,
    });
    return () => {
      const result = visualAnalysis.stopAnalysis();
      onResult?.(result);
    };
  }, [analyzeWhenReady, isCameraReady, onResult, visualAnalysis]);

  return (
    <div className={className} style={{ position: "relative", width: "100%", maxWidth: 720, aspectRatio: "16/9" }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12, background: "#111" }}
      />
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      />
    </div>
  );
}
