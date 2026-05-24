import {
  buildOfficialPromptExport,
  getOfficialPromptKey,
  isOfficialPromptDeletable,
  isOfficialPromptKey,
  isOfficialRestorableSystemPrompt,
  normalizeOfficialPrompt,
  readOfficialPromptImport,
  splitPromptsByOfficialDefaultOrder,
  splitPromptsByOfficialOrder,
  type OfficialPromptExport,
} from '../utils/officialPromptManager';

export interface FavoriteFolder {
  id: string;
  name: string;
  collapsed: boolean;
  items: PresetNormalPrompt[];
}

export interface DraftPrompt {
  id: string;
  name: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  collapsed: boolean;
}

interface ManagerState {
  presetName: string;
  preset: Preset | null;
  secondPresetName: string;
  secondPreset: Preset | null;
  favorites: FavoriteFolder[];
  drafts: DraftPrompt[];
}

const STORAGE_KEY = 'preset_manager';

function tryGetPreset(name: string): Preset | null {
  try {
    return getPreset(name);
  } catch (e) {
    console.warn('[PresetManager] preset name is not loadable:', name, e);
    return null;
  }
}

function getLoadablePresetNames(): string[] {
  return getPresetNames().filter(name => !!tryGetPreset(name));
}

function clonePreset(preset: Preset): Preset {
  return JSON.parse(JSON.stringify(preset));
}

export function getPromptKey(prompt: PresetPrompt | null | undefined): string {
  return getOfficialPromptKey(prompt as any);
}

function getDisplayPrompts(preset: Preset | null): PresetPrompt[] {
  if (!preset) return [];
  const prompts = Array.isArray(preset.prompts) ? preset.prompts : [];
  return prompts;
}

function getMutableDisplayPrompts(preset: Preset): PresetPrompt[] {
  return getMutableActivePrompts(preset);
}

function getMutableActivePrompts(preset: Preset): PresetPrompt[] {
  if (!Array.isArray(preset.prompts)) preset.prompts = [];
  return preset.prompts;
}

function getMutableUnusedPrompts(preset: Preset): PresetPrompt[] {
  if (!Array.isArray(preset.prompts_unused)) preset.prompts_unused = [];
  return preset.prompts_unused;
}

function getAllPresetPrompts(preset: Preset | null): PresetPrompt[] {
  if (!preset) return [];
  return [
    ...(Array.isArray(preset.prompts) ? preset.prompts : []),
    ...(Array.isArray(preset.prompts_unused) ? preset.prompts_unused : []),
  ];
}

function normalizeStoredPrompt(prompt: PresetPrompt): PresetNormalPrompt {
  return normalizeOfficialPrompt(prompt as any) as unknown as PresetNormalPrompt;
}

function loadFavorites(): FavoriteFolder[] {
  try {
    const vars = getVariables({ type: 'script' });
    return vars?.[STORAGE_KEY]?.favorites ?? [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites: FavoriteFolder[]) {
  try {
    updateVariablesWith(
      vars => {
        _.set(vars, `${STORAGE_KEY}.favorites`, klona(favorites));
        return vars;
      },
      { type: 'script' },
    );
  } catch (e) {
    console.error('[PresetManager] Failed to save favorites:', e);
  }
}

const managerStore = reactive<ManagerState & {
  readonly presetNames: string[];
  readonly currentPresetName: string;
  readonly mainPrompts: PresetPrompt[];
  readonly secondPrompts: PresetPrompt[];
  readonly mainUnusedPrompts: PresetPrompt[];
  readonly secondUnusedPrompts: PresetPrompt[];
  loadMainPreset(name: string): boolean;
  loadSecondPreset(name: string): boolean;
  refreshMainPreset(): void;
  refreshSecondPreset(): void;
  createPresetByName(name: string): Promise<boolean>;
  copyPresetToName(sourceName: string, targetName: string): Promise<boolean>;
  renamePresetByName(sourceName: string, targetName: string): Promise<boolean>;
  deletePresetByName(name: string): Promise<boolean>;
  insertPromptToPreset(prompt: PresetNormalPrompt, targetPreset: 'main' | 'second', index?: number): Promise<void>;
  appendUnusedPromptToPreset(promptId: string, targetPreset: 'main' | 'second'): Promise<boolean>;
  reorderPromptInPreset(targetPreset: 'main' | 'second', fromIndex: number, toIndex: number): Promise<boolean>;
  removePromptFromPreset(promptId: string, targetPreset: 'main' | 'second'): Promise<void>;
  detachPromptFromPreset(promptId: string, targetPreset: 'main' | 'second'): Promise<boolean>;
  deletePromptEverywhere(promptId: string, targetPreset: 'main' | 'second'): Promise<boolean>;
  updatePromptInPreset(promptId: string, updates: Partial<PresetPrompt>, targetPreset: 'main' | 'second'): Promise<void>;
  createPromptInPreset(targetPreset?: 'main' | 'second'): Promise<PresetNormalPrompt | null>;
  importPromptsToPreset(importData: unknown, targetPreset?: 'main' | 'second'): Promise<number>;
  exportPromptsFromPreset(targetPreset?: 'main' | 'second'): OfficialPromptExport | null;
  resetPromptOrder(targetPreset?: 'main' | 'second'): Promise<boolean>;
  restoreSystemPromptDefault(promptId: string, targetPreset?: 'main' | 'second'): Promise<boolean>;
  addFavoriteFolder(name?: string): void;
  removeFavoriteFolder(folderId: string): void;
  renameFavoriteFolder(folderId: string, name: string): void;
  toggleFavoriteFolder(folderId: string): void;
  addToFavorites(folderId: string, prompt: PresetNormalPrompt): void;
  removeFromFavorites(folderId: string, index: number): void;
  moveFavoriteItem(fromFolderId: string, fromIndex: number, toFolderId: string, toIndex: number): void;
  addDraft(): void;
  removeDraft(id: string): void;
  updateDraft(id: string, updates: Partial<DraftPrompt>): void;
  draftToPrompt(draft: DraftPrompt): PresetNormalPrompt;
}>({
  presetName: '',
  preset: null,
  secondPresetName: '',
  secondPreset: null,
  favorites: loadFavorites(),
  drafts: [],

  get presetNames(): string[] {
    return getLoadablePresetNames();
  },
  get currentPresetName(): string {
    return getLoadedPresetName();
  },
  get mainPrompts(): PresetPrompt[] {
    return getDisplayPrompts(this.preset);
  },
  get secondPrompts(): PresetPrompt[] {
    return getDisplayPrompts(this.secondPreset);
  },
  get mainUnusedPrompts(): PresetPrompt[] {
    return Array.isArray(this.preset?.prompts_unused) ? this.preset.prompts_unused : [];
  },
  get secondUnusedPrompts(): PresetPrompt[] {
    return Array.isArray(this.secondPreset?.prompts_unused) ? this.secondPreset.prompts_unused : [];
  },

  loadMainPreset(name: string): boolean {
    this.presetName = name;
    const p = tryGetPreset(name);
    if (!p) {
      toastr.error('加载预设失败: 预设不存在或不可读取', '', { timeOut: 5000 });
      this.preset = null;
      return false;
    }

    const prompts = getDisplayPrompts(p);
    console.log('[PresetManager] loaded main preset:', name, 'display:', prompts.length, 'prompts:', p.prompts?.length ?? 0, 'unused:', p.prompts_unused?.length ?? 0);
    this.preset = clonePreset(p);
    toastr.info(`已加载预设，共 ${prompts.length} 个条目`, '', { timeOut: 2000 });
    return true;
  },

  loadSecondPreset(name: string): boolean {
    this.secondPresetName = name;
    const p = tryGetPreset(name);
    if (!p) {
      toastr.error('加载第二预设失败: 预设不存在或不可读取', '', { timeOut: 5000 });
      this.secondPreset = null;
      return false;
    }

    this.secondPreset = clonePreset(p);
    return true;
  },

  refreshMainPreset() {
    if (this.presetName) this.loadMainPreset(this.presetName);
  },

  refreshSecondPreset() {
    if (this.secondPresetName) this.loadSecondPreset(this.secondPresetName);
  },

  async createPresetByName(name: string) {
    const presetName = name.trim();
    if (!presetName || presetName === 'in_use' || this.presetNames.includes(presetName)) return false;

    const created = await createPreset(presetName);
    if (created) {
      this.loadMainPreset(presetName);
    }
    return created;
  },

  async copyPresetToName(sourceName: string, targetName: string) {
    const presetName = targetName.trim();
    if (!sourceName || !presetName || presetName === 'in_use' || this.presetNames.includes(presetName)) return false;

    const source = tryGetPreset(sourceName);
    if (!source) return false;

    const created = await createPreset(presetName, clonePreset(source));
    if (created) {
      this.loadMainPreset(presetName);
    }
    return created;
  },

  async renamePresetByName(sourceName: string, targetName: string) {
    const presetName = targetName.trim();
    if (!sourceName || !presetName || sourceName === 'in_use' || presetName === 'in_use' || this.presetNames.includes(presetName)) return false;

    const renamed = await renamePreset(sourceName, presetName);
    if (renamed) {
      if (this.presetName === sourceName) this.loadMainPreset(presetName);
      if (this.secondPresetName === sourceName) this.loadSecondPreset(presetName);
    }
    return renamed;
  },

  async deletePresetByName(name: string) {
    if (!name || name === 'in_use') return false;

    const deleted = await deletePreset(name);
    if (!deleted) return false;

    if (this.secondPresetName === name) {
      this.secondPresetName = '';
      this.secondPreset = null;
    }

    if (this.presetName === name) {
      const fallback = this.presetNames.find(presetName => presetName !== name);
      if (fallback) {
        this.loadMainPreset(fallback);
      } else {
        this.presetName = '';
        this.preset = null;
      }
    }

    return true;
  },

  async insertPromptToPreset(prompt: PresetNormalPrompt, targetPreset: 'main' | 'second', index?: number) {
    const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
    if (!name) return;

    const newPromptId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newPrompt: PresetNormalPrompt = {
      ...normalizeStoredPrompt(prompt),
      id: newPromptId,
    };
    (newPrompt as any).identifier = newPromptId;
    (newPrompt as any).system_prompt = false;
    (newPrompt as any).marker = false;
    (newPrompt as any).injection_position = (newPrompt as any).injection_position
      ?? ((newPrompt as any).position?.type === 'in_chat' ? 1 : 0);
    (newPrompt as any).injection_depth = (newPrompt as any).injection_depth
      ?? (newPrompt as any).position?.depth
      ?? 4;
    (newPrompt as any).injection_order = (newPrompt as any).injection_order
      ?? (newPrompt as any).position?.order
      ?? 100;
    (newPrompt as any).injection_trigger = Array.isArray((newPrompt as any).injection_trigger)
      ? (newPrompt as any).injection_trigger
      : [];
    (newPrompt as any).forbid_overrides = Boolean((newPrompt as any).forbid_overrides);

    await updatePresetWith(name, preset => {
      const prompts = getMutableDisplayPrompts(preset);
      const idx = Math.max(0, Math.min(index ?? prompts.length, prompts.length));
      prompts.splice(idx, 0, newPrompt);
      return preset;
    });

    if (targetPreset === 'main') this.refreshMainPreset();
    else this.refreshSecondPreset();
  },

  async appendUnusedPromptToPreset(promptId: string, targetPreset: 'main' | 'second') {
    const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
    if (!name) return false;

    let appended = false;
    await updatePresetWith(name, preset => {
      const prompts = getMutableActivePrompts(preset);
      if (prompts.some(prompt => isOfficialPromptKey(prompt as any, promptId))) return preset;

      const unused = getMutableUnusedPrompts(preset);
      const index = unused.findIndex(prompt => isOfficialPromptKey(prompt as any, promptId));
      if (index < 0) return preset;

      const [prompt] = unused.splice(index, 1);
      prompts.unshift({ ...prompt, enabled: false });
      appended = true;
      return preset;
    });

    if (appended) {
      if (targetPreset === 'main') this.refreshMainPreset();
      else this.refreshSecondPreset();
    }
    return appended;
  },

  async reorderPromptInPreset(targetPreset: 'main' | 'second', fromIndex: number, toIndex: number) {
    const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
    if (!name) return false;

    let moved = false;
    await updatePresetWith(name, preset => {
      const prompts = getMutableDisplayPrompts(preset);
      if (fromIndex < 0 || fromIndex >= prompts.length) return preset;

      const boundedTarget = Math.max(0, Math.min(toIndex, prompts.length));
      const insertIndex = boundedTarget > fromIndex ? boundedTarget - 1 : boundedTarget;
      if (insertIndex === fromIndex) return preset;

      const [prompt] = prompts.splice(fromIndex, 1);
      prompts.splice(insertIndex, 0, prompt);
      moved = true;
      return preset;
    });

    if (moved) {
      if (targetPreset === 'main') this.refreshMainPreset();
      else this.refreshSecondPreset();
    }

    return moved;
  },

  async removePromptFromPreset(promptId: string, targetPreset: 'main' | 'second') {
    const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
    if (!name) return;

    await updatePresetWith(name, preset => {
      if (Array.isArray(preset.prompts)) {
        preset.prompts = preset.prompts.filter(p => !isOfficialPromptKey(p as any, promptId));
      }
      if (Array.isArray(preset.prompts_unused)) {
        preset.prompts_unused = preset.prompts_unused.filter(p => !isOfficialPromptKey(p as any, promptId));
      }
      return preset;
    });

    if (targetPreset === 'main') this.refreshMainPreset();
    else this.refreshSecondPreset();
  },

  async detachPromptFromPreset(promptId: string, targetPreset: 'main' | 'second') {
    const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
    if (!name) return false;

    let detached = false;
    await updatePresetWith(name, preset => {
      const prompts = getMutableActivePrompts(preset);
      const index = prompts.findIndex(prompt => isOfficialPromptKey(prompt as any, promptId));
      if (index < 0) return preset;

      const [prompt] = prompts.splice(index, 1);
      const unused = getMutableUnusedPrompts(preset);
      if (!unused.some(item => isOfficialPromptKey(item as any, promptId))) {
        unused.push(prompt);
      }
      detached = true;
      return preset;
    });

    if (detached) {
      if (targetPreset === 'main') this.refreshMainPreset();
      else this.refreshSecondPreset();
    }
    return detached;
  },

  async deletePromptEverywhere(promptId: string, targetPreset: 'main' | 'second') {
    const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
    if (!name) return false;

    let deleted = false;
    await updatePresetWith(name, preset => {
      const allPrompts = getAllPresetPrompts(preset);
      const prompt = allPrompts.find(item => isOfficialPromptKey(item as any, promptId));
      if (!isOfficialPromptDeletable(prompt as any)) return preset;

      const beforeActive = preset.prompts?.length ?? 0;
      const beforeUnused = preset.prompts_unused?.length ?? 0;
      preset.prompts = (preset.prompts ?? []).filter(item => !isOfficialPromptKey(item as any, promptId));
      preset.prompts_unused = (preset.prompts_unused ?? []).filter(item => !isOfficialPromptKey(item as any, promptId));
      deleted = beforeActive !== preset.prompts.length || beforeUnused !== preset.prompts_unused.length;
      return preset;
    });

    if (deleted) {
      if (targetPreset === 'main') this.refreshMainPreset();
      else this.refreshSecondPreset();
    }
    return deleted;
  },

  async updatePromptInPreset(promptId: string, updates: Partial<PresetPrompt>, targetPreset: 'main' | 'second') {
    const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
    if (!name) return;

    await updatePresetWith(name, preset => {
      const prompt = preset.prompts?.find(p => isOfficialPromptKey(p as any, promptId))
        ?? preset.prompts_unused?.find(p => isOfficialPromptKey(p as any, promptId));
      if (prompt) Object.assign(prompt, updates);
      return preset;
    });

    if (targetPreset === 'main') this.refreshMainPreset();
    else this.refreshSecondPreset();
  },

  async createPromptInPreset(targetPreset: 'main' | 'second' = 'main') {
    const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
    if (!name) return null;

    const promptId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const prompt = normalizeStoredPrompt({
      id: promptId,
      identifier: promptId,
      name: '新提示词',
      enabled: true,
      role: 'system',
      content: '',
    } as PresetPrompt);

    await updatePresetWith(name, preset => {
      const prompts = getMutableDisplayPrompts(preset);
      prompts.push(prompt);
      return preset;
    });

    if (targetPreset === 'main') this.refreshMainPreset();
    else this.refreshSecondPreset();
    return prompt;
  },

  async importPromptsToPreset(importData: unknown, targetPreset: 'main' | 'second' = 'main') {
    const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
    if (!name) return 0;

    const imported = readOfficialPromptImport(importData);
    if (!imported.prompts.length) return 0;

    await updatePresetWith(name, preset => {
      const current = getAllPresetPrompts(preset);
      const byKey = new Map(current.map(prompt => [getPromptKey(prompt), prompt]));
      for (const prompt of imported.prompts) {
        const key = getPromptKey(prompt);
        const existing = byKey.get(key);
        if (existing) {
          Object.assign(existing, prompt);
        } else {
          current.push(prompt as unknown as PresetPrompt);
          byKey.set(key, prompt);
        }
      }
      const sorted = splitPromptsByOfficialOrder(current, imported.promptOrder);
      preset.prompts = sorted.active as PresetPrompt[];
      preset.prompts_unused = sorted.unused as PresetPrompt[];
      return preset;
    });

    if (targetPreset === 'main') this.refreshMainPreset();
    else this.refreshSecondPreset();
    return imported.prompts.length;
  },

  exportPromptsFromPreset(targetPreset: 'main' | 'second' = 'main') {
    const preset = targetPreset === 'main' ? this.preset : this.secondPreset;
    if (!preset) return null;

    return buildOfficialPromptExport(getAllPresetPrompts(preset), 'full', getDisplayPrompts(preset));
  },

  async resetPromptOrder(targetPreset: 'main' | 'second' = 'main') {
    const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
    if (!name) return false;

    let changed = false;
    await updatePresetWith(name, preset => {
      const { active, unused } = splitPromptsByOfficialDefaultOrder(getAllPresetPrompts(preset));
      preset.prompts = active as PresetPrompt[];
      preset.prompts_unused = unused as PresetPrompt[];
      changed = true;
      return preset;
    });

    if (changed) {
      if (targetPreset === 'main') this.refreshMainPreset();
      else this.refreshSecondPreset();
    }
    return changed;
  },

  async restoreSystemPromptDefault(promptId: string, targetPreset: 'main' | 'second' = 'main') {
    const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
    if (!name) return false;

    const defaultPrompt = getAllPresetPrompts(default_preset)
      .find(prompt => isOfficialPromptKey(prompt as any, promptId));
    if (!defaultPrompt || !isOfficialRestorableSystemPrompt(defaultPrompt as any)) return false;

    let restored = false;
    await updatePresetWith(name, preset => {
      const prompt = getAllPresetPrompts(preset)
        .find(item => isOfficialPromptKey(item as any, promptId));
      if (!prompt || !isOfficialRestorableSystemPrompt(prompt as any)) return preset;

      const enabled = prompt.enabled;
      Object.assign(prompt, klona(defaultPrompt));
      prompt.enabled = enabled;
      restored = true;
      return preset;
    });

    if (restored) {
      if (targetPreset === 'main') this.refreshMainPreset();
      else this.refreshSecondPreset();
    }
    return restored;
  },

  addFavoriteFolder(name?: string) {
    const folder: FavoriteFolder = {
      id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name ?? `收藏夹 ${this.favorites.length + 1}`,
      collapsed: false,
      items: [],
    };
    this.favorites.push(folder);
    saveFavorites(this.favorites);
    toastr.success(`已创建收藏夹 "${folder.name}"`, '', { timeOut: 1500 });
  },

  removeFavoriteFolder(folderId: string) {
    this.favorites = this.favorites.filter(f => f.id !== folderId);
    saveFavorites(this.favorites);
  },

  renameFavoriteFolder(folderId: string, name: string) {
    const folder = this.favorites.find(f => f.id === folderId);
    if (folder) folder.name = name;
    saveFavorites(this.favorites);
  },

  toggleFavoriteFolder(folderId: string) {
    const folder = this.favorites.find(f => f.id === folderId);
    if (folder) folder.collapsed = !folder.collapsed;
    saveFavorites(this.favorites);
  },

  addToFavorites(folderId: string, prompt: PresetNormalPrompt) {
    const folder = this.favorites.find(f => f.id === folderId);
    if (!folder) return;
    folder.items.push(klona(prompt));
    saveFavorites(this.favorites);
  },

  removeFromFavorites(folderId: string, index: number) {
    const folder = this.favorites.find(f => f.id === folderId);
    if (!folder) return;
    folder.items.splice(index, 1);
    saveFavorites(this.favorites);
  },

  moveFavoriteItem(fromFolderId: string, fromIndex: number, toFolderId: string, toIndex: number) {
    const fromFolder = this.favorites.find(f => f.id === fromFolderId);
    const toFolder = this.favorites.find(f => f.id === toFolderId);
    if (!fromFolder || !toFolder) return;
    const [item] = fromFolder.items.splice(fromIndex, 1);
    toFolder.items.splice(toIndex, 0, item);
    saveFavorites(this.favorites);
  },

  addDraft() {
    this.drafts.push({
      id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: '',
      role: 'system',
      content: '',
      collapsed: true,
    });
  },

  removeDraft(id: string) {
    this.drafts = this.drafts.filter(d => d.id !== id);
  },

  updateDraft(id: string, updates: Partial<DraftPrompt>) {
    const draft = this.drafts.find(d => d.id === id);
    if (draft) Object.assign(draft, updates);
  },

  draftToPrompt(draft: DraftPrompt): PresetNormalPrompt {
    const prompt: PresetNormalPrompt = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: draft.name || 'Untitled',
      enabled: true,
      position: { type: 'relative' },
      role: draft.role,
      content: draft.content,
    };
    (prompt as any).identifier = prompt.id;
    (prompt as any).injection_position = 0;
    (prompt as any).injection_depth = 4;
    (prompt as any).injection_order = 100;
    (prompt as any).injection_trigger = [];
    (prompt as any).forbid_overrides = false;
    return prompt;
  },
});

export function useManagerStore() {
  return managerStore;
}
