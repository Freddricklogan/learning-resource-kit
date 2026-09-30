/** Where the guided-tour card goes. Pure, so it is unit-tested; the shell applies the result. */

export interface TourRect {
  top: number;
  bottom: number;
  left: number;
}

export interface TourPlacement {
  left: number;
  top: number;
}

export interface TourPlaceInput {
  rect: TourRect;
  vw: number;
  vh: number;
  cw: number;
  ch: number;
  margin?: number;
  gap?: number;
}

/**
 * Below the target, else above it, and always inside the viewport. A card taller than the
 * viewport is capped by CSS (max-height with internal scroll) and pinned to the top margin,
 * so its Back / Next buttons stay reachable.
 */
export function placeTourCard({ rect, vw, vh, cw, ch, margin = 12, gap = 16 }: TourPlaceInput): TourPlacement {
  const h = Math.min(ch, vh - 2 * margin);
  let top = rect.bottom + gap;
  if (top + h > vh - margin) top = rect.top - h - gap;
  top = Math.min(Math.max(margin, top), vh - h - margin);
  let left = rect.left;
  if (left + cw > vw - margin) left = vw - cw - margin;
  return { left: Math.max(margin, left), top: Math.max(margin, top) };
}

/** Centre a card that has no target, never above the top margin. */
export function centreTourCard({ vw, vh, cw, ch, margin = 12 }: Omit<TourPlaceInput, 'rect' | 'gap'>): TourPlacement {
  const h = Math.min(ch, vh - 2 * margin);
  return { left: Math.max(margin, (vw - cw) / 2), top: Math.max(margin, (vh - h) / 2) };
}
