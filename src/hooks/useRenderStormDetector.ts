import { useEffect, useRef } from 'react';

interface RenderStormOptions {
  threshold?: number;
  windowMs?: number;
}

export function useRenderStormDetector(
  name: string,
  { threshold = 30, windowMs = 1000 }: RenderStormOptions = {}
) {
  const renderCountRef = useRef(0);
  const windowStartRef = useRef(0);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const now = Date.now();
    if (now - windowStartRef.current > windowMs) {
      windowStartRef.current = now;
      renderCountRef.current = 0;
    }

    renderCountRef.current += 1;
    if (renderCountRef.current > threshold) {
      console.warn(
        `[RenderStorm] ${name} rendered ${renderCountRef.current} times in ${windowMs}ms.`
      );
    }
  });
}
