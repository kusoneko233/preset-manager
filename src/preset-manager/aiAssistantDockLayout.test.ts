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

function expectEqual(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(actual)} to equal ${String(expected)}`);
  }
}

const app = readProjectFile('src/preset-manager/App.vue');
const assistant = readProjectFile('src/preset-manager/components/AiAssistant.vue');
const aiStore = readProjectFile('src/preset-manager/stores/ai.ts');
const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const splitHandle = readProjectFile('src/preset-manager/components/SplitHandle.vue');
const centerStart = app.indexOf('class="center-area"');
const centerEnd = app.indexOf('<template v-if="showRightAuxArea">');
const centerAreaBlock = app.slice(centerStart, centerEnd);
const migrationPanel = readProjectFile('src/preset-manager/components/PresetMigrationPanel.vue');
const dockAssistant = '<AiAssistant @open-config="openAiConfig" />';
const mainComposerStart = assistant.indexOf('v-if="variant === \'main\'"');
const sideComposerStart = assistant.indexOf('<div v-else class="side-chat-composer">', mainComposerStart);
const mainComposerBlock = assistant.slice(mainComposerStart, sideComposerStart);
const dockTemplateStart = assistant.indexOf('<template v-else>');
const dockTemplateBlock = assistant.slice(dockTemplateStart);

expectIncludes(centerAreaBlock, '<PresetPanel');
expectIncludes(centerAreaBlock, 'panel-id="main"');
expectIncludes(centerAreaBlock, dockAssistant);
expectEqual(app.split(dockAssistant).length - 1, 1);
expectIncludes(centerAreaBlock, 'v-if="sidebarMode === \'chat\'"');
expectIncludes(centerAreaBlock, 'variant="main"');
expectNotIncludes(app, '<AiAssistant v-if="sidebarMode === \'presets\'"');
expectNotIncludes(app, 'v-else class="workspace-page"');
expectIncludes(app, 'const rightAuxOpen = ref(false);');
expectIncludes(app, 'const showRightAuxArea = computed(() => rightAuxOpen.value);');
expectIncludes(app, 'const activeRightAuxTab = computed');
expectIncludes(app, '<template v-if="showRightAuxArea">');
expectIncludes(app, 'class="right-aux-tab-strip"');
expectIncludes(app, 'class="right-aux-empty"');
expectNotIncludes(app, 'v-if="showSecondPreset" class="right-aux-tabs"');
expectNotIncludes(app, 'right-aux-tabs single');
expectNotIncludes(app, '<button class="active">AI 辅助</button>');
expectIncludes(app, 'v-else-if="activeRightAuxTab?.type === \'chat\'"');
expectIncludes(app, 'variant="side"');
expectIncludes(app, '@toggle-right-sidebar="toggleRightSidebar"');
expectIncludes(app, 'function toggleRightSidebar()');
expectNotIncludes(app, 'manager.loadSecondPreset(presetName);\n  showSecondPreset.value = true;');
expectNotIncludes(app, 'class="second-toggle"');
expectIncludes(app, '.center-area {');
expectIncludes(app, '.center-area {\n  position: relative;');
expectIncludes(app, 'display: flex;\n  flex-direction: column;\n  overflow: hidden;');
expectIncludes(app, '<SplitHandle hit-area="narrow" direction="vertical" @drag-start="onRightDragStart" @resize="onRightSplitResize" />');
expectIncludes(splitHandle, "hitArea?: 'normal' | 'narrow';");
expectIncludes(splitHandle, "hit-${props.hitArea}");
expectIncludes(splitHandle, '.split-handle.vertical.hit-narrow::before');
expectIncludes(splitHandle, 'left: -2px;');
expectIncludes(splitHandle, 'width: 5px;');
expectIncludes(assistant, '.overlay-shell {');
expectIncludes(assistant, 'bottom: var(--pm-ai-dock-bottom, 26px);');
expectIncludes(assistant, 'z-index: 100;');
expectIncludes(assistant, 'class="dock-resize-edge dock-resize-top"');
expectIncludes(assistant, 'class="dock-resize-edge dock-resize-left"');
expectIncludes(assistant, 'class="dock-resize-edge dock-resize-right"');
expectIncludes(assistant, 'class="dock-resize-corner"');
expectIncludes(assistant, 'function onDockResize');
expectIncludes(assistant, "direction: 'top' | 'left' | 'right' | 'corner'");
expectIncludes(assistant, 'const dockShellStyle = computed(() =>');
expectIncludes(assistant, 'ai.dockComposerWidth');
expectIncludes(assistant, 'ai.dockComposerHeight');
expectIncludes(aiStore, 'dockComposerOffsetX: 0');
expectIncludes(aiStore, 'dockComposerOffsetY: 0');
expectIncludes(assistant, 'height: ai.drawerExpanded ?');
expectIncludes(assistant, 'width: `min(${ai.dockComposerWidth}px, calc(100% - var(--pm-ai-dock-side-gap, 96px)))`');
expectIncludes(assistant, 'transform: `translate(calc(-50% + ${ai.dockComposerOffsetX}px), ${ai.dockComposerOffsetY}px)`');
expectIncludes(assistant, 'title="恢复默认位置大小"');
expectIncludes(assistant, 'function resetDockLayout');
expectIncludes(assistant, 'function onDockMove');
expectIncludes(assistant, '@mousedown.stop.prevent="onDockMove"');
expectIncludes(assistant, "cursor: 'move'");
expectIncludes(assistant, 'class="tool-pill icon-only dock-move-handle"');
expectIncludes(assistant, 'title="移动聊天框"');
expectIncludes(assistant, 'class="tool-pill icon-only dock-reset-btn"');
expectIncludes(assistant, 'class="dock-tool-group"');
expectNotIncludes(mainComposerBlock, 'class="dock-tool-group"');
expectNotIncludes(mainComposerBlock, 'class="tool-pill icon-only dock-move-handle"');
expectNotIncludes(mainComposerBlock, 'class="tool-pill icon-only dock-reset-btn"');
expectNotIncludes(mainComposerBlock, 'class="tool-pill icon-only settings-trigger"');
expectIncludes(dockTemplateBlock, 'class="dock-tool-group"');
expectIncludes(dockTemplateBlock, 'class="tool-pill icon-only dock-move-handle"');
expectIncludes(dockTemplateBlock, 'class="tool-pill icon-only dock-reset-btn"');
expectIncludes(dockTemplateBlock, 'class="tool-pill icon-only settings-trigger"');
expectIncludes(assistant, '.dock-move-handle {');
expectIncludes(assistant, '.dock-reset-btn {');
expectNotIncludes(assistant, 'class="main-chat-header"');
expectNotIncludes(assistant, 'main-chat-kicker');
expectIncludes(assistant, 'class="main-chat-composer-shell"');
expectIncludes(assistant, 'class="main-chat-reset-btn"');
expectIncludes(assistant, '@click="resetMainComposerLayout"');
expectIncludes(assistant, 'function resetMainComposerLayout()');
expectIncludes(assistant, 'ai.mainComposerWidth = 620;');
expectIncludes(assistant, 'ai.mainComposerHeight = 93;');
expectIncludes(assistant, 'class="main-chat-resize-handle"');
expectIncludes(assistant, 'class="composer-resize-corner"');
expectIncludes(assistant, 'class="composer-resize-edge composer-resize-top"');
expectIncludes(assistant, 'class="composer-resize-edge composer-resize-left"');
expectIncludes(assistant, 'function onMainComposerResize');
expectIncludes(assistant, "direction: 'corner' | 'top' | 'left'");
expectIncludes(assistant, 'function onMainComposerResize');
expectIncludes(assistant, 'const mainComposerStyle = computed(() =>');
expectIncludes(assistant, 'ai.mainComposerWidth');
expectIncludes(assistant, 'ai.mainComposerHeight');
expectIncludes(assistant, 'height: `${ai.mainComposerHeight}px`');
expectNotIncludes(assistant, 'minHeight: `${ai.mainComposerHeight}px`');
expectIncludes(assistant, '.main-chat-dock .input-row');
expectIncludes(assistant, "cursor: direction === 'corner' ? 'nwse-resize' : direction === 'top' ? 'ns-resize' : 'ew-resize'");
expectIncludes(assistant, "if (direction === 'corner' || direction === 'left')");
expectIncludes(assistant, "if (direction === 'corner' || direction === 'top')");
expectIncludes(assistant, '.dock-resize-edge {');
expectIncludes(assistant, '.dock-resize-top {');
expectIncludes(assistant, '.dock-resize-left {');
expectIncludes(assistant, '.dock-resize-right {');
expectIncludes(assistant, '.dock-resize-corner {');
expectIncludes(assistant, 'class="model-menu"');
expectIncludes(assistant, 'function toggleModelMenu');
expectIncludes(assistant, 'function selectModelOption');
expectIncludes(assistant, 'class="model-option-group"');
expectIncludes(assistant, 'modelOptionKey(option)');
expectNotIncludes(assistant, 'title="AI 模型设置" @click="openConfig"');
expectIncludes(presetPanel, '.prompt-list {\n  padding: 6px 14px 14px;');
expectIncludes(presetPanel, '.prompt-drop-tail {\n  min-height: 2px;');
expectNotIncludes(presetPanel, 'min-height: 10px;');
expectIncludes(presetPanel, 'padding-bottom: calc(var(--pm-ai-dock-min-height, 93px) + var(--pm-ai-dock-bottom, 18px) + 24px);');
expectIncludes(migrationPanel, 'await confirmDialog.confirm');

console.info('aiAssistantDockLayout tests passed');
