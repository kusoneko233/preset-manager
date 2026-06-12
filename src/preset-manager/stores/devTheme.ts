import { CODEX_DARK_GLASS_WALLPAPER_DATA_URL, buildDevThemeSourceSelectors, createCodexDarkGlassDevThemeBackground, createDefaultDevThemeBackground, type DevThemeBackground, type DevThemePinnedStyle, type DevThemeTarget } from '../utils/devThemeCss';

export type DevThemePreset = {
  id: string;
  name: string;
  imageFileName: string | null;
  background: DevThemeBackground;
  targets: Record<DevThemeTarget, boolean>;
  pinnedStyles: DevThemePinnedStyle[];
  createdAt: number;
  updatedAt: number;
  builtin?: boolean;
};

export const BUILTIN_CODEX_V1_PRESET_ID = 'builtin-codex-minimal-v1';
export const BUILTIN_CODEX_DARK_GLASS_PRESET_ID = 'builtin-codex-dark-glass-v2';

export type DevThemePanelRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type DevThemeSelectedElement = {
  path: string;
  selectors?: string[];
  label: string;
  tag: string;
  stability?: 'source' | 'stable' | 'fallback';
  matchedCount: number;
  rect?: { width: number; height: number };
};

type PersistedDevThemeState = {
  version?: number;
  enabled: boolean;
  activePresetId: string | null;
  presets: DevThemePreset[];
};

const STORAGE_KEY = 'PresetManagerDevThemeState';
const DEV_THEME_STATE_VERSION = 5;

function cloneBackground(background: DevThemeBackground): DevThemeBackground {
  const next = { ...createDefaultDevThemeBackground(), ...background };
  if ((next as { imageFit?: string }).imageFit === 'framed') {
    next.imageFit = 'contain';
    next.imageScale = 1;
    next.imagePositionX = 50;
    next.imagePositionY = 50;
  }
  return next;
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

function normalizeSelectors(selectors: unknown, path: string) {
  const seen = new Set<string>();
  const normalized = Array.isArray(selectors)
    ? selectors
      .filter(selector => typeof selector === 'string')
      .map(selector => selector.trim())
      .filter(selector => {
        if (!selector) return false;
        if (selector.includes('[data-preset-manager-dev-selected="true"]')) return false;
        if (seen.has(selector)) return false;
        seen.add(selector);
        return true;
      })
    : [];
  return normalized.length ? normalized : buildDevThemeSourceSelectors(path);
}

function normalizeStability(value: unknown, selectors: string[], path: string): DevThemePinnedStyle['stability'] {
  if (value === 'source' || value === 'stable' || value === 'fallback') return value;
  if (path && !path.startsWith('__selected_element__')) return 'source';
  return selectors.some(selector => !selector.includes('data-preset-manager-dev-stable-id')) ? 'stable' : 'fallback';
}

function normalizeMatchedCount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 1;
}

function selectorKey(selectors: string[]) {
  return selectors.join('\n');
}

function clonePinnedStyle(style: DevThemePinnedStyle): DevThemePinnedStyle {
  const selectors = normalizeSelectors((style as { selectors?: unknown }).selectors, style.path);
  return {
    id: style.id || createId(),
    path: style.path,
    selectors,
    label: style.label || style.path,
    stability: normalizeStability((style as { stability?: unknown }).stability, selectors, style.path),
    matchedCount: normalizeMatchedCount((style as { matchedCount?: unknown }).matchedCount),
    background: cloneBackground(style.background),
  };
}

function normalizePinnedStyles(styles: DevThemePinnedStyle[] | undefined): DevThemePinnedStyle[] {
  if (!Array.isArray(styles)) return [];
  return styles.filter(style => Boolean(style?.path)).map(clonePinnedStyle);
}

function normalizePreset(preset: DevThemePreset): DevThemePreset {
  return {
    ...preset,
    background: cloneBackground(preset.background),
    targets: normalizeTargets(preset.targets),
    pinnedStyles: normalizePinnedStyles(preset.pinnedStyles),
    builtin: preset.id === BUILTIN_CODEX_V1_PRESET_ID || preset.id === BUILTIN_CODEX_DARK_GLASS_PRESET_ID ? true : preset.builtin,
  };
}

function isLegacyCodexDarkGlassPreset(preset: DevThemePreset) {
  if (preset.id === BUILTIN_CODEX_DARK_GLASS_PRESET_ID) return true;
  if (preset.id === BUILTIN_CODEX_V1_PRESET_ID) return false;
  const background = preset.background;
  const name = `${preset.id} ${preset.name}`.toLowerCase();
  const hasCodexIdentity = name.includes('codex');
  const hasCodexWallpaper =
    background.imageDataUrl === CODEX_DARK_GLASS_WALLPAPER_DATA_URL
    || background.originalImageDataUrl === CODEX_DARK_GLASS_WALLPAPER_DATA_URL
    || preset.imageFileName === 'codex-section-1-bg.webp';
  const hasLegacyDarkGlassTuning =
    background.maskColor?.toLowerCase() === '#303344'
    || background.maskColor?.toLowerCase() === '#161a22'
    || background.blur === 0
    || background.brightness < 0.8;
  return Boolean(
    hasCodexWallpaper
    || (hasCodexIdentity && hasLegacyDarkGlassTuning),
  );
}

function shouldMigrateCodexDarkGlassPreset(preset: DevThemePreset) {
  return isLegacyCodexDarkGlassPreset(preset);
}

function migrateCodexDarkGlassBackground(background: DevThemeBackground): DevThemeBackground {
  return {
    ...cloneBackground(background),
    ...createCodexDarkGlassDevThemeBackground(),
  };
}

function migratePersistedDevThemeState(state: PersistedDevThemeState): PersistedDevThemeState {
  if (state.version === DEV_THEME_STATE_VERSION) return state;
  return {
    ...state,
    version: DEV_THEME_STATE_VERSION,
    presets: Array.isArray(state.presets)
      ? state.presets.map(preset => {
        const normalized = normalizePreset(preset);
        return shouldMigrateCodexDarkGlassPreset(normalized)
          ? { ...normalized, background: migrateCodexDarkGlassBackground(normalized.background) }
          : normalized;
      })
      : [],
  };
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
    pinnedStyles: [],
    createdAt: now,
    updatedAt: now,
    builtin: true,
  };
}

function createBuiltinCodexDarkGlassPreset(): DevThemePreset {
  const now = Date.now();
  return {
    id: BUILTIN_CODEX_DARK_GLASS_PRESET_ID,
    name: 'Codex 深色雾透 v2（内置壁纸）',
    imageFileName: 'codex-section-1-bg.webp',
    background: createCodexDarkGlassDevThemeBackground(),
    targets: { ...defaultTargets(), workspace: false, panel: false },
    pinnedStyles: [],
    createdAt: now,
    updatedAt: now,
    builtin: true,
  };
}

function ensureBuiltinPresets(presets: DevThemePreset[]): DevThemePreset[] {
  const userPresets = presets
    .map(normalizePreset)
    .filter(preset => preset.id !== BUILTIN_CODEX_DARK_GLASS_PRESET_ID && preset.id !== BUILTIN_CODEX_V1_PRESET_ID);
  return [
    createBuiltinCodexDarkGlassPreset(),
    ...userPresets,
    createBuiltinCodexV1Preset(),
  ];
}

function readPersisted(): PersistedDevThemeState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedDevThemeState;
    if (!Array.isArray(parsed.presets)) return null;
    return migratePersistedDevThemeState(parsed);
  } catch {
    return null;
  }
}

const persisted = readPersisted();
const hasPersistedState = Boolean(persisted);
const initialPresets = ensureBuiltinPresets(persisted?.presets ?? []);
const firstPreset = initialPresets.find(p => p.id === persisted?.activePresetId) ?? initialPresets[0];

const devThemeStore = reactive({
  enabled: persisted?.enabled ?? !hasPersistedState,
  panelOpen: false,
  activePresetId: firstPreset?.id ?? null,
  presets: initialPresets,
  currentDraft: cloneBackground(firstPreset?.background ?? createDefaultDevThemeBackground()),
  currentTargets: normalizeTargets(firstPreset?.targets),
  pinnedStyles: normalizePinnedStyles(firstPreset?.pinnedStyles),
  panelRect: defaultPanelRect(),
  selectedElement: null as DevThemeSelectedElement | null,
  locked: true,
  livePreviewActive: false,

  persist() {
    const payload: PersistedDevThemeState = {
      version: DEV_THEME_STATE_VERSION,
      enabled: Boolean(this.enabled),
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
    this.pinnedStyles = normalizePinnedStyles(preset.pinnedStyles);
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
      pinnedStyles: normalizePinnedStyles(this.pinnedStyles),
      createdAt: now,
      updatedAt: now,
    };
    this.presets.push(preset);
    this.activePresetId = preset.id;
    this.persist();
  },
  importPreset(name: string, background: DevThemeBackground, targets: Partial<Record<DevThemeTarget, boolean>>, pinnedStyles: DevThemePinnedStyle[] = []) {
    const now = Date.now();
    const nextTargets = normalizeTargets(targets);
    if (this.selectedElement) nextTargets.selected = true;
    const preset: DevThemePreset = {
      id: createId(),
      name: name.trim() || '未命名背景预设',
      imageFileName: null,
      background: cloneBackground(background),
      targets: nextTargets,
      pinnedStyles: normalizePinnedStyles(pinnedStyles),
      createdAt: now,
      updatedAt: now,
    };
    this.presets.push(preset);
    this.activePresetId = preset.id;
    this.currentDraft = cloneBackground(preset.background);
    this.currentTargets = normalizeTargets(preset.targets);
    this.pinnedStyles = normalizePinnedStyles(preset.pinnedStyles);
    this.setEnabled(true);
    this.persist();
  },
  overwriteCurrentPreset() {
    const preset = this.presets.find(item => item.id === this.activePresetId);
    if (!preset || preset.builtin) return;
    preset.background = cloneBackground(this.currentDraft);
    preset.targets = normalizeTargets(this.currentTargets);
    preset.pinnedStyles = normalizePinnedStyles(this.pinnedStyles);
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
      this.pinnedStyles = normalizePinnedStyles(next?.pinnedStyles);
    }
    this.persist();
  },
  resetDraft() {
    const preset = this.presets.find(item => item.id === this.activePresetId);
    this.currentDraft = cloneBackground(preset?.background ?? createDefaultDevThemeBackground());
    this.currentTargets = normalizeTargets(preset?.targets);
    this.pinnedStyles = normalizePinnedStyles(preset?.pinnedStyles);
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
  pinSelectedElementStyle() {
    if (!this.selectedElement?.path) return;
    const selectors = normalizeSelectors(this.selectedElement.selectors, this.selectedElement.path);
    if (!selectors.length) return;
    const pinned: DevThemePinnedStyle = {
      id: createId(),
      path: this.selectedElement.path,
      selectors,
      label: this.selectedElement.label || this.selectedElement.path,
      stability: this.selectedElement.stability ?? 'fallback',
      matchedCount: this.selectedElement.matchedCount || 1,
      background: cloneBackground(this.currentDraft),
    };
    const pinnedKey = selectorKey(pinned.selectors);
    const existingIndex = this.pinnedStyles.findIndex(style => selectorKey(style.selectors) === pinnedKey);
    if (existingIndex >= 0) {
      this.pinnedStyles[existingIndex] = { ...pinned, id: this.pinnedStyles[existingIndex].id };
    } else {
      this.pinnedStyles.push(pinned);
    }
    this.currentTargets.selected = true;
    this.persist();
  },
  removePinnedStyle(id: string) {
    this.pinnedStyles = this.pinnedStyles.filter(style => style.id !== id);
    this.persist();
  },
  clearPinnedStyles() {
    this.pinnedStyles = [];
    this.persist();
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
