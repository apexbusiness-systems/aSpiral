import { useState, useEffect } from 'react';

/**
 * Mobile detection hook with performance optimization focus.
 * Detects mobile devices based on user agent and screen width.
 */
export function useMobileDetect() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Very basic sanity check for SSR
      if (typeof globalThis.window === 'undefined') return;
      
      const userAgent = navigator.userAgent;
      const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isSmallScreen = globalThis.window.innerWidth < 768 || globalThis.window.screen.width < 768;
      
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    // Initial check
    checkMobile();

    // Listen to resize events but debounce heavily since device type rarely changes mid-session
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 500);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return isMobile;
}

/**
 * Higher order mobile throttle utility for useFrame.
 * Evaluates the clock and skips frames to maintain ~30fps on mobile devices.
 * 
 * Usage in useFrame:
 * if (throttleMobileFrame(isMobile, state.clock.elapsedTime)) return;
 */
export function throttleMobileFrame(isMobile: boolean, elapsedTime: number): boolean {
  // If mobile, throttle to 30fps (approx 0.033s per frame)
  // Skip if we haven't passed the threshold in the current 1/30s bucket
  if (isMobile && elapsedTime % (1 / 30) > 0.016) {
    return true; // Skip this frame
  }
  return false;
}
