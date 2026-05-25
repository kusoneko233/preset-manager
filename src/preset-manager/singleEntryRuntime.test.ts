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

const index = readProjectFile('src/preset-manager/index.ts');
const instanceConfig = readProjectFile('src/preset-manager/utils/instanceConfig.ts');

expectIncludes(index, "import { createPinia } from 'pinia';");
expectIncludes(index, 'const instance = resolvePresetManagerInstance(readScriptName());');
expectIncludes(index, 'const INSTANCE_KEY = instance.key;');
expectIncludes(index, 'const BUTTON_NAME = instance.buttonName;');
expectIncludes(index, ".on('pointerdown', (event: JQuery.Event) => {");
expectIncludes(index, 'finishPointerDrag');
expectIncludes(index, "openFromFloatingButton('floating-button-pointerup');");
expectIncludes(index, "openFromFloatingButton('floating-button-click');");
expectIncludes(index, 'eventOn(getButtonEvent(BUTTON_NAME), () => togglePanel());');
expectIncludes(index, 'const nextApp = createApp(App).use(createPinia());');
expectIncludes(index, "nextApp.provide('presetManagerInstanceKey', INSTANCE_KEY);");
expectIncludes(index, "throw new Error('panel mounted without app root');");
expectIncludes(index, 'const codeInspectorControls = bindCodeInspectorControls(iframeDoc, window.parent.document);');
expectIncludes(index, "nextApp.provide('presetManagerCodeInspector', codeInspectorControls);");
expectIncludes(instanceConfig, "export type PresetManagerInstanceKey = 'default' | 'ui' | 'core';");
expectIncludes(instanceConfig, 'export function resolvePresetManagerInstance');

console.info('singleEntryRuntime tests passed');
