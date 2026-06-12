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

const item = readProjectFile('src/preset-manager/components/PromptItem.vue');
const panel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const manager = readProjectFile('src/preset-manager/stores/manager.ts');

expectIncludes(item, 'injection_trigger');
expectIncludes(item, 'injection_position');
expectIncludes(item, 'injection_depth');
expectIncludes(item, 'injection_order');
expectIncludes(manager, 'forbid_overrides');
expectIncludes(item, 'TRIGGER_OPTIONS');
expectIncludes(item, 'positionType');
expectIncludes(item, 'v-model="draft.triggers"');
expectIncludes(item, 'v-if="draft.positionType === \'in_chat\'"');
expectIncludes(item, 'triggerLabel');
expectIncludes(item, 'positionLabel');
expectIncludes(panel, 'identifier: promptKey');
expectIncludes(manager, 'getPromptKey');
expectIncludes(manager, 'isOfficialPromptKey');

console.info('promptOfficialFields tests passed');
