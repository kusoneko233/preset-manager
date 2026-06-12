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

const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const app = readProjectFile('src/preset-manager/App.vue');

expectIncludes(presetPanel, 'const creatingSinglePrompt = ref(false);');
expectIncludes(presetPanel, ':disabled="creatingSinglePrompt"');
expectIncludes(presetPanel, 'if (creatingSinglePrompt.value) return;');
expectIncludes(presetPanel, 'creatingSinglePrompt.value = true;');
expectIncludes(presetPanel, 'creatingSinglePrompt.value = false;');

expectIncludes(app, 'const creatingOfficialPrompt = ref(false);');
expectIncludes(app, 'if (creatingOfficialPrompt.value) return;');
expectIncludes(app, 'creatingOfficialPrompt.value = true;');
expectIncludes(app, 'creatingOfficialPrompt.value = false;');

console.info('promptCreationGuard tests passed');
