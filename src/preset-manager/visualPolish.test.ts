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

expectIncludes(app, '--pm-bg-sidebar: rgba(34, 38, 48, 0.62);');
expectIncludes(app, '--pm-sidebar-edge: rgba(255, 255, 255, 0.08);');
expectIncludes(app, '--pm-bg-titlebar: #1c1e25;');
expectIncludes(app, '--pm-bg-workspace: #1c1e25;');
expectIncludes(app, '--pm-bg-transparent: oklch(0.155 0.008 255 / 0);');
expectIncludes(app, 'background: var(--pm-bg-transparent);');
expectIncludes(app, '--pm-split-line: rgba(255, 255, 255, 0.075);');
expectIncludes(app, '--pm-ai-capsule: rgba(28, 32, 42, 0.78);');
expectIncludes(app, '--pm-control-highlight: rgba(255, 255, 255, 0.05);');
expectIncludes(app, '--pm-send-bg: oklch(0.97 0 0);');
expectIncludes(app, '--pm-btn-hover: rgba(255, 255, 255, 0.05);');
expectIncludes(app, '--pm-btn-radius: 6px;');
expectIncludes(app, 'backdrop-filter: blur(32px) saturate(140%);');
expectIncludes(app, 'box-shadow: inset -0.8px 0 0 var(--pm-sidebar-edge);');
expectIncludes(app, 'width: 6px;');
expectIncludes(designMetrics, 'width: 400,');
expectIncludes(designMetricsTest, 'expectEqual(CODEX_REFERENCE_METRICS.aiDock.width, 400);');
expectIncludes(leftSidebar, 'const topHeight = ref(188);');
expectIncludes(workbenchPanel, 'border-bottom-color: transparent;');
expectIncludes(workbenchPanel, 'text-transform: uppercase;');
expectIncludes(favoriteFolder, 'border-bottom-color: transparent;');
expectIncludes(aiAssistant, 'placeholder="Ask Codex anything"');
expectIncludes(aiAssistant, 'background: var(--pm-send-bg);');
expectIncludes(aiAssistant, 'var(--pm-ai-dock-width, 400px)');
expectIncludes(aiAssistant, 'floating-detach"');
expectIncludes(aiAssistant, '.floating-detach');
expectIncludes(promptItem, 'border-top: 1px solid var(--pm-divider);');
expectIncludes(promptItem, 'border-radius: 999px;');
expectIncludes(annotationOverlay, 'const DEFAULT_TEXT_SIZE = 18;');
expectIncludes(annotationOverlay, '.anno-group {');
expectIncludes(annotationOverlay, 'width: 22px;');

console.info('visualPolish tests passed');
