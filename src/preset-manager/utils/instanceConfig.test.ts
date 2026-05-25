declare const require: any;

const { getInstanceStorageKey, resolvePresetManagerInstance } = require('./instanceConfig');

function expectEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

expectEqual(getInstanceStorageKey('default', 'Theme'), 'presetManagerTheme');
expectEqual(getInstanceStorageKey('default', 'FloatingButton'), 'presetManagerFloatingButton');
expectEqual(getInstanceStorageKey('default', 'WindowState'), 'presetManagerWindowState');
expectEqual(getInstanceStorageKey('ui', 'FloatingButton'), 'presetManager:ui:FloatingButton');
expectEqual(getInstanceStorageKey('core', 'WindowState'), 'presetManager:core:WindowState');
expectEqual(resolvePresetManagerInstance('preset-manager-ui').key, 'ui');
expectEqual(resolvePresetManagerInstance('preset-manager-core').key, 'core');
expectEqual(resolvePresetManagerInstance('preset-manager').key, 'default');

console.info('instanceConfig tests passed');
