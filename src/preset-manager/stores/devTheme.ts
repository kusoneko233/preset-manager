import { defineStore } from 'pinia';
import { createDefaultDevThemeBackground, type DevThemeBackground, type DevThemeTarget } from '../utils/devThemeCss';

export type DevThemePreset = {
  id: string;
  name: string;
  imageFileName: string | null;
  background: DevThemeBackground;
  targets: Record<DevThemeTarget, boolean>;
  createdAt: number;
  updatedAt: number;
};

export type DevThemePanelRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type PersistedDevThemeState = {
  enabled: boolean;
  activePresetId: string | null;
  presets: DevThemePreset[];
  panelRect: DevThemePanelRect;
};

const STORAGE_KEY = 'PresetManagerDevThemeState';

function cloneBackground(background: DevThemeBackground): DevThemeBackground {
  return { ...background };
}

function createId() {
  return `dev-theme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultTargets(): Record<DevThemeTarget, boolean> {
  return { sidebar: true, workspace: true, panel: true };
}

function defaultPanelRect(): DevThemePanelRect {
  return { top: 88, left: 520, width: 360, height: 620 };
}

function readPersisted(): PersistedDevThemeState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedDevThemeState;
    if (!Array.isArray(parsed.presets)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const useDevThemeStore = defineStore('devTheme', {
  state: () => {
    const persisted = readPersisted();
    const firstPreset = persisted?.presets.find(p => p.id === persisted.activePresetId) ?? persisted?.presets[0];

    return {
      enabled: persisted?.enabled ?? false,
      panelOpen: false,
      activePresetId: firstPreset?.id ?? null,
      presets: persisted?.presets ?? [],
      currentDraft: cloneBackground(firstPreset?.background ?? createDefaultDevThemeBackground()),
      currentTargets: { ...(firstPreset?.targets ?? defaultTargets()) },
      panelRect: persisted?.panelRect ?? defaultPanelRect(),
    };
  },
  actions: {
    persist() {
      const payload: PersistedDevThemeState = {
        enabled: this.enabled,
        activePresetId: this.activePresetId,
        presets: this.presets,
        panelRect: this.panelRect,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    },
    togglePanel() {
      this.panelOpen = !this.panelOpen;
    },
    setEnabled(value: boolean) {
      this.enabled = value;
      this.persist();
    },
    applyPreset(id: string) {
      const preset = this.presets.find(item => item.id === id);
      if (!preset) return;
      this.activePresetId = preset.id;
      this.currentDraft = cloneBackground(preset.background);
      this.currentTargets = { ...preset.targets };
      this.persist();
    },
    saveAsNewPreset(name: string) {
      const now = Date.now();
      const preset: DevThemePreset = {
        id: createId(),
        name: name.trim() || '未命名背景预设',
        imageFileName: null,
        background: cloneBackground(this.currentDraft),
        targets: { ...this.currentTargets },
        createdAt: now,
        updatedAt: now,
      };
      this.presets.push(preset);
      this.activePresetId = preset.id;
      this.persist();
    },
    overwriteCurrentPreset() {
      const preset = this.presets.find(item => item.id === this.activePresetId);
      if (!preset) return;
      preset.background = cloneBackground(this.currentDraft);
      preset.targets = { ...this.currentTargets };
      preset.updatedAt = Date.now();
      this.persist();
    },
    renamePreset(id: string, name: string) {
      const preset = this.presets.find(item => item.id === id);
      if (!preset) return;
      preset.name = name.trim() || preset.name;
      preset.updatedAt = Date.now();
      this.persist();
    },
    deletePreset(id: string) {
      this.presets = this.presets.filter(item => item.id !== id);
      if (this.activePresetId === id) {
        const next = this.presets[0];
        this.activePresetId = next?.id ?? null;
        this.currentDraft = cloneBackground(next?.background ?? createDefaultDevThemeBackground());
        this.currentTargets = { ...(next?.targets ?? defaultTargets()) };
      }
      this.persist();
    },
    resetDraft() {
      const preset = this.presets.find(item => item.id === this.activePresetId);
      this.currentDraft = cloneBackground(preset?.background ?? createDefaultDevThemeBackground());
      this.currentTargets = { ...(preset?.targets ?? defaultTargets()) };
    },
    toggleTarget(target: DevThemeTarget) {
      this.currentTargets[target] = !this.currentTargets[target];
      this.persist();
    },
    setPanelRect(rect: DevThemePanelRect) {
      this.panelRect = rect;
      this.persist();
    },
  },
});
