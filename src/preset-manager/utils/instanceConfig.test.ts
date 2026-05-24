declare const require: any;

const {
  getInstanceStorageKey,
  resolvePresetManagerInstance,
} = require('./instanceConfig');

function expectEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

expectEqual(resolvePresetManagerInstance('preset-manager-ui').key, 'ui');
expectEqual(resolvePresetManagerInstance('preset_manager UI').buttonName, '预设管理器 UI');
expectEqual(resolvePresetManagerInstance('preset-manager-core').key, 'core');
expectEqual(resolvePresetManagerInstance('预设管理器').key, 'default');
expectEqual(getInstanceStorageKey('default', 'Theme'), 'presetManagerTheme');
expectEqual(getInstanceStorageKey('ui', 'Theme'), 'presetManager:ui:Theme');
expectEqual(getInstanceStorageKey('core', 'WindowState'), 'presetManager:core:WindowState');

console.info('instanceConfig tests passed');
