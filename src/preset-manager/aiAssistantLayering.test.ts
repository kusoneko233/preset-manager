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

const assistant = readProjectFile('src/preset-manager/components/AiAssistant.vue');
const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const overlayShellStart = assistant.indexOf('.overlay-shell {');
const overlayShellEnd = assistant.indexOf('.overlay-shell.expanded', overlayShellStart);
const overlayShellBlock = assistant.slice(overlayShellStart, overlayShellEnd);
const drawerStart = assistant.indexOf('.ai-assistant.mode-drawer {');
const drawerEnd = assistant.indexOf('.ai-assistant.mode-side {', drawerStart);
const drawerBlock = assistant.slice(drawerStart, drawerEnd);

expectIncludes(assistant, "variant === 'dock' ? 'mode-drawer' : `mode-${variant}`");
expectNotIncludes(assistant, '`mode-${ai.mode}`');
expectNotIncludes(assistant, "variant === 'dock' ? ai.mode : 'side'");
expectIncludes(assistant, '.ai-assistant.mode-drawer {');
expectNotIncludes(assistant, '.ai-assistant.drawer {');
expectNotIncludes(assistant, '.ai-assistant.side {');
expectIncludes(assistant, 'z-index: 100;');
expectIncludes(drawerBlock, 'background: transparent;');
expectIncludes(drawerBlock, 'backdrop-filter: none;');
expectIncludes(assistant, '.overlay-shell {');
expectNotIncludes(overlayShellBlock, 'z-index: 1;');
expectNotIncludes(overlayShellBlock, 'background: transparent;');
expectIncludes(assistant, '.overlay-panel {');
expectIncludes(assistant, 'background: var(--pm-ai-capsule);');
expectNotIncludes(assistant, 'z-index: 8;');

expectIncludes(presetPanel, '.prompt-drop-slot,');
expectIncludes(presetPanel, 'z-index: 2;');
expectNotIncludes(presetPanel, 'z-index: 12;');

console.info('aiAssistantLayering tests passed');
