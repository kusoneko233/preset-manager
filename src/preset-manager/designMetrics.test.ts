declare const require: any;

const {
  CODEX_REFERENCE_METRICS,
  getCodexMainWidth,
} = require('./designMetrics');

function expectEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

expectEqual(CODEX_REFERENCE_METRICS.window.width, 1100);
expectEqual(CODEX_REFERENCE_METRICS.window.height, 700);
expectEqual(CODEX_REFERENCE_METRICS.sidebar.width, 255);
expectEqual(CODEX_REFERENCE_METRICS.titleBar.height, 52);
expectEqual(CODEX_REFERENCE_METRICS.aiDock.width, 400);
expectEqual(CODEX_REFERENCE_METRICS.aiDock.minHeight, 93);
expectEqual(CODEX_REFERENCE_METRICS.aiDock.maxHeight, 93);
expectEqual(CODEX_REFERENCE_METRICS.aiDock.bottom, 18);
expectEqual(getCodexMainWidth(), 845);

console.info('designMetrics tests passed');
