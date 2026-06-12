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

const app = readProjectFile('src/preset-manager/App.vue');
const titleBar = readProjectFile('src/preset-manager/components/TitleBar.vue');
const leftSidebar = readProjectFile('src/preset-manager/components/LeftSidebar.vue');
const lucideIcons = readProjectFile('src/preset-manager/utils/lucideIcons.ts');
const leftSidebarGlassArchive = readProjectFile(
  'docs/archive/left-sidebar-glass-effect-before-settings-menu-2026-06-12.css',
);

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

const sidebarContentBlock = cssBlock(leftSidebar, '.sidebar-content');
const sidebarMainContentBlock = cssBlock(leftSidebar, '.sidebar-main-content');
const settingsButtonBlock = cssBlock(leftSidebar, '.sidebar-settings-button');
const settingsPopoverBlock = cssBlock(leftSidebar, '.sidebar-settings-popover');
const sidebarNewChatBlock = cssBlock(leftSidebar, '.sidebar-new-chat-button');
const uiSettingsPanelBlock = cssBlock(leftSidebar, '.ui-settings-panel');
const appSidebarGlassBlock = cssBlock(app, '.app-root::after');

expectIncludes(app, '@toggle-history="showHistory = !showHistory"');
expectIncludes(app, '@toggle-theme="toggleTheme"');
expectIncludes(app, '@open-api-settings="openAiConfig"');
expectIncludes(app, '@toggle-annotation="showAnnotation = !showAnnotation"');
expectIncludes(app, '@toggle-dev-theme-panel="devTheme.togglePanel()"');
expectIncludes(app, '@toggle-code-inspector="toggleCodeInspector"');

expectIncludes(leftSidebar, 'class="sidebar-settings-dock"');
expectIncludes(leftSidebar, 'class="sidebar-settings-button"');
expectIncludes(leftSidebar, '<Icon name="settings" :size="14" />');
expectNotIncludes(leftSidebar, '<Icon name="settings-2" :size="14" />');
expectIncludes(lucideIcons, "'settings':");
expectIncludes(leftSidebar, 'class="sidebar-settings-popover"');
expectIncludes(leftSidebar, "const parentDocument = inject<Document>('parentDocument', document);");
expectIncludes(leftSidebar, "parentDocument.addEventListener('pointerdown', closeSettingsFromPointer, true);");
expectIncludes(leftSidebar, "parentDocument.addEventListener('mousedown', closeSettingsFromPointer, true);");
expectIncludes(leftSidebar, "parentDocument.defaultView?.addEventListener('keydown', closeSettingsFromKey, true);");
expectIncludes(leftSidebar, "parentDocument.removeEventListener('pointerdown', closeSettingsFromPointer, true);");
expectIncludes(leftSidebar, "parentDocument.removeEventListener('mousedown', closeSettingsFromPointer, true);");
expectIncludes(leftSidebar, "parentDocument.defaultView?.removeEventListener('keydown', closeSettingsFromKey, true);");
expectIncludes(leftSidebar, 'class="sidebar-new-chat-button"');
expectIncludes(leftSidebar, 'v-if="activeMode === \'chat\'"');
expectIncludes(leftSidebar, 'class="new-chat-label">新对话</span>');
expectIncludes(leftSidebar, 'API 设置');
expectIncludes(leftSidebar, 'runSettingsAction(\'api\')');
expectIncludes(leftSidebar, "'open-api-settings': [];");
expectIncludes(leftSidebar, 'ui-settings-panel');
expectIncludes(leftSidebar, 'const uiSettingsExpanded = ref(false);');
expectIncludes(leftSidebar, ':class="{ expanded: uiSettingsExpanded }"');
expectIncludes(leftSidebar, '@click.stop="toggleUiSettingsExpanded"');
expectIncludes(leftSidebar, '<div v-if="uiSettingsExpanded" class="ui-settings-body">');
expectIncludes(leftSidebar, '<Icon :name="uiSettingsExpanded ? \'chevron-up\' : \'chevron-down\'" :size="13" />');
expectIncludes(leftSidebar, 'class="settings-range"');
expectIncludes(leftSidebar, 'class="settings-preset-apply"');
expectIncludes(leftSidebar, "'set-ui-scale': [value: number];");
expectIncludes(leftSidebar, "'apply-ui-preset': [key: UiPresetKey];");
expectIncludes(leftSidebar, "'toggle-history': [];");
expectIncludes(leftSidebar, "'toggle-theme': [];");
expectIncludes(leftSidebar, "'toggle-annotation': [];");
expectIncludes(leftSidebar, "'toggle-code-inspector': [];");
expectIncludes(leftSidebar, "'toggle-dev-theme-panel': [];");
expectIncludes(leftSidebar, 'annotationVisible: boolean;');
expectIncludes(leftSidebar, 'codeInspectorEnabled: boolean;');
expectIncludes(leftSidebar, "theme: 'dark' | 'light';");
expectIncludes(leftSidebar, '.sidebar-content {');
expectIncludes(sidebarContentBlock, 'overflow: visible;');
expectIncludes(leftSidebar, '.sidebar-main-content {');
expectIncludes(sidebarMainContentBlock, 'overflow: hidden;');
expectIncludes(settingsButtonBlock, 'border-radius: 8px;');
expectIncludes(settingsPopoverBlock, 'left: 0;');
expectIncludes(settingsPopoverBlock, 'right: 0;');
expectIncludes(settingsPopoverBlock, 'bottom: calc(100% + 8px);');
expectIncludes(settingsPopoverBlock, 'width: auto;');
expectIncludes(settingsPopoverBlock, 'max-height: min(520px, calc(100vh - 72px));');
expectIncludes(settingsPopoverBlock, 'overflow-y: auto;');
expectIncludes(settingsPopoverBlock, 'border-radius: 16px;');
expectIncludes(settingsPopoverBlock, 'background: var(--pm-left-entry-editor-bg);');
expectIncludes(leftSidebarGlassArchive, '.app-root::after');
expectIncludes(leftSidebarGlassArchive, 'background-image: var(--pm-sidebar-default-bottom-fade), var(--pm-sidebar-default-mask), var(--pm-sidebar-default-image);');
expectIncludes(leftSidebarGlassArchive, 'backdrop-filter: var(--pm-sidebar-default-backdrop);');
expectIncludes(appSidebarGlassBlock, 'background-color: rgba(48, 51, 68, 0.7);');
expectIncludes(appSidebarGlassBlock, 'background-image: var(--pm-sidebar-default-bottom-fade), var(--pm-sidebar-default-mask), var(--pm-sidebar-default-image);');
expectIncludes(appSidebarGlassBlock, 'background-size: cover;');
expectIncludes(appSidebarGlassBlock, 'background-position: center center;');
expectIncludes(appSidebarGlassBlock, 'background-repeat: no-repeat;');
expectIncludes(appSidebarGlassBlock, 'backdrop-filter: var(--pm-sidebar-default-backdrop);');
expectIncludes(appSidebarGlassBlock, '-webkit-backdrop-filter: var(--pm-sidebar-default-backdrop);');
expectIncludes(appSidebarGlassBlock, 'filter: var(--pm-sidebar-default-backdrop);');
expectNotIncludes(settingsPopoverBlock, 'left: calc(100% + 8px);');
expectIncludes(sidebarNewChatBlock, 'background: var(--pm-ai-capsule);');
expectIncludes(sidebarNewChatBlock, 'border-radius: 16px;');
expectIncludes(uiSettingsPanelBlock, 'padding-bottom: 3px;');
expectIncludes(leftSidebar, '.ui-settings-toggle {');
expectIncludes(leftSidebar, '.ui-settings-body {');

expectIncludes(titleBar, 'class="sidebar-toggle-button"');
expectNotIncludes(titleBar, 'name="highlighter"');
expectNotIncludes(titleBar, 'name="crosshair"');
expectNotIncludes(titleBar, 'name="palette"');
expectNotIncludes(titleBar, 'title-more-divider');
expectNotIncludes(titleBar, 'class="title-separator"');
expectNotIncludes(titleBar, '.title-separator');

console.info('sidebarSettingsDock tests passed');
