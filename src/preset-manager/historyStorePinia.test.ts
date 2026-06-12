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

const historyStore = readProjectFile('src/preset-manager/stores/history.ts');
const roadmap = readProjectFile('docs/roadmap.md');

expectIncludes(historyStore, "import { defineStore } from 'pinia';");
expectIncludes(historyStore, "export const useHistoryStore = defineStore('preset-manager-history'");
expectIncludes(historyStore, 'state: () => ({');
expectIncludes(historyStore, 'getters: {');
expectIncludes(historyStore, 'actions: {');
expectExcludes(historyStore, 'const historyStore = reactive');
expectExcludes(historyStore, 'export function useHistoryStore()');

expectIncludes(roadmap, '`manager.ts`、`history.ts`、`ai.ts` 已迁移到 Pinia');

console.info('historyStorePinia tests passed');
