/**
 * Motion helpers for Client Components.
 * Keep GSAP usage behind these helpers so reduced-motion stays consistent.
 */

export const MOTION = {
  duration: 0.45,
  ease: "power2.out",
  y: 10,
  readableOpacity: 0.92,
} as const;

export const DASHBOARD_FIRST_VISIT_KEY = "auri-dashboard-entered";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
