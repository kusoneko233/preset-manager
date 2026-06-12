declare const require: any;
declare const process: any;

const fs = require('fs');
const path = require('path');

function readProjectFile(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8') as string;
}

function expectIncludes(content: string, expected: string) {
  if (!content.includes(expected)) {
    throw new Error(`Expected file to include: ${expected}`);
  }
}

function expectNotIncludes(content: string, unexpected: string) {
  if (content.includes(unexpected)) {
    throw new Error(`Expected file not to include: ${unexpected}`);
  }
}

function extractCssBlock(content: string, selector: string, nextSelector: string) {
  const start = content.indexOf(selector);
  if (start < 0) throw new Error(`Expected selector to exist: ${selector}`);
  const end = content.indexOf(nextSelector, start + selector.length);
  if (end < 0) throw new Error(`Expected selector after block to exist: ${nextSelector}`);
  return content.slice(start, end);
}

const panel = readProjectFile('src/preset-manager/components/AiConfig.vue');
const assistant = readProjectFile('src/preset-manager/components/AiAssistant.vue');
const app = readProjectFile('src/preset-manager/App.vue');
const store = readProjectFile('src/preset-manager/stores/ai.ts');
const apiConfig = readProjectFile('src/preset-manager/utils/aiApiConfig.ts');
const removedTitleIconClass = ['api-title', 'edit-icon'].join('-');

expectIncludes(panel, 'class="ai-config-shell"');
expectIncludes(panel, "variant?: 'panel' | 'page'");
expectIncludes(panel, ':class="[`variant-${variant}`]"');
expectIncludes(panel, 'class="api-page-back"');
expectIncludes(panel, 'defineEmits<{ close: [] }>()');
expectIncludes(panel, 'class="api-config-layout"');
expectIncludes(panel, 'class="api-profile-sidebar"');
expectIncludes(panel, 'class="api-profile-list"');
expectIncludes(panel, 'class="api-profile-item"');
expectIncludes(panel, '@contextmenu.prevent.stop="openApiProfileMenu($event, profile)"');
expectIncludes(panel, 'class="api-profile-context-menu"');
expectIncludes(panel, 'renameApiProfile');
expectIncludes(panel, 'deleteApiProfileFromMenu');
expectIncludes(panel, 'class="api-profile-add"');
expectIncludes(panel, 'api-mode-section');
expectIncludes(panel, 'api-mode-field');
expectIncludes(panel, 'class="api-select-control api-mode-select-control"');
expectIncludes(panel, 'class="config-input api-mode-select"');
expectIncludes(panel, 'class="api-select-chevron"');
expectIncludes(panel, 'api-field-secret');
expectIncludes(panel, 'api-field-url');
expectIncludes(panel, 'api-field-model');
expectIncludes(panel, 'class="api-config-detail"');
expectIncludes(panel, 'class="api-detail-scroll"');
expectIncludes(panel, 'class="api-detail-title-row"');
expectIncludes(panel, 'class="api-title-name-editor"');
expectIncludes(panel, 'class="api-title-name-input"');
expectNotIncludes(panel, `class="${removedTitleIconClass}"`);
expectNotIncludes(panel, `.${removedTitleIconClass}`);
expectIncludes(panel, ':style="{ width: titleInputWidthCh }"');
expectIncludes(panel, 'const titleInputWidthCh = computed(() =>');
expectIncludes(panel, 'class="api-field-section"');
expectIncludes(panel, 'class="api-section-heading"');
expectIncludes(panel, 'class="api-field-grid"');
expectIncludes(panel, 'api-field');
expectIncludes(panel, 'class="api-field-label"');
expectIncludes(panel, 'manual-api-url');
expectIncludes(panel, 'manual-api-key');
expectIncludes(panel, 'showApiKey');
expectIncludes(panel, ':type="showApiKey ? \'text\' : \'password\'"');
expectIncludes(panel, 'class="api-key-visibility-button"');
expectIncludes(panel, ":title=\"showApiKey ? '隐藏 Key' : '显示 Key'\"");
expectIncludes(panel, "showApiKey ? 'eye-off' : 'eye'");
expectIncludes(panel, 'model-select');
expectIncludes(panel, 'class="api-select-control model-select-control"');
expectIncludes(panel, 'class="api-model-list"');
expectIncludes(panel, 'v-for="model in activeProfile.models"');
expectIncludes(panel, 'class="api-model-name"');
expectIncludes(panel, 'class="api-model-profile"');
expectIncludes(panel, 'class="api-model-remove"');
expectIncludes(panel, 'class="api-fetch-button"');
expectIncludes(panel, 'class="api-action-row"');
expectIncludes(panel, 'class="api-secondary-action"');
expectIncludes(panel, 'class="danger-clear-button api-clear-bottom"');
expectIncludes(panel, 'width: min(860px, calc(100vw - 32px));');
expectIncludes(panel, '.ai-config-shell.variant-page');
expectIncludes(panel, 'width: 100%;');
expectIncludes(panel, 'height: 100%;');
expectIncludes(panel, 'grid-template-columns: 248px minmax(0, 1fr);');
expectIncludes(panel, 'min-height: 520px;');
expectIncludes(panel, 'padding: 34px 42px 36px;');
expectIncludes(panel, 'gap: 28px;');
expectIncludes(panel, 'min-height: 48px;');
expectIncludes(panel, 'height: 46px;');
expectIncludes(panel, 'line-height: 46px;');
expectIncludes(panel, 'gap: 18px;');
expectIncludes(panel, '从接口获取模型');
expectIncludes(panel, 'API 模式');
expectIncludes(panel, '身份验证');
expectIncludes(panel, '接口与模型');
expectIncludes(panel, 'API 地址');
expectIncludes(panel, 'API Key');
expectIncludes(panel, '模型');
expectIncludes(panel, 'getModelList');
expectIncludes(panel, 'sourceOptions');
expectIncludes(panel, "value: 'custom'");
expectIncludes(panel, '自定义兼容接口');
expectIncludes(panel, 'selectModelKey');
expectIncludes(panel, '{{ option.name }}');
expectNotIncludes(panel, 'OpenRouter');
expectNotIncludes(panel, 'openrouter');
expectNotIncludes(panel, 'DeepSeek');
expectNotIncludes(panel, "value: 'deepseek'");
expectNotIncludes(panel, '{{ option.name }} · {{ option.group }}');
expectNotIncludes(panel, '<optgroup');
expectNotIncludes(panel, 'class="api-page-header"');
expectNotIncludes(panel, 'class="api-page-heading"');
expectNotIncludes(panel, '.api-page-header');
expectNotIncludes(panel, '.api-page-heading');
expectNotIncludes(panel, 'class="api-provider-segment"');
expectNotIncludes(panel, 'class="api-provider-pill"');
expectNotIncludes(panel, 'class="api-provider-dot"');
expectNotIncludes(panel, '.api-provider-segment');
expectNotIncludes(panel, '.api-provider-pill');
expectNotIncludes(panel, '.api-provider-dot');
expectNotIncludes(panel, '模型提供方');
expectNotIncludes(panel, 'class="api-danger-zone"');
expectNotIncludes(panel, '.api-danger-zone');
expectNotIncludes(panel, '对话数据');
expectNotIncludes(panel, '只影响 AI 助手的本地对话记录');
expectNotIncludes(panel, 'deleteActiveProfile');
expectNotIncludes(panel, '删除当前 API 预设');
expectNotIncludes(panel, 'accordion');
expectNotIncludes(panel, 'collapse');
expectNotIncludes(panel, 'profile-select');
expectNotIncludes(panel, 'group-select');
expectNotIncludes(panel, 'groupOptions');
expectNotIncludes(panel, 'updateProfileGroup');
expectNotIncludes(panel, '<span>Source</span>');
expectNotIncludes(panel, '<span>分组</span>');
expectNotIncludes(panel, 'model-results-panel');
expectNotIncludes(panel, 'model-result-option');
expectNotIncludes(panel, 'modelDraft');
expectNotIncludes(panel, 'modelGroupDraft');
expectNotIncludes(panel, '添加模型名');
expectNotIncludes(panel, 'addModel()');
expectNotIncludes(panel, 'class="api-proxy-toggle"');
expectNotIncludes(panel, 'manual-profile-name');
expectNotIncludes(panel, '使用代理预设');
expectNotIncludes(panel, '代理预设');
expectNotIncludes(panel, '<span>名称</span>');
expectNotIncludes(panel, 'class="chatbox-setting-row"');
expectNotIncludes(panel, 'class="api-provider-sidebar"');
expectNotIncludes(panel, 'class="api-provider-list"');
expectNotIncludes(panel, 'class="api-provider-mark"');
expectNotIncludes(panel, 'class="api-config-section"');
expectNotIncludes(panel, 'grid-template-columns: 232px 220px minmax(0, 760px) minmax(24px, 1fr);');
expectNotIncludes(panel, 'border-bottom: 1px solid rgba(255, 255, 255, 0.065);');
expectIncludes(panel, 'width: min(232px, 100%);');
expectIncludes(panel, 'width: min(560px, 100%);');
expectIncludes(panel, 'width: min(640px, 100%);');
expectIncludes(panel, 'width: min(520px, 100%);');
expectIncludes(panel, 'max-width: min(520px, 100%);');
expectIncludes(panel, 'padding: 18px 16px;');
expectIncludes(panel, 'appearance: none;');
expectIncludes(panel, 'padding-right: 38px;');
expectIncludes(panel, 'right: 13px;');
expectIncludes(panel, 'position: absolute;');
expectIncludes(panel, 'right: 0;');
expectIncludes(panel, 'top: 0;');

const manualInputCount = (panel.match(/manual-(api-url|api-key)/g) ?? []).length;
if (manualInputCount !== 2) {
  throw new Error(`Expected exactly 2 manual inputs, got ${manualInputCount}`);
}

expectIncludes(app, "import AiConfig from './components/AiConfig.vue';");
expectIncludes(app, 'const ai = useAiStore();');
expectIncludes(app, 'function openAiConfig()');
expectIncludes(app, 'ai.showConfig = true;');
expectIncludes(app, '@open-config="openAiConfig"');
expectIncludes(app, 'v-if="ai.showConfig"');
expectIncludes(app, 'class="api-settings-page"');
expectIncludes(app, '<AiConfig variant="page" @close="ai.showConfig = false" />');
expectIncludes(app, '<div ref="presetWorkspaceRef" class="preset-workspace">\n        <div class="preset-workspace-content">');
expectNotIncludes(app, '<div ref="presetWorkspaceRef" class="preset-workspace">\n        <div v-if="ai.showConfig" class="api-settings-page">');
expectNotIncludes(app, 'v-else class="preset-workspace-content"');
expectIncludes(app, '.api-settings-page');
expectIncludes(app, '.app-root > .api-settings-page');
expectIncludes(app, 'inset: 0;');
expectIncludes(extractCssBlock(app, '.app-root > .api-settings-page', '.app-root.fullscreen'), 'position: absolute;');
expectIncludes(extractCssBlock(app, '.app-root > .api-settings-page', '.app-root.fullscreen'), 'inset: 0;');
expectIncludes(extractCssBlock(app, '.app-root > .api-settings-page', '.app-root.fullscreen'), 'z-index: 900;');
expectNotIncludes(assistant, 'v-if="ai.showConfig && ai.mode === \'drawer\'"');
expectIncludes(assistant, "'open-config': [];");
expectIncludes(assistant, "'session-title': [payload: { sessionId: string; title: string }];");
expectIncludes(assistant, "emit('open-config')");
expectIncludes(assistant, 'function openConfig()');
expectIncludes(assistant, 'ai.showConfig = true;');
expectNotIncludes(assistant, 'ai.showConfig = !ai.showConfig');
expectNotIncludes(assistant, 'class="capsule-config large-api-config"');
expectNotIncludes(assistant, '<AiConfig v-if="ai.showConfig" />');
expectNotIncludes(assistant, '<AiConfig v-if="ai.showConfig && !isDrawerCompact" />');
expectNotIncludes(
  assistant,
  '<div v-if="ai.showConfig && !ai.drawerExpanded" class="capsule-config large-api-config">',
);
expectNotIncludes(assistant, '.capsule-config');
expectNotIncludes(assistant, '.large-api-config');

expectIncludes(store, 'normalizeAiConfig');
expectIncludes(store, 'buildAiCustomApi');
expectIncludes(store, 'syncTavernApiProfile');
expectIncludes(store, 'startTavernApiProfileSync');
expectIncludes(store, 'readTavernApiProfileSnapshot');
expectIncludes(store, 'applyTavernApiProfileSnapshot');
expectIncludes(store, 'CHATCOMPLETION_SOURCE_CHANGED');
expectIncludes(store, 'CHATCOMPLETION_MODEL_CHANGED');
expectIncludes(store, 'MAIN_API_CHANGED');
expectIncludes(store, 'SECRET_WRITTEN');
expectIncludes(store, 'modelOptions');
expectIncludes(store, 'createApiProfile');
expectIncludes(store, 'addModelToActiveProfile');

expectIncludes(apiConfig, 'flattenAiModelOptions');
expectIncludes(apiConfig, 'buildAiCustomApi');
expectIncludes(apiConfig, 'apiProfiles');
expectIncludes(apiConfig, 'TAVERN_API_PROFILE_ID');
expectIncludes(apiConfig, 'readTavernApiProfileSnapshot');
expectIncludes(apiConfig, 'applyTavernApiProfileSnapshot');

console.info('aiConfigPanel tests passed');
