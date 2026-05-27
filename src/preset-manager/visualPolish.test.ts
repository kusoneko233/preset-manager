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
const favoritesPanel = readProjectFile('src/preset-manager/components/FavoritesPanel.vue');
const aiAssistant = readProjectFile('src/preset-manager/components/AiAssistant.vue');
const promptItem = readProjectFile('src/preset-manager/components/PromptItem.vue');
const annotationOverlay = readProjectFile('src/preset-manager/components/AnnotationOverlay.vue');
const titleBar = readProjectFile('src/preset-manager/components/TitleBar.vue');
const icon = readProjectFile('src/preset-manager/components/Icon.vue');
const iconButton = readProjectFile('src/preset-manager/components/IconButton.vue');
const pillButton = readProjectFile('src/preset-manager/components/PillButton.vue');
const panelHeader = readProjectFile('src/preset-manager/components/PanelHeader.vue');
const lucideIcons = readProjectFile('src/preset-manager/utils/lucideIcons.ts');

expectIncludes(app, '--pm-bg: #15171a;');
expectIncludes(app, '--pm-bg-transparent: rgba(21, 23, 26, 0);');
expectIncludes(app, '--pm-bg-titlebar: #15171a;');
expectIncludes(app, '--pm-bg-workspace: #15171a;');
expectIncludes(app, '--pm-bg-sidebar: #15171a;');
expectIncludes(app, '--pm-bg-card: #2a2d32;');
expectIncludes(app, '--pm-sidebar-edge: rgba(255, 255, 255, 0.06);');
expectIncludes(app, '--pm-split-line: rgba(255, 255, 255, 0.06);');
expectIncludes(app, '--pm-ai-capsule: rgba(36, 39, 44, 0.92);');
expectIncludes(app, '--pm-control-highlight: rgba(255, 255, 255, 0.05);');
expectIncludes(app, '--pm-send-bg: #f4f5f6;');
expectIncludes(app, '--pm-pill-primary-bg: #f4f5f6;');
expectIncludes(app, '--pm-pill-bg-hover: rgba(255, 255, 255, 0.06);');
expectIncludes(app, '--pm-btn-hover: var(--pm-pill-bg-hover);');
expectIncludes(app, '--pm-btn-radius: 8px;');
expectIncludes(app, "font-feature-settings: 'calt', 'kern', 'liga', 'ss03';");
expectIncludes(app, 'background: var(--pm-bg);');
expectIncludes(app, 'width: 6px;');
expectIncludes(app, '.hidden-file-input {');
expectIncludes(app, 'display: none !important;');
expectIncludes(designMetrics, 'width: 400,');
expectIncludes(designMetricsTest, 'expectEqual(CODEX_REFERENCE_METRICS.aiDock.width, 400);');
expectIncludes(leftSidebar, 'const topHeight = ref(188);');
expectIncludes(workbenchPanel, 'IconButton name="plus"');
expectIncludes(workbenchPanel, 'class="sidebar-section-kicker"');
expectIncludes(workbenchPanel, 'text-transform: uppercase;');
expectIncludes(favoritesPanel, 'IconButton name="plus"');
expectIncludes(favoritesPanel, 'class="sidebar-section-kicker"');
expectIncludes(favoriteFolder, 'class="folder-row"');
expectIncludes(favoriteFolder, 'class="folder-count"');
expectIncludes(aiAssistant, 'placeholder="Ask Codex anything"');
expectIncludes(aiAssistant, 'background: var(--pm-send-bg);');
expectIncludes(aiAssistant, 'var(--pm-ai-dock-width, 400px)');
expectIncludes(aiAssistant, 'floating-detach"');
expectIncludes(aiAssistant, '.floating-detach');
expectIncludes(aiAssistant, 'Icon name="external-link"');
expectIncludes(promptItem, 'class="prompt-role-dot"');
expectIncludes(promptItem, 'class="status-toggle"');
expectIncludes(promptItem, 'IconButton v-if="!isPlaceholder" name="pen-line"');
expectIncludes(promptItem, 'border-radius: 999px;');
expectIncludes(titleBar, "import IconButton from './IconButton.vue';");
expectIncludes(titleBar, "import PillButton from './PillButton.vue';");
expectIncludes(titleBar, 'leading-icon="plus"');
expectIncludes(icon, 'LUCIDE_ICONS');
expectIncludes(iconButton, 'class="icon-btn"');
expectIncludes(pillButton, 'class="pill-btn"');
expectIncludes(panelHeader, 'class="panel-header"');
expectIncludes(lucideIcons, "'panel-left-close'");
expectIncludes(lucideIcons, "'external-link'");
expectIncludes(annotationOverlay, 'const DEFAULT_TEXT_SIZE = 18;');
expectIncludes(annotationOverlay, '.anno-group {');
expectIncludes(annotationOverlay, 'width: 22px;');

console.info('visualPolish tests passed');
