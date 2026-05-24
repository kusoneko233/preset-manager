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
const app = readProjectFile('src/preset-manager/App.vue');
const manager = readProjectFile('src/preset-manager/stores/manager.ts');
const promptItem = readProjectFile('src/preset-manager/components/PromptItem.vue');
const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');

expectIncludes(titleBar, 'createPrompt');
expectIncludes(titleBar, 'createPreset');
expectNotIncludes(titleBar, 'copyPreset');
expectNotIncludes(titleBar, '复制预设');
expectIncludes(titleBar, 'renamePreset');
expectIncludes(titleBar, 'deletePreset');
expectIncludes(titleBar, 'appendUnusedPrompt');
expectIncludes(titleBar, 'importPrompts');
expectIncludes(titleBar, 'exportPrompts');
expectIncludes(titleBar, 'resetPromptOrder');
expectIncludes(app, 'officialPromptImportInput');
expectIncludes(app, 'showUnusedPromptPicker');
expectIncludes(app, 'appendOfficialUnusedPrompt');
expectIncludes(app, 'createOfficialPreset');
expectNotIncludes(app, 'copyOfficialPreset');
expectNotIncludes(app, '@copy-preset');
expectIncludes(app, 'renameOfficialPreset');
expectIncludes(app, 'deleteOfficialPreset');
expectIncludes(app, 'handleImportPromptsFile');
expectIncludes(app, 'downloadPresetPromptExport');
expectIncludes(manager, 'createPromptInPreset');
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
expectIncludes(promptItem, '移出列表');
expectIncludes(presetPanel, 'isOfficialPromptDeletable');
expectIncludes(presetPanel, 'canDeletePrompt');
expectIncludes(presetPanel, 'detachPrompt(prompt)');
expectIncludes(presetPanel, 'deletePromptEverywhere');
expectIncludes(presetPanel, 'restoreSystemPromptDefault');
expectIncludes(promptItem, 'restoreDefault');
expectIncludes(promptItem, '恢复默认');

console.info('promptOfficialTools tests passed');
