/**
 * Motion helpers for Client Components.
 * Keep GSAP usage behind these helpers so reduced-motion stays consistent.
 */

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
