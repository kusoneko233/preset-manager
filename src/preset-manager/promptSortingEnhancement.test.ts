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

const panel = readProjectFile('src/preset-manager/components/PresetPanel.vue');

expectIncludes(panel, 'focusedPromptKey');
expectIncludes(panel, 'moveFocusedPrompt');
expectIncludes(panel, '@keydown.up.prevent');
expectIncludes(panel, '@keydown.down.prevent');
expectIncludes(panel, 'dropHintText');
expectIncludes(panel, 'drop-hint');
expectIncludes(panel, 'aria-live="polite"');

console.info('promptSortingEnhancement tests passed');
