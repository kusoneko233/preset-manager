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

function sliceFunction(content: string, name: string) {
  const start = content.indexOf(`function ${name}`);
  if (start < 0) throw new Error(`Function ${name} not found`);
  const nextFunction = content.indexOf('\nfunction ', start + 1);
  const nextAsyncFunction = content.indexOf('\nasync function ', start + 1);
  const candidates = [nextFunction, nextAsyncFunction].filter(index => index >= 0);
  const next = candidates.length ? Math.min(...candidates) : -1;
  return content.slice(start, next < 0 ? content.length : next);
}

const promptItem = readProjectFile('src/preset-manager/components/PromptItem.vue');
const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const aiAssistant = readProjectFile('src/preset-manager/components/AiAssistant.vue');

expectIncludes(promptItem, "'locked': locked");
expectIncludes(promptItem, ':aria-pressed="locked"');
expectIncludes(promptItem, '.prompt-item.locked');
expectIncludes(promptItem, '@click.stop="startInlineEdit(\'content\')"');
expectIncludes(promptItem, '@keydown.enter.stop.prevent="startInlineEdit(\'content\')"');
expectIncludes(promptItem, 'ref="contentInput"');
expectIncludes(promptItem, 'function focusInitialField(initialFocus: InlineEditFocus)');
expectIncludes(promptItem, 'function saveInlineEdit()');
expectIncludes(presetPanel, '@save-edits="savePromptEdits(prompt, $event)"');
expectNotIncludes(presetPanel, "@edit-content=\"openEditor(prompt, 'content')\"");
expectNotIncludes(presetPanel, ':initial-focus="editingInitialFocus"');
expectIncludes(aiAssistant, 'z-index: 100;');

const detachPrompt = sliceFunction(presetPanel, 'detachPrompt');
expectNotIncludes(detachPrompt, 'confirmDialog.confirm');

console.info('screenshotInteractionRegression tests passed');
