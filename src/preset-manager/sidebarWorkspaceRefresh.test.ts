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

const leftSidebar = readProjectFile('src/preset-manager/components/LeftSidebar.vue');
const workbench = readProjectFile('src/preset-manager/components/WorkbenchPanel.vue');
const favoritesPanel = readProjectFile('src/preset-manager/components/FavoritesPanel.vue');

expectIncludes(leftSidebar, '<WorkbenchPanel v-else-if="activeMode === \'workbench\'" />');
expectIncludes(leftSidebar, '<FavoritesPanel v-else-if="activeMode === \'favorites\'" />');
expectNotIncludes(leftSidebar, 'draftStructureRevision');
expectNotIncludes(leftSidebar, 'favoriteStructureRevision');

expectIncludes(workbench, 'const drafts = computed(() => store.drafts);');
expectIncludes(workbench, 'v-for="draft in drafts"');
expectNotIncludes(workbench, 'v-if="!drafts.length"');
expectNotIncludes(workbench, 'draft-bulk-insert');
expectNotIncludes(workbench, 'visibleDrafts');
expectNotIncludes(workbench, 'shallowRef');
expectNotIncludes(workbench, 'workspaceRevision');
expectNotIncludes(workbench, "import { storeToRefs } from 'pinia';");

expectIncludes(favoritesPanel, 'const folders = computed(() => store.favorites);');
expectIncludes(favoritesPanel, 'v-for="folder in folders"');
expectNotIncludes(favoritesPanel, 'v-if="!folders.length"');
expectNotIncludes(favoritesPanel, 'visibleFolders');
expectNotIncludes(favoritesPanel, 'shallowRef');
expectNotIncludes(favoritesPanel, 'workspaceRevision');
expectNotIncludes(favoritesPanel, "import { storeToRefs } from 'pinia';");

console.info('sidebarWorkspaceRefresh tests passed');
