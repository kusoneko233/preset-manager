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

function joinParts(...parts: string[]) {
  return parts.join('');
}

function extractBlock(content: string, startToken: string, nextToken: string) {
  const start = content.indexOf(startToken);
  if (start === -1) {
    throw new Error(`Expected block to start with: ${startToken}`);
  }
  const end = content.indexOf(nextToken, start + startToken.length);
  if (end === -1) {
    throw new Error(`Expected block after ${startToken} to end before: ${nextToken}`);
  }
  return content.slice(start, end);
}

function cssBlock(content: string, selector: string) {
  const start = content.indexOf(`${selector} {`);
  if (start === -1) {
    throw new Error(`Expected CSS selector to exist: ${selector}`);
  }
  const end = content.indexOf('\n}', start);
  if (end === -1) {
    throw new Error(`Expected CSS selector to close: ${selector}`);
  }
  return content.slice(start, end + 2);
}

const app = readProjectFile('src/preset-manager/App.vue');
const leftSidebarGlassArchive = readProjectFile('docs/archive/left-sidebar-glass-effect-before-settings-menu-2026-06-12.css');
const designMetrics = readProjectFile('src/preset-manager/designMetrics.ts');
const designMetricsTest = readProjectFile('src/preset-manager/designMetrics.test.ts');
const leftSidebar = readProjectFile('src/preset-manager/components/LeftSidebar.vue');
const sidebarPresetList = readProjectFile('src/preset-manager/components/SidebarPresetList.vue');
const workbenchPanel = readProjectFile('src/preset-manager/components/WorkbenchPanel.vue');
const favoriteFolder = readProjectFile('src/preset-manager/components/FavoriteFolder.vue');
const favoritesPanel = readProjectFile('src/preset-manager/components/FavoritesPanel.vue');
const aiAssistant = readProjectFile('src/preset-manager/components/AiAssistant.vue');
const promptItem = readProjectFile('src/preset-manager/components/PromptItem.vue');
const annotationOverlay = readProjectFile('src/preset-manager/components/AnnotationOverlay.vue');
const titleBar = readProjectFile('src/preset-manager/components/TitleBar.vue');
const icon = readProjectFile('src/preset-manager/components/Icon.vue');
const iconButton = readProjectFile('src/preset-manager/components/IconButton.vue');
const panelHeader = readProjectFile('src/preset-manager/components/PanelHeader.vue');
const lucideIcons = readProjectFile('src/preset-manager/utils/lucideIcons.ts');
const presetItemStart = sidebarPresetList.indexOf('.sidebar-preset-item {');
const presetItemEnd = sidebarPresetList.indexOf('.sidebar-preset-item:hover', presetItemStart);
const presetItemBlock = sidebarPresetList.slice(presetItemStart, presetItemEnd);
const presetItemActiveStart = sidebarPresetList.indexOf('.sidebar-preset-item.active {');
const presetItemActiveEnd = sidebarPresetList.indexOf('.preset-icon {', presetItemActiveStart);
const presetItemActiveBlock = sidebarPresetList.slice(presetItemActiveStart, presetItemActiveEnd);
const modeButtonActiveStart = leftSidebar.indexOf('.sidebar-mode-button.active {');
const modeButtonActiveEnd = leftSidebar.indexOf('.sidebar-main-content {', modeButtonActiveStart);
const modeButtonActiveBlock = leftSidebar.slice(modeButtonActiveStart, modeButtonActiveEnd);
const darkThemeBlock = extractBlock(app, "body[data-pm-theme='dark'],", '/* Backup of the previous');
const promptItemBlock = cssBlock(promptItem, '.prompt-item');
const promptItemHoverBlock = cssBlock(promptItem, '.prompt-item:hover');
const promptItemExpandedBlock = cssBlock(promptItem, '.prompt-item.expanded');
const promptItemLockedExpandedBlock = cssBlock(promptItem, '.prompt-item.locked.expanded');
const promptItemDisabledBlock = cssBlock(promptItem, '.prompt-item.disabled');
const promptItemEmptyContentBlock = cssBlock(promptItem, '.prompt-item.empty-content');
const promptItemDisabledContentBlock = cssBlock(promptItem, '.prompt-item.disabled .prompt-content');
const promptItemDisabledInlineContentBlock = cssBlock(promptItem, '.prompt-item.disabled .inline-content-input');
const promptRowStyleBlock = cssBlock(promptItem, '.prompt-row');
const promptLeftMarkerBlock = cssBlock(promptItem, '.prompt-left-marker');
const promptRoleDotBlock = cssBlock(promptItem, '.prompt-role-dot');
const promptItemEnabledDotBlock = cssBlock(promptItem, '.prompt-item.enabled .prompt-role-dot');
const promptTitleEditBlock = cssBlock(promptItem, '.prompt-title-edit');
const promptGroupToggleBlock = cssBlock(promptItem, '.prompt-group-toggle');
const promptGroupCountBlock = cssBlock(promptItem, '.prompt-group-count');
const promptPreviewBlock = cssBlock(promptItem, '.prompt-preview');
const statusToggleBlock = cssBlock(promptItem, '.status-toggle');
const statusToggleTrackBlock = cssBlock(promptItem, '.status-toggle::before');
const statusToggleOnBlock = cssBlock(promptItem, '.status-toggle.on');
const statusDotBlock = cssBlock(promptItem, '.status-dot');
const statusToggleOnDotBlock = cssBlock(promptItem, '.status-toggle.on .status-dot');
const inlineControlCapsuleBlock = cssBlock(promptItem, '.inline-control-capsule');
const inlineTriggerSummaryBlock = cssBlock(promptItem, '.inline-trigger-summary');
const inlineTriggerPanelBlock = cssBlock(promptItem, '.inline-trigger-panel');
const inlineTriggerPillBlock = cssBlock(promptItem, '.inline-trigger-pill');

expectIncludes(app, '--pm-bg: #15171a;');
expectIncludes(app, '--pm-bg-transparent: rgba(21, 23, 26, 0);');
expectIncludes(app, '--pm-bg-titlebar: #15171a;');
expectIncludes(app, '--pm-bg-workspace: #15171a;');
expectNotIncludes(app, '--pm-bg: #000000;');
expectNotIncludes(app, '--pm-bg-workspace: #000000;');
expectIncludes(app, '--pm-bg-sidebar: #15171a;');
expectIncludes(darkThemeBlock, '--pm-bg-card: #2a2d32;');
expectIncludes(darkThemeBlock, '--pm-bg-card-hover: #30343a;');
expectIncludes(app, '--pm-sidebar-edge: rgba(255, 255, 255, 0.06);');
expectIncludes(app, '--pm-split-line: rgba(255, 255, 255, 0.06);');
expectIncludes(app, '--pm-sidebar-default-backdrop: blur(0px) saturate(90%) brightness(55%) contrast(105%);');
expectIncludes(app, '--pm-sidebar-default-bottom-fade: linear-gradient(180deg, rgba(0, 0, 0, 0) 54%, rgba(0, 0, 0, 0.59) 65%, rgba(0, 0, 0, 0.59) 100%);');
expectIncludes(app, '--pm-sidebar-default-mask: linear-gradient(rgba(48, 51, 68, 0.7), rgba(48, 51, 68, 0.7));');
expectIncludes(app, '--pm-sidebar-default-image: none;');
expectIncludes(app, '--pm-ai-capsule: rgba(36, 39, 44, 0.92);');
expectIncludes(app, '--pm-control-highlight: rgba(255, 255, 255, 0.05);');
expectIncludes(app, '--pm-send-bg: #f4f5f6;');
expectIncludes(app, '--pm-pill-primary-bg: #f4f5f6;');
expectIncludes(app, '--pm-pill-bg-hover: rgba(255, 255, 255, 0.06);');
expectIncludes(app, '--pm-btn-hover: var(--pm-pill-bg-hover);');
expectIncludes(app, '--pm-btn-radius: 8px;');
expectIncludes(app, "font-feature-settings: 'calt', 'kern', 'liga', 'ss03';");
expectIncludes(app, 'background: var(--pm-bg);');
expectIncludes(app, 'width: var(--pm-left-rail-width);');
expectIncludes(leftSidebarGlassArchive, 'background-image: var(--pm-sidebar-default-bottom-fade), var(--pm-sidebar-default-mask), var(--pm-sidebar-default-image);');
expectIncludes(leftSidebarGlassArchive, 'backdrop-filter: var(--pm-sidebar-default-backdrop);');
expectIncludes(leftSidebarGlassArchive, 'filter: var(--pm-sidebar-default-backdrop);');
expectIncludes(app, 'background-color: rgba(48, 51, 68, 0.7);');
expectIncludes(app, 'background-image: var(--pm-sidebar-default-bottom-fade), var(--pm-sidebar-default-mask), var(--pm-sidebar-default-image);');
expectIncludes(app, 'backdrop-filter: var(--pm-sidebar-default-backdrop);');
expectIncludes(app, 'filter: var(--pm-sidebar-default-backdrop);');
expectIncludes(app, 'width: 6px;');
expectIncludes(app, '.hidden-file-input {');
expectIncludes(app, 'display: none !important;');
expectIncludes(designMetrics, 'width: 400,');
expectIncludes(designMetricsTest, 'expectEqual(CODEX_REFERENCE_METRICS.aiDock.width, 400);');
expectIncludes(leftSidebar, "type SidebarMode = 'presets' | 'workbench' | 'favorites' | 'chat';");
expectIncludes(leftSidebar, 'class="sidebar-mode-list"');
expectIncludes(leftSidebar, '新聊天');
expectIncludes(leftSidebar, "setMode('workbench')");
expectIncludes(leftSidebar, "setMode('favorites')");
expectIncludes(leftSidebar, '增添预设条目');
expectNotIncludes(leftSidebar, '<span>新建条目</span>');
expectIncludes(leftSidebar, '收藏栏');
expectNotIncludes(leftSidebar, 'background: rgba(255, 255, 255, 0.03);');
expectNotIncludes(leftSidebar, 'backdrop-filter: blur(40px) saturate(180%);');
expectIncludes(sidebarPresetList, 'class="sidebar-preset-list"');
expectNotIncludes(presetItemBlock, 'isolation: isolate;');
expectNotIncludes(sidebarPresetList, '.sidebar-preset-item > *');
expectIncludes(presetItemActiveBlock, 'background: var(--pm-row-active);');
expectIncludes(presetItemActiveBlock, 'color: var(--pm-text);');
expectIncludes(modeButtonActiveBlock, 'background: var(--pm-row-active);');
expectIncludes(modeButtonActiveBlock, 'color: var(--pm-text);');
expectIncludes(workbenchPanel, 'IconButton name="plus"');
expectIncludes(workbenchPanel, 'class="sidebar-section-kicker"');
expectIncludes(workbenchPanel, 'text-transform: uppercase;');
expectIncludes(favoritesPanel, 'IconButton name="plus"');
expectIncludes(favoritesPanel, 'class="sidebar-section-kicker"');
expectIncludes(favoriteFolder, 'class="folder-row"');
expectNotIncludes(favoriteFolder, 'class="folder-count"');
expectNotIncludes(favoriteFolder, '.folder-count');
expectIncludes(aiAssistant, 'placeholder="Ask Codex anything"');
expectIncludes(aiAssistant, 'main-chat-workspace');
expectIncludes(aiAssistant, 'side-chat-composer');
expectIncludes(aiAssistant, 'background: var(--pm-send-bg);');
expectIncludes(aiAssistant, 'var(--pm-ai-dock-width, 400px)');
expectNotIncludes(aiAssistant, joinParts('floating', '-', 'detach'));
expectNotIncludes(aiAssistant, joinParts('mode === ', "'detached'"));
expectNotIncludes(aiAssistant, joinParts('setMode(', "'detached'", ')'));
expectNotIncludes(aiAssistant, joinParts('detached', '-', 'window'));
expectIncludes(promptItem, 'class="prompt-role-dot"');
expectIncludes(promptItem, 'class="status-toggle"');
expectIncludes(promptItem, 'enabled: prompt.enabled');
expectNotIncludes(promptItem, 'IconButton v-if="!isPlaceholder" name="pen-line"');
expectIncludes(promptItem, 'border-radius: 999px;');
expectIncludes(promptItemBlock, 'border: 0;');
expectIncludes(promptItemBlock, 'background: var(--pm-bg-card);');
expectIncludes(promptItemHoverBlock, 'background: color-mix(in srgb, var(--pm-bg-card-hover) 86%, var(--pm-text) 4%);');
expectIncludes(promptItemExpandedBlock, 'background: var(--pm-bg-card);');
expectIncludes(promptItemLockedExpandedBlock, 'background: var(--pm-bg-card);');
expectIncludes(promptItemDisabledBlock, 'background: color-mix(in srgb, var(--pm-bg-card) 38%, var(--pm-bg-workspace));');
expectIncludes(promptItem, "'empty-content': isEmptyContent");
expectIncludes(promptItem, 'const isEmptyContent = computed(() =>');
expectIncludes(promptItemEmptyContentBlock, 'background: color-mix(in srgb, var(--pm-warning) 9%, var(--pm-bg-card));');
expectIncludes(promptItem, '.prompt-item.empty-content:hover {');
expectIncludes(promptItem, '.prompt-item.empty-content.disabled {');
expectIncludes(promptItem, '.prompt-item.disabled:hover {');
expectIncludes(promptItem, 'background: color-mix(in srgb, var(--pm-bg-card) 44%, var(--pm-bg-workspace));');
expectIncludes(promptItemDisabledContentBlock, 'background: color-mix(in srgb, var(--pm-bg-elevated) 90%, var(--pm-bg-hover));');
expectIncludes(promptItemDisabledContentBlock, 'box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pm-text) 8%, transparent);');
expectIncludes(promptItemDisabledInlineContentBlock, 'background: color-mix(in srgb, var(--pm-bg-elevated) 92%, var(--pm-bg-hover));');
expectIncludes(promptItemDisabledInlineContentBlock, 'box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pm-text) 9%, transparent);');
expectIncludes(promptItem, 'color: color-mix(in srgb, var(--pm-text-muted) 56%, transparent);');
expectIncludes(promptItem, 'color: color-mix(in srgb, var(--pm-text-muted) 44%, transparent);');
expectIncludes(promptRowStyleBlock, 'calc(var(--pm-prompt-pad-x, 12px) + 18px)');
expectNotIncludes(promptRowStyleBlock, 'calc(var(--pm-prompt-pad-x, 12px) + 22px)');
expectIncludes(promptLeftMarkerBlock, 'position: absolute;');
expectIncludes(promptLeftMarkerBlock, 'left: calc(var(--pm-prompt-pad-x, 12px) - 7px);');
expectIncludes(promptLeftMarkerBlock, 'top: 50%;');
expectIncludes(promptLeftMarkerBlock, 'transform: translateY(-50%);');
expectIncludes(promptLeftMarkerBlock, 'justify-content: center;');
expectNotIncludes(promptLeftMarkerBlock, 'flex: 0 0 20px;');
expectNotIncludes(promptLeftMarkerBlock, 'align-self: stretch;');
expectIncludes(promptRoleDotBlock, 'width: 6px;');
expectIncludes(promptRoleDotBlock, 'height: 6px;');
expectIncludes(promptItemEnabledDotBlock, 'background: color-mix(in srgb, var(--pm-text-muted) 72%, transparent);');
expectIncludes(promptItemEnabledDotBlock, 'box-shadow: none;');
expectNotIncludes(promptItemEnabledDotBlock, '0 0 0 2px');
expectNotIncludes(promptItem, '.prompt-role-dot.role-user {\n  background: var(--pm-success);');
expectNotIncludes(promptItem, '.prompt-role-dot.role-assistant {\n  background: var(--pm-warning);');
expectIncludes(promptTitleEditBlock, 'background: transparent;');
expectIncludes(promptTitleEditBlock, 'border-radius: 7px;');
expectIncludes(promptItem, '.prompt-title-edit:hover {');
expectIncludes(promptItem, '.prompt-title-input {');
expectIncludes(promptGroupToggleBlock, 'background: transparent;');
expectIncludes(promptGroupToggleBlock, 'width: 18px;');
expectIncludes(promptGroupToggleBlock, 'height: 18px;');
expectIncludes(promptGroupToggleBlock, 'color: #ffffff;');
expectNotIncludes(promptGroupToggleBlock, 'filter: drop-shadow');
expectNotIncludes(promptGroupToggleBlock, '#000');
expectNotIncludes(promptGroupCountBlock, '#000');
expectNotIncludes(promptItem, '.prompt-chevron');
expectIncludes(promptPreviewBlock, 'calc(var(--pm-prompt-pad-x, 12px) + 18px)');
expectNotIncludes(promptPreviewBlock, 'calc(var(--pm-prompt-pad-x, 12px) + 16px)');
expectIncludes(statusToggleBlock, 'appearance: none;');
expectIncludes(statusToggleBlock, 'position: relative;');
expectIncludes(statusToggleBlock, 'width: 28px;');
expectIncludes(statusToggleBlock, 'height: 16px;');
expectIncludes(statusToggleBlock, 'margin: 0;');
expectIncludes(statusToggleBlock, 'padding: 0;');
expectIncludes(statusToggleBlock, 'border: 0;');
expectIncludes(statusToggleBlock, 'border-radius: 999px;');
expectIncludes(statusToggleBlock, 'background: color-mix(in srgb, #54585f 54%, #000);');
expectIncludes(statusToggleBlock, 'box-shadow: none;');
expectIncludes(statusToggleBlock, 'opacity: 0.72;');
expectIncludes(statusToggleBlock, 'transition: all 100ms ease-out;');
expectIncludes(statusToggleTrackBlock, 'content: "";');
expectIncludes(statusToggleTrackBlock, 'position: absolute;');
expectIncludes(statusToggleTrackBlock, 'inset: -6px;');
expectNotIncludes(statusToggleTrackBlock, 'background:');
expectIncludes(statusToggleOnBlock, 'background: #6ca775;');
expectIncludes(statusToggleOnBlock, 'box-shadow: none;');
expectNotIncludes(promptItem, '.status-toggle.on::before');
expectIncludes(promptItem, 'background: color-mix(in srgb, #60656d 58%, #000);');
expectNotIncludes(promptItem, 'background: #c8ccd4;');
expectIncludes(statusDotBlock, 'position: absolute;');
expectIncludes(statusDotBlock, 'top: 0;');
expectIncludes(statusDotBlock, 'left: 0;');
expectIncludes(statusDotBlock, 'width: 16px;');
expectIncludes(statusDotBlock, 'height: 16px;');
expectIncludes(statusDotBlock, 'display: block;');
expectIncludes(statusDotBlock, 'background: color-mix(in srgb, #ffffff 58%, #54585f);');
expectIncludes(statusDotBlock, 'border-radius: 50%;');
expectIncludes(statusDotBlock, 'box-shadow: none;');
expectIncludes(statusDotBlock, 'transition: all 100ms ease-out;');
expectIncludes(statusToggleOnDotBlock, 'background: #ffffff;');
expectIncludes(statusToggleOnDotBlock, 'transform: translateX(12px);');
expectIncludes(statusToggleOnDotBlock, 'box-shadow: none;');
expectNotIncludes(promptItem, '#dfe1e4');
expectNotIncludes(promptItem, '#c9cbcd');
expectNotIncludes(promptItem, 'viewBox="0 0 10 10"');
expectNotIncludes(promptItem, '.status-dot svg');
expectNotIncludes(promptItem, 'stroke-dasharray');
expectNotIncludes(promptItem, 'stroke-dashoffset');
expectNotIncludes(promptItem, 'width: 36px;');
expectNotIncludes(promptItem, 'height: 24px;');
expectNotIncludes(promptItem, 'inset: -7.2px;');
expectNotIncludes(promptItem, 'top: 3.6px;');
expectNotIncludes(promptItem, 'left: 15.6px;');
expectNotIncludes(promptItem, 'width: 51.2px;');
expectNotIncludes(promptItem, 'height: 25.6px;');
expectNotIncludes(promptItem, 'width: 71.7px;');
expectNotIncludes(promptItem, 'translate(20px, -50%)');
expectNotIncludes(promptItem, '.status-dot::before');
expectIncludes(promptItem, 'font-size: var(--pm-prompt-editor-font-size, 15px);');
expectIncludes(app, '--pm-prompt-editor-font-size');
expectIncludes(inlineControlCapsuleBlock, 'height: 32px;');
expectIncludes(inlineControlCapsuleBlock, 'border: 0;');
expectIncludes(inlineControlCapsuleBlock, 'border-radius: 999px;');
expectIncludes(inlineControlCapsuleBlock, 'background: color-mix(in srgb, #000 20%, var(--pm-bg-elevated));');
expectIncludes(inlineControlCapsuleBlock, 'color: var(--pm-text-muted);');
expectIncludes(inlineTriggerSummaryBlock, 'border-radius: 999px;');
expectIncludes(inlineTriggerSummaryBlock, 'border: 0;');
expectIncludes(inlineTriggerSummaryBlock, 'background: color-mix(in srgb, #000 20%, var(--pm-bg-elevated));');
expectIncludes(inlineTriggerPanelBlock, 'border-radius: 999px;');
expectIncludes(inlineTriggerPanelBlock, 'border: 0;');
expectIncludes(inlineTriggerPanelBlock, 'background: color-mix(in srgb, #000 18%, var(--pm-bg-elevated));');
expectIncludes(inlineTriggerPillBlock, 'border-radius: 999px;');
expectIncludes(promptItem, '.inline-trigger-pill.active {');
expectNotIncludes(promptItemBlock, 'var(--pm-ai-surface)');
expectNotIncludes(promptItemHoverBlock, 'var(--pm-ai-surface)');
expectNotIncludes(promptItemExpandedBlock, 'var(--pm-ai-surface)');
expectNotIncludes(promptItemLockedExpandedBlock, 'var(--pm-ai-surface)');
expectNotIncludes(promptItemDisabledBlock, 'var(--pm-ai-surface)');
expectIncludes(titleBar, "import IconButton from './IconButton.vue';");
expectNotIncludes(titleBar, "import PillButton from './PillButton.vue';");
expectIncludes(titleBar, 'rightSidebarOpen: boolean;');
expectIncludes(titleBar, 'toggleRightSidebar: []');
expectIncludes(titleBar, 'class="sidebar-status-dot"');
expectIncludes(titleBar, 'class="sidebar-toggle-button"');
expectIncludes(titleBar, 'class="preset-token-ratio"');
expectIncludes(titleBar, '侧边栏');
expectIncludes(app, 'class="right-aux-choice-card"');
expectIncludes(app, 'class="right-aux-tab-strip"');
expectIncludes(app, 'class="right-preset-migration-action"');
expectIncludes(app, 'border: 0;\n  border-radius: 8px;\n  background: color-mix(in srgb, var(--pm-bg-elevated) 70%, transparent);');
expectNotIncludes(titleBar, 'background: rgba(255, 255, 255, 0.03);');
expectNotIncludes(titleBar, 'backdrop-filter: blur(40px) saturate(180%);');
expectIncludes(icon, 'LUCIDE_ICONS');
expectIncludes(iconButton, 'class="icon-btn"');
expectIncludes(panelHeader, 'class="panel-header"');
expectIncludes(lucideIcons, "'panel-left-close'");
expectIncludes(lucideIcons, "'external-link'");
expectIncludes(annotationOverlay, 'const DEFAULT_TEXT_SIZE = 18;');
expectIncludes(annotationOverlay, '.anno-group {');
expectIncludes(annotationOverlay, 'width: 22px;');

console.info('visualPolish tests passed');
