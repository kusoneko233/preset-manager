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

expectIncludes(manager, 'const warnedUnloadablePresetNames = new Set<string>();');
expectIncludes(manager, 'const unloadablePresetNames = new Set<string>();');
expectIncludes(manager, 'function tryGetPreset(name: string, options: { silent?: boolean } = {}): Preset | null');
expectIncludes(manager, 'unloadablePresetNames.delete(name);');
expectIncludes(manager, 'unloadablePresetNames.add(name);');
expectIncludes(manager, '!options.silent && !warnedUnloadablePresetNames.has(name)');
expectIncludes(manager, 'warnedUnloadablePresetNames.add(name);');
expectIncludes(manager, 'if (unloadablePresetNames.has(name)) return false;');
expectIncludes(manager, 'tryGetPreset(name, { silent: true })');

console.info('managerPresetNames tests passed');
