/**
 * Custom Easing Functions for ASPIRAL Cinematics
 * Lightweight implementation without external dependencies
 * All functions take t (0-1) and return eased value (0-1)
 */

/**
 * Easing function type
 */
export type EasingFunction = (t: number) => number;

/**
 * Linear easing (no easing)
 */
export const linear: EasingFunction = (t: number) => t;

/**
 * Ease In Cubic
 * Slow start, accelerating
 */
export const easeInCubic: EasingFunction = (t: number) => t * t * t;

/**
 * Ease Out Cubic
 * Fast start, decelerating
 */
export const easeOutCubic: EasingFunction = (t: number) => {
  const t1 = t - 1;
  return t1 * t1 * t1 + 1;
};

/**
 * Ease In Out Cubic (PRIMARY EASING)
 * Slow start and end, fast middle
 * Used for most camera animations
 */
export const easeInOutCubic: EasingFunction = (t: number) => {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/**
 * Ease In Quart
 * Very slow start, rapid acceleration
 */
export const easeInQuart: EasingFunction = (t: number) => t * t * t * t;

/**
 * Ease Out Quart
 * Very fast start, smooth deceleration
 */
export const easeOutQuart: EasingFunction = (t: number) => {
  const t1 = t - 1;
  return 1 - t1 * t1 * t1 * t1;
};

/**
 * Ease In Out Quart
 * Very smooth camera movements
 * Used for gentle, cinematic camera paths
 */
export const easeInOutQuart: EasingFunction = (t: number) => {
  return t < 0.5
    ? 8 * t * t * t * t
    : 1 - Math.pow(-2 * t + 2, 4) / 2;
};

/**
 * Ease Out Expo
 * Explosive start, rapid deceleration
 * Perfect for explosion and impact effects
 */
export const easeOutExpo: EasingFunction = (t: number) => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

/**
 * Ease In Expo
 * Slow start, explosive acceleration
 */
export const easeInExpo: EasingFunction = (t: number) => {
  return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
};

/**
 * Ease In Out Expo
 * Explosive start and end
 */
export const easeInOutExpo: EasingFunction = (t: number) => {
  if (t === 0) return 0;
  if (t === 1) return 1;

  return t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;
};

/**
 * Ease Out Back
 * Overshoots slightly at the end
 * Great for "landing" effects
 */
export const easeOutBack: EasingFunction = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/**
 * Ease In Back
 * Pulls back slightly before moving forward
 */
export const easeInBack: EasingFunction = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
};

/**
 * Ease Out Bounce
 * Bouncy landing effect
 */
export const easeOutBounce: EasingFunction = (t: number) => {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

/**
 * Ease Out Elastic
 * Elastic/spring effect at the end
 */
export const easeOutElastic: EasingFunction = (t: number) => {
  const c4 = (2 * Math.PI) / 3;

  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

/**
 * Ease In Sine
 * Very gentle acceleration
 */
export const easeInSine: EasingFunction = (t: number) => {
  return 1 - Math.cos((t * Math.PI) / 2);
};

/**
 * Ease Out Sine
 * Very gentle deceleration
 */
export const easeOutSine: EasingFunction = (t: number) => {
  return Math.sin((t * Math.PI) / 2);
};

/**
 * Ease In Out Sine
 * Very smooth, wave-like motion
 */
export const easeInOutSine: EasingFunction = (t: number) => {
  return -(Math.cos(Math.PI * t) - 1) / 2;
};

/**
 * Map of all easing functions for lookup
 */
export const easingFunctions: Record<string, EasingFunction> = {
  linear,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeOutExpo,
  easeInExpo,
  easeInOutExpo,
  easeOutBack,
  easeInBack,
  easeOutBounce,
  easeOutElastic,
  easeInSine,
  easeOutSine,
  easeInOutSine,
};

/**
 * Get easing function by name
 */
export function getEasingFunction(name: string): EasingFunction {
  return easingFunctions[name] || linear;
}

/**
 * Interpolate between two numbers using an easing function
 */
export function lerp(start: number, end: number, t: number, easing: EasingFunction = linear): number {
  const easedT = easing(Math.max(0, Math.min(1, t)));
  return start + (end - start) * easedT;
}

/**
 * Interpolate between two values over time
 * Returns current value based on elapsed time and duration
 */
export function interpolate(
  start: number,
  end: number,
  elapsed: number,
  duration: number,
  easing: EasingFunction = easeInOutCubic
): number {
  const t = Math.min(elapsed / duration, 1);
  return lerp(start, end, t, easing);
}

/**
 * Map a value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Smooth step function (hermite interpolation)
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
