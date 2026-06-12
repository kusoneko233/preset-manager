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

function expectNoNativePrompt(content: string, file: string) {
  if (/(^|[^.\w])prompt\s*\(/m.test(content)) {
    throw new Error(`Expected ${file} not to use native prompt()`);
  }
}

const store = readProjectFile('src/preset-manager/stores/textPrompt.ts');
const dialog = readProjectFile('src/preset-manager/components/TextPromptDialog.vue');
const app = readProjectFile('src/preset-manager/App.vue');
const historyPanel = readProjectFile('src/preset-manager/components/HistoryPanel.vue');
const devThemePanel = readProjectFile('src/preset-manager/components/DevThemePanel.vue');

expectIncludes(store, 'type TextPromptOptions =');
expectIncludes(store, 'prompt(options: string | TextPromptOptions): Promise<string | null>');
expectIncludes(store, 'multiline?: boolean;');
expectIncludes(store, 'rows?: number;');
expectIncludes(store, 'resolve(null)');
expectIncludes(store, 'resolve(value)');

expectIncludes(dialog, 'role="dialog"');
expectIncludes(dialog, "const parentFloatingRoot = inject<HTMLElement | null>('presetManagerParentFloatingRoot', null);");
expectIncludes(dialog, '<Teleport :to="parentFloatingRoot ?? \'body\'" :disabled="!parentFloatingRoot">');
expectIncludes(dialog, 'data-preset-manager-floating-panel="text-prompt"');
expectIncludes(dialog, '@keydown.esc.stop.prevent="textPrompt.cancel"');
expectIncludes(dialog, '@submit.prevent="submit"');
expectIncludes(dialog, 'v-model="value"');
expectIncludes(dialog, 'autofocus');

expectIncludes(app, "import TextPromptDialog from './components/TextPromptDialog.vue';");
expectIncludes(app, '<TextPromptDialog />');
expectIncludes(app, 'const textPrompt = useTextPromptStore();');
expectIncludes(dialog, 'v-if="textPrompt.options?.multiline"');
expectIncludes(dialog, '<textarea');
expectIncludes(dialog, ':rows="textPrompt.options?.rows"');
expectIncludes(app, 'await textPrompt.prompt');
expectNoNativePrompt(app, 'App.vue');

expectIncludes(historyPanel, 'const textPrompt = useTextPromptStore();');
expectIncludes(historyPanel, 'await textPrompt.prompt');
expectNoNativePrompt(historyPanel, 'HistoryPanel.vue');

expectIncludes(devThemePanel, 'const textPrompt = useTextPromptStore();');
expectIncludes(devThemePanel, 'await textPrompt.prompt');
expectNoNativePrompt(devThemePanel, 'DevThemePanel.vue');

console.info('textPromptDialog tests passed');
