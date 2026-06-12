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

const workbench = readProjectFile('src/preset-manager/components/WorkbenchPanel.vue');
const favoriteFolder = readProjectFile('src/preset-manager/components/FavoriteFolder.vue');

expectIncludes(workbench, ':draggable="!isDraftNameEditing(draft)"');
expectIncludes(workbench, '@pointerdown.stop');
expectIncludes(workbench, '@mousedown.stop');
expectIncludes(workbench, '@dragstart.stop');
expectNotIncludes(workbench, ':draggable="true"');

expectIncludes(favoriteFolder, ':draggable="!isFavoriteNameEditing(item, i)"');
expectIncludes(favoriteFolder, '@pointerdown.stop');
expectIncludes(favoriteFolder, '@mousedown.stop');
expectIncludes(favoriteFolder, '@dragstart.stop');
expectNotIncludes(favoriteFolder, ':draggable="true"');

console.info('renameTextSelectionDragGuard tests passed');
