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

const manager = readProjectFile('src/preset-manager/stores/manager.ts');
const panel = readProjectFile('src/preset-manager/components/PresetPanel.vue');

expectIncludes(manager, 'updatePromptsInPreset(promptIds: string[], updates: Partial<PresetPrompt>, targetPreset');
expectIncludes(manager, 'detachPromptsFromPreset(promptIds: string[], targetPreset');
expectIncludes(panel, 'selectedPromptKeys');
expectIncludes(panel, 'bulk-selection-bar');
expectIncludes(panel, 'togglePromptSelected');
expectIncludes(panel, 'bulkSetEnabled(true)');
expectIncludes(panel, 'bulkSetEnabled(false)');
expectIncludes(panel, 'bulkSetLocked(true)');
expectIncludes(panel, 'bulkSetLocked(false)');
expectIncludes(panel, 'bulkDetachSelected');
expectIncludes(panel, 'bulkCopySelectedToOther');
expectIncludes(panel, 'bulkMoveSelectedToOther');
expectIncludes(panel, 'clearSelection');

console.info('bulkPromptActions tests passed');
