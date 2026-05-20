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

expectEqual(CODEX_REFERENCE_METRICS.window.width, 1375);
expectEqual(CODEX_REFERENCE_METRICS.window.height, 875);
expectEqual(CODEX_REFERENCE_METRICS.sidebar.width, 320);
expectEqual(CODEX_REFERENCE_METRICS.titleBar.height, 52);
expectEqual(CODEX_REFERENCE_METRICS.aiDock.width, 800);
expectEqual(CODEX_REFERENCE_METRICS.aiDock.minHeight, 112);
expectEqual(CODEX_REFERENCE_METRICS.aiDock.maxHeight, 124);
expectEqual(getCodexMainWidth(), 1055);

console.info('designMetrics tests passed');
