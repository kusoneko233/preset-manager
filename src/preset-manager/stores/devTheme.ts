import { createDefaultDevThemeBackground, type DevThemeBackground, type DevThemeTarget } from '../utils/devThemeCss';

export type DevThemePreset = {
  id: string;
  name: string;
  imageFileName: string | null;
  background: DevThemeBackground;
  targets: Record<DevThemeTarget, boolean>;
  createdAt: number;
  updatedAt: number;
  builtin?: boolean;
};

export const BUILTIN_CODEX_V1_PRESET_ID = 'builtin-codex-minimal-v1';

export type DevThemePanelRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type DevThemeSelectedElement = {
  path: string;
  label: string;
  tag: string;
  matchedCount: number;
  rect?: { width: number; height: number };
};

type PersistedDevThemeState = {
  enabled: boolean;
  activePresetId: string | null;
  presets: DevThemePreset[];
};

const STORAGE_KEY = 'PresetManagerDevThemeState';

function cloneBackground(background: DevThemeBackground): DevThemeBackground {
  return { ...createDefaultDevThemeBackground(), ...background };
}

function createId() {
  return `dev-theme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultTargets(): Record<DevThemeTarget, boolean> {
  return { sidebar: true, workspace: true, panel: true, selected: false };
}

function normalizeTargets(targets: Partial<Record<DevThemeTarget, boolean>> | undefined): Record<DevThemeTarget, boolean> {
  return { ...defaultTargets(), ...(targets ?? {}) };
}

function defaultPanelRect(): DevThemePanelRect {
  return { top: 88, left: 520, width: 360, height: 620 };
}

function createBuiltinCodexV1Preset(): DevThemePreset {
  const now = Date.now();
  return {
    id: BUILTIN_CODEX_V1_PRESET_ID,
    name: 'Codex 极简 v1（内置基线）',
    imageFileName: null,
    background: createDefaultDevThemeBackground(),
    targets: defaultTargets(),
    createdAt: now,
    updatedAt: now,
    builtin: true,
  };
}

function ensureBuiltinPresets(presets: DevThemePreset[]): DevThemePreset[] {
  const merged = presets.map(preset => (preset.id === BUILTIN_CODEX_V1_PRESET_ID ? { ...preset, builtin: true } : preset));
  if (merged.some(p => p.id === BUILTIN_CODEX_V1_PRESET_ID)) return merged;
  return [createBuiltinCodexV1Preset(), ...merged];
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

const persisted = readPersisted();
const initialPresets = ensureBuiltinPresets(persisted?.presets ?? []);
const firstPreset = initialPresets.find(p => p.id === persisted?.activePresetId) ?? initialPresets[0];

const devThemeStore = reactive({
  enabled: false,
  panelOpen: false,
  activePresetId: firstPreset?.id ?? null,
  presets: initialPresets,
  currentDraft: cloneBackground(firstPreset?.background ?? createDefaultDevThemeBackground()),
  currentTargets: normalizeTargets(firstPreset?.targets),
  panelRect: defaultPanelRect(),
  selectedElement: null as DevThemeSelectedElement | null,
  locked: true,
  livePreviewActive: false,

  persist() {
    const payload: PersistedDevThemeState = {
      enabled: false,
      activePresetId: this.activePresetId,
      presets: this.presets,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  },
  togglePanel() {
    if (!this.panelOpen) this.resetPanelRect();
    this.panelOpen = !this.panelOpen;
  },
  resetPanelRect() {
    this.panelRect = defaultPanelRect();
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
    this.currentTargets = normalizeTargets(preset.targets);
    this.persist();
  },
  saveAsNewPreset(name: string) {
    const now = Date.now();
    const preset: DevThemePreset = {
      id: createId(),
      name: name.trim() || '未命名背景预设',
      imageFileName: null,
      background: cloneBackground(this.currentDraft),
      targets: normalizeTargets(this.currentTargets),
      createdAt: now,
      updatedAt: now,
    };
    this.presets.push(preset);
    this.activePresetId = preset.id;
    this.persist();
  },
  importPreset(name: string, background: DevThemeBackground, targets: Partial<Record<DevThemeTarget, boolean>>) {
    const now = Date.now();
    const nextTargets = normalizeTargets(targets);
    if (this.selectedElement) nextTargets.selected = true;
    const preset: DevThemePreset = {
      id: createId(),
      name: name.trim() || '未命名背景预设',
      imageFileName: null,
      background: cloneBackground(background),
      targets: nextTargets,
      createdAt: now,
      updatedAt: now,
    };
    this.presets.push(preset);
    this.activePresetId = preset.id;
    this.currentDraft = cloneBackground(preset.background);
    this.currentTargets = normalizeTargets(preset.targets);
    this.setEnabled(true);
    this.persist();
  },
  overwriteCurrentPreset() {
    const preset = this.presets.find(item => item.id === this.activePresetId);
    if (!preset || preset.builtin) return;
    preset.background = cloneBackground(this.currentDraft);
    preset.targets = normalizeTargets(this.currentTargets);
    preset.updatedAt = Date.now();
    this.persist();
  },
  renamePreset(id: string, name: string) {
    const preset = this.presets.find(item => item.id === id);
    if (!preset || preset.builtin) return;
    preset.name = name.trim() || preset.name;
    preset.updatedAt = Date.now();
    this.persist();
  },
  deletePreset(id: string) {
    const target = this.presets.find(item => item.id === id);
    if (!target || target.builtin) return;
    this.presets = this.presets.filter(item => item.id !== id);
    if (this.activePresetId === id) {
      const next = this.presets[0];
      this.activePresetId = next?.id ?? null;
      this.currentDraft = cloneBackground(next?.background ?? createDefaultDevThemeBackground());
      this.currentTargets = normalizeTargets(next?.targets);
    }
    this.persist();
  },
  resetDraft() {
    const preset = this.presets.find(item => item.id === this.activePresetId);
    this.currentDraft = cloneBackground(preset?.background ?? createDefaultDevThemeBackground());
    this.currentTargets = normalizeTargets(preset?.targets);
  },
  toggleTarget(target: DevThemeTarget) {
    this.currentTargets[target] = !this.currentTargets[target];
    this.persist();
  },
  setPanelRect(rect: DevThemePanelRect) {
    this.panelRect = rect;
  },
  setSelectedElement(payload: DevThemeSelectedElement) {
    this.selectedElement = payload;
    this.panelOpen = true;
    if (!this.currentTargets.selected) {
      this.currentTargets.selected = true;
    }
    if (!this.enabled) this.setEnabled(true);
  },
  clearSelectedElement() {
    this.selectedElement = null;
  },
  toggleLocked() {
    this.locked = !this.locked;
  },
  setLivePreviewActive(value: boolean) {
    this.livePreviewActive = value;
  },
});

export function useDevThemeStore() {
  return devThemeStore;
}
