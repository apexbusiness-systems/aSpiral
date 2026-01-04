import { useEffect, useMemo, useRef } from "react";
import { detectDeviceCapabilities, prefersReducedMotion } from "@/lib/performance/optimizer";
import type { DeviceCapabilities } from "@/lib/cinematics/types";

interface OffscreenSpiralCanvasProps {
  className?: string;
}

type RendererInitMessage = {
  type: "init";
  canvas: OffscreenCanvas;
  dpr: number;
  size: { width: number; height: number };
  capabilities: DeviceCapabilities;
  reducedMotion: boolean;
};

type RendererResizeMessage = {
  type: "resize";
  size: { width: number; height: number };
};

export function OffscreenSpiralCanvas({ className }: OffscreenSpiralCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const capabilities = useMemo(() => detectDeviceCapabilities(), []);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!("transferControlToOffscreen" in canvas)) return;

    const offscreen = canvas.transferControlToOffscreen();
    const worker = new Worker(new URL("@/workers/renderer.worker.tsx", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    const bounds = canvas.getBoundingClientRect();
    const initMessage: RendererInitMessage = {
      type: "init",
      canvas: offscreen,
      dpr: window.devicePixelRatio || 1,
      size: { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) },
      capabilities,
      reducedMotion,
    };

    worker.postMessage(initMessage, [offscreen]);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const resizeMessage: RendererResizeMessage = {
        type: "resize",
        size: { width: Math.max(1, width), height: Math.max(1, height) },
      };
      worker.postMessage(resizeMessage);
    });

    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
      worker.terminate();
      workerRef.current = null;
    };
  }, [capabilities, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
