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
const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');

expectIncludes(app, "type RightAuxTabType = 'empty' | 'preset' | 'chat';");
expectIncludes(app, 'type EmptyRightAuxTab = {');
expectIncludes(app, "const rightAuxTabs = ref<RightAuxTab[]>([]);");
expectIncludes(app, '@click.stop="createEmptyRightAuxTab"');
expectIncludes(app, "activeRightAuxTab?.type === 'empty'");
expectIncludes(app, '@click="replaceRightAuxTabWithPreset(activeRightAuxTab.id)"');
expectIncludes(app, '@click="replaceRightAuxTabWithChat(activeRightAuxTab.id)"');
expectIncludes(app, 'function createEmptyRightAuxTab()');
expectIncludes(app, 'function replaceRightAuxTabWithPreset(tabId: string)');
expectIncludes(app, 'function replaceRightAuxTabWithChat(tabId: string)');
expectIncludes(app, 'function changeRightPresetTabPreset(tabId: string, presetName: string)');

const createEmptyRightAuxTab = extractFunctionBlock(app, 'createEmptyRightAuxTab');
expectIncludes(createEmptyRightAuxTab, "type: 'empty'");
expectIncludes(createEmptyRightAuxTab, "title: '新标签页'");
expectIncludes(createEmptyRightAuxTab, 'setActiveRightAuxTab(tab.id);');

const changeRightPresetTabPreset = extractFunctionBlock(app, 'changeRightPresetTabPreset');
expectIncludes(changeRightPresetTabPreset, 'manager.loadSecondPreset(presetName)');
expectIncludes(changeRightPresetTabPreset, 'tab.presetName = presetName;');
expectIncludes(changeRightPresetTabPreset, 'tab.title = presetName;');
expectIncludes(changeRightPresetTabPreset, 'duplicateTab.migrationOpen = false;');
expectIncludes(changeRightPresetTabPreset, 'tab.migrationOpen = false;');

const openPresetInRightSidebar = extractFunctionBlock(app, 'openPresetInRightSidebar');
expectIncludes(openPresetInRightSidebar, 'existingPreset.migrationOpen = false;');
expectIncludes(openPresetInRightSidebar, 'migrationOpen: false,');

expectIncludes(app, 'class="right-preset-select-row"');
expectNotIncludes(app, 'class="right-preset-select-label">第二预设</span>');
expectNotIncludes(app, 'right-preset-select-label');
expectIncludes(app, 'class="right-preset-select-wrap"');
expectIncludes(app, 'class="right-preset-select"');
expectIncludes(app, '@click.stop="toggleRightPresetMenu(activeRightAuxTab.id)"');
expectIncludes(app, 'class="right-preset-menu"');
expectIncludes(app, 'class="right-preset-menu-item"');
expectIncludes(app, '@click.stop="selectRightPresetFromMenu(activeRightAuxTab.id, name)"');
expectIncludes(app, 'function toggleRightPresetMenu(tabId: string)');
expectIncludes(app, 'function selectRightPresetFromMenu(tabId: string, presetName: string)');
expectIncludes(app, 'function closeRightPresetMenuFromOutside(event?: Event)');
expectIncludes(app, "parentDoc.addEventListener('pointerdown', closeRightPresetMenuFromOutside, true);");
expectNotIncludes(app, '<select');
expectNotIncludes(app, '<option v-for="name in manager.presetNames"');
expectNotIncludes(app, 'function getSelectValue(event: Event)');
expectIncludes(app, '<PresetPanel');
expectIncludes(app, ':show-second-header="false"');

expectNotIncludes(app, 'rightAuxAddMenuOpen');
expectNotIncludes(app, 'right-aux-add-menu');
expectNotIncludes(app, 'right-aux-add-backdrop');
expectNotIncludes(app, 'class="right-preset-title"');
expectNotIncludes(app, '.right-preset-title');
expectNotIncludes(app, '.right-preset-toolbar');
expectNotIncludes(app, '@click="openPresetInRightSidebar(activeRightAuxTab.presetName)"');
expectNotIncludes(app, '@click="manager.loadSecondPreset(activeRightAuxTab.presetName)"');
expectIncludes(app, '<PresetMigrationPanel');
expectIncludes(app, 'v-show="activeRightAuxTab.migrationOpen"');
expectIncludes(app, '@focus-main-prompt="focusMainPromptFromMigration"');
expectIncludes(app, '@focus-second-prompt="focusSecondPromptFromMigration"');
expectIncludes(app, '<PresetPanel\n                    ref="secondPresetPanelRef"');
expectIncludes(app, ':migration-active="activeRightAuxTab.migrationOpen"');

expectIncludes(presetPanel, 'showSecondHeader?: boolean;');
expectIncludes(presetPanel, "v-if=\"panelId === 'second' && showSecondHeader\"");
expectIncludes(presetPanel, 'const showSecondHeader = computed(() => props.showSecondHeader ?? true);');

console.info('rightAuxTabRefactor tests passed');
