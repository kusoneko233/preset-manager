export const CODEX_REFERENCE_METRICS = {
  window: {
    width: 1375,
    height: 875,
  },
  sidebar: {
    width: 320,
    minWidth: 248,
    maxWidth: 420,
  },
  titleBar: {
    height: 52,
  },
  aiDock: {
    width: 800,
    minHeight: 112,
    maxHeight: 124,
    bottom: 26,
    sideGap: 136,
  },
} as const;

export function getCodexMainWidth() {
  return CODEX_REFERENCE_METRICS.window.width - CODEX_REFERENCE_METRICS.sidebar.width;
}
