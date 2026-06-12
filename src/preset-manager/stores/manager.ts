import { defineStore } from 'pinia';

import {
  buildOfficialPromptExport,
  getOfficialPromptKey,
  isOfficialPromptDeletable,
  isOfficialPromptKey,
  isOfficialRestorableSystemPrompt,
  isPresetPlaceholderPrompt,
  normalizeOfficialPrompt,
  readOfficialPromptImport,
  splitPromptsByOfficialDefaultOrder,
  splitPromptsByOfficialOrder,
  type OfficialPromptExport,
} from '../utils/officialPromptManager';
import {
  parsePresetManagerFavorites,
  parsePresetManagerPresetOrder,
  parsePresetManagerPromptLocks,
} from '../utils/scriptVariableSchemas';

export interface FavoriteFolder {
  id: string;
  name: string;
  collapsed: boolean;
  items: PresetNormalPrompt[];
}

export type DraftPromptPosition =
  | { type: 'relative'; depth?: never; order?: never }
  | { type: 'in_chat'; depth: number; order: number };

export interface DraftPrompt {
  id: string;
  name: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  collapsed: boolean;
  position: DraftPromptPosition;
  injection_position: number;
  injection_depth: number;
  injection_order: number;
  injection_trigger: string[];
}

type PromptLockState = Record<string, boolean>;

interface ManagerState {
  presetName: string;
  preset: Preset | null;
  secondPresetName: string;
  secondPreset: Preset | null;
  favorites: FavoriteFolder[];
  drafts: DraftPrompt[];
  promptLocks: PromptLockState;
  presetOrder: string[];
}

const STORAGE_KEY = 'preset_manager';
const unloadablePresetNames = new Set<string>();
const warnedUnloadablePresetNames = new Set<string>();

function tryGetPreset(name: string, options: { silent?: boolean } = {}): Preset | null {
  try {
    const preset = getPreset(name);
    unloadablePresetNames.delete(name);
    return preset;
  } catch (e) {
    unloadablePresetNames.add(name);
    if (!options.silent && !warnedUnloadablePresetNames.has(name)) {
      warnedUnloadablePresetNames.add(name);
      console.warn('[PresetManager] preset name is not loadable:', name, e);
    }
    return null;
  }
}

function getLoadablePresetNames(): string[] {
  return getPresetNames().filter(name => {
    if (name === 'in_use') return false;
    if (unloadablePresetNames.has(name)) return false;
    return !!tryGetPreset(name, { silent: true });
  });
}

function applyPresetOrder(names: string[], order: string[]): string[] {
  const available = new Set(names);
  const ordered = order.filter(name => available.has(name));
  const orderedSet = new Set(ordered);
  return [...ordered, ...names.filter(name => !orderedSet.has(name))];
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
  return prompts.filter(prompt => !isPresetPlaceholderPrompt(prompt as any));
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

function makeNewPrompt(name = '新提示词'): PresetNormalPrompt {
  const promptId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return normalizeStoredPrompt({
    id: promptId,
    identifier: promptId,
    name,
    enabled: true,
    role: 'system',
    content: '',
  } as PresetPrompt);
}

function loadFavorites(): FavoriteFolder[] {
  try {
    const vars = getVariables({ type: 'script' });
    return parsePresetManagerFavorites(vars?.[STORAGE_KEY]?.favorites) as FavoriteFolder[];
  } catch {
    return [];
  }
}

function saveFavorites(favorites: FavoriteFolder[]) {
  try {
    updateVariablesWith(
      vars => {
        _.set(vars, `${STORAGE_KEY}.favorites`, klona(parsePresetManagerFavorites(favorites)));
        return vars;
      },
      { type: 'script' },
    );
  } catch (e) {
    console.error('[PresetManager] Failed to save favorites:', e);
  }
}

function loadPromptLocks(): PromptLockState {
  try {
    const vars = getVariables({ type: 'script' });
    return parsePresetManagerPromptLocks(vars?.[STORAGE_KEY]?.promptLocks);
  } catch {
    return {};
  }
}

function savePromptLocks(promptLocks: PromptLockState) {
  try {
    updateVariablesWith(
      vars => {
        _.set(vars, `${STORAGE_KEY}.promptLocks`, klona(parsePresetManagerPromptLocks(promptLocks)));
        return vars;
      },
      { type: 'script' },
    );
  } catch (e) {
    console.error('[PresetManager] Failed to save prompt locks:', e);
  }
}

function loadPresetOrder(): string[] {
  try {
    const vars = getVariables({ type: 'script' });
    return parsePresetManagerPresetOrder(vars?.[STORAGE_KEY]?.presetOrder);
  } catch {
    return [];
  }
}

function savePresetOrder(presetOrder: string[]) {
  try {
    updateVariablesWith(
      vars => {
        _.set(vars, `${STORAGE_KEY}.presetOrder`, klona(parsePresetManagerPresetOrder(presetOrder)));
        return vars;
      },
      { type: 'script' },
    );
  } catch (e) {
    console.error('[PresetManager] Failed to save preset order:', e);
  }
}

function getPromptLockKey(presetName: string, promptId: string) {
  return `${presetName}::${promptId}`;
}

export const useManagerStore = defineStore('preset-manager', {
  state: (): ManagerState => ({
    presetName: '',
    preset: null,
    secondPresetName: '',
    secondPreset: null,
    favorites: loadFavorites(),
    drafts: [],
    promptLocks: loadPromptLocks(),
    presetOrder: loadPresetOrder(),
  }),

  getters: {
    presetNames(state): string[] {
      return applyPresetOrder(getLoadablePresetNames(), state.presetOrder);
    },
    currentPresetName(): string {
      return getLoadedPresetName();
    },
    mainPrompts(state): PresetPrompt[] {
      return getDisplayPrompts(state.preset);
    },
    secondPrompts(state): PresetPrompt[] {
      return getDisplayPrompts(state.secondPreset);
    },
    mainUnusedPrompts(state): PresetPrompt[] {
      return Array.isArray(state.preset?.prompts_unused) ? state.preset.prompts_unused : [];
    },
    secondUnusedPrompts(state): PresetPrompt[] {
      return Array.isArray(state.secondPreset?.prompts_unused) ? state.secondPreset.prompts_unused : [];
    },
  },

  actions: {
    loadMainPreset(name: string): boolean {
      this.presetName = name;
      const p = tryGetPreset(name);
      if (!p) {
        toastr.error('加载预设失败: 预设不存在或不可读取', '', { timeOut: 5000 });
        this.preset = null;
        return false;
      }

      const prompts = getDisplayPrompts(p);
      console.log(
        '[PresetManager] loaded main preset:',
        name,
        'display:',
        prompts.length,
        'prompts:',
        p.prompts?.length ?? 0,
        'unused:',
        p.prompts_unused?.length ?? 0,
      );
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

    syncMainPresetFromTavern(currentName?: string): boolean {
      try {
        const name = currentName ?? getLoadedPresetName();
        if (!name || name === this.presetName) return false;
        return this.loadMainPreset(name);
      } catch (e) {
        console.warn('[PresetManager] failed to sync current tavern preset:', e);
        return false;
      }
    },

    async createPresetByName(name: string) {
      const presetName = name.trim();
      if (!presetName || presetName === 'in_use' || this.presetNames.includes(presetName)) return false;

      const created = await createPreset(presetName);
      if (created) {
        if (!this.presetOrder.includes(presetName)) {
          this.presetOrder = [...this.presetOrder, presetName];
          savePresetOrder(this.presetOrder);
        }
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
        if (!this.presetOrder.includes(presetName)) {
          this.presetOrder = [...this.presetOrder, presetName];
          savePresetOrder(this.presetOrder);
        }
        this.loadMainPreset(presetName);
      }
      return created;
    },

    async renamePresetByName(sourceName: string, targetName: string) {
      const presetName = targetName.trim();
      if (
        !sourceName ||
        !presetName ||
        sourceName === 'in_use' ||
        presetName === 'in_use' ||
        this.presetNames.includes(presetName)
      )
        return false;

      const renamed = await renamePreset(sourceName, presetName);
      if (renamed) {
        this.presetOrder = this.presetOrder.map(name => name === sourceName ? presetName : name);
        savePresetOrder(this.presetOrder);
        if (this.presetName === sourceName) this.loadMainPreset(presetName);
        if (this.secondPresetName === sourceName) this.loadSecondPreset(presetName);
      }
      return renamed;
    },

    async deletePresetByName(name: string) {
      if (!name || name === 'in_use') return false;

      const deleted = await deletePreset(name);
      if (!deleted) return false;

      this.presetOrder = this.presetOrder.filter(presetName => presetName !== name);
      savePresetOrder(this.presetOrder);

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

    reorderPresetDisplay(sourceName: string, targetName: string) {
      if (!sourceName || !targetName || sourceName === targetName) return false;

      const currentOrder = this.presetNames;
      const fromIndex = currentOrder.indexOf(sourceName);
      const targetIndex = currentOrder.indexOf(targetName);
      if (fromIndex < 0 || targetIndex < 0) return false;

      const nextOrder = [...currentOrder];
      const [source] = nextOrder.splice(fromIndex, 1);
      const insertIndex = nextOrder.indexOf(targetName);
      nextOrder.splice(insertIndex, 0, source);
      this.presetOrder = applyPresetOrder(nextOrder, nextOrder);
      savePresetOrder(this.presetOrder);
      return true;
    },

    reorderPresetDisplayToIndex(sourceName: string, targetIndex: number) {
      if (!sourceName) return false;

      const currentOrder = this.presetNames;
      const fromIndex = currentOrder.indexOf(sourceName);
      if (fromIndex < 0) return false;

      const nextOrder = [...currentOrder];
      const [source] = nextOrder.splice(fromIndex, 1);
      const boundedTarget = Math.max(0, Math.min(targetIndex, currentOrder.length));
      const insertIndex = boundedTarget > fromIndex ? boundedTarget - 1 : boundedTarget;
      if (insertIndex === fromIndex) return false;
      nextOrder.splice(insertIndex, 0, source);
      this.presetOrder = applyPresetOrder(nextOrder, nextOrder);
      savePresetOrder(this.presetOrder);
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
      (newPrompt as any).injection_position =
        (newPrompt as any).injection_position ?? ((newPrompt as any).position?.type === 'in_chat' ? 1 : 0);
      (newPrompt as any).injection_depth =
        (newPrompt as any).injection_depth ?? (newPrompt as any).position?.depth ?? 4;
      (newPrompt as any).injection_order =
        (newPrompt as any).injection_order ?? (newPrompt as any).position?.order ?? 100;
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
        preset.prompts_unused = (preset.prompts_unused ?? []).filter(
          item => !isOfficialPromptKey(item as any, promptId),
        );
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
        const prompt =
          preset.prompts?.find(p => isOfficialPromptKey(p as any, promptId)) ??
          preset.prompts_unused?.find(p => isOfficialPromptKey(p as any, promptId));
        if (prompt) Object.assign(prompt, updates);
        return preset;
      });

      if (targetPreset === 'main') this.refreshMainPreset();
      else this.refreshSecondPreset();
    },

    async updatePromptsInPreset(promptIds: string[], updates: Partial<PresetPrompt>, targetPreset: 'main' | 'second') {
      const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
      const ids = new Set(promptIds.filter(Boolean));
      if (!name || ids.size === 0) return false;

      let changed = false;
      await updatePresetWith(name, preset => {
        for (const prompt of getAllPresetPrompts(preset)) {
          const key = getPromptKey(prompt);
          if (!ids.has(key)) continue;

          for (const [field, value] of Object.entries(updates)) {
            const target = prompt as any;
            if (target[field] === value) continue;
            target[field] = value;
            changed = true;
          }
        }
        return preset;
      });

      if (changed) {
        if (targetPreset === 'main') this.refreshMainPreset();
        else this.refreshSecondPreset();
      }
      return changed;
    },

    async detachPromptsFromPreset(promptIds: string[], targetPreset: 'main' | 'second') {
      const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
      const ids = new Set(promptIds.filter(Boolean));
      if (!name || ids.size === 0) return 0;

      let detached = 0;
      await updatePresetWith(name, preset => {
        const prompts = getMutableActivePrompts(preset);
        const unused = getMutableUnusedPrompts(preset);
        const remaining: PresetPrompt[] = [];

        for (const prompt of prompts) {
          const key = getPromptKey(prompt);
          if (!ids.has(key)) {
            remaining.push(prompt);
            continue;
          }

          if (!unused.some(item => isOfficialPromptKey(item as any, key))) {
            unused.push(prompt);
          }
          detached += 1;
        }

        preset.prompts = remaining;
        return preset;
      });

      if (detached > 0) {
        if (targetPreset === 'main') this.refreshMainPreset();
        else this.refreshSecondPreset();
      }
      return detached;
    },

    async applyPromptMigration(nextPrompts: PresetPrompt[], targetPreset: 'main' | 'second' = 'main') {
      const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
      if (!name) return false;

      await updatePresetWith(name, preset => {
        preset.prompts = klona(nextPrompts) as PresetPrompt[];
        return preset;
      });

      if (targetPreset === 'main') this.refreshMainPreset();
      else this.refreshSecondPreset();
      return true;
    },

    async createPromptInPreset(targetPreset: 'main' | 'second' = 'main') {
      const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
      if (!name) return null;

      const prompt = makeNewPrompt();

      await updatePresetWith(name, preset => {
        const prompts = getMutableDisplayPrompts(preset);
        prompts.push(prompt);
        return preset;
      });

      if (targetPreset === 'main') this.refreshMainPreset();
      else this.refreshSecondPreset();
      return prompt;
    },

    async createPromptsInPreset(names: string[], targetPreset: 'main' | 'second' = 'main') {
      const name = targetPreset === 'main' ? this.presetName : this.secondPresetName;
      const cleanedNames = names.map(item => item.trim()).filter(Boolean);
      if (!name || cleanedNames.length === 0) return 0;

      const promptsToCreate = cleanedNames.map(item => makeNewPrompt(item));

      await updatePresetWith(name, preset => {
        const prompts = getMutableDisplayPrompts(preset);
        prompts.push(...promptsToCreate);
        return preset;
      });

      if (targetPreset === 'main') this.refreshMainPreset();
      else this.refreshSecondPreset();
      return promptsToCreate.length;
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

      const defaultPrompt = getAllPresetPrompts(default_preset).find(prompt =>
        isOfficialPromptKey(prompt as any, promptId),
      );
      if (!defaultPrompt || !isOfficialRestorableSystemPrompt(defaultPrompt as any)) return false;

      let restored = false;
      await updatePresetWith(name, preset => {
        const prompt = getAllPresetPrompts(preset).find(item => isOfficialPromptKey(item as any, promptId));
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
      this.favorites = [...this.favorites, folder];
      saveFavorites(this.favorites);
      toastr.success(`已创建收藏夹 "${folder.name}"`, '', { timeOut: 1500 });
    },

    removeFavoriteFolder(folderId: string) {
      this.favorites = this.favorites.filter(f => f.id !== folderId);
      saveFavorites(this.favorites);
    },

    renameFavoriteFolder(folderId: string, name: string) {
      let changed = false;
      this.favorites = this.favorites.map(folder => {
        if (folder.id !== folderId) return folder;
        changed = true;
        return { ...folder, name };
      });
      if (!changed) return;
      saveFavorites(this.favorites);
    },

    toggleFavoriteFolder(folderId: string) {
      let changed = false;
      this.favorites = this.favorites.map(folder => {
        if (folder.id !== folderId) return folder;
        changed = true;
        return { ...folder, collapsed: !folder.collapsed };
      });
      if (!changed) return;
      saveFavorites(this.favorites);
    },

    addToFavorites(folderId: string, prompt: PresetNormalPrompt) {
      const folder = this.favorites.find(f => f.id === folderId);
      if (!folder) return false;
      const promptKey = getPromptKey(prompt as any);
      if (promptKey && folder.items.some(item => getPromptKey(item as any) === promptKey)) return false;
      this.favorites = this.favorites.map(folder => {
        if (folder.id !== folderId) return folder;
        return {
          ...folder,
          items: [...folder.items, klona(prompt)],
        };
      });
      saveFavorites(this.favorites);
      return true;
    },

    removeFromFavorites(folderId: string, index: number) {
      const folder = this.favorites.find(f => f.id === folderId);
      if (!folder) return;
      if (index < 0 || index >= folder.items.length) return;
      this.favorites = this.favorites.map(folder => {
        if (folder.id !== folderId) return folder;
        return {
          ...folder,
          items: folder.items.filter((_, i) => i !== index),
        };
      });
      saveFavorites(this.favorites);
    },

    updateFavoriteItem(folderId: string, index: number, updates: Partial<PresetPrompt>) {
      const folder = this.favorites.find(f => f.id === folderId);
      const item = folder?.items[index];
      if (!folder || !item) return;
      this.favorites = this.favorites.map(folder => {
        if (folder.id !== folderId) return folder;
        return {
          ...folder,
          items: folder.items.map((item, i) => i === index ? { ...item, ...updates } as PresetNormalPrompt : item),
        };
      });
      saveFavorites(this.favorites);
    },

    moveFavoriteItem(fromFolderId: string, fromIndex: number, toFolderId: string, toIndex: number) {
      const fromFolder = this.favorites.find(f => f.id === fromFolderId);
      const toFolder = this.favorites.find(f => f.id === toFolderId);
      if (!fromFolder || !toFolder) return;
      const item = fromFolder.items[fromIndex];
      if (!item) return;
      const nextFavorites = this.favorites.map(folder => {
        if (folder.id === fromFolderId) {
          return {
            ...folder,
            items: folder.items.filter((_, i) => i !== fromIndex),
          };
        }
        return folder;
      });
      this.favorites = nextFavorites.map(folder => {
        if (folder.id !== toFolderId) return folder;
        const boundedIndex = Math.max(0, Math.min(toIndex, folder.items.length));
        return {
          ...folder,
          items: [
            ...folder.items.slice(0, boundedIndex),
            item,
            ...folder.items.slice(boundedIndex),
          ],
        };
      });
      saveFavorites(this.favorites);
    },

    reorderFavoriteItem(folderId: string, fromIndex: number, targetIndex: number) {
      const folder = this.favorites.find(f => f.id === folderId);
      if (!folder) return false;
      const item = folder.items[fromIndex];
      if (!item) return false;

      const nextItems = [...folder.items];
      const [source] = nextItems.splice(fromIndex, 1);
      const boundedTarget = Math.max(0, Math.min(targetIndex, folder.items.length));
      const insertIndex = boundedTarget > fromIndex ? boundedTarget - 1 : boundedTarget;
      if (insertIndex === fromIndex) return false;

      nextItems.splice(insertIndex, 0, source);
      this.favorites = this.favorites.map(item => item.id === folderId ? { ...item, items: nextItems } : item);
      saveFavorites(this.favorites);
      return true;
    },

    addDraft() {
      const draft: DraftPrompt = {
        id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: '',
        role: 'system',
        content: '',
        collapsed: false,
        position: { type: 'relative' },
        injection_position: 0,
        injection_depth: 4,
        injection_order: 100,
        injection_trigger: [],
      };
      this.drafts = [...this.drafts, draft];
    },

    removeDraft(id: string) {
      this.drafts = this.drafts.filter(d => d.id !== id);
    },

    duplicateDraft(id: string) {
      const draft = this.drafts.find(d => d.id === id);
      if (!draft) return;
      const index = this.drafts.indexOf(draft);
      const nextDraft: DraftPrompt = {
        ...klona(draft),
        id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: draft.name ? `${draft.name} 副本` : '',
        collapsed: false,
      };
      this.drafts = [
        ...this.drafts.slice(0, index + 1),
        nextDraft,
        ...this.drafts.slice(index + 1),
      ];
    },

    updateDraft(id: string, updates: Partial<DraftPrompt>) {
      this.drafts = this.drafts.map(draft => draft.id === id ? { ...draft, ...updates } : draft);
    },

    reorderDraftToIndex(sourceId: string, targetIndex: number) {
      const fromIndex = this.drafts.findIndex(draft => draft.id === sourceId);
      if (fromIndex < 0) return false;

      const nextDrafts = [...this.drafts];
      const [source] = nextDrafts.splice(fromIndex, 1);
      const boundedTarget = Math.max(0, Math.min(targetIndex, this.drafts.length));
      const insertIndex = boundedTarget > fromIndex ? boundedTarget - 1 : boundedTarget;
      if (insertIndex === fromIndex) return false;

      nextDrafts.splice(insertIndex, 0, source);
      this.drafts = nextDrafts;
      return true;
    },

    draftToPrompt(draft: DraftPrompt): PresetNormalPrompt {
      const prompt: PresetNormalPrompt = {
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: draft.name || '未命名',
        enabled: true,
        position: draft.position ?? { type: 'relative' },
        role: draft.role,
        content: draft.content,
      };
      (prompt as any).identifier = prompt.id;
      (prompt as any).injection_position = draft.injection_position ?? 0;
      (prompt as any).injection_depth = draft.injection_depth ?? 4;
      (prompt as any).injection_order = draft.injection_order ?? 100;
      (prompt as any).injection_trigger = Array.isArray(draft.injection_trigger) ? [...draft.injection_trigger] : [];
      (prompt as any).forbid_overrides = false;
      return prompt;
    },

    isPromptLocked(promptId: string, targetPreset: 'main' | 'second' = 'main') {
      const presetName = targetPreset === 'main' ? this.presetName : this.secondPresetName;
      if (!presetName || !promptId) return false;
      return Boolean(this.promptLocks[getPromptLockKey(presetName, promptId)]);
    },

    setPromptLock(promptId: string, locked: boolean, targetPreset: 'main' | 'second' = 'main') {
      const presetName = targetPreset === 'main' ? this.presetName : this.secondPresetName;
      if (!presetName || !promptId) return;

      const key = getPromptLockKey(presetName, promptId);
      if (locked) this.promptLocks[key] = true;
      else delete this.promptLocks[key];
      savePromptLocks(this.promptLocks);
    },

    togglePromptLock(promptId: string, targetPreset: 'main' | 'second' = 'main') {
      const nextLocked = !this.isPromptLocked(promptId, targetPreset);
      this.setPromptLock(promptId, nextLocked, targetPreset);
      return nextLocked;
    },
  },
});
