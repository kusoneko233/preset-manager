import { defineStore } from 'pinia';

import { buildPresetWritingSkillPrompt, shouldUsePresetWritingSkill } from '../utils/presetWritingSkill';
import {
  buildAiActionSystemPrompt,
  parseAiPresetActionResponse,
  stripAiActionBlocks,
  type AiPresetActionPlan,
} from '../utils/aiPresetActions';
import { executeAiPresetActionPlan } from '../utils/aiPresetActionExecutor';
import {
  addModelToProfile,
  addModelsToProfile,
  applyTavernApiProfileSnapshot,
  buildAiCustomApi,
  createAiApiProfile,
  flattenAiModelOptions,
  getActiveAiApiProfile,
  normalizeAiConfig,
  readTavernApiProfileSnapshot,
  TAVERN_API_PROFILE_ID,
  type AiApiProfile,
  type AiConfigShape,
} from '../utils/aiApiConfig';
import { parsePresetManagerAiConfig } from '../utils/scriptVariableSchemas';
import { useManagerStore } from './manager';
import { useHistoryStore } from './history';

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  actionPlan?: AiPresetActionPlan;
}

export type AiConfig = AiConfigShape;
type PendingAiActionPlan = { messageId: string; plan: AiPresetActionPlan };

const STORAGE_KEY = 'preset_manager';
let tavernApiSyncStops: Array<() => void> = [];

function loadAiConfig(): AiConfig {
  try {
    const vars = getVariables({ type: 'script' });
    return normalizeAiConfig(parsePresetManagerAiConfig(vars?.[STORAGE_KEY]?.aiConfig));
  } catch {
    return normalizeAiConfig(null);
  }
}

function saveAiConfig(config: AiConfig) {
  try {
    updateVariablesWith(
      vars => {
        _.set(vars, `${STORAGE_KEY}.aiConfig`, klona(parsePresetManagerAiConfig(config)));
        return vars;
      },
      { type: 'script' },
    );
  } catch (e) {
    console.error('[PresetManager] Failed to save AI config:', e);
  }
}

export const useAiStore = defineStore('preset-manager-ai', {
  state: () => ({
    config: loadAiConfig(),
    messages: [] as AiMessage[],
    sessionMessages: {} as Record<string, AiMessage[]>,
    sessionGenerating: {} as Record<string, boolean>,
    sessionPendingActionPlans: {} as Record<string, PendingAiActionPlan | null>,
    isGenerating: false,
    showConfig: false,
    drawerHeight: 220,
    dockComposerWidth: 400,
    dockComposerHeight: 93,
    dockComposerOffsetX: 0,
    dockComposerOffsetY: 0,
    mainComposerWidth: 620,
    mainComposerHeight: 93,
    drawerExpanded: false,
    visible: true,
    pendingActionPlan: null as PendingAiActionPlan | null,
    isExecutingAction: false,
  }),

  getters: {
    activeApiProfile: state => getActiveAiApiProfile(state.config),
    modelOptions: state => flattenAiModelOptions(state.config.apiProfiles),
  },

  actions: {
    saveConfig() {
      this.config = normalizeAiConfig(this.config);
      saveAiConfig(this.config);
    },

    syncTavernApiProfile() {
      const snapshot = readTavernApiProfileSnapshot();
      if (applyTavernApiProfileSnapshot(this.config, snapshot)) {
        this.saveConfig();
      }
    },

    startTavernApiProfileSync() {
      this.syncTavernApiProfile();
      if (tavernApiSyncStops.length > 0 || typeof eventOn === 'undefined' || typeof tavern_events === 'undefined') return;

      const sync = () => this.syncTavernApiProfile();
      const events = [
        tavern_events.CHATCOMPLETION_SOURCE_CHANGED,
        tavern_events.CHATCOMPLETION_MODEL_CHANGED,
        tavern_events.MAIN_API_CHANGED,
        tavern_events.ONLINE_STATUS_CHANGED,
        tavern_events.CONNECTION_PROFILE_LOADED,
        tavern_events.CONNECTION_PROFILE_UPDATED,
        tavern_events.SECRET_WRITTEN,
        tavern_events.SECRET_DELETED,
        tavern_events.SECRET_ROTATED,
        tavern_events.SECRET_EDITED,
      ];

      for (const eventType of events) {
        try {
          const stop = eventOn(eventType as any, sync as any)?.stop;
          if (stop) tavernApiSyncStops.push(stop);
        } catch {
          // Some SillyTavern builds may not expose every event to plugin iframes.
        }
      }
    },

    stopTavernApiProfileSync() {
      tavernApiSyncStops.forEach(stop => {
        try {
          stop();
        } catch {
          // Best-effort cleanup only.
        }
      });
      tavernApiSyncStops = [];
    },

    createApiProfile() {
      const profile = createAiApiProfile({ name: `API ${this.config.apiProfiles.length + 1}` });
      this.config.apiProfiles.push(profile);
      this.config.activeProfileId = profile.id;
      this.config.useProxyPreset = false;
      this.saveConfig();
    },

    deleteApiProfile(id: string) {
      if (id === TAVERN_API_PROFILE_ID) {
        this.syncTavernApiProfile();
        return;
      }
      this.config.apiProfiles = this.config.apiProfiles.filter(profile => profile.id !== id);
      if (this.config.activeProfileId === id) {
        this.config.activeProfileId = this.config.apiProfiles[0]?.id ?? '';
      }
      this.saveConfig();
    },

    selectApiProfile(id: string) {
      this.config.activeProfileId = id;
      this.config.useProxyPreset = false;
      this.saveConfig();
    },

    setActiveApiProfilePatch(patch: Partial<Omit<AiApiProfile, 'id' | 'models'>>) {
      const profile = getActiveAiApiProfile(this.config);
      if (!profile) return;
      Object.assign(profile, patch);
      this.saveConfig();
    },

    addModelToActiveProfile(name: string, group?: string) {
      const profile = getActiveAiApiProfile(this.config);
      if (!profile) return;
      const model = addModelToProfile(profile, name, group || profile.group);
      if (model) this.config.model = model.name;
      this.saveConfig();
    },

    addModelsToActiveProfile(names: string[], group?: string) {
      const profile = getActiveAiApiProfile(this.config);
      if (!profile) return;
      addModelsToProfile(profile, names, group || profile.group);
      this.saveConfig();
    },

    removeModelFromActiveProfile(modelId: string) {
      const profile = getActiveAiApiProfile(this.config);
      if (!profile) return;
      profile.models = profile.models.filter(model => model.id !== modelId);
      if (this.config.model && !this.modelOptions.some(option => option.name === this.config.model)) {
        this.config.model = '';
      }
      this.saveConfig();
    },

    toggleVisible() {
      this.visible = !this.visible;
    },

    show() {
      this.visible = true;
    },

    hide() {
      this.visible = false;
      this.showConfig = false;
    },

    setDrawerExpanded(expanded: boolean) {
      this.drawerExpanded = expanded;
    },

    getMessages(sessionId?: string): AiMessage[] {
      if (!sessionId) return this.messages;
      if (!this.sessionMessages[sessionId]) this.sessionMessages[sessionId] = [];
      return this.sessionMessages[sessionId];
    },

    isSessionGenerating(sessionId?: string): boolean {
      return sessionId ? Boolean(this.sessionGenerating[sessionId]) : this.isGenerating;
    },

    getPendingActionPlan(sessionId?: string): PendingAiActionPlan | null {
      return sessionId ? this.sessionPendingActionPlans[sessionId] ?? null : this.pendingActionPlan;
    },

    setSessionGenerating(sessionId: string | undefined, generating: boolean) {
      if (sessionId) this.sessionGenerating[sessionId] = generating;
      else this.isGenerating = generating;
    },

    setPendingActionPlan(sessionId: string | undefined, pending: PendingAiActionPlan | null) {
      if (sessionId) this.sessionPendingActionPlans[sessionId] = pending;
      else this.pendingActionPlan = pending;
    },

    async sendMessage(content: string, presetContext?: string, sessionId?: string) {
      if (!content.trim() || this.isSessionGenerating(sessionId)) return;

      const messages = this.getMessages(sessionId);
      messages.push({
        id: `msg_${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      });

      this.setSessionGenerating(sessionId, true);

      try {
        const presetWritingPrompt = shouldUsePresetWritingSkill(content)
          ? `\n\n${buildPresetWritingSkillPrompt({ presetContext, userInput: content })}`
          : '';
        const systemPrompt = dedent`
        你是一个预设管理助手，帮助用户管理和优化 SillyTavern 的预设提示词。
        你了解各种预设的思维链语法、提示词排列最佳实践。
        用户可能会请你分析预设结构、建议条目排列顺序、生成新条目、或修改现有条目。
        请用中文回复，保持简洁实用。
        ${buildAiActionSystemPrompt()}
        ${presetContext ? `\n当前预设上下文:\n${presetContext}` : ''}
        ${presetWritingPrompt}
      `;

        const chatHistory = messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        const customApi = buildAiCustomApi(this.config);

        const result = await generateRaw({
          should_silence: true,
          ordered_prompts: [{ role: 'system', content: systemPrompt }, ...chatHistory],
          ...(Object.keys(customApi).length > 0 ? { custom_api: customApi as any } : {}),
        });

        const text = typeof result === 'string' ? result : result.content;
        const parsedAction = parseAiPresetActionResponse(text);
        const visibleText = stripAiActionBlocks(text) || '我准备了一个待确认的操作方案。';
        const messageId = `msg_${Date.now()}`;

        if (parsedAction.plan) {
          this.setPendingActionPlan(sessionId, { messageId, plan: parsedAction.plan });
        }

        messages.push({
          id: messageId,
          role: 'assistant',
          content: parsedAction.errors.length
            ? `${visibleText}\n\n动作计划未被接受：${parsedAction.errors.join('；')}`
            : visibleText,
          timestamp: Date.now(),
          actionPlan: parsedAction.plan ?? undefined,
        });
      } catch (e: any) {
        messages.push({
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `错误: ${e?.message ?? '生成失败'}`,
          timestamp: Date.now(),
        });
      } finally {
        this.setSessionGenerating(sessionId, false);
      }
    },

    async confirmActionPlan(messageId?: string, sessionId?: string) {
      const pending = this.getPendingActionPlan(sessionId);
      if (!pending || this.isExecutingAction) return;
      if (messageId && pending.messageId !== messageId) return;

      this.isExecutingAction = true;
      try {
        const result = await executeAiPresetActionPlan(pending.plan, {
          manager: useManagerStore() as any,
          history: useHistoryStore() as any,
        });

        if (result.ok) {
          this.setPendingActionPlan(sessionId, null);
          const skipText = result.warnings.length ? `\n\n跳过项：${result.warnings.join('；')}` : '';
          this.getMessages(sessionId).push({
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `已执行：${pending.plan.summary}${skipText}`,
            timestamp: Date.now(),
          });
          toastr.success('AI 代操作已执行', '', { timeOut: 1500 });
        } else {
          this.getMessages(sessionId).push({
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `执行失败：${result.errors.join('；')}`,
            timestamp: Date.now(),
          });
          toastr.error(result.errors.join('；') || 'AI 代操作执行失败', '', { timeOut: 2600 });
        }
      } catch (e: any) {
        this.getMessages(sessionId).push({
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `执行失败：${e?.message ?? '未知错误'}`,
          timestamp: Date.now(),
        });
        toastr.error(e?.message ?? 'AI 代操作执行失败', '', { timeOut: 2600 });
      } finally {
        this.isExecutingAction = false;
      }
    },

    rejectActionPlan(messageId?: string, sessionId?: string) {
      const pending = this.getPendingActionPlan(sessionId);
      if (!pending) return;
      if (messageId && pending.messageId !== messageId) return;
      this.setPendingActionPlan(sessionId, null);
      this.getMessages(sessionId).push({
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `已取消：${pending.plan.summary}`,
        timestamp: Date.now(),
      });
    },

    clearMessages(sessionId?: string) {
      if (sessionId) {
        this.sessionMessages[sessionId] = [];
        this.sessionPendingActionPlans[sessionId] = null;
        this.sessionGenerating[sessionId] = false;
        return;
      }
      this.messages = [];
      this.pendingActionPlan = null;
    },
  },
});
