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
const designMetrics = readProjectFile('src/preset-manager/designMetrics.ts');
const designMetricsTest = readProjectFile('src/preset-manager/designMetrics.test.ts');
const leftSidebar = readProjectFile('src/preset-manager/components/LeftSidebar.vue');
const workbenchPanel = readProjectFile('src/preset-manager/components/WorkbenchPanel.vue');
const favoriteFolder = readProjectFile('src/preset-manager/components/FavoriteFolder.vue');
const aiAssistant = readProjectFile('src/preset-manager/components/AiAssistant.vue');
const promptItem = readProjectFile('src/preset-manager/components/PromptItem.vue');
const annotationOverlay = readProjectFile('src/preset-manager/components/AnnotationOverlay.vue');

expectIncludes(app, '--pm-bg-sidebar: rgba(30, 40, 66, 0.22);');
expectIncludes(app, '--pm-sidebar-edge: rgba(225, 235, 255, 0.105);');
expectIncludes(app, '--pm-bg-transparent: rgba(5, 5, 6, 0);');
expectIncludes(app, 'background: var(--pm-bg-transparent);');
expectIncludes(app, '--pm-split-line: rgba(255, 255, 255, 0.24);');
expectIncludes(app, '--pm-ai-capsule: rgba(20, 22, 28, 0.46);');
expectIncludes(app, '--pm-control-highlight: rgba(255, 255, 255, 0.09);');
expectIncludes(app, '--pm-send-bg: #f7f7f2;');
expectIncludes(designMetrics, 'width: 400,');
expectIncludes(designMetricsTest, 'expectEqual(CODEX_REFERENCE_METRICS.aiDock.width, 400);');
expectIncludes(leftSidebar, 'const topHeight = ref(188);');
expectIncludes(workbenchPanel, 'border-bottom-color: transparent;');
expectIncludes(favoriteFolder, 'border-bottom-color: transparent;');
expectIncludes(aiAssistant, 'background: var(--pm-control-highlight);');
expectIncludes(aiAssistant, 'background: var(--pm-send-bg);');
expectIncludes(aiAssistant, 'var(--pm-ai-dock-width, 400px)');
expectIncludes(promptItem, 'width: 30px;');
expectIncludes(promptItem, 'border-radius: 999px;');
expectIncludes(annotationOverlay, 'const DEFAULT_TEXT_SIZE = 18;');

console.info('visualPolish tests passed');
