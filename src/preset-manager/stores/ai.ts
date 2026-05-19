export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AiConfig {
  apiUrl: string;
  key: string;
  model: string;
  source: string;
  useProxyPreset: boolean;
  proxyPreset: string;
}

const STORAGE_KEY = 'preset_manager';

function loadAiConfig(): AiConfig {
  try {
    const vars = getVariables({ type: 'script' });
    return (
      vars?.[STORAGE_KEY]?.aiConfig ?? {
        apiUrl: '',
        key: '',
        model: '',
        source: 'openai',
        useProxyPreset: false,
        proxyPreset: '',
      }
    );
  } catch {
    return { apiUrl: '', key: '', model: '', source: 'openai', useProxyPreset: false, proxyPreset: '' };
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

  saveConfig() {
    saveAiConfig(this.config);
  },

  toggleVisible() {
    this.visible = !this.visible;
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
      const systemPrompt = dedent`
        你是一个预设管理助手，帮助用户管理和优化 SillyTavern 的预设提示词。
        你了解各种预设的思维链语法、提示词排列最佳实践。
        用户可能会请你分析预设结构、建议条目排列顺序、生成新条目、或修改现有条目。
        请用中文回复，保持简洁实用。
        ${presetContext ? `\n当前预设上下文:\n${presetContext}` : ''}
      `;

      const chatHistory = this.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const customApi: Record<string, any> = {};
      if (this.config.useProxyPreset && this.config.proxyPreset) {
        customApi.proxy_preset = this.config.proxyPreset;
      } else if (this.config.apiUrl) {
        customApi.apiurl = this.config.apiUrl;
        if (this.config.key) customApi.key = this.config.key;
        if (this.config.source) customApi.source = this.config.source;
      }
      if (this.config.model) customApi.model = this.config.model;

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
