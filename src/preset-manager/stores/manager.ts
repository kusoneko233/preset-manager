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

export const useManagerStore = defineStore('manager', {
  state: (): ManagerState => ({
    presetName: '',
    preset: null,
    secondPresetName: '',
    secondPreset: null,
    favorites: loadFavorites(),
    drafts: [],
  }),

  getters: {
    presetNames(): string[] {
      return getPresetNames();
    },
    currentPresetName(): string {
      return getLoadedPresetName();
    },
    mainPrompts(): PresetPrompt[] {
      return this.preset?.prompts ?? [];
    },
    secondPrompts(): PresetPrompt[] {
      return this.secondPreset?.prompts ?? [];
    },
  },

  actions: {
    loadMainPreset(name: string) {
      this.presetName = name;
      try {
        const p = getPreset(name);
        this.preset = JSON.parse(JSON.stringify(p));
        toastr.info(`已加载预设，共 ${this.preset?.prompts?.length ?? 0} 个条目`, '', { timeOut: 2000 });
      } catch (e) {
        console.error('[PresetManager] loadMainPreset failed:', name, e);
        toastr.error(`加载预设失败: ${e}`, '', { timeOut: 5000 });
        this.preset = null;
      }
    },

    loadSecondPreset(name: string) {
      this.secondPresetName = name;
      try {
        const p = getPreset(name);
        this.secondPreset = JSON.parse(JSON.stringify(p));
      } catch (e) {
        console.error('[PresetManager] loadSecondPreset failed:', name, e);
        toastr.error(`加载第二预设失败: ${e}`, '', { timeOut: 5000 });
        this.secondPreset = null;
      }
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
        preset.prompts = preset.prompts.filter(p => p.id !== promptId);
        return preset;
      });

      if (targetPreset === 'main') this.refreshMainPreset();
      else this.refreshSecondPreset();
    },

    async updatePromptInPreset(
      promptId: string,
      updates: Partial<PresetPrompt>,
      targetPreset: 'main' | 'second',
    ) {
      const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
      if (!name) return;

      await updatePresetWith(name, preset => {
        const prompt = preset.prompts.find(p => p.id === promptId);
        if (prompt) Object.assign(prompt, updates);
        return preset;
      });

      if (targetPreset === 'main') this.refreshMainPreset();
      else this.refreshSecondPreset();
    },

    // Favorites
    addFavoriteFolder(name?: string) {
      this.favorites.push({
        id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: name ?? `收藏夹 ${this.favorites.length + 1}`,
        collapsed: false,
        items: [],
      });
      saveFavorites(this.favorites);
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

    // Drafts
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
  },
});
