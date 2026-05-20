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

const app = readProjectFile('src/preset-manager/App.vue');
const leftSidebar = readProjectFile('src/preset-manager/components/LeftSidebar.vue');
const workbenchPanel = readProjectFile('src/preset-manager/components/WorkbenchPanel.vue');
const favoriteFolder = readProjectFile('src/preset-manager/components/FavoriteFolder.vue');
const aiAssistant = readProjectFile('src/preset-manager/components/AiAssistant.vue');

expectIncludes(app, '--pm-bg-sidebar: rgba(30, 40, 66, 0.46);');
expectIncludes(app, '--pm-sidebar-edge: rgba(225, 235, 255, 0.065);');
expectIncludes(app, '--pm-ai-capsule: rgba(20, 22, 28, 0.46);');
expectIncludes(app, '--pm-control-highlight: rgba(255, 255, 255, 0.09);');
expectIncludes(app, '--pm-send-bg: #f7f7f2;');
expectIncludes(leftSidebar, 'const topHeight = ref(188);');
expectIncludes(workbenchPanel, 'border-bottom-color: transparent;');
expectIncludes(favoriteFolder, 'border-bottom-color: transparent;');
expectIncludes(aiAssistant, 'background: var(--pm-control-highlight);');
expectIncludes(aiAssistant, 'background: var(--pm-send-bg);');

console.info('visualPolish tests passed');
