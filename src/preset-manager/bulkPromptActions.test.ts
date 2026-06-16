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

function cssBlock(content: string, selector: string) {
  const start = content.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Expected CSS selector to exist: ${selector}`);
  const end = content.indexOf('\n}', start);
  if (end === -1) throw new Error(`Expected CSS selector to close: ${selector}`);
  return content.slice(start, end + 2);
}

const manager = readProjectFile('src/preset-manager/stores/manager.ts');
const panel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const bulkSelectionBarBlock = cssBlock(panel, '.bulk-selection-bar');
const bulkSelectionMoreBlock = cssBlock(panel, '.bulk-selection-more');

expectIncludes(manager, 'updatePromptsInPreset(promptIds: string[], updates: Partial<PresetPrompt>, targetPreset');
expectIncludes(manager, 'detachPromptsFromPreset(promptIds: string[], targetPreset');
expectIncludes(panel, 'selectedPromptKeys');
expectIncludes(panel, 'bulk-selection-toolbar');
expectIncludes(panel, 'bulk-selection-bar');
expectIncludes(panel, 'bulk-selection-actions');
expectIncludes(panel, 'bulk-selection-more');
expectIncludes(panel, 'bulk-selection-more-trigger');
expectIncludes(panel, '<summary class="bulk-selection-more-trigger">更多</summary>');
expectIncludes(panel, 'togglePromptSelected');
expectIncludes(panel, 'bulkSetEnabled(true)');
expectIncludes(panel, 'bulkSetEnabled(false)');
expectIncludes(panel, 'bulkSetLocked(true)');
expectIncludes(panel, 'bulkSetLocked(false)');
expectIncludes(panel, 'bulkDetachSelected');
expectIncludes(panel, 'bulkCopySelectedToOther');
expectIncludes(panel, 'bulkMoveSelectedToOther');
expectIncludes(panel, 'clearSelection');
expectIncludes(bulkSelectionBarBlock, 'position: static;');
expectNotIncludes(bulkSelectionBarBlock, 'position: sticky;');
expectNotIncludes(bulkSelectionBarBlock, 'backdrop-filter:');
expectNotIncludes(bulkSelectionBarBlock, 'box-shadow:');
expectIncludes(bulkSelectionMoreBlock, 'position: relative;');

console.info('bulkPromptActions tests passed');
