export interface SplitBounds {
  min: number;
  max: number;
  center: number;
}

const SPLIT_HANDLE_WIDTH = 1;
const SECOND_TOGGLE_WIDTH = 22;
const DESKTOP_PANEL_MIN = 280;
const COMPACT_PANEL_MIN = 180;

export function getSecondPresetBounds(totalWidth: number): SplitBounds {
  const available = Math.max(0, Math.floor(totalWidth - SPLIT_HANDLE_WIDTH - SECOND_TOGGLE_WIDTH));
  const preferredMin = available < DESKTOP_PANEL_MIN * 2 ? COMPACT_PANEL_MIN : DESKTOP_PANEL_MIN;
  const min = Math.min(preferredMin, Math.max(COMPACT_PANEL_MIN, Math.floor(available / 2)));
  const max = Math.max(min, available - min);
  const center = Math.round(available / 2);

  return { min, max, center };
}

export function clampSecondPresetWidth(width: number, totalWidth: number): number {
  const bounds = getSecondPresetBounds(totalWidth);
  if (!Number.isFinite(width) || width <= 0) return bounds.center;
  return Math.max(bounds.min, Math.min(Math.round(width), bounds.max));
}
