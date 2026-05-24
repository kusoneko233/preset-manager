export type PresetManagerInstanceKey = 'default' | 'ui' | 'core';

export type PresetManagerInstanceConfig = {
  key: PresetManagerInstanceKey;
  label: string;
  buttonName: string;
  iconClass: string;
  defaultPosition: {
    right: number;
    bottom: number;
  };
};

const INSTANCE_CONFIGS: Record<PresetManagerInstanceKey, PresetManagerInstanceConfig> = {
  default: {
    key: 'default',
    label: 'Preset Manager',
    buttonName: '预设管理器',
    iconClass: 'fa-sliders-h',
    defaultPosition: { right: 20, bottom: 80 },
  },
  ui: {
    key: 'ui',
    label: 'Preset Manager UI',
    buttonName: '预设管理器 UI',
    iconClass: 'fa-paint-brush',
    defaultPosition: { right: 84, bottom: 80 },
  },
  core: {
    key: 'core',
    label: 'Preset Manager Core',
    buttonName: '预设管理器 Core',
    iconClass: 'fa-sliders-h',
    defaultPosition: { right: 20, bottom: 80 },
  },
};

export function resolvePresetManagerInstance(scriptName: string | undefined | null): PresetManagerInstanceConfig {
  const normalized = String(scriptName ?? '').toLowerCase();

  if (/\bui\b|[-_\s]ui\b|\bui[-_\s]/.test(normalized)) {
    return INSTANCE_CONFIGS.ui;
  }

  if (/\bcore\b|[-_\s]core\b|\bcore[-_\s]/.test(normalized)) {
    return INSTANCE_CONFIGS.core;
  }

  return INSTANCE_CONFIGS.default;
}

export function getInstanceStorageKey(instanceKey: PresetManagerInstanceKey, key: string) {
  return instanceKey === 'default' ? `presetManager${key}` : `presetManager:${instanceKey}:${key}`;
}
