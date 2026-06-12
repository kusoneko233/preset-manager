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

function extractFunctionBlock(content: string, name: string) {
  const start = content.indexOf(`function ${name}`);
  if (start < 0) throw new Error(`Expected function to exist: ${name}`);
  const nextFunction = content.indexOf('\nfunction ', start + 1);
  return content.slice(start, nextFunction < 0 ? undefined : nextFunction);
}

const app = readProjectFile('src/preset-manager/App.vue');
const leftSidebar = readProjectFile('src/preset-manager/components/LeftSidebar.vue');
const aiAssistant = readProjectFile('src/preset-manager/components/AiAssistant.vue');

expectIncludes(leftSidebar, "type SidebarMode = 'presets' | 'workbench' | 'favorites' | 'chat';");
expectIncludes(leftSidebar, '@click="createMainChat"');
expectIncludes(leftSidebar, "'new-chat': [];");
expectIncludes(leftSidebar, '<span>新聊天</span>');
expectIncludes(app, "const sidebarMode = ref<SidebarMode>('presets');");
expectIncludes(app, "type SidebarMode = 'presets' | 'workbench' | 'favorites' | 'chat';");
expectIncludes(app, 'v-if="sidebarMode === \'chat\'"');
expectIncludes(app, 'variant="main"');
expectIncludes(app, ':session-id="mainChatSessionId"');
expectIncludes(app, '@open-config="openAiConfig"');

expectIncludes(app, "type RightAuxTabType = 'empty' | 'preset' | 'chat';");
expectIncludes(app, 'const rightAuxOpen = ref(false);');
expectIncludes(app, 'const rightAuxTabs = ref<RightAuxTab[]>([]);');
expectIncludes(app, 'const activeRightAuxTab = computed');
expectIncludes(app, 'const showRightAuxArea = computed(() => rightAuxOpen.value);');
expectIncludes(app, 'class="right-aux-tab-strip"');
expectIncludes(app, 'class="right-aux-empty"');
expectIncludes(app, 'class="right-aux-choice-grid"');
expectIncludes(app, '@click.stop="createEmptyRightAuxTab"');
expectIncludes(app, "activeRightAuxTab?.type === 'empty'");
expectIncludes(app, '第二预设');
expectIncludes(app, '侧边聊天');
expectIncludes(app, '发起侧边对话');
expectIncludes(app, "createSideChatTab()");
expectIncludes(app, "openFirstAvailablePresetInRightSidebar()");
expectIncludes(app, "closeRightAuxTab(tab.id)");
expectIncludes(app, '<PresetMigrationPanel');
expectIncludes(app, 'class="right-preset-migration-action"');
expectIncludes(app, 'class="right-preset-select-row"');
expectIncludes(app, 'class="right-preset-menu"');
expectIncludes(app, 'class="right-preset-menu-item"');
expectNotIncludes(app, '<select');
expectIncludes(app, ':active-preset-name="activeRightAuxTab.presetName"');
expectIncludes(app, ':show-second-header="false"');
expectIncludes(app, 'v-else-if="activeRightAuxTab?.type === \'chat\'"');
expectIncludes(app, 'variant="side"');
expectIncludes(app, ':session-id="activeRightAuxTab.sessionId"');
expectIncludes(app, '--pm-right-aux-gutter: 24px;');
expectIncludes(app, 'padding: 0 0 14px;');
expectIncludes(app, 'padding: 7px var(--pm-right-aux-gutter) 8px;');
expectIncludes(app, 'padding: 48px var(--pm-right-aux-gutter);');
expectIncludes(app, 'width: min(100%, 460px);');
expectIncludes(app, 'gap: 56px;');
expectNotIncludes(app, 'transform: translateY(-18px);');
expectIncludes(app, 'padding: 8px var(--pm-right-aux-gutter) 10px;');
expectIncludes(app, '.right-aux-area :deep(.preset-panel)');
expectIncludes(app, 'margin-inline: 0;');

const toggleRightSidebar = extractFunctionBlock(app, 'toggleRightSidebar');
expectIncludes(toggleRightSidebar, 'rightAuxOpen.value = true;');
expectNotIncludes(toggleRightSidebar, 'manager.loadSecondPreset');
expectNotIncludes(toggleRightSidebar, 'rightAuxMode.value');
expectNotIncludes(toggleRightSidebar, 'showSecondPreset.value = true;');

const openPresetInRightSidebar = extractFunctionBlock(app, 'openPresetInRightSidebar');
expectIncludes(openPresetInRightSidebar, 'upsertRightAuxTab');
expectIncludes(openPresetInRightSidebar, "type: 'preset'");
expectIncludes(openPresetInRightSidebar, 'presetName');
expectIncludes(openPresetInRightSidebar, 'setActiveRightAuxTab');
expectNotIncludes(openPresetInRightSidebar, 'rightAuxMode.value');

expectNotIncludes(app, "type RightAuxMode = 'second' | 'migration' | 'assistant';");
expectNotIncludes(app, 'class="right-aux-tabs"');
expectNotIncludes(app, '<button :class="{ active: rightAuxMode === \'second\' }"');
expectNotIncludes(app, '<button :class="{ active: rightAuxMode === \'migration\' }"');
expectNotIncludes(app, '<button :class="{ active: rightAuxMode === \'assistant\' }"');
expectNotIncludes(app, 'const showSecondPreset = ref(false);');
expectNotIncludes(app, 'const showRightAssistant = ref(false);');
expectNotIncludes(app, 'const activeRightAuxMode = computed<RightAuxMode>');

expectIncludes(aiAssistant, "variant?: 'dock' | 'side' | 'main'");
expectIncludes(aiAssistant, "variant === 'main'");
expectIncludes(aiAssistant, 'main-chat-workspace');
expectIncludes(aiAssistant, 'class="side-chat-composer"');
expectIncludes(aiAssistant, 'padding: 14px 14px 96px;');
expectIncludes(aiAssistant, 'margin: 0 14px 16px;');
expectIncludes(aiAssistant, 'border-radius: 16px;');

console.info('rightAuxWorkspace tests passed');
