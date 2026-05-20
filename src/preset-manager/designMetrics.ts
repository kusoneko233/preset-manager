export const CODEX_REFERENCE_METRICS = {
  window: {
    width: 1100,
    height: 700,
  },
  sidebar: {
    width: 255,
    minWidth: 220,
    maxWidth: 360,
  },
  titleBar: {
    height: 52,
  },
  aiDock: {
    width: 634,
    minHeight: 93,
    maxHeight: 93,
    bottom: 18,
    sideGap: 96,
  },
} as const;

export function getCodexMainWidth() {
  return CODEX_REFERENCE_METRICS.window.width - CODEX_REFERENCE_METRICS.sidebar.width;
}
