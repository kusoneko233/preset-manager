declare const require: any;
declare const process: any;

// eslint-disable-next-line import-x/no-nodejs-modules
const fs = require('fs');
// eslint-disable-next-line import-x/no-nodejs-modules
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
    throw new Error(`Expected file to hide: ${unexpected}`);
  }
}

const titleBar = readProjectFile('src/preset-manager/components/TitleBar.vue');
const leftSidebar = readProjectFile('src/preset-manager/components/LeftSidebar.vue');
const sidebarPresetList = readProjectFile('src/preset-manager/components/SidebarPresetList.vue');
const app = readProjectFile('src/preset-manager/App.vue');
const manager = readProjectFile('src/preset-manager/stores/manager.ts');
const promptItem = readProjectFile('src/preset-manager/components/PromptItem.vue');
const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');

expectNotIncludes(titleBar, 'createPrompt: []');
expectNotIncludes(titleBar, 'appendUnusedPrompt: []');
expectNotIncludes(titleBar, 'importPrompts: []');
expectNotIncludes(titleBar, 'exportPrompts: []');
expectNotIncludes(titleBar, 'resetPromptOrder: []');
expectNotIncludes(titleBar, "runMoreAction('appendUnusedPrompt')");
expectNotIncludes(titleBar, "runMoreAction('importPrompts')");
expectNotIncludes(titleBar, "runMoreAction('exportPrompts')");
expectNotIncludes(titleBar, "runMoreAction('resetPromptOrder')");
expectNotIncludes(titleBar, 'runMoreAction');
expectIncludes(leftSidebar, "runSettingsAction('history')");
expectIncludes(leftSidebar, 'ui-settings-panel');
expectIncludes(leftSidebar, "runSettingsAction('theme')");
expectIncludes(titleBar, 'rightSidebarOpen: boolean;');
expectIncludes(titleBar, 'toggleRightSidebar: []');
expectIncludes(titleBar, 'class="sidebar-status-dot"');
expectIncludes(titleBar, '侧边栏');
expectNotIncludes(titleBar, "runMoreAction('createPreset')");
expectNotIncludes(titleBar, "runMoreAction('renamePreset')");
expectNotIncludes(titleBar, "runMoreAction('deletePreset')");
expectNotIncludes(titleBar, 'copyPreset');

expectIncludes(sidebarPresetList, "export type SidebarPresetAction = 'createPreset' | 'openSecondPreset' | 'renamePreset' | 'deletePreset';");
expectIncludes(sidebarPresetList, 'class="sidebar-section-create"');
expectIncludes(sidebarPresetList, "emit('preset-action', { action: 'createPreset', presetName: props.activePresetName });");
expectNotIncludes(sidebarPresetList, "runPresetAction('createPreset')");
expectIncludes(sidebarPresetList, "runPresetAction('openSecondPreset', $event)");
expectIncludes(sidebarPresetList, '在侧边栏打开');
expectIncludes(sidebarPresetList, "runPresetAction('renamePreset', $event)");
expectIncludes(sidebarPresetList, "runPresetAction('deletePreset', $event)");
expectNotIncludes(sidebarPresetList, "runPresetAction('history')");
expectNotIncludes(sidebarPresetList, "runPresetAction('appendUnusedPrompt')");
expectNotIncludes(sidebarPresetList, "runPresetAction('importPrompts')");
expectNotIncludes(sidebarPresetList, "runPresetAction('exportPrompts')");
expectNotIncludes(sidebarPresetList, "runPresetAction('resetPromptOrder')");
expectNotIncludes(sidebarPresetList, "runPresetAction('ui')");
expectNotIncludes(sidebarPresetList, "runPresetAction('theme')");

expectIncludes(app, 'officialPromptImportInput');
expectIncludes(app, 'showUnusedPromptPicker');
expectIncludes(app, 'appendOfficialUnusedPrompt');
expectNotIncludes(app, '@create-prompt="createOfficialPrompt"');
expectNotIncludes(app, '@append-unused-prompt="showUnusedPromptPicker = true"');
expectNotIncludes(app, '@import-prompts="officialPromptImportInput?.click()"');
expectNotIncludes(app, '@export-prompts="downloadPresetPromptExport"');
expectNotIncludes(app, '@reset-prompt-order="resetOfficialPromptOrder"');
expectIncludes(app, 'createOfficialPreset');
expectNotIncludes(app, 'copyOfficialPreset');
expectNotIncludes(app, '@copy-preset');
expectIncludes(app, 'renameOfficialPreset');
expectIncludes(app, 'deleteOfficialPreset');
expectIncludes(app, 'handleImportPromptsFile');
expectIncludes(app, 'downloadPresetPromptExport');
expectIncludes(manager, 'createPromptInPreset');
expectIncludes(manager, 'createPromptsInPreset');
expectIncludes(manager, 'makeNewPrompt');
expectIncludes(manager, 'isPresetPlaceholderPrompt(prompt as any)');
expectIncludes(manager, 'createPresetByName');
expectIncludes(manager, 'copyPresetToName');
expectIncludes(manager, 'renamePresetByName');
expectIncludes(manager, 'deletePresetByName');
expectIncludes(manager, 'restoreSystemPromptDefault');
expectIncludes(manager, 'mainUnusedPrompts');
expectIncludes(manager, 'appendUnusedPromptToPreset');
expectIncludes(manager, 'detachPromptFromPreset');
expectIncludes(manager, 'deletePromptEverywhere');
expectIncludes(manager, 'newPromptId');
expectIncludes(manager, 'importPromptsToPreset');
expectIncludes(manager, 'exportPromptsFromPreset');
expectIncludes(manager, 'resetPromptOrder');
expectIncludes(promptItem, 'detach');
expectIncludes(promptItem, 'canDetach');
expectIncludes(promptItem, 'canDelete');
expectNotIncludes(promptItem, 'name="minus" size="sm" title="移出列表"');
expectIncludes(presetPanel, 'isOfficialPromptDeletable');
expectIncludes(presetPanel, 'canDeletePrompt');
expectIncludes(presetPanel, 'detachPrompt(prompt)');
expectIncludes(presetPanel, 'deletePromptEverywhere');
expectIncludes(presetPanel, 'restoreSystemPromptDefault');
expectIncludes(presetPanel, 'useTextPromptStore');
expectIncludes(presetPanel, 'createBatchPrompts');
expectIncludes(presetPanel, '批量新建条目');
expectIncludes(presetPanel, 'store.createPromptsInPreset(names, props.panelId)');
expectIncludes(promptItem, 'restoreDefault');
expectIncludes(promptItem, '恢复默认');

console.info('promptOfficialTools tests passed');
