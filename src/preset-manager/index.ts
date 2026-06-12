import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createScriptIdIframe, teleportStyle } from '@util/script';
import App from './App.vue';
import { CODEX_REFERENCE_METRICS } from './designMetrics';
import { cleanupPresetManagerDragOverlays } from './utils/drag';
import { createAltShiftToggleState, resetAltShiftToggleState, shouldToggleInspectorOnAltShift } from './utils/codeInspectorToggle';
import {
  getInspectorSourceCodeBlock,
  highlightInspectorCodeLabel,
  normalizeInspectorSourcePath,
  parseInspectorSource,
  type InspectorSourceInfo,
} from './utils/codeInspectorSource';
import { getInstanceStorageKey, resolvePresetManagerInstance } from './utils/instanceConfig';

declare const __PRESET_MANAGER_SOURCE_LINES__: Record<string, string[]>;

let $iframe: JQuery<HTMLIFrameElement> | null = null;
let $floatingBtn: JQuery<HTMLDivElement> | null = null;
let app: ReturnType<typeof createApp> | null = null;
let styleCleanup: (() => void) | null = null;
let codeInspectorCleanup: (() => void) | null = null;

const instance = resolvePresetManagerInstance(readScriptName());
const INSTANCE_KEY = instance.key;
const BUTTON_NAME = instance.buttonName;
const BUTTON_LABEL = instance.label;
const BUTTON_ICON_CLASS = instance.iconClass;
const FLOATING_BUTTON_SIZE = 48;
const FLOATING_BUTTON_MARGIN = 8;
const PANEL_Z_INDEX = 2147483000;
const FLOATING_BUTTON_Z_INDEX = 2147483001;
const FLOATING_BUTTON_ROLE = 'floating-button';
const PANEL_ROLE = 'panel';
const DEFAULT_BUTTON_POSITION = instance.defaultPosition;
const CODE_INSPECTOR_STATE_EVENT = 'preset-manager-code-inspector-state';
const CODE_INSPECTOR_SELECT_EVENT = 'preset-manager-code-inspector-select';
const DEV_THEME_STABLE_ID_ATTR = 'data-preset-manager-dev-stable-id';
let devThemeStableIdCounter = 0;

type FloatingButtonPosition = { left: number; top: number };

type InspectorLocateTarget = {
  ip?: string;
  port?: number;
};

type CodeInspectorSelectPayload = {
  path: string;
  selectors: string[];
  label: string;
  tag: string;
  stability: 'source' | 'stable' | 'fallback';
  matchedCount: number;
  rect?: { width: number; height: number };
};

type CodeInspectorControls = {
  isEnabled: () => boolean;
  setEnabled: (enabled: boolean) => boolean;
  toggle: () => boolean;
  onSelect: (listener: (payload: CodeInspectorSelectPayload) => void) => () => void;
  destroy: () => void;
};

type InspectorOverlay = {
  box: HTMLDivElement;
  label: HTMLDivElement;
};

function readScriptName() {
  try {
    return getScriptName();
  } catch {
    return '';
  }
}

function getViewport(parentDoc: Document) {
  return {
    width: parentDoc.documentElement.clientWidth || parentDoc.defaultView?.innerWidth || 0,
    height: parentDoc.documentElement.clientHeight || parentDoc.defaultView?.innerHeight || 0,
  };
}

function clampFloatingButtonPosition(parentDoc: Document, position: FloatingButtonPosition): FloatingButtonPosition {
  const viewport = getViewport(parentDoc);
  const maxLeft = Math.max(FLOATING_BUTTON_MARGIN, viewport.width - FLOATING_BUTTON_SIZE - FLOATING_BUTTON_MARGIN);
  const maxTop = Math.max(FLOATING_BUTTON_MARGIN, viewport.height - FLOATING_BUTTON_SIZE - FLOATING_BUTTON_MARGIN);

  return {
    left: Math.max(FLOATING_BUTTON_MARGIN, Math.min(position.left, maxLeft)),
    top: Math.max(FLOATING_BUTTON_MARGIN, Math.min(position.top, maxTop)),
  };
}

function getDefaultFloatingButtonPosition(parentDoc: Document) {
  const viewport = getViewport(parentDoc);
  return clampFloatingButtonPosition(parentDoc, {
    left: viewport.width - FLOATING_BUTTON_SIZE - DEFAULT_BUTTON_POSITION.right,
    top: viewport.height - FLOATING_BUTTON_SIZE - DEFAULT_BUTTON_POSITION.bottom,
  });
}

function readFloatingButtonPosition(parentDoc: Document) {
  try {
    const raw = localStorage.getItem(getInstanceStorageKey(INSTANCE_KEY, 'FloatingButton'));
    if (!raw) return getDefaultFloatingButtonPosition(parentDoc);
    const saved = JSON.parse(raw) as FloatingButtonPosition;
    if (!Number.isFinite(saved.left) || !Number.isFinite(saved.top)) return getDefaultFloatingButtonPosition(parentDoc);
    return clampFloatingButtonPosition(parentDoc, saved);
  } catch {
    return getDefaultFloatingButtonPosition(parentDoc);
  }
}

function saveFloatingButtonPosition(position: FloatingButtonPosition) {
  localStorage.setItem(getInstanceStorageKey(INSTANCE_KEY, 'FloatingButton'), JSON.stringify(position));
}

function requestCodeInspectorLocate(iframeDoc: Document, sourceInfo: InspectorSourceInfo, target: InspectorLocateTarget = {}) {
  const file = sourceInfo.path;
  if (!file) return;
  const ip = target.ip || 'localhost';
  const port = target.port || 5678;
  const line = sourceInfo.line ?? 1;
  const column = sourceInfo.column ?? 1;

  console.info('[Preset Manager] code inspector locate', { file, line, column, port });
  const img = iframeDoc.createElement('img');
  img.style.display = 'none';
  img.src = `http://${ip}:${port}/?file=${encodeURIComponent(file)}&line=${line}&column=${column}`;
  iframeDoc.body.appendChild(img);
  window.setTimeout(() => img.remove(), 3000);
}

function dispatchPresetManagerEvent<T>(iframeDoc: Document, parentDoc: Document, eventName: string, detail: T) {
  const targets: Array<Document | Window | null | undefined> = [
    iframeDoc,
    iframeDoc.defaultView,
    parentDoc,
    parentDoc.defaultView,
  ];
  const dispatched = new Set<Document | Window>();

  for (const target of targets) {
    if (!target || dispatched.has(target)) continue;
    dispatched.add(target);
    const EventCtor = target instanceof Document
      ? target.defaultView?.CustomEvent ?? CustomEvent
      : iframeDoc.defaultView?.CustomEvent ?? CustomEvent;
    target.dispatchEvent(new EventCtor(eventName, { detail }));
  }
}

function dispatchCodeInspectorState(iframeDoc: Document, parentDoc: Document, enabled: boolean) {
  dispatchPresetManagerEvent(iframeDoc, parentDoc, CODE_INSPECTOR_STATE_EVENT, { enabled });
}

function dispatchCodeInspectorSelect(iframeDoc: Document, parentDoc: Document, payload: {
  path: string;
  selectors: string[];
  label: string;
  tag: string;
  stability: 'source' | 'stable' | 'fallback';
  matchedCount: number;
}) {
  dispatchPresetManagerEvent(iframeDoc, parentDoc, CODE_INSPECTOR_SELECT_EVENT, payload);
}

function buildSelectedElementPath(target: HTMLElement, sourceInfo: InspectorSourceInfo) {
  return buildInspectorSourcePathKey(sourceInfo) || `__selected_element__:${target.tagName.toLowerCase()}`;
}

function escapeAttributeValue(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function escapeCssIdentifier(value: string) {
  const css = window.CSS as (typeof CSS | undefined);
  if (css?.escape) return css.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, character => `\\${character}`);
}

function buildInspectorSourceSelectorList(path: string) {
  if (!path) return [];
  const escaped = escapeAttributeValue(path);
  const escapedWithColon = escapeAttributeValue(`${path}:`);
  return [
    `[data-insp-path="${escaped}"]`,
    `[data-insp-path^="${escapedWithColon}"]`,
    `[data-v-inspector="${escaped}"]`,
    `[data-v-inspector^="${escapedWithColon}"]`,
    `[data-preset-manager-selected-source="${escaped}"]`,
  ];
}

function buildInspectorSourceSelectors(path: string) {
  return buildInspectorSourceSelectorList(path).join(',');
}

function ensureStableElementId(target: HTMLElement) {
  const existing = target.getAttribute(DEV_THEME_STABLE_ID_ATTR);
  if (existing) return existing;
  devThemeStableIdCounter += 1;
  const next = `pm-stable-${Date.now().toString(36)}-${devThemeStableIdCounter.toString(36)}`;
  target.setAttribute(DEV_THEME_STABLE_ID_ATTR, next);
  return next;
}

function buildElementSegment(element: HTMLElement) {
  const tag = element.tagName.toLowerCase();
  const classes = Array.from(element.classList)
    .filter(className => className && !className.startsWith('pm-inspector-'))
    .slice(0, 3)
    .map(className => `.${escapeCssIdentifier(className)}`)
    .join('');
  const siblings = element.parentElement
    ? Array.from(element.parentElement.children).filter(child => child.tagName === element.tagName)
    : [];
  const nth = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(element) + 1})` : '';
  return `${tag}${classes}${nth}`;
}

function buildDomPathSelector(target: HTMLElement) {
  const parts: string[] = [];
  let current: HTMLElement | null = target;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (current.id) {
      parts.unshift(`#${escapeCssIdentifier(current.id)}`);
      break;
    }
    parts.unshift(buildElementSegment(current));
    if (current.matches('.app-root, .left-sidebar, .preset-workspace, .preset-panel, .dev-theme-panel, .ai-assistant')) {
      break;
    }
    current = current.parentElement;
  }
  return parts.length ? parts.join(' > ') : '';
}

function buildSelectedElementSelectors(target: HTMLElement, path: string, sourceInfo: InspectorSourceInfo) {
  const selectors = new Set<string>();
  if (sourceInfo.path) {
    buildInspectorSourceSelectorList(path).forEach(selector => selectors.add(selector));
  }

  const stableId = ensureStableElementId(target);
  selectors.add(`[${DEV_THEME_STABLE_ID_ATTR}="${escapeAttributeValue(stableId)}"]`);

  if (target.id) selectors.add(`#${escapeCssIdentifier(target.id)}`);
  const domPathSelector = buildDomPathSelector(target);
  if (domPathSelector) selectors.add(domPathSelector);
  return Array.from(selectors);
}

function inferSelectedElementStability(sourceInfo: InspectorSourceInfo, selectors: string[]): CodeInspectorSelectPayload['stability'] {
  if (sourceInfo.path) return 'source';
  return selectors.some(selector => !selector.includes(DEV_THEME_STABLE_ID_ATTR)) ? 'stable' : 'fallback';
}

function clearDevThemeSelectionMarks(iframeDoc: Document) {
  iframeDoc.querySelectorAll('[data-preset-manager-selected-source], [data-preset-manager-dev-selected]').forEach(element => {
    element.removeAttribute('data-preset-manager-selected-source');
    element.removeAttribute('data-preset-manager-dev-selected');
  });
}

function countSelectedMatches(iframeDoc: Document, path: string) {
  if (!path) return 0;
  try {
    return iframeDoc.querySelectorAll(buildInspectorSourceSelectors(path)).length;
  } catch {
    return 0;
  }
}

function countSelectorMatches(iframeDoc: Document, selectors: string[]) {
  if (!selectors.length) return 0;
  try {
    return iframeDoc.querySelectorAll(selectors.join(',')).length;
  } catch {
    return 0;
  }
}

function markSelectedMatches(iframeDoc: Document, path: string) {
  clearDevThemeSelectionMarks(iframeDoc);
  if (!path) return 0;
  try {
    const matches = Array.from(iframeDoc.querySelectorAll(buildInspectorSourceSelectors(path))) as HTMLElement[];
    matches.forEach(element => {
      element.setAttribute('data-preset-manager-selected-source', path);
      element.setAttribute('data-preset-manager-dev-selected', 'true');
    });
    return matches.length;
  } catch {
    return 0;
  }
}

function markSelectedTarget(iframeDoc: Document, target: HTMLElement, path: string, sourceInfo: InspectorSourceInfo) {
  let markedCount = 0;
  if (sourceInfo.path) {
    markedCount = markSelectedMatches(iframeDoc, path);
  } else {
    clearDevThemeSelectionMarks(iframeDoc);
  }
  if (!path) return markedCount;
  if (!target.matches('[data-preset-manager-selected-source]')) {
    target.setAttribute('data-preset-manager-selected-source', path);
  }
  target.setAttribute('data-preset-manager-dev-selected', 'true');
  return Math.max(markedCount, 1);
}

function buildInspectorSourcePathKey(sourceInfo: InspectorSourceInfo) {
  if (!sourceInfo.path) return '';
  const line = sourceInfo.line ?? 1;
  const column = sourceInfo.column ?? 1;
  return `${sourceInfo.path}:${line}:${column}`;
}

function showCodeInspectorStateToast(enabled: boolean) {
  const message = enabled ? '开发者检查器已开启，移动鼠标查看代码，点击元素定位到 VS Code' : '开发者检查器已关闭';
  toastr.info(message, '', { timeOut: 1400 });
}

function cleanupCodeInspectorArtifacts(doc: Document | null | undefined) {
  doc?.querySelectorAll('code-inspector-component').forEach(element => element.remove());
  doc?.getElementById('code-inspector-notification-styles')?.remove();
  if (!doc?.head || doc.querySelector('[data-preset-manager-code-inspector-cleanup]')) return;
  const style = doc.createElement('style');
  style.setAttribute('data-preset-manager-code-inspector-cleanup', 'true');
  style.textContent = `
    code-inspector-component,
    .inspector-switch,
    #inspector-node-tree,
    .code-inspector-notification {
      display: none !important;
      pointer-events: none !important;
    }
    [data-preset-manager-inspector-overlay="label"] .pm-inspector-code-line {
      min-height: 18px;
    }
    [data-preset-manager-inspector-overlay="label"] .pm-inspector-line-number {
      color: #6e7681;
      display: inline-block;
      min-width: 46px;
      user-select: none;
    }
    [data-preset-manager-inspector-overlay="label"] .pm-inspector-line-number-current {
      color: #79c0ff;
      font-weight: 600;
    }
    [data-preset-manager-inspector-overlay="label"] .pm-inspector-token-tag {
      color: #7ee787;
    }
    [data-preset-manager-inspector-overlay="label"] .pm-inspector-token-attr {
      color: #79c0ff;
    }
    [data-preset-manager-inspector-overlay="label"] .pm-inspector-token-string {
      color: #a5d6ff;
    }
    [data-preset-manager-inspector-overlay="label"] .pm-inspector-token-expression {
      color: #d2a8ff;
    }
    [data-preset-manager-inspector-overlay="label"] .pm-inspector-token-comment {
      color: #8b949e;
    }
    [data-preset-manager-inspector-overlay="label"] .pm-inspector-source-path {
      color: #ffa657;
    }
  `;
  doc.head.appendChild(style);
}

function createInspectorOverlay(iframeDoc: Document): InspectorOverlay {
  const box = iframeDoc.createElement('div');
  box.setAttribute('data-preset-manager-inspector-overlay', 'box');
  Object.assign(box.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '0',
    height: '0',
    border: '1px solid rgba(93, 188, 255, 0.56)',
    borderRadius: '6px',
    background: 'rgba(93, 188, 255, 0.025)',
    boxShadow: '0 0 0 1px rgba(93, 188, 255, 0.12), inset 0 0 0 1px rgba(255,255,255,0.06)',
    pointerEvents: 'none',
    zIndex: '2147483646',
    display: 'none',
    overflow: 'visible',
    transition: 'transform 80ms ease, width 80ms ease, height 80ms ease',
  } satisfies Partial<CSSStyleDeclaration>);

  const label = iframeDoc.createElement('div');
  label.setAttribute('data-preset-manager-inspector-overlay', 'label');
  Object.assign(label.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    maxWidth: 'min(1100px, calc(100vw - 16px))',
    maxHeight: 'min(360px, calc(100vh - 24px))',
    padding: '8px 10px',
    border: '1px solid rgba(117, 196, 255, 0.38)',
    borderRadius: '7px',
    background: 'rgba(8, 12, 18, 0.9)',
    color: '#f7f7f7',
    backdropFilter: 'blur(18px)',
    boxShadow: '0 18px 46px rgba(0,0,0,0.32)',
    font: '12px/1.5 ui-monospace, SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace',
    pointerEvents: 'none',
    zIndex: '2147483647',
    display: 'block',
    whiteSpace: 'pre-wrap',
    overflow: 'hidden auto',
    textOverflow: 'clip',
    tabSize: '2',
  } satisfies Partial<CSSStyleDeclaration>);

  const overlay = { box, label };
  iframeDoc.body.append(overlay.box, overlay.label);
  return overlay;
}

function removeInspectorOverlay(overlay: InspectorOverlay | null) {
  overlay?.box.remove();
  overlay?.label.remove();
}

function hideInspectorOverlay(overlay: InspectorOverlay | null) {
  if (!overlay) return;
  overlay.box.style.display = 'none';
  overlay.label.style.display = 'none';
}

function isInspectorOverlayElement(element: Element | null) {
  return Boolean(element?.closest('[data-preset-manager-inspector-overlay], code-inspector-component'));
}

function findInspectableElement(iframeDoc: Document, event: MouseEvent) {
  let element = iframeDoc.elementFromPoint(event.clientX, event.clientY);
  while (element && isInspectorOverlayElement(element)) {
    element = element.parentElement;
  }
  if (!element || element === iframeDoc.documentElement || element === iframeDoc.body) return null;
  return element as HTMLElement;
}

function resolveInspectorSourceHint(element: HTMLElement, hasSourceMarker = false) {
  const sourceInfo = getInspectorSourceInfo(element);
  if (sourceInfo.path) {
    return hasSourceMarker ? '已识别源码定位标记，暂无源码行预览' : '当前元素没有源码定位标记';
  }

  const sourceHints: Array<[string, string]> = [
    ['.title-bar,.title-actions,.title-btn,.preset-title-wrap', '标题栏区域（当前元素没有源码行预览）'],
    ['.main-body,.preset-workspace,.preset-panels,.center-area', '主工作区（当前元素没有源码行预览）'],
    ['.left-sidebar,.sidebar-section,.favorite,.favorites', '左侧栏区域（当前元素没有源码行预览）'],
    ['.preset-panel,.prompt-list,.prompt-row,.prompt-item,.prompt-name', '预设条目区域（当前元素没有源码行预览）'],
    ['.ai-assistant,.ai-chat,.ai-input,.ai-dock', 'AI 助手区域（当前元素没有源码行预览）'],
    ['.annotation-toolbar,.annotation-overlay', '批注工具区域（当前元素没有源码行预览）'],
    ['.dev-theme-panel,.dev-theme', '开发者主题面板（当前元素没有源码行预览）'],
    ['.history-panel,.history', '历史备份区域（当前元素没有源码行预览）'],
  ];
  for (const [selector, hint] of sourceHints) {
    if (element.closest(selector)) return hint;
  }
  return '当前元素没有源码定位标记';
}

function getInspectorSourcePreviewFromElementSignature(element: HTMLElement): { code: string; sourceInfo: InspectorSourceInfo } | undefined {
  const classNames = Array.from(element.classList);
  const classMatches = classNames.filter(className => className.length >= 3);
  const idMatch = element.id ? `id="${element.id}"` : undefined;

  for (const [path, lines] of Object.entries(__PRESET_MANAGER_SOURCE_LINES__ ?? {})) {
    for (const [index, line] of lines.entries()) {
      if (!line.includes(`<${element.tagName.toLowerCase()}`)) continue;
      if (idMatch && !line.includes(idMatch)) continue;
      if (classMatches.length && !classMatches.every(className => line.includes(className))) continue;
      if (!idMatch && !classMatches.length) continue;
      return {
        code: line.trim(),
        sourceInfo: {
          path,
          line: index + 1,
          column: Math.max(1, line.indexOf(`<${element.tagName.toLowerCase()}`) + 1),
        },
      };
    }
  }

  return undefined;
}

function getInspectorSourceCodePreviewFromElement(element: HTMLElement) {
  return getInspectorSourcePreviewFromElementSignature(element)?.code;
}

function isUsefulInspectorCodePreview(code: string | undefined) {
  if (!code) return false;
  return !code.startsWith('</') && !code.endsWith('/>');
}

function getInspectorSourceInfo(element: HTMLElement): InspectorSourceInfo {
  const sourceElement = element.closest('[data-insp-path], [data-v-inspector]') as HTMLElement | null;
  const sourceInfo = parseInspectorSource(
    sourceElement?.getAttribute('data-insp-path')
    || sourceElement?.getAttribute('data-v-inspector')
    || null,
  );
  return sourceInfo.path ? sourceInfo : findInspectorSourceFromElementSignature(element);
}

function findInspectorSourceFromElementSignature(element: HTMLElement): InspectorSourceInfo {
  return getInspectorSourcePreviewFromElementSignature(element)?.sourceInfo ?? {};
}

function getInspectorElementLabel(element: HTMLElement) {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const className = Array.from(element.classList).slice(0, 3).map(name => `.${name}`).join('');
  const sourceInfo = getInspectorSourceInfo(element);
  const directCodePreview = getInspectorSourceCodeBlock(
    __PRESET_MANAGER_SOURCE_LINES__,
    sourceInfo,
    { before: 1, after: 4, includeLineNumbers: true },
  );
  const elementCodePreview = getInspectorSourceCodePreviewFromElement(element);
  const codePreview = isUsefulInspectorCodePreview(directCodePreview)
    ? directCodePreview
    : elementCodePreview ?? directCodePreview;
  if (codePreview) {
    const shortPath = sourceInfo.path ? normalizeInspectorSourcePath(sourceInfo.path) : '';
    const locationLine = sourceInfo.path ? `${shortPath}:${sourceInfo.line ?? 1}:${sourceInfo.column ?? 1}` : `${tag}${id}${className}`;
    return `${codePreview}\n\n${locationLine}`;
  }
  const labelContent = codePreview ?? resolveInspectorSourceHint(element, Boolean(sourceInfo.path));
  return `${tag}${id}${className}\n${labelContent}`;
}

function updateInspectorOverlay(iframeDoc: Document, overlay: InspectorOverlay, target: HTMLElement) {
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  Object.assign(overlay.box.style, {
    display: 'block',
    transform: `translate(${Math.round(rect.left)}px, ${Math.round(rect.top)}px)`,
    width: `${Math.round(rect.width)}px`,
    height: `${Math.round(rect.height)}px`,
  } satisfies Partial<CSSStyleDeclaration>);

  const iframeWidth = iframeDoc.defaultView?.innerWidth ?? window.innerWidth;
  const iframeHeight = iframeDoc.defaultView?.innerHeight ?? window.innerHeight;
  const labelLeft = Math.min(Math.max(6, rect.left), Math.max(6, iframeWidth - 1108));
  const labelTop = rect.top > 180 ? rect.top - 172 : Math.min(rect.bottom + 6, Math.max(6, iframeHeight - 172));
  Object.assign(overlay.label.style, {
    display: 'block',
    top: `${Math.round(labelTop)}px`,
    left: `${Math.round(labelLeft)}px`,
    transform: 'translate(0, 0)',
  } satisfies Partial<CSSStyleDeclaration>);
  overlay.label.innerHTML = highlightInspectorCodeLabel(getInspectorElementLabel(target));
}

function bindCodeInspectorControls(iframeDoc: Document, parentDoc: Document): CodeInspectorControls {
  if (process.env.NODE_ENV !== 'development') {
    return {
      isEnabled: () => false,
      setEnabled: () => false,
      toggle: () => false,
      onSelect: () => () => {},
      destroy: () => {},
    };
  }

  let enabled = false;
  let overlay: InspectorOverlay | null = null;
  let removeInspectorListeners: (() => void) | null = null;
  const selectListeners = new Set<(payload: CodeInspectorSelectPayload) => void>();
  const state = createAltShiftToggleState();

  const dispatchSelectFor = (target: HTMLElement) => {
    const sourceInfo = getInspectorSourceInfo(target);
    const pathKey = buildSelectedElementPath(target, sourceInfo);
    const selectors = buildSelectedElementSelectors(target, pathKey, sourceInfo);
    const markedCount = markSelectedTarget(iframeDoc, target, pathKey, sourceInfo);
    const matchedCount = markedCount || countSelectorMatches(iframeDoc, selectors) || countSelectedMatches(iframeDoc, pathKey) || 1;
    const shortPath = sourceInfo.path ? normalizeInspectorSourcePath(sourceInfo.path) : target.tagName.toLowerCase();
    const rect = target.getBoundingClientRect();
    const payload: CodeInspectorSelectPayload = {
      path: pathKey,
      selectors: buildSelectedElementSelectors(target, pathKey, sourceInfo),
      label: sourceInfo.path ? `${shortPath}:${sourceInfo.line ?? 1}` : `${shortPath}（仅样式选中，暂无源码定位）`,
      tag: target.tagName.toLowerCase(),
      stability: sourceInfo.path ? 'source' : inferSelectedElementStability(sourceInfo, selectors),
      matchedCount,
      rect: { width: Math.round(rect.width), height: Math.round(rect.height) },
    };
    dispatchCodeInspectorSelect(iframeDoc, parentDoc, payload);
    selectListeners.forEach(listener => listener(payload));
  };

  const mountInspector = () => {
    cleanupCodeInspectorArtifacts(iframeDoc);

    overlay = overlay ?? createInspectorOverlay(iframeDoc);

    const onMouseMove = (event: MouseEvent) => {
      if (!enabled) return;
      const target = findInspectableElement(iframeDoc, event);
      if (!target) {
        hideInspectorOverlay(overlay);
        return;
      }
      if (overlay) updateInspectorOverlay(iframeDoc, overlay, target);
    };
    const onMouseLeave = () => hideInspectorOverlay(overlay);
    const onClick = (event: MouseEvent) => {
      if (!enabled) return;
      const target = findInspectableElement(iframeDoc, event);
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const sourceInfo = getInspectorSourceInfo(target);
      if (!sourceInfo.path) {
        dispatchSelectFor(target);
        toastr.warning('这个元素已选中，可调样式；但暂时没有源码定位。', '', { timeOut: 1800 });
        return;
      }
      requestCodeInspectorLocate(iframeDoc, sourceInfo);
      dispatchSelectFor(target);
    };

    iframeDoc.addEventListener('mousemove', onMouseMove, true);
    iframeDoc.addEventListener('mouseleave', onMouseLeave, true);
    iframeDoc.addEventListener('click', onClick, true);
    iframeDoc.defaultView?.addEventListener('click', onClick, true);
    removeInspectorListeners = () => {
      iframeDoc.removeEventListener('mousemove', onMouseMove, true);
      iframeDoc.removeEventListener('mouseleave', onMouseLeave, true);
      iframeDoc.removeEventListener('click', onClick, true);
      iframeDoc.defaultView?.removeEventListener('click', onClick, true);
    };
  };

  const unmountInspector = () => {
    removeInspectorListeners?.();
    removeInspectorListeners = null;
    cleanupCodeInspectorArtifacts(iframeDoc);
    removeInspectorOverlay(overlay);
    overlay = null;
  };

  const setEnabled = (nextEnabled: boolean) => {
    if (enabled === nextEnabled) return enabled;
    enabled = nextEnabled;
    if (enabled) {
      mountInspector();
    } else {
      unmountInspector();
    }
    dispatchCodeInspectorState(iframeDoc, parentDoc, enabled);
    return enabled;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!shouldToggleInspectorOnAltShift(event, state)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    showCodeInspectorStateToast(setEnabled(!enabled));
  };
  const onKeyUp = (event: KeyboardEvent) => resetAltShiftToggleState(event, state);
  const onWindowBlur = () => resetAltShiftToggleState({ altKey: false, shiftKey: false }, state);
  iframeDoc.addEventListener('keydown', onKeyDown, true);
  iframeDoc.addEventListener('keyup', onKeyUp, true);
  iframeDoc.defaultView?.addEventListener('keydown', onKeyDown, true);
  iframeDoc.defaultView?.addEventListener('keyup', onKeyUp, true);
  iframeDoc.defaultView?.addEventListener('blur', onWindowBlur, true);
  parentDoc.addEventListener('keydown', onKeyDown, true);
  parentDoc.addEventListener('keyup', onKeyUp, true);
  parentDoc.defaultView?.addEventListener('keydown', onKeyDown, true);
  parentDoc.defaultView?.addEventListener('keyup', onKeyUp, true);
  parentDoc.defaultView?.addEventListener('blur', onWindowBlur, true);

  const destroy = () => {
    setEnabled(false);
    iframeDoc.removeEventListener('keydown', onKeyDown, true);
    iframeDoc.removeEventListener('keyup', onKeyUp, true);
    iframeDoc.defaultView?.removeEventListener('keydown', onKeyDown, true);
    iframeDoc.defaultView?.removeEventListener('keyup', onKeyUp, true);
    iframeDoc.defaultView?.removeEventListener('blur', onWindowBlur, true);
    parentDoc.removeEventListener('keydown', onKeyDown, true);
    parentDoc.removeEventListener('keyup', onKeyUp, true);
    parentDoc.defaultView?.removeEventListener('keydown', onKeyDown, true);
    parentDoc.defaultView?.removeEventListener('keyup', onKeyUp, true);
    parentDoc.defaultView?.removeEventListener('blur', onWindowBlur, true);
    $(window).off('pagehide', destroy);
  };

  $(window).on('pagehide', destroy);
  dispatchCodeInspectorState(iframeDoc, parentDoc, enabled);

  return {
    isEnabled: () => enabled,
    setEnabled,
    toggle: () => setEnabled(!enabled),
    onSelect: listener => {
      selectListeners.add(listener);
      return () => selectListeners.delete(listener);
    },
    destroy,
  };
}

function cleanupPanelApp() {
  codeInspectorCleanup?.();
  codeInspectorCleanup = null;
  try {
    app?.unmount();
  } catch (error) {
    console.warn('[Preset Manager] panel app unmount failed:', error);
  }
  app = null;
  styleCleanup?.();
  styleCleanup = null;
}

function mountPanelApp(iframe: HTMLIFrameElement) {
  if (app && hasMountedPanelContent(iframe)) {
    iframe.style.pointerEvents = 'auto';
    return;
  }
  if (app && !hasMountedPanelContent(iframe)) {
    cleanupPanelApp();
  }

  const iframeDoc = iframe.contentDocument;
  if (!iframeDoc?.head || !iframeDoc.body) return;

  cleanupCodeInspectorArtifacts(iframeDoc);
  iframe.style.pointerEvents = 'none';
  iframeDoc.body.replaceChildren();

  const mountEl = iframeDoc.createElement('div');
  mountEl.id = 'app';
  iframeDoc.body.appendChild(mountEl);

  try {
    const { destroy } = teleportStyle(iframeDoc.head);
    styleCleanup = destroy;
    const codeInspectorControls = bindCodeInspectorControls(iframeDoc, window.parent.document);
    codeInspectorCleanup = codeInspectorControls.destroy;

    const nextApp = createApp(App).use(createPinia());
    nextApp.provide('parentDocument', window.parent.document);
    nextApp.provide('iframeElement', iframe);
    nextApp.provide('presetManagerInstanceKey', INSTANCE_KEY);
    nextApp.provide('presetManagerInstanceLabel', BUTTON_LABEL);
    nextApp.provide('presetManagerCodeInspector', codeInspectorControls);
    nextApp.mount(mountEl);
    if (!hasMountedPanelContent(iframe)) {
      throw new Error('panel mounted without app root');
    }
    app = nextApp;
    iframe.style.pointerEvents = 'auto';

    console.info('[Preset Manager] panel mounted', {
      instance: INSTANCE_KEY,
      label: BUTTON_LABEL,
      scriptId: getScriptId(),
    });
  } catch (error) {
    cleanupPanelApp();
    $iframe?.remove();
    $iframe = null;
    console.error('[Preset Manager] panel mount failed:', error);
    toastr.error('预设管理器打开失败，请查看浏览器控制台错误', '', { timeOut: 5000 });
  }
}

function cleanupPresetManagerInstanceElements(parentDoc: Document) {
  const legacySelector = `[data-preset-manager-instance="${INSTANCE_KEY}"]:not([data-preset-manager-role])`;
  const instanceSelectors = [
    `[data-preset-manager-instance="${INSTANCE_KEY}"][data-preset-manager-role="${FLOATING_BUTTON_ROLE}"]`,
    `[data-preset-manager-instance="${INSTANCE_KEY}"][data-preset-manager-role="${PANEL_ROLE}"]`,
    legacySelector,
  ];
  instanceSelectors.forEach(selector => parentDoc.querySelectorAll(selector).forEach(element => element.remove()));
}

function hasMountedPanelContent(iframe: HTMLIFrameElement) {
  return Boolean(iframe.contentDocument?.querySelector('#app .app-root'));
}

function isPanelInteractable(iframe: HTMLIFrameElement, parentDoc: Document) {
  const style = parentDoc.defaultView?.getComputedStyle(iframe);
  const rect = iframe.getBoundingClientRect();
  const viewport = getViewport(parentDoc);

  if (!style || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
  if (rect.width < 80 || rect.height < 80) return false;
  if (rect.right <= 0 || rect.bottom <= 0) return false;
  if (rect.left >= viewport.width || rect.top >= viewport.height) return false;
  return true;
}

function resetPanelPosition(iframe: HTMLIFrameElement) {
  Object.assign(iframe.style, {
    top: '50%',
    left: '50%',
    right: '',
    bottom: '',
    transform: 'translate(-50%, -50%)',
    width: `${CODEX_REFERENCE_METRICS.window.width}px`,
    height: `${CODEX_REFERENCE_METRICS.window.height}px`,
    maxWidth: 'none',
    maxHeight: 'none',
    display: 'block',
    visibility: 'visible',
    opacity: '1',
    pointerEvents: hasMountedPanelContent(iframe) ? 'auto' : 'none',
  });
}

function showExistingPanel(iframe: HTMLIFrameElement, reason: string) {
  resetPanelPosition(iframe);
  console.info('[Preset Manager] panel shown', {
    instance: INSTANCE_KEY,
    label: BUTTON_LABEL,
    scriptId: getScriptId(),
    reason,
    rect: iframe.getBoundingClientRect(),
  });
}

function schedulePanelMount(iframe: HTMLIFrameElement, delay = 0) {
  window.setTimeout(() => {
    if (!$iframe || $iframe[0] !== iframe || !iframe.isConnected) return;
    if (hasMountedPanelContent(iframe)) {
      iframe.style.pointerEvents = 'auto';
      return;
    }
    mountPanelApp(iframe);
  }, delay);
}

function createFloatingButton() {
  const parentDoc = window.parent.document;
  const initialPosition = readFloatingButtonPosition(parentDoc);
  const $btn = $<HTMLDivElement>('<div>')
    .attr('script_id', getScriptId())
    .attr('data-preset-manager-instance', INSTANCE_KEY)
    .attr('data-preset-manager-role', FLOATING_BUTTON_ROLE)
    .attr('title', BUTTON_LABEL)
    .css({
      position: 'fixed',
      top: `${initialPosition.top}px`,
      left: `${initialPosition.left}px`,
      width: `${FLOATING_BUTTON_SIZE}px`,
      height: `${FLOATING_BUTTON_SIZE}px`,
      borderRadius: '50%',
      background: '#0a0a0a',
      color: '#f7f7f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      zIndex: FLOATING_BUTTON_Z_INDEX,
      border: '1px solid rgba(255,255,255,0.16)',
      boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
      fontSize: '18px',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
      touchAction: 'none',
      userSelect: 'none',
    })
    .html(`<i class="fas ${BUTTON_ICON_CLASS}"></i>`)
    .on('mouseenter', function () {
      $(this).css({ transform: 'scale(1.06)', boxShadow: '0 18px 46px rgba(0,0,0,0.42)', background: '#161616' });
    })
    .on('mouseleave', function () {
      $(this).css({ transform: 'scale(1)', boxShadow: '0 14px 40px rgba(0,0,0,0.35)', background: '#0a0a0a' });
    })
    .appendTo(window.parent.document.body);

  console.info('[Preset Manager] floating button mounted', {
    instance: INSTANCE_KEY,
    label: BUTTON_LABEL,
    scriptId: getScriptId(),
    position: initialPosition,
  });

  let pointerDragging = false;
  let dragStartPos = { x: 0, y: 0 };
  let btnStartPos = { x: 0, y: 0 };
  let suppressClickUntil = 0;

  const openFromFloatingButton = (reason: string) => {
    console.info('[Preset Manager] floating button click', {
      instance: INSTANCE_KEY,
      label: BUTTON_LABEL,
      scriptId: getScriptId(),
      reason,
    });
    openPanel(reason);
  };

  $btn.on('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (Date.now() < suppressClickUntil) return;
    openFromFloatingButton('floating-button-click');
  });

  $btn.on('pointerdown', (event: JQuery.Event) => {
    const evt = (event as any).originalEvent as PointerEvent;
    if (evt.pointerType === 'mouse' && evt.button !== 0) return;

    evt.preventDefault();
    evt.stopPropagation();
    const pointerId = evt.pointerId;
    dragStartPos = { x: evt.clientX, y: evt.clientY };
    const rect = $btn[0].getBoundingClientRect();
    btnStartPos = { x: rect.left, y: rect.top };
    pointerDragging = false;

    $btn[0].setPointerCapture?.(pointerId);
    parentDoc.body.style.userSelect = 'none';
    parentDoc.body.style.cursor = 'move';

    const cleanupPointerDrag = () => {
      $btn[0].removeEventListener('pointermove', onPointerMove, true);
      $btn[0].removeEventListener('pointerup', finishPointerDrag, true);
      $btn[0].removeEventListener('pointercancel', finishPointerDrag, true);
      parentDoc.removeEventListener('pointermove', onPointerMove, true);
      parentDoc.removeEventListener('pointerup', finishPointerDrag, true);
      parentDoc.removeEventListener('pointercancel', finishPointerDrag, true);
      parentDoc.defaultView?.removeEventListener('blur', cancelPointerDrag, true);
      $btn[0].releasePointerCapture?.(pointerId);
      $btn.css({ transition: 'transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease' });
      parentDoc.body.style.userSelect = '';
      parentDoc.body.style.cursor = '';
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      moveEvent.stopPropagation();

      const dx = moveEvent.clientX - dragStartPos.x;
      const dy = moveEvent.clientY - dragStartPos.y;
      if (!pointerDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        pointerDragging = true;
        $btn.css({ transition: 'none' });
      }
      if (!pointerDragging) return;

      const nextPosition = clampFloatingButtonPosition(parentDoc, {
        left: btnStartPos.x + dx,
        top: btnStartPos.y + dy,
      });
      $btn.css({ left: `${nextPosition.left}px`, top: `${nextPosition.top}px`, right: 'auto', bottom: 'auto' });
    };

    const finishPointerDrag = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      upEvent.preventDefault();
      upEvent.stopPropagation();
      cleanupPointerDrag();

      if (!pointerDragging) {
        suppressClickUntil = Date.now() + 500;
        openFromFloatingButton('floating-button-pointerup');
        return;
      }

      const nextRect = $btn[0].getBoundingClientRect();
      saveFloatingButtonPosition(clampFloatingButtonPosition(parentDoc, { left: nextRect.left, top: nextRect.top }));
      suppressClickUntil = Date.now() + 500;
      pointerDragging = false;
    };

    const cancelPointerDrag = () => {
      cleanupPointerDrag();
      pointerDragging = false;
    };

    $btn[0].addEventListener('pointermove', onPointerMove, true);
    $btn[0].addEventListener('pointerup', finishPointerDrag, true);
    $btn[0].addEventListener('pointercancel', finishPointerDrag, true);
    parentDoc.addEventListener('pointermove', onPointerMove, true);
    parentDoc.addEventListener('pointerup', finishPointerDrag, true);
    parentDoc.addEventListener('pointercancel', finishPointerDrag, true);
    parentDoc.defaultView?.addEventListener('blur', cancelPointerDrag, true);
  });

  return $btn;
}

function openPanel(reason = 'open-panel') {
  const parentDoc = window.parent.document;
  if ($iframe) {
    const iframeElement = $iframe[0];

    showExistingPanel(
      iframeElement,
      isPanelInteractable(iframeElement, parentDoc) && hasMountedPanelContent(iframeElement)
        ? reason
        : 'recover-existing-panel',
    );
    schedulePanelMount(iframeElement);
    return;
  }

  $iframe = createScriptIdIframe()
    .attr('data-preset-manager-instance', INSTANCE_KEY)
    .attr('data-preset-manager-role', PANEL_ROLE)
    .css({
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${CODEX_REFERENCE_METRICS.window.width}px`,
      height: `${CODEX_REFERENCE_METRICS.window.height}px`,
      maxWidth: 'none',
      maxHeight: 'none',
      border: 'none',
      borderRadius: '12px',
      boxShadow: 'none',
      zIndex: PANEL_Z_INDEX,
      background: 'transparent',
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      pointerEvents: 'none',
    })
    .on('load', function () {
      schedulePanelMount(this);
    });

  const iframeElement = $iframe[0];
  $iframe.appendTo(window.parent.document.body);
  console.info('[Preset Manager] panel iframe created', {
    instance: INSTANCE_KEY,
    label: BUTTON_LABEL,
    scriptId: getScriptId(),
    rect: iframeElement.getBoundingClientRect(),
  });
  schedulePanelMount(iframeElement, 80);
  schedulePanelMount(iframeElement, 300);
}

function togglePanel() {
  const parentDoc = window.parent.document;
  if (!$iframe) {
    openPanel('script-button');
    return;
  }

  const iframeElement = $iframe[0];
  if (isPanelInteractable(iframeElement, parentDoc) && hasMountedPanelContent(iframeElement)) {
    $iframe.hide();
    console.info('[Preset Manager] panel hidden', {
      instance: INSTANCE_KEY,
      label: BUTTON_LABEL,
      scriptId: getScriptId(),
      reason: 'hidden-by-toggle',
    });
    return;
  }

  showExistingPanel(iframeElement, 'recover-existing-panel');
  schedulePanelMount(iframeElement);
}

function registerScriptButton() {
  try {
    updateScriptButtonsWith(buttons => {
      const nextButtons = INSTANCE_KEY === 'default' ? buttons : buttons.filter(button => button.name !== '预设管理器');
      if (nextButtons.some(button => button.name === BUTTON_NAME)) return nextButtons;
      return [...nextButtons, { name: BUTTON_NAME, visible: true }];
    });
    eventOn(getButtonEvent(BUTTON_NAME), () => togglePanel());
  } catch (error) {
    console.warn('[Preset Manager] script button registration failed:', error);
  }
}

$(() => {
  console.info('[Preset Manager] loaded', {
    instance: INSTANCE_KEY,
    label: BUTTON_LABEL,
    buttonName: BUTTON_NAME,
    scriptId: getScriptId(),
    scriptName: readScriptName(),
  });

  cleanupCodeInspectorArtifacts(window.document);
  cleanupCodeInspectorArtifacts(window.parent.document);
  cleanupPresetManagerDragOverlays(window.parent.document);
  cleanupPresetManagerInstanceElements(window.parent.document);

  $floatingBtn = createFloatingButton();
  registerScriptButton();

  $(window).on('pagehide', () => {
    cleanupPanelApp();
    $iframe?.remove();
    $floatingBtn?.remove();
  });
});
