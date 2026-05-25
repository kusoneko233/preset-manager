declare const require: any;
declare const process: any;

// eslint-disable-next-line import-x/no-nodejs-modules
const fs = require('fs');
// eslint-disable-next-line import-x/no-nodejs-modules
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
const runtime = readProjectFile('src/preset-manager/index.ts');
const titleBar = readProjectFile('src/preset-manager/components/TitleBar.vue');
const panel = readProjectFile('src/preset-manager/components/DevThemePanel.vue');
const injector = readProjectFile('src/preset-manager/components/DevThemeStyleInjector.vue');
const css = readProjectFile('src/preset-manager/utils/devThemeCss.ts');
const controls = readProjectFile('src/preset-manager/utils/devThemeControls.ts');
const store = readProjectFile('src/preset-manager/stores/devTheme.ts');

expectIncludes(app, 'data-dev-sidebar');
expectIncludes(app, 'data-dev-workspace');
expectIncludes(app, 'data-dev-panel');
expectIncludes(app, 'DevThemeStyleInjector');
expectIncludes(app, 'DevThemePanel');
expectIncludes(app, 'useDevThemeStore');
expectIncludes(app, '@toggle-dev-theme-panel="devTheme.togglePanel()"');
expectIncludes(app, 'codeInspectorEnabled');
expectIncludes(app, '@toggle-code-inspector="toggleCodeInspector"');
expectIncludes(app, 'WINDOW_MIN_VISIBLE_RATIO = 0.1');
expectIncludes(app, "provide('presetManagerWindowMinVisibleRatio', WINDOW_MIN_VISIBLE_RATIO);");
expectIncludes(app, 'presetManagerParentFloatingRoot');
expectIncludes(app, "parentDoc.createElement('div')");
expectIncludes(app, "parentDoc.createElement('style')");
expectIncludes(app, "data-preset-manager-floating-root");
expectIncludes(app, "data-preset-manager-floating-root-style");
expectIncludes(app, '[data-preset-manager-floating-root="${instanceKey}"] .dev-theme-panel');
expectIncludes(app, '[data-preset-manager-floating-root="${instanceKey}"] .dev-theme-head');
expectIncludes(app, '[data-preset-manager-floating-root="${instanceKey}"] .dev-theme-icon-btn');
expectIncludes(app, '[data-preset-manager-floating-root="${instanceKey}"] .dev-theme-resize');
expectIncludes(app, "parentFloatingRoot?.remove()");

expectIncludes(titleBar, 'toggleDevThemePanel');
expectIncludes(titleBar, 'toggleCodeInspector');
expectIncludes(titleBar, 'clampWindowStateWithVisibleArea');
expectIncludes(titleBar, "inject<number>('presetManagerWindowMinVisibleRatio', 0.1)");
expectIncludes(titleBar, '开发者背景面板');
expectIncludes(titleBar, '开发者检查器');
expectIncludes(titleBar, 'IconButton name="palette"');
expectIncludes(titleBar, 'IconButton name="crosshair"');
expectIncludes(titleBar, '@mousedown.stop="onDragStart"');
expectNotIncludes(titleBar, '@mousedown.stop.prevent="onDragStart"');

expectIncludes(app, 'onSelect?:');
expectIncludes(app, 'codeInspectorControls?.onSelect');
expectIncludes(app, 'removeCodeInspectorSelectListener?.()');
expectIncludes(runtime, 'selectListeners');
expectIncludes(runtime, 'onSelect: listener');
expectIncludes(runtime, 'markSelectedMatches');
expectIncludes(runtime, 'data-preset-manager-selected-source');
expectIncludes(css, 'data-preset-manager-selected-source');
expectIncludes(injector, "inject<Document | null>('parentDocument', null)");
expectIncludes(injector, "styleDocument.createElement('style')");
expectIncludes(store, 'this.panelOpen = true;');
expectIncludes(panel, 'dev-theme-effective-guide');
expectIncludes(panel, '控件 → CSS → 代码位置');
expectIncludes(panel, 'ControlCodeMap');
expectIncludes(panel, 'controlInfo');
expectIncludes(panel, 'getDevThemeControlTraces');
expectIncludes(panel, 'activeForSelection');
expectIncludes(panel, 'dev-theme-code-map');
expectIncludes(panel, '改的是');
expectIncludes(panel, '代码在');
expectIncludes(panel, '作用到当前选中元素和同类元素');
expectIncludes(panel, ':effect-info="controlInfo(\'brightness\')"');
expectIncludes(panel, ':effect-info="controlInfo(\'contrast\')"');
expectIncludes(panel, ':info="controlInfo(\'textColor\')"');
expectIncludes(panel, ':info="controlInfo(\'borderRadius\')"');
expectNotIncludes(panel, '现在可以调这些绿色项');
expectNotIncludes(panel, 'EFFECTIVE_TEXT_STYLE');
expectNotIncludes(panel, 'function effectiveTextStyle');
expectNotIncludes(panel, ':style="effectiveTextStyle');
expectNotIncludes(panel, ':effective="selectedTargetActive"');
expectIncludes(runtime, 'parentDoc.defaultView');
expectIncludes(panel, "'is-recommended': hasSelected");
expectIncludes(panel, '先确认这里');
expectIncludes(panel, '开发者背景面板');
expectIncludes(panel, '实时预览 · 手动保存');
expectIncludes(panel, 'readFileAsDataUrl');
expectIncludes(panel, 'serializeDevThemeConfig');
expectIncludes(panel, 'parseDevThemeConfig');
expectIncludes(panel, 'clampFloatingPanelRect');
expectIncludes(panel, '@pointerdown.stop.prevent="onDragStart"');
expectIncludes(panel, '@pointerdown.stop.prevent="onResizeStart($event, handle)"');
expectIncludes(panel, 'function startPanelPointerDrag');
expectIncludes(panel, 'PointerEvent');
expectIncludes(panel, 'pointermove');
expectIncludes(panel, 'pointerup');
expectIncludes(panel, 'pointercancel');
expectIncludes(panel, 'function getPanelViewportSize');
expectIncludes(panel, "position: 'fixed'");
expectIncludes(panel, 'window.innerWidth');
expectIncludes(panel, 'window.innerHeight');
expectIncludes(panel, 'store.panelRect = clampPanelRect(start)');
expectIncludes(panel, '<Teleport');
expectIncludes(panel, ':disabled="!parentFloatingRoot"');
expectIncludes(panel, 'parentFloatingRoot');
expectIncludes(panel, "parentFloatingRoot.style.pointerEvents = 'auto'");
expectIncludes(panel, 'activeDocument.addEventListener');
expectIncludes(panel, "parentFloatingRoot.style.pointerEvents = previousRootPointerEvents");
expectIncludes(panel, 'data-preset-manager-floating-panel');
expectIncludes(panel, 'event.clientX');
expectIncludes(panel, 'event.clientY');
expectIncludes(panel, 'position: fixed;');
expectNotIncludes(panel, 'store.panelDetached');
expectNotIncludes(panel, 'toggleDetached');
expectNotIncludes(panel, 'getIframeOffsetInParent');
expectNotIncludes(panel, 'getActiveDocument');
expectNotIncludes(panel, '@mousedown.stop.prevent="onDragStart"');
expectNotIncludes(panel, '@mousedown.stop.prevent="onResizeStart($event, handle)"');
expectNotIncludes(panel, 'startParentDrag');
expectNotIncludes(panel, "document.querySelector('.app-root')");
expectNotIncludes(panel, 'function startLocalPanelDrag');
expectNotIncludes(panel, 'snapInside');
expectNotIncludes(panel, '回屏内');
expectNotIncludes(panel, "inject<Document>('parentDocument')");
expectNotIncludes(panel, "inject<HTMLIFrameElement>('iframeElement')");
expectNotIncludes(panel, 'setPointerCapture');
expectNotIncludes(panel, 'releasePointerCapture');
expectNotIncludes(panel, 'function getDragPoint(event: MouseEvent)');
expectNotIncludes(panel, 'iframeElement.getBoundingClientRect()');
expectNotIncludes(panel, 'event.screenX');
expectNotIncludes(panel, 'event.screenY');
expectNotIncludes(panel, 'ev.screenX');
expectNotIncludes(panel, 'ev.screenY');

expectIncludes(injector, 'pm-dev-theme');
expectIncludes(injector, 'pm-dev-theme-parent');
expectIncludes(injector, 'pm-dev-theme-iframe');
expectIncludes(injector, 'syncStyleElement(document,');
expectIncludes(injector, 'syncStyleElement(parentDoc,');
expectIncludes(injector, 'buildDevThemeCss');
expectIncludes(css, "import { buildSelectedExtraStyleDeclarations } from './devThemeControls';");
expectIncludes(css, 'return buildSelectedExtraStyleDeclarations(background);');
expectIncludes(controls, 'DEV_THEME_CONTROL_SPECS');
expectIncludes(controls, 'getDevThemeControlTraces');
expectIncludes(controls, 'buildSelectedExtraStyleDeclarations');
expectIncludes(controls, "id: 'brightness'");
expectIncludes(controls, "cssProperties: ['filter: brightness(...)']");
expectIncludes(controls, "sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildBlock'");
expectIncludes(controls, "id: 'textColor'");
expectIncludes(controls, "color: ${background.textColor} !important;");

expectIncludes(store, 'setLivePreviewActive(value: boolean)');
expectIncludes(store, 'livePreviewActive: false');
expectIncludes(store, 'this.livePreviewActive = value;');
expectIncludes(injector, 'store.livePreviewActive');
expectIncludes(injector, 'targets: store.livePreviewActive ? livePreviewTargets.value : store.currentTargets');
expectIncludes(injector, 'selectedPaths: store.livePreviewActive ? livePreviewSelectedPaths.value : selectedPaths.value');
expectIncludes(panel, '@pointerdown="store.setLivePreviewActive(true)"');
expectIncludes(panel, '@pointerup="store.setLivePreviewActive(false)"');
expectIncludes(panel, '@pointercancel="store.setLivePreviewActive(false)"');
expectIncludes(panel, '@change="store.setLivePreviewActive(false)"');

expectIncludes(store, 'PresetManagerDevThemeState');
expectIncludes(store, 'currentDraft');
expectIncludes(store, 'currentTargets');
expectIncludes(store, 'saveAsNewPreset');
expectIncludes(store, 'importPreset(name: string, background: DevThemeBackground, targets: Partial<Record<DevThemeTarget, boolean>>)');
expectIncludes(store, 'if (this.selectedElement) nextTargets.selected = true;');
expectIncludes(store, 'this.setEnabled(true);');
expectIncludes(panel, 'store.importPreset(config.name, config.background, config.targets);');
expectNotIncludes(panel, 'store.currentDraft = config.background;');
expectNotIncludes(panel, 'store.currentTargets = config.targets;');
expectIncludes(store, 'overwriteCurrentPreset');
expectIncludes(store, 'setPanelRect');
expectIncludes(store, 'resetPanelRect()');
expectIncludes(store, 'this.panelRect = defaultPanelRect();');
expectNotIncludes(store, 'panelDetached');
expectNotIncludes(store, 'setPanelDetached');

console.info('devThemeIntegration tests passed');
