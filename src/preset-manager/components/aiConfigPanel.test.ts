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

const panel = readProjectFile('src/preset-manager/components/AiConfig.vue');
const assistant = readProjectFile('src/preset-manager/components/AiAssistant.vue');
const app = readProjectFile('src/preset-manager/App.vue');
const store = readProjectFile('src/preset-manager/stores/ai.ts');
const apiConfig = readProjectFile('src/preset-manager/utils/aiApiConfig.ts');

expectIncludes(panel, 'class="ai-config-shell"');
expectIncludes(panel, "variant?: 'panel' | 'page'");
expectIncludes(panel, ':class="[`variant-${variant}`]"');
expectIncludes(panel, 'class="api-page-back"');
expectIncludes(panel, 'defineEmits<{ close: [] }>()');
expectIncludes(panel, 'class="api-config-layout"');
expectIncludes(panel, 'class="api-profile-sidebar"');
expectIncludes(panel, 'class="api-profile-list"');
expectIncludes(panel, 'class="api-profile-item"');
expectIncludes(panel, 'class="api-profile-add"');
expectIncludes(panel, 'class="api-config-detail"');
expectIncludes(panel, 'class="api-title-name-editor"');
expectIncludes(panel, 'class="api-title-name-input"');
expectIncludes(panel, 'class="api-title-edit-icon"');
expectIncludes(panel, 'class="chatbox-config-card"');
expectIncludes(panel, 'class="chatbox-setting-row"');
expectIncludes(panel, 'class="chatbox-setting-label"');
expectIncludes(panel, 'class="chatbox-setting-control"');
expectIncludes(panel, 'manual-api-url');
expectIncludes(panel, 'manual-api-key');
expectIncludes(panel, 'source-select');
expectIncludes(panel, 'model-select');
expectIncludes(panel, 'class="api-fetch-button"');
expectIncludes(panel, 'class="danger-clear-button"');
expectIncludes(panel, 'width: min(760px, calc(100vw - 32px));');
expectIncludes(panel, '.ai-config-shell.variant-page');
expectIncludes(panel, 'width: 100%;');
expectIncludes(panel, 'height: 100%;');
expectIncludes(panel, 'grid-template-columns: 240px minmax(0, 760px) minmax(24px, 1fr);');
expectIncludes(panel, 'min-height: 520px;');
expectIncludes(panel, 'padding: 40px 28px 32px;');
expectIncludes(panel, 'gap: 20px;');
expectIncludes(panel, 'min-height: 48px;');
expectIncludes(panel, 'min-height: 72px;');
expectIncludes(panel, 'height: 46px;');
expectIncludes(panel, 'line-height: 46px;');
expectIncludes(panel, 'grid-template-columns: 132px minmax(0, 1fr);');
expectIncludes(panel, '从接口获取模型');
expectIncludes(panel, 'API 模式');
expectIncludes(panel, 'API 地址');
expectIncludes(panel, 'API Key');
expectIncludes(panel, '模型');
expectIncludes(panel, 'getModelList');
expectIncludes(panel, 'sourceOptions');
expectIncludes(panel, 'selectModelKey');
expectNotIncludes(panel, '<optgroup');
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

const manualInputCount = (panel.match(/manual-(api-url|api-key)/g) ?? []).length;
if (manualInputCount !== 2) {
  throw new Error(`Expected exactly 2 manual inputs, got ${manualInputCount}`);
}

expectIncludes(app, "import AiConfig from './components/AiConfig.vue';");
expectIncludes(app, 'const ai = useAiStore();');
expectIncludes(app, 'v-if="ai.showConfig"');
expectIncludes(app, 'class="api-settings-page"');
expectIncludes(app, '<AiConfig variant="page" @close="ai.showConfig = false" />');
expectIncludes(app, 'v-else class="preset-workspace-content"');
expectIncludes(app, '.api-settings-page');
expectIncludes(app, 'inset: 0;');
expectIncludes(app, 'z-index: 90;');
expectNotIncludes(assistant, 'v-if="ai.showConfig && ai.mode === \'drawer\'"');
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
expectIncludes(store, 'modelOptions');
expectIncludes(store, 'createApiProfile');
expectIncludes(store, 'addModelToActiveProfile');

expectIncludes(apiConfig, 'flattenAiModelOptions');
expectIncludes(apiConfig, 'buildAiCustomApi');
expectIncludes(apiConfig, 'apiProfiles');

console.info('aiConfigPanel tests passed');
