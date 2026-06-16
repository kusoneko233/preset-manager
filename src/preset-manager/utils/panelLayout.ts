export interface SplitBounds {
  min: number;
  max: number;
  center: number;
}

export interface WindowState {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface FloatingPanelRect {
  top: number;
  left: number;
  width: number;
  height: number;
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

export function getCollapsedSecondPresetWidth(expandedWidth: number, totalWidth: number): number {
  const responsiveWidth = Math.round(Math.max(0, totalWidth) * 0.42);
  return clampSecondPresetWidth(Math.max(expandedWidth, responsiveWidth), totalWidth);
}

export function clampWindowState(
  state: WindowState,
  viewportWidth: number,
  viewportHeight: number,
  minWidth: number,
  minHeight: number,
): WindowState {
  const safeViewportWidth = Math.max(1, Math.floor(viewportWidth));
  const safeViewportHeight = Math.max(1, Math.floor(viewportHeight));
  const width = Math.min(
    safeViewportWidth,
    Math.max(minWidth, Number.isFinite(state.width) ? Math.round(state.width) : minWidth),
  );
  const height = Math.min(
    safeViewportHeight,
    Math.max(minHeight, Number.isFinite(state.height) ? Math.round(state.height) : minHeight),
  );
  const maxLeft = Math.max(0, safeViewportWidth - width);
  const maxTop = Math.max(0, safeViewportHeight - height);
  const left = Math.max(0, Math.min(Number.isFinite(state.left) ? Math.round(state.left) : 0, maxLeft));
  const top = Math.max(0, Math.min(Number.isFinite(state.top) ? Math.round(state.top) : 0, maxTop));

  return { top, left, width, height };
}

export function clampWindowStateWithVisibleArea(
  state: WindowState,
  viewportWidth: number,
  viewportHeight: number,
  minWidth: number,
  minHeight: number,
  visibleRatio = 0.1,
): WindowState {
  const safeViewportWidth = Math.max(1, Math.floor(viewportWidth));
  const safeViewportHeight = Math.max(1, Math.floor(viewportHeight));
  const safeVisibleRatio = Math.max(0.05, Math.min(Number.isFinite(visibleRatio) ? visibleRatio : 0.1, 1));
  const width = Math.min(
    safeViewportWidth,
    Math.max(minWidth, Number.isFinite(state.width) ? Math.round(state.width) : minWidth),
  );
  const height = Math.min(
    safeViewportHeight,
    Math.max(minHeight, Number.isFinite(state.height) ? Math.round(state.height) : minHeight),
  );
  const minVisibleWidth = Math.max(1, Math.round(width * safeVisibleRatio));
  const minVisibleHeight = Math.max(1, Math.round(height * safeVisibleRatio));
  const minLeft = minVisibleWidth - width;
  const minTop = minVisibleHeight - height;
  const maxLeft = safeViewportWidth - minVisibleWidth;
  const maxTop = safeViewportHeight - minVisibleHeight;
  const left = Math.max(minLeft, Math.min(Number.isFinite(state.left) ? Math.round(state.left) : 0, maxLeft));
  const top = Math.max(minTop, Math.min(Number.isFinite(state.top) ? Math.round(state.top) : 0, maxTop));

  return { top, left, width, height };
}

export function clampFloatingPanelRect(
  rect: FloatingPanelRect,
  viewportWidth: number,
  viewportHeight: number,
  minWidth: number,
  minHeight: number,
  margin = 12,
): FloatingPanelRect {
  const safeViewportWidth = Math.max(1, Math.floor(viewportWidth));
  const safeViewportHeight = Math.max(1, Math.floor(viewportHeight));
  const safeMargin = Math.max(0, Math.floor(margin));
  const maxAvailableWidth = Math.max(1, safeViewportWidth - safeMargin * 2);
  const maxAvailableHeight = Math.max(1, safeViewportHeight - safeMargin * 2);
  const width = Math.min(
    maxAvailableWidth,
    Math.max(Math.min(minWidth, safeViewportWidth), Number.isFinite(rect.width) ? Math.round(rect.width) : minWidth),
  );
  const height = Math.min(
    maxAvailableHeight,
    Math.max(Math.min(minHeight, safeViewportHeight), Number.isFinite(rect.height) ? Math.round(rect.height) : minHeight),
  );
  const maxLeft = Math.max(0, safeViewportWidth - width - safeMargin);
  const maxTop = Math.max(0, safeViewportHeight - height - safeMargin);
  const minLeft = Math.min(safeMargin, maxLeft);
  const minTop = Math.min(safeMargin, maxTop);
  const left = Math.max(minLeft, Math.min(Number.isFinite(rect.left) ? Math.round(rect.left) : minLeft, maxLeft));
  const top = Math.max(minTop, Math.min(Number.isFinite(rect.top) ? Math.round(rect.top) : minTop, maxTop));

  return { top, left, width, height };
}
