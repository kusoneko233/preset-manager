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

function getDisplayPrompts(preset: Preset | null): PresetPrompt[] {
  if (!preset) return [];
  const prompts = Array.isArray(preset.prompts) ? preset.prompts : [];
  const unusedPrompts = Array.isArray(preset.prompts_unused) ? preset.prompts_unused : [];
  return prompts.length ? prompts : unusedPrompts;
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
  loadMainPreset(name: string): boolean;
  loadSecondPreset(name: string): boolean;
  refreshMainPreset(): void;
  refreshSecondPreset(): void;
  insertPromptToPreset(prompt: PresetNormalPrompt, targetPreset: 'main' | 'second', index?: number): Promise<void>;
  removePromptFromPreset(promptId: string, targetPreset: 'main' | 'second'): Promise<void>;
  updatePromptInPreset(promptId: string, updates: Partial<PresetPrompt>, targetPreset: 'main' | 'second'): Promise<void>;
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

  loadMainPreset(name: string): boolean {
    this.presetName = name;
    const p = tryGetPreset(name);
    if (!p) {
      toastr.error(`加载预设失败: 预设不存在或不可读取`, '', { timeOut: 5000 });
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
      toastr.error(`加载第二预设失败: 预设不存在或不可读取`, '', { timeOut: 5000 });
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

  async insertPromptToPreset(prompt: PresetNormalPrompt, targetPreset: 'main' | 'second', index?: number) {
    const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
    if (!name) return;

    const newPrompt: PresetNormalPrompt = {
      ...klona(prompt),
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };

    await updatePresetWith(name, preset => {
      const idx = index ?? preset.prompts.length;
      preset.prompts.splice(idx, 0, newPrompt);
      return preset;
    });

    if (targetPreset === 'main') this.refreshMainPreset();
    else this.refreshSecondPreset();
  },

  async removePromptFromPreset(promptId: string, targetPreset: 'main' | 'second') {
    const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
    if (!name) return;

    await updatePresetWith(name, preset => {
      if (Array.isArray(preset.prompts)) {
        preset.prompts = preset.prompts.filter(p => p.id !== promptId);
      }
      if (Array.isArray(preset.prompts_unused)) {
        preset.prompts_unused = preset.prompts_unused.filter(p => p.id !== promptId);
      }
      return preset;
    });

    if (targetPreset === 'main') this.refreshMainPreset();
    else this.refreshSecondPreset();
  },

  async updatePromptInPreset(promptId: string, updates: Partial<PresetPrompt>, targetPreset: 'main' | 'second') {
    const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
    if (!name) return;

    await updatePresetWith(name, preset => {
      const prompt = preset.prompts?.find(p => p.id === promptId)
        ?? preset.prompts_unused?.find(p => p.id === promptId);
      if (prompt) Object.assign(prompt, updates);
      return preset;
    });

    if (targetPreset === 'main') this.refreshMainPreset();
    else this.refreshSecondPreset();
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
    return {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: draft.name || 'Untitled',
      enabled: true,
      position: { type: 'relative' },
      role: draft.role,
      content: draft.content,
    };
  },
});

export function useManagerStore() {
  return managerStore;
}
