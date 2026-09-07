const DICEBEAR_SPROUTS_SVG = "https://api.dicebear.com/10.x/sprouts/svg";

/** Deterministic DiceBear sprouts avatar with the animation preset. */
export function dicebearAvatarUrl(seed: string) {
  const params = new URLSearchParams({
    seed,
    tags: "animation",
  });
  return `${DICEBEAR_SPROUTS_SVG}?${params}`;
}
