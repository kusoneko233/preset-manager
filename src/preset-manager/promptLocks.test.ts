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

const manager = readProjectFile('src/preset-manager/stores/manager.ts');
const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const promptItem = readProjectFile('src/preset-manager/components/PromptItem.vue');
const lucideIcons = readProjectFile('src/preset-manager/utils/lucideIcons.ts');

expectIncludes(manager, 'promptLocks: loadPromptLocks()');
expectIncludes(manager, 'function loadPromptLocks(): PromptLockState');
expectIncludes(manager, 'function savePromptLocks(promptLocks: PromptLockState)');
expectIncludes(manager, 'function getPromptLockKey(presetName: string, promptId: string)');
expectIncludes(manager, "isPromptLocked(promptId: string, targetPreset: 'main' | 'second' = 'main')");
expectIncludes(manager, "togglePromptLock(promptId: string, targetPreset: 'main' | 'second' = 'main')");
expectIncludes(manager, "setPromptLock(promptId: string, locked: boolean, targetPreset: 'main' | 'second' = 'main')");
expectIncludes(manager, '`${STORAGE_KEY}.promptLocks`');
expectIncludes(presetPanel, ':locked="isPromptLocked(prompt)"');
expectIncludes(presetPanel, '@toggle-lock="togglePromptLock(prompt)"');
expectIncludes(promptItem, 'locked?: boolean;');
expectIncludes(promptItem, 'toggleLock: [];');
expectIncludes(promptItem, 'name="lock"');
expectIncludes(promptItem, 'name="lock-open"');
expectIncludes(promptItem, 'class="inline-lock-toggle inline-control-capsule"');
expectIncludes(lucideIcons, "'lock'");
expectIncludes(lucideIcons, "'lock-open'");

console.info('promptLocks tests passed');
