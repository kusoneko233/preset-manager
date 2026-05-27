import { buildPresetWritingSkillPrompt, shouldUsePresetWritingSkill } from '../utils/presetWritingSkill';
import {
  addModelToProfile,
  buildAiCustomApi,
  createAiApiProfile,
  flattenAiModelOptions,
  getActiveAiApiProfile,
  normalizeAiConfig,
  type AiApiProfile,
  type AiConfigShape,
} from '../utils/aiApiConfig';

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export type AiConfig = AiConfigShape;

const STORAGE_KEY = 'preset_manager';

function loadAiConfig(): AiConfig {
  try {
    const vars = getVariables({ type: 'script' });
    return normalizeAiConfig(vars?.[STORAGE_KEY]?.aiConfig);
  } catch {
    return normalizeAiConfig(null);
  }
}

function saveAiConfig(config: AiConfig) {
  try {
    updateVariablesWith(
      vars => {
        _.set(vars, `${STORAGE_KEY}.aiConfig`, klona(config));
        return vars;
      },
      { type: 'script' },
    );
  } catch (e) {
    console.error('[PresetManager] Failed to save AI config:', e);
  }
}

const aiStore = reactive({
  config: loadAiConfig(),
  messages: [] as AiMessage[],
  isGenerating: false,
  showConfig: false,
  mode: 'drawer' as 'drawer' | 'detached',
  drawerHeight: 220,
  drawerExpanded: false,
  detachedPosition: { x: 100, y: 100 },
  snappedEdge: null as 'top' | 'bottom' | 'left' | 'right' | null,
  visible: true,

  get activeApiProfile() {
    return getActiveAiApiProfile(this.config);
  },

  get modelOptions() {
    return flattenAiModelOptions(this.config.apiProfiles);
  },

  saveConfig() {
    this.config = normalizeAiConfig(this.config);
    saveAiConfig(this.config);
  },

  createApiProfile() {
    const profile = createAiApiProfile({ name: `API ${this.config.apiProfiles.length + 1}` });
    this.config.apiProfiles.push(profile);
    this.config.activeProfileId = profile.id;
    this.config.useProxyPreset = false;
    this.saveConfig();
  },

  deleteApiProfile(id: string) {
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

  setMode(mode: 'drawer' | 'detached') {
    this.mode = mode;
  },

  setDrawerExpanded(expanded: boolean) {
    this.drawerExpanded = expanded;
  },

  snapToEdge(edge: 'top' | 'bottom' | 'left' | 'right' | null) {
    this.snappedEdge = edge;
  },

  async sendMessage(content: string, presetContext?: string) {
    if (!content.trim() || this.isGenerating) return;

    this.messages.push({
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    });

    this.isGenerating = true;

    try {
      const presetWritingPrompt = shouldUsePresetWritingSkill(content)
        ? `\n\n${buildPresetWritingSkillPrompt({ presetContext, userInput: content })}`
        : '';
      const systemPrompt = dedent`
        你是一个预设管理助手，帮助用户管理和优化 SillyTavern 的预设提示词。
        你了解各种预设的思维链语法、提示词排列最佳实践。
        用户可能会请你分析预设结构、建议条目排列顺序、生成新条目、或修改现有条目。
        请用中文回复，保持简洁实用。
        ${presetContext ? `\n当前预设上下文:\n${presetContext}` : ''}
        ${presetWritingPrompt}
      `;

      const chatHistory = this.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const customApi = buildAiCustomApi(this.config);

      const result = await generateRaw({
        should_silence: true,
        ordered_prompts: [
          { role: 'system', content: systemPrompt },
          ...chatHistory,
        ],
        ...(Object.keys(customApi).length > 0 ? { custom_api: customApi as any } : {}),
      });

      const text = typeof result === 'string' ? result : result.content;

      this.messages.push({
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: text,
        timestamp: Date.now(),
      });
    } catch (e: any) {
      this.messages.push({
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `错误: ${e?.message ?? '生成失败'}`,
        timestamp: Date.now(),
      });
    } finally {
      this.isGenerating = false;
    }
  },

  clearMessages() {
    this.messages = [];
  },
});

export function useAiStore() {
  return aiStore;
}
