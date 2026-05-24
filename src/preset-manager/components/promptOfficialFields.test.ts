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

const dialog = readProjectFile('src/preset-manager/components/PromptEditDialog.vue');
const item = readProjectFile('src/preset-manager/components/PromptItem.vue');
const panel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const manager = readProjectFile('src/preset-manager/stores/manager.ts');

expectIncludes(dialog, 'injection_trigger');
expectIncludes(dialog, 'injection_position');
expectIncludes(dialog, 'injection_depth');
expectIncludes(dialog, 'injection_order');
expectIncludes(dialog, 'forbid_overrides');
expectIncludes(dialog, 'TRIGGER_OPTIONS');
expectIncludes(dialog, 'positionType');
expectIncludes(dialog, 'v-model="draft.triggers"');
expectIncludes(dialog, 'v-if="draft.positionType === \'in_chat\'"');
expectIncludes(item, 'triggerLabel');
expectIncludes(item, 'positionLabel');
expectIncludes(panel, 'identifier: promptKey');
expectIncludes(manager, 'getPromptKey');
expectIncludes(manager, 'isOfficialPromptKey');

console.info('promptOfficialFields tests passed');
