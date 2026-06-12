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

function expectExcludes(content: string, unexpected: string) {
  if (content.includes(unexpected)) {
    throw new Error(`Expected file to exclude: ${unexpected}`);
  }
}

const managerStore = readProjectFile('src/preset-manager/stores/manager.ts');
const aiStore = readProjectFile('src/preset-manager/stores/ai.ts');
const roadmap = readProjectFile('docs/roadmap.md');

for (const [label, content, storeName, id] of [
  ['manager', managerStore, 'useManagerStore', 'preset-manager'],
  ['ai', aiStore, 'useAiStore', 'preset-manager-ai'],
] as const) {
  expectIncludes(content, "import { defineStore } from 'pinia';");
  expectIncludes(content, `export const ${storeName} = defineStore('${id}'`);
  expectIncludes(content, 'state:');
  expectIncludes(content, '=> ({');
  expectIncludes(content, 'getters: {');
  expectIncludes(content, 'actions: {');
  expectExcludes(content, `const ${label}Store = reactive`);
  expectExcludes(content, `export function ${storeName}()`);
}

expectIncludes(roadmap, '`manager.ts`、`history.ts`、`ai.ts` 已迁移到 Pinia');
expectExcludes(roadmap, '`manager.ts`、`ai.ts` 待迁移');

console.info('coreStoresPinia tests passed');
