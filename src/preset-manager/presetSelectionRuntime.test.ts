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

function extractFunctionBlock(content: string, name: string) {
  const start = content.indexOf(`function ${name}`);
  if (start < 0) throw new Error(`Expected function to exist: ${name}`);
  const nextFunction = content.indexOf('\nfunction ', start + 1);
  const nextAsyncFunction = content.indexOf('\nasync function ', start + 1);
  const candidates = [nextFunction, nextAsyncFunction].filter((index: number) => index >= 0);
  return content.slice(start, candidates.length ? Math.min(...candidates) : undefined);
}

const app = readProjectFile('src/preset-manager/App.vue');
const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');

expectIncludes(app, 'function getTavernPresetName()');
expectIncludes(extractFunctionBlock(app, 'getTavernPresetName'), 'return getLoadedPresetName();');
expectIncludes(extractFunctionBlock(app, 'getTavernPresetName'), "return '';");
expectIncludes(extractFunctionBlock(app, 'syncPresetFromTavern'), 'if (!tavernPresetName) return;');
expectIncludes(extractFunctionBlock(app, 'syncPresetFromTavern'), 'if (tavernPresetName === manager.presetName) return;');

expectIncludes(presetPanel, 'function initializeMainPanelFromActivePreset()');
expectIncludes(
  extractFunctionBlock(presetPanel, 'initializeMainPanelFromActivePreset'),
  "const activeName = props.activePresetName || (props.panelId === 'main' ? store.presetName : store.secondPresetName);",
);
expectIncludes(extractFunctionBlock(presetPanel, 'initializeMainPanelFromActivePreset'), 'if (activeName) {');
expectIncludes(
  extractFunctionBlock(presetPanel, 'initializeMainPanelFromActivePreset'),
  "const loaded = props.panelId === 'main' ? store.loadMainPreset(activeName) : store.loadSecondPreset(activeName);",
);
expectIncludes(extractFunctionBlock(presetPanel, 'initializeMainPanelFromActivePreset'), 'if (!loaded) return;');
expectIncludes(extractFunctionBlock(presetPanel, 'initializeMainPanelFromActivePreset'), 'selectedPreset.value = activeName;');
expectNotIncludes(extractFunctionBlock(presetPanel, 'initializeMainPanelFromActivePreset'), 'store.currentPresetName');
expectIncludes(presetPanel, 'onMounted(() => {');
expectIncludes(presetPanel, 'initializeMainPanelFromActivePreset();');
expectNotIncludes(presetPanel, 'const current = store.currentPresetName;');

console.info('presetSelectionRuntime tests passed');
