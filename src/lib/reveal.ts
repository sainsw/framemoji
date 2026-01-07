export const REVEAL_STEPS = [3, 5, 7, 9, 10] as const;

export function clampRevealCount(reveal: number) {
  if (!Number.isFinite(reveal)) return REVEAL_STEPS[0];
  return Math.min(Math.max(Math.round(reveal), 1), 10);
}

export function revealStepForCount(reveal: number) {
  const clamped = clampRevealCount(reveal);
  for (const step of REVEAL_STEPS) {
    if (clamped <= step) return step;
  }
  return REVEAL_STEPS[REVEAL_STEPS.length - 1];
}

export function revealIndexForCount(reveal: number) {
  const step = revealStepForCount(reveal);
  const idx = REVEAL_STEPS.indexOf(step);
  return idx >= 0 ? idx : 0;
}

export function nextRevealCount(current: number) {
  const step = revealStepForCount(current);
  const idx = REVEAL_STEPS.indexOf(step);
  const nextIdx = Math.min(idx + 1, REVEAL_STEPS.length - 1);
  return REVEAL_STEPS[nextIdx];
}

export function guessesLeftForReveal(reveal: number) {
  const idx = revealIndexForCount(reveal);
  return REVEAL_STEPS.length - idx;
}
