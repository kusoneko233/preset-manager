<template>
  <div
    class="app-root"
    :class="[
      `theme-${theme}`,
      { fullscreen: isFullscreen, 'hide-prompt-preview': promptPreviewLines === 0, 'left-collapsed': leftCollapsed },
    ]"
    :style="uiVars"
    :data-dev-sidebar="devTheme.enabled && devTheme.currentTargets.sidebar ? 'on' : undefined"
    :data-dev-workspace="devTheme.enabled && devTheme.currentTargets.workspace ? 'on' : undefined"
    :data-dev-panel="devTheme.enabled && devTheme.currentTargets.panel ? 'on' : undefined"
  >
    <TitleBar
      :is-fullscreen="isFullscreen"
      :can-undo="history.canUndo"
      :can-redo="history.canRedo"
      :annotation-visible="showAnnotation"
      :theme="theme"
      :left-collapsed="leftCollapsed"
      :current-preset-name="manager.presetName"
      :preset-names="manager.presetNames"
      :prompt-count="manager.mainPrompts.length"
      :token-estimate="mainPresetTokenEstimate"
      :code-inspector-enabled="codeInspectorEnabled"
      @undo="doUndo"
      @redo="doRedo"
      @toggle-history="showHistory = !showHistory"
      @toggle-theme="toggleTheme"
      @toggle-ui-settings="showUiSettings = !showUiSettings"
      @toggle-annotation="showAnnotation = !showAnnotation"
      @toggle-dev-theme-panel="devTheme.togglePanel()"
      @toggle-code-inspector="toggleCodeInspector"
      @toggle-left-sidebar="leftCollapsed = !leftCollapsed"
      @select-preset="selectMainPreset"
      @create-prompt="createOfficialPrompt"
      @create-preset="createOfficialPreset"
      @rename-preset="renameOfficialPreset"
      @delete-preset="deleteOfficialPreset"
      @append-unused-prompt="showUnusedPromptPicker = true"
      @import-prompts="officialPromptImportInput?.click()"
      @export-prompts="downloadPresetPromptExport"
      @reset-prompt-order="resetOfficialPromptOrder"
      @toggle-fullscreen="toggleFullscreen"
      @close="closePanel"
    />

    <SplitHandle
      v-if="!leftCollapsed"
      class="sidebar-edge-handle"
      direction="vertical"
      :style="sidebarSplitHandleStyle"
      @drag-start="onLeftDragStart"
      @resize="onLeftSplitResize"
    />

    <div class="main-body">
      <LeftSidebar :width="leftWidth" :collapsed="leftCollapsed" />

      <div ref="presetWorkspaceRef" class="preset-workspace">
        <div v-if="ai.showConfig" class="api-settings-page">
          <AiConfig variant="page" @close="ai.showConfig = false" />
        </div>

        <div v-else class="preset-workspace-content">
          <div class="preset-panels">
            <div class="center-area" style="flex: 1; min-width: 200px">
              <PresetPanel panel-id="main" :favorited-ids="favoritedIds" @favorite="onFavorite" />
            </div>

            <template v-if="showSecondPreset">
              <SplitHandle direction="vertical" @drag-start="onRightDragStart" @resize="onRightSplitResize" />
              <div class="second-preset-area" :style="{ width: `${rightWidth}px` }">
                <PresetPanel panel-id="second" :favorited-ids="favoritedIds" @favorite="onFavorite" />
              </div>
            </template>

            <button
              class="second-toggle"
              :class="{ active: showSecondPreset }"
              :title="showSecondPreset ? '收起第二预设' : '展开第二预设'"
              @click="showSecondPreset = !showSecondPreset"
            >
              <i :class="['fas text-xs', showSecondPreset ? 'fa-chevron-right' : 'fa-chevron-left']" />
            </button>
          </div>

          <AiAssistant />
        </div>
      </div>
    </div>

    <HistoryPanel :visible="showHistory" @close="showHistory = false" />

    <AnnotationOverlay v-if="showAnnotation" @close="showAnnotation = false" />

    <input
      ref="officialPromptImportInput"
      class="hidden-file-input"
      type="file"
      accept="application/json,.json"
      @change="handleImportPromptsFile"
    />

    <Transition name="settings-pop">
      <div v-if="showUnusedPromptPicker" class="unused-prompt-picker">
        <div class="settings-head">
          <span>添加未使用条目</span>
          <button class="settings-close" title="关闭" @click="showUnusedPromptPicker = false">
            <i class="fas fa-times text-xs" />
          </button>
        </div>

        <input v-model="unusedPromptSearch" class="unused-prompt-search" type="search" placeholder="搜索条目" />

        <div class="unused-prompt-list">
          <button
            v-for="prompt in filteredOfficialUnusedPrompts"
            :key="getPromptKey(prompt)"
            class="unused-prompt-item"
            @click="appendOfficialUnusedPrompt(prompt)"
          >
            <span>{{ prompt.name || getPromptKey(prompt) }}</span>
            <small>{{ (prompt as any).role || 'system' }}</small>
          </button>
          <div v-if="filteredOfficialUnusedPrompts.length === 0" class="unused-prompt-empty">暂无可添加条目</div>
        </div>
      </div>
    </Transition>

    <Transition name="settings-pop">
      <div v-if="showUiSettings" class="ui-settings-panel">
        <div class="settings-head">
          <span>界面设置</span>
          <button class="settings-close" title="关闭" @click="showUiSettings = false">
            <i class="fas fa-times text-xs" />
          </button>
        </div>

        <div class="settings-presets">
          <div v-for="preset in uiPresetOptions" :key="preset.key" class="settings-preset-slot">
            <button
              class="settings-preset-apply"
              :class="{ active: isCurrentUiPreset(preset.key) }"
              :title="`套用${preset.label}档位`"
              @click="applyUiPreset(preset.key)"
            >
              <span>{{ preset.label }}</span>
              <small
                >{{ Math.round(uiPresets[preset.key].promptScale * 100) }}% ·
                {{ previewLabel(uiPresets[preset.key].promptPreviewLines) }}</small
              >
            </button>
            <button
              class="settings-preset-save"
              :title="`保存当前比例到${preset.label}`"
              @click="saveCurrentToUiPreset(preset.key)"
            >
              <i class="fas fa-save text-xs" />
            </button>
          </div>
        </div>

        <button class="settings-reset-btn" @click="resetUiSettingsDefaults">恢复默认比例</button>

        <label class="settings-row">
          <span>整体字体</span>
          <span class="settings-value">{{ Math.round(uiScale * 100) }}%</span>
        </label>
        <input
          class="settings-range"
          type="range"
          min="0.9"
          max="1.16"
          step="0.02"
          :value="uiScale"
          @input="setUiScale(Number(($event.target as HTMLInputElement).value))"
        />

        <label class="settings-row settings-row-spaced">
          <span>预设条目</span>
          <span class="settings-value">{{ Math.round(promptScale * 100) }}%</span>
        </label>
        <input
          class="settings-range"
          type="range"
          min="1"
          max="1.42"
          step="0.02"
          :value="promptScale"
          @input="setPromptScale(Number(($event.target as HTMLInputElement).value))"
        />

        <label class="settings-row settings-row-spaced">
          <span>内容预览</span>
          <span class="settings-value">{{ promptPreviewLines === 0 ? '关闭' : `${promptPreviewLines} 行` }}</span>
        </label>
        <input
          class="settings-range"
          type="range"
          min="0"
          max="3"
          step="1"
          :value="promptPreviewLines"
          @input="setPromptPreviewLines(Number(($event.target as HTMLInputElement).value))"
        />
      </div>
    </Transition>

    <DevThemeStyleInjector />
    <DevThemePanel v-if="devTheme.panelOpen" />

    <template v-if="!isFullscreen">
      <div
        class="window-resize-handle resize-top-left"
        @mousedown.stop.prevent="onWindowResizeStart($event, 'top-left')"
      />
      <div
        class="window-resize-handle resize-top-right"
        @mousedown.stop.prevent="onWindowResizeStart($event, 'top-right')"
      />
      <div
        class="window-resize-handle resize-bottom-left"
        @mousedown.stop.prevent="onWindowResizeStart($event, 'bottom-left')"
      />
      <div
        class="window-resize-handle resize-bottom-right"
        @mousedown.stop.prevent="onWindowResizeStart($event, 'bottom-right')"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import TitleBar from './components/TitleBar.vue';
import LeftSidebar from './components/LeftSidebar.vue';
import SplitHandle from './components/SplitHandle.vue';
import PresetPanel from './components/PresetPanel.vue';
import AiAssistant from './components/AiAssistant.vue';
import AiConfig from './components/AiConfig.vue';
import HistoryPanel from './components/HistoryPanel.vue';
import AnnotationOverlay from './components/AnnotationOverlay.vue';
import DevThemeStyleInjector from './components/DevThemeStyleInjector.vue';
import DevThemePanel from './components/DevThemePanel.vue';
import { useDevThemeStore } from './stores/devTheme';
import { useAiStore } from './stores/ai';
import { getPromptKey, useManagerStore } from './stores/manager';
import { useHistoryStore } from './stores/history';
import { startParentDrag } from './utils/drag';
import {
  clampSecondPresetWidth,
  clampWindowState,
  clampWindowStateWithVisibleArea,
  getSecondPresetBounds,
  type WindowState,
} from './utils/panelLayout';
import { CODEX_REFERENCE_METRICS } from './designMetrics';
import { getInstanceStorageKey, type PresetManagerInstanceKey } from './utils/instanceConfig';

const manager = useManagerStore();
const history = useHistoryStore();
const devTheme = useDevThemeStore();
const ai = useAiStore();

const isFullscreen = ref(false);
const showHistory = ref(false);
const showAnnotation = ref(false);
const showSecondPreset = ref(false);
const showUnusedPromptPicker = ref(false);
const leftCollapsed = ref(false);
const leftWidth = ref(CODEX_REFERENCE_METRICS.sidebar.width);
const rightWidth = ref(280);
const presetWorkspaceRef = ref<HTMLElement>();
const officialPromptImportInput = ref<HTMLInputElement | null>(null);
const unusedPromptSearch = ref('');
const instanceKey = inject<PresetManagerInstanceKey>('presetManagerInstanceKey', 'default');
const codeInspectorControls = inject<CodeInspectorControls | null>('presetManagerCodeInspector', null);
const codeInspectorEnabled = ref(codeInspectorControls?.isEnabled() ?? false);
let removeCodeInspectorSelectListener: (() => void) | null = null;

const WINDOW_STATE_KEY = getInstanceStorageKey(instanceKey, 'WindowState');
const WINDOW_STATE_VERSION_KEY = getInstanceStorageKey(instanceKey, 'WindowStateVersion');
const WINDOW_STATE_VERSION = `codex-${CODEX_REFERENCE_METRICS.window.width}x${CODEX_REFERENCE_METRICS.window.height}`;
const THEME_KEY = getInstanceStorageKey(instanceKey, 'Theme');
const UI_SCALE_KEY = getInstanceStorageKey(instanceKey, 'UiScale');
const PROMPT_SCALE_KEY = getInstanceStorageKey(instanceKey, 'PromptScale');
const PROMPT_PREVIEW_LINES_KEY = getInstanceStorageKey(instanceKey, 'PromptPreviewLines');
const UI_PRESETS_KEY = getInstanceStorageKey(instanceKey, 'UiPresets');
type AppTheme = 'dark' | 'light';
type UiPresetKey = 'compact' | 'standard' | 'large';
type UiPresetConfig = { uiScale: number; promptScale: number; promptPreviewLines: number };
type UiPresetMap = Record<UiPresetKey, UiPresetConfig>;
type CodeInspectorSelectPayload = {
  path: string;
  label: string;
  tag: string;
  matchedCount: number;
  rect?: { width: number; height: number };
};
type CodeInspectorControls = {
  isEnabled: () => boolean;
  toggle: () => boolean;
  onSelect?: (listener: (payload: CodeInspectorSelectPayload) => void) => () => void;
};
let lastWindowState: WindowState | null = null;
type WindowResizeDirection =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';
const MIN_WINDOW_WIDTH = 640;
const MIN_WINDOW_HEIGHT = 420;
const WINDOW_MIN_VISIBLE_RATIO = 0.1;
const DEFAULT_WINDOW_WIDTH = CODEX_REFERENCE_METRICS.window.width;
const DEFAULT_WINDOW_HEIGHT = CODEX_REFERENCE_METRICS.window.height;

const DEFAULT_UI_PRESETS: UiPresetMap = {
  compact: { uiScale: 0.94, promptScale: 1, promptPreviewLines: 0 },
  standard: { uiScale: 1, promptScale: 1.06, promptPreviewLines: 1 },
  large: { uiScale: 1.06, promptScale: 1.3, promptPreviewLines: 2 },
};

const uiPresetOptions: { key: UiPresetKey; label: string }[] = [
  { key: 'compact', label: '紧凑' },
  { key: 'standard', label: '标准' },
  { key: 'large', label: '放大' },
];

const startLeftWidth = ref(CODEX_REFERENCE_METRICS.sidebar.width);
const startRightWidth = ref(280);
const theme = ref<AppTheme>(readTheme());
const showUiSettings = ref(false);
const uiScale = ref(readUiScale());
const promptScale = ref(readPromptScale());
const promptPreviewLines = ref(readPromptPreviewLines());
const uiPresets = ref<UiPresetMap>(readUiPresets());

const uiVars = computed(() => {
  const font = uiScale.value;
  const prompt = promptScale.value;
  return {
    '--pm-font-size': `${13 * font}px`,
    '--pm-small-font-size': `${12 * font}px`,
    '--pm-title-font-size': `${13 * font}px`,
    '--pm-prompt-font-size': `${13 * font * prompt}px`,
    '--pm-prompt-preview-font-size': `${12 * font * Math.min(prompt, 1.26)}px`,
    '--pm-prompt-row-min': `${42 * prompt}px`,
    '--pm-prompt-pad-y': `${7 * prompt}px`,
    '--pm-prompt-pad-x': `${10 * prompt}px`,
    '--pm-prompt-icon-size': `${20 * prompt}px`,
    '--pm-prompt-radius': `${8 + 2 * prompt}px`,
    '--pm-prompt-list-gap': `${5 * prompt}px`,
    '--pm-prompt-list-pad': `${8 * prompt}px`,
    '--pm-prompt-preview-lines': String(promptPreviewLines.value),
    '--pm-left-rail-width': `${leftCollapsed.value ? 0 : leftWidth.value}px`,
    '--pm-titlebar-height': `${CODEX_REFERENCE_METRICS.titleBar.height}px`,
    '--pm-ai-dock-width': `${CODEX_REFERENCE_METRICS.aiDock.width}px`,
    '--pm-ai-dock-side-gap': `${CODEX_REFERENCE_METRICS.aiDock.sideGap}px`,
    '--pm-ai-dock-bottom': `${CODEX_REFERENCE_METRICS.aiDock.bottom}px`,
    '--pm-ai-dock-min-height': `${CODEX_REFERENCE_METRICS.aiDock.minHeight}px`,
  };
});

const sidebarSplitHandleStyle = computed(() => ({
  position: 'absolute',
  top: '0',
  bottom: '0',
  left: `${leftCollapsed.value ? 0 : leftWidth.value}px`,
  zIndex: 220,
}));

const mainPresetTokenEstimate = computed(() => {
  const totalChars = manager.mainPrompts.reduce((sum, prompt) => {
    const content = (prompt as any).content ?? '';
    return sum + String(prompt.name ?? '').length + String(content).length;
  }, 0);
  return Math.max(0, Math.ceil(totalChars / 3.8));
});

const favoritedIds = computed(() => {
  const ids = new Set<string>();
  for (const folder of manager.favorites) {
    for (const item of folder.items) {
      ids.add(item.id);
    }
  }
  return ids;
});

const filteredOfficialUnusedPrompts = computed(() => {
  const keyword = unusedPromptSearch.value.trim().toLowerCase();
  if (!keyword) return manager.mainUnusedPrompts;
  return manager.mainUnusedPrompts.filter(prompt => {
    const name = String(prompt.name ?? '').toLowerCase();
    const key = getPromptKey(prompt).toLowerCase();
    const role = String((prompt as any).role ?? '').toLowerCase();
    return name.includes(keyword) || key.includes(keyword) || role.includes(keyword);
  });
});

function onLeftDragStart() {
  startLeftWidth.value = leftWidth.value;
}

function onLeftSplitResize(delta: number) {
  leftWidth.value = Math.max(
    CODEX_REFERENCE_METRICS.sidebar.minWidth,
    Math.min(startLeftWidth.value + delta, CODEX_REFERENCE_METRICS.sidebar.maxWidth),
  );
}

function onRightDragStart() {
  ensureSecondPresetWidth();
  startRightWidth.value = rightWidth.value;
}

function onRightSplitResize(delta: number) {
  rightWidth.value = clampSecondPresetWidth(startRightWidth.value - delta, getPresetWorkspaceWidth());
}

function selectMainPreset(name: string) {
  if (!name || name === manager.presetName) return;
  const loaded = manager.loadMainPreset(name);
  if (loaded) {
    history.createSnapshot(name, undefined, true);
  }
}

function snapshotMainPreset(): Preset | null {
  if (!manager.presetName) return null;
  return klona(getPreset(manager.presetName));
}

async function recordMainOfficialChange<T>(description: string, operation: () => Promise<T>): Promise<T | null> {
  const presetName = manager.presetName;
  if (!presetName) {
    toastr.warning('请先选择一个预设', '', { timeOut: 1600 });
    return null;
  }

  const before = snapshotMainPreset();
  if (!before) return null;

  const result = await operation();
  if (result === false || result === null || result === 0) return result;

  const after = snapshotMainPreset();
  if (after) history.recordOperation(presetName, before, after, description);
  manager.refreshMainPreset();
  return result;
}

async function createOfficialPrompt() {
  const created = await recordMainOfficialChange('新建条目', () => manager.createPromptInPreset('main'));
  if (created) toastr.success('条目已新建', '', { timeOut: 1400 });
}

async function createOfficialPreset() {
  const name = prompt('新预设名称');
  if (!name?.trim()) return;

  const created = await manager.createPresetByName(name);
  if (created) {
    history.createSnapshot(manager.presetName, undefined, true);
    toastr.success('预设已新建', '', { timeOut: 1400 });
  } else {
    toastr.warning('预设名称不可用或已存在', '', { timeOut: 1600 });
  }
}

async function renameOfficialPreset() {
  const currentName = manager.presetName;
  if (!currentName) {
    toastr.warning('请先选择一个预设', '', { timeOut: 1600 });
    return;
  }

  const name = prompt('新的预设名称', currentName);
  if (!name?.trim() || name.trim() === currentName) return;

  const renamed = await manager.renamePresetByName(currentName, name);
  if (renamed) {
    history.createSnapshot(manager.presetName, undefined, true);
    toastr.success('预设已重命名', '', { timeOut: 1400 });
  } else {
    toastr.warning('重命名失败，可能是名称已存在', '', { timeOut: 1800 });
  }
}

async function deleteOfficialPreset() {
  const presetName = manager.presetName;
  if (!presetName) {
    toastr.warning('请先选择一个预设', '', { timeOut: 1600 });
    return;
  }
  if (!confirm(`确定删除预设 "${presetName}" 吗？此操作无法用撤回恢复。`)) return;

  const deleted = await manager.deletePresetByName(presetName);
  if (deleted) toastr.info('预设已删除', '', { timeOut: 1400 });
  else toastr.warning('删除预设失败', '', { timeOut: 1600 });
}

async function appendOfficialUnusedPrompt(prompt: PresetPrompt) {
  const key = getPromptKey(prompt);
  const appended = await recordMainOfficialChange(`添加未使用条目: ${prompt.name || key}`, () => {
    return manager.appendUnusedPromptToPreset(key, 'main');
  });

  if (appended) {
    toastr.success('条目已添加到当前预设', '', { timeOut: 1400 });
    if (manager.mainUnusedPrompts.length === 0) showUnusedPromptPicker.value = false;
  } else {
    toastr.warning('条目无法添加，可能已经在列表中', '', { timeOut: 1600 });
  }
}

async function handleImportPromptsFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const parsed = JSON.parse(await file.text()) as unknown;
    const imported = await recordMainOfficialChange(`导入条目: ${file.name}`, () => {
      return manager.importPromptsToPreset(parsed, 'main');
    });

    if (imported) toastr.success(`已导入 ${imported} 个条目`, '', { timeOut: 1600 });
    else toastr.warning('导入文件里没有可用条目', '', { timeOut: 1800 });
  } catch (error) {
    console.error('[PresetManager] import prompts failed:', error);
    toastr.error('导入失败，请确认文件是有效 JSON', '', { timeOut: 2200 });
  } finally {
    input.value = '';
  }
}

function downloadPresetPromptExport() {
  const exportData = manager.exportPromptsFromPreset('main');
  if (!exportData) {
    toastr.warning('请先选择一个预设', '', { timeOut: 1600 });
    return;
  }

  const safeName = (manager.presetName || 'preset').replace(/[\\/:*?"<>|]+/g, '_');
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}-prompts.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function resetOfficialPromptOrder() {
  if (!confirm('确定按官方默认顺序重置当前预设的条目吗？')) return;

  const reset = await recordMainOfficialChange('重置条目顺序', () => manager.resetPromptOrder('main'));
  if (reset) toastr.success('条目顺序已重置', '', { timeOut: 1400 });
  else toastr.warning('重置顺序失败', '', { timeOut: 1600 });
}

function getPresetWorkspaceWidth() {
  return presetWorkspaceRef.value?.clientWidth ?? iframeEl?.getBoundingClientRect().width ?? 900;
}

function ensureSecondPresetWidth() {
  rightWidth.value = clampSecondPresetWidth(rightWidth.value, getPresetWorkspaceWidth());
}

watch(showSecondPreset, visible => {
  if (!visible) return;
  nextTick(() => {
    rightWidth.value = getSecondPresetBounds(getPresetWorkspaceWidth()).center;
  });
});

const parentDoc = inject<Document>('parentDocument')!;
const iframeEl = inject<HTMLIFrameElement>('iframeElement')!;
const parentFloatingRoot = createParentFloatingRoot();
provide('presetManagerWindowStateKey', WINDOW_STATE_KEY);
provide('presetManagerWindowStateVersionKey', WINDOW_STATE_VERSION_KEY);
provide('presetManagerWindowStateVersion', WINDOW_STATE_VERSION);
provide('presetManagerWindowMinVisibleRatio', WINDOW_MIN_VISIBLE_RATIO);
provide('presetManagerParentFloatingRoot', parentFloatingRoot);

function createParentFloatingRoot() {
  const root = parentDoc.createElement('div');
  root.setAttribute('data-preset-manager-floating-root', String(instanceKey));
  const style = parentDoc.createElement('style');
  style.setAttribute('data-preset-manager-floating-root-style', String(instanceKey));
  style.textContent = `
    [data-preset-manager-floating-root="${instanceKey}"] {
      --pm-bg-panel: #111114;
      --pm-bg-soft: rgba(255,255,255,0.045);
      --pm-bg-hover: rgba(255,255,255,0.06);
      --pm-input-bg: rgba(255,255,255,0.04);
      --pm-border: rgba(255,255,255,0.08);
      --pm-border-strong: #343541;
      --pm-divider: rgba(255,255,255,0.28);
      --pm-text: #ffffff;
      --pm-text-muted: #acacbe;
      --pm-text-subtle: #8e8ea0;
      --pm-shadow: 0 24px 80px rgba(0,0,0,0.55);
      font: 13px/1.5 'Inter Variable', Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-feature-settings: 'calt', 'kern', 'liga', 'ss03';
      color: var(--pm-text);
    }
    [data-preset-manager-floating-root="${instanceKey}"] * {
      box-sizing: border-box;
    }
    [data-preset-manager-floating-panel] {
      pointer-events: auto;
    }
    [data-preset-manager-floating-root="${instanceKey}"] .dev-theme-resize {
      position: absolute;
      width: 16px;
      height: 16px;
      z-index: 2;
    }
    [data-preset-manager-floating-root="${instanceKey}"] .dev-theme-resize-top-left {
      top: 0;
      left: 0;
      cursor: nwse-resize;
    }
    [data-preset-manager-floating-root="${instanceKey}"] .dev-theme-resize-top-right {
      top: 0;
      right: 0;
      cursor: nesw-resize;
    }
    [data-preset-manager-floating-root="${instanceKey}"] .dev-theme-resize-bottom-left {
      bottom: 0;
      left: 0;
      cursor: nesw-resize;
    }
    [data-preset-manager-floating-root="${instanceKey}"] .dev-theme-resize-bottom-right {
      right: 0;
      bottom: 0;
      cursor: nwse-resize;
    }
  `;
  Object.assign(root.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483002',
    pointerEvents: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  parentDoc.head.appendChild(style);
  parentDoc.body.appendChild(root);
  return root;
}

function toggleCodeInspector() {
  codeInspectorEnabled.value = codeInspectorControls?.toggle() ?? false;
  toastr.info(
    codeInspectorEnabled.value ? '开发者检查器已开启，移动鼠标查看元素，Alt+Shift+点击定位代码' : '开发者检查器已关闭',
    '',
    {
      timeOut: 1400,
    },
  );
}

function readTheme(): AppTheme {
  return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
}

function readUiScale() {
  const value = Number(localStorage.getItem(UI_SCALE_KEY));
  if (!Number.isFinite(value)) return 1;
  return Math.max(0.9, Math.min(value, 1.16));
}

function setUiScale(value: number) {
  uiScale.value = Math.max(0.9, Math.min(value, 1.16));
  localStorage.setItem(UI_SCALE_KEY, String(uiScale.value));
}

function readPromptScale() {
  const value = Number(localStorage.getItem(PROMPT_SCALE_KEY));
  if (!Number.isFinite(value)) return 1.06;
  return Math.max(1, Math.min(value, 1.42));
}

function setPromptScale(value: number) {
  promptScale.value = Math.max(1, Math.min(value, 1.42));
  localStorage.setItem(PROMPT_SCALE_KEY, String(promptScale.value));
}

function readPromptPreviewLines() {
  const value = Number(localStorage.getItem(PROMPT_PREVIEW_LINES_KEY));
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(Math.round(value), 3));
}

function setPromptPreviewLines(value: number) {
  promptPreviewLines.value = Math.max(0, Math.min(Math.round(value), 3));
  localStorage.setItem(PROMPT_PREVIEW_LINES_KEY, String(promptPreviewLines.value));
}

function clampUiPreset(preset: Partial<UiPresetConfig> | undefined, fallback: UiPresetConfig): UiPresetConfig {
  const nextUiScale = Number(preset?.uiScale);
  const nextPromptScale = Number(preset?.promptScale);
  const nextPreviewLines = Number(preset?.promptPreviewLines);
  return {
    uiScale: Math.max(0.9, Math.min(Number.isFinite(nextUiScale) ? nextUiScale : fallback.uiScale, 1.16)),
    promptScale: Math.max(1, Math.min(Number.isFinite(nextPromptScale) ? nextPromptScale : fallback.promptScale, 1.42)),
    promptPreviewLines: Math.max(
      0,
      Math.min(Math.round(Number.isFinite(nextPreviewLines) ? nextPreviewLines : fallback.promptPreviewLines), 3),
    ),
  };
}

function readUiPresets(): UiPresetMap {
  try {
    const saved = JSON.parse(localStorage.getItem(UI_PRESETS_KEY) || '{}') as Partial<
      Record<UiPresetKey, Partial<UiPresetConfig>>
    >;
    return {
      compact: clampUiPreset(saved.compact, DEFAULT_UI_PRESETS.compact),
      standard: clampUiPreset(saved.standard, DEFAULT_UI_PRESETS.standard),
      large: clampUiPreset(saved.large, DEFAULT_UI_PRESETS.large),
    };
  } catch {
    return { ...DEFAULT_UI_PRESETS };
  }
}

function saveUiPresets() {
  localStorage.setItem(UI_PRESETS_KEY, JSON.stringify(uiPresets.value));
}

function applyUiPreset(key: UiPresetKey) {
  const preset = uiPresets.value[key];
  setUiScale(preset.uiScale);
  setPromptScale(preset.promptScale);
  setPromptPreviewLines(preset.promptPreviewLines);
}

function saveCurrentToUiPreset(key: UiPresetKey) {
  uiPresets.value = {
    ...uiPresets.value,
    [key]: {
      uiScale: uiScale.value,
      promptScale: promptScale.value,
      promptPreviewLines: promptPreviewLines.value,
    },
  };
  saveUiPresets();
  toastr.info('已保存当前 UI 比例', '', { timeOut: 1000 });
}

function resetUiSettingsDefaults() {
  uiPresets.value = {
    compact: { ...DEFAULT_UI_PRESETS.compact },
    standard: { ...DEFAULT_UI_PRESETS.standard },
    large: { ...DEFAULT_UI_PRESETS.large },
  };
  saveUiPresets();
  applyUiPreset('standard');
}

function previewLabel(lines: number) {
  return lines === 0 ? '无预览' : `${lines}行`;
}

function isCurrentUiPreset(key: UiPresetKey) {
  const preset = uiPresets.value[key];
  return (
    Math.abs(uiScale.value - preset.uiScale) < 0.001 &&
    Math.abs(promptScale.value - preset.promptScale) < 0.001 &&
    promptPreviewLines.value === preset.promptPreviewLines
  );
}

function applyTheme(nextTheme: AppTheme) {
  document.body.dataset.pmTheme = nextTheme;
  localStorage.setItem(THEME_KEY, nextTheme);
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  applyTheme(theme.value);
}

function readWindowState(): WindowState | null {
  try {
    if (localStorage.getItem(WINDOW_STATE_VERSION_KEY) !== WINDOW_STATE_VERSION) return null;
    const raw = localStorage.getItem(WINDOW_STATE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as WindowState;
    if (!state.width || !state.height) return null;
    return state;
  } catch {
    return null;
  }
}

function saveWindowState() {
  if (isFullscreen.value) return;
  const rect = iframeEl.getBoundingClientRect();
  lastWindowState = clampLooseWindowState({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
  applyWindowStyle(lastWindowState);
  localStorage.setItem(WINDOW_STATE_KEY, JSON.stringify(lastWindowState));
  localStorage.setItem(WINDOW_STATE_VERSION_KEY, WINDOW_STATE_VERSION);
}

function applyWindowStyle(state: WindowState) {
  const style = iframeEl.style;
  style.transform = '';
  style.right = '';
  style.bottom = '';
  style.top = `${state.top}px`;
  style.left = `${state.left}px`;
  style.width = `${state.width}px`;
  style.height = `${state.height}px`;
  style.maxWidth = 'none';
  style.maxHeight = 'none';
  style.borderRadius = '12px';
}

function getParentViewportSize() {
  const viewport = parentDoc.documentElement;
  return {
    width: viewport.clientWidth || parentDoc.defaultView?.innerWidth || DEFAULT_WINDOW_WIDTH,
    height: viewport.clientHeight || parentDoc.defaultView?.innerHeight || DEFAULT_WINDOW_HEIGHT,
  };
}

function clampWindowStateInsideViewport(state: WindowState) {
  const viewport = getParentViewportSize();
  return clampWindowState(state, viewport.width, viewport.height, MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT);
}

function clampLooseWindowState(state: WindowState) {
  const viewport = getParentViewportSize();
  return clampWindowStateWithVisibleArea(
    state,
    viewport.width,
    viewport.height,
    MIN_WINDOW_WIDTH,
    MIN_WINDOW_HEIGHT,
    WINDOW_MIN_VISIBLE_RATIO,
  );
}

function applyWindowState(state: WindowState) {
  applyWindowStyle(clampWindowStateInsideViewport(state));
}

function getDefaultWindowState(): WindowState {
  const viewport = parentDoc.documentElement;
  const width = DEFAULT_WINDOW_WIDTH;
  const height = DEFAULT_WINDOW_HEIGHT;
  return {
    top: Math.max(0, Math.round((viewport.clientHeight - height) / 2)),
    left: Math.max(0, Math.round((viewport.clientWidth - width) / 2)),
    width,
    height,
  };
}

function toggleFullscreen() {
  const style = iframeEl.style;
  if (!isFullscreen.value) {
    saveWindowState();
    isFullscreen.value = true;
    style.top = '0';
    style.left = '0';
    style.right = '0';
    style.bottom = '0';
    style.width = '100%';
    style.height = '100%';
    style.maxWidth = '100%';
    style.maxHeight = '100%';
    style.transform = '';
    style.borderRadius = '0';
  } else {
    isFullscreen.value = false;
    applyWindowState(lastWindowState ?? readWindowState() ?? getDefaultWindowState());
  }
}

function onWindowResizeStart(e: MouseEvent, direction: WindowResizeDirection) {
  if (e.button !== 0) return;

  const rect = iframeEl.getBoundingClientRect();
  const startX = e.screenX;
  const startY = e.screenY;
  const startLeft = rect.left;
  const startTop = rect.top;
  const startW = rect.width;
  const startH = rect.height;
  const style = iframeEl.style;
  const cursor =
    (direction.includes('top') && direction.includes('left')) ||
    (direction.includes('bottom') && direction.includes('right'))
      ? 'nwse-resize'
      : (direction.includes('top') && direction.includes('right')) ||
          (direction.includes('bottom') && direction.includes('left'))
        ? 'nesw-resize'
        : direction === 'left' || direction === 'right'
          ? 'ew-resize'
          : 'ns-resize';

  startParentDrag(parentDoc, {
    startEvent: e,
    cursor,
    onMove: ev => {
      const dx = ev.screenX - startX;
      const dy = ev.screenY - startY;
      let nextLeft = startLeft;
      let nextTop = startTop;
      let nextW = startW;
      let nextH = startH;

      if (direction.includes('right')) nextW = Math.max(MIN_WINDOW_WIDTH, startW + dx);
      if (direction.includes('bottom')) nextH = Math.max(MIN_WINDOW_HEIGHT, startH + dy);
      if (direction.includes('left')) {
        nextW = Math.max(MIN_WINDOW_WIDTH, startW - dx);
        nextLeft = startLeft + startW - nextW;
      }
      if (direction.includes('top')) {
        nextH = Math.max(MIN_WINDOW_HEIGHT, startH - dy);
        nextTop = startTop + startH - nextH;
      }

      applyWindowStyle(clampLooseWindowState({ top: nextTop, left: nextLeft, width: nextW, height: nextH }));
    },
    onEnd: saveWindowState,
  });
}

function closePanel() {
  const $iframe = $(iframeEl);
  $iframe.hide();
}

async function doUndo() {
  const record = await history.undo();
  if (record) {
    manager.refreshMainPreset();
    manager.refreshSecondPreset();
    toastr.info(`已撤回: ${record.description}`, '', { timeOut: 1500 });
  }
}

async function doRedo() {
  const record = await history.redo();
  if (record) {
    manager.refreshMainPreset();
    manager.refreshSecondPreset();
    toastr.info(`已重做: ${record.description}`, '', { timeOut: 1500 });
  }
}

function onFavorite(prompt: PresetPrompt) {
  if (manager.favorites.length === 0) {
    manager.addFavoriteFolder('收藏夹 1');
  }
  const firstFolder = manager.favorites[0];
  const existingIdx = firstFolder.items.findIndex(i => i.id === prompt.id);
  if (existingIdx >= 0) {
    manager.removeFromFavorites(firstFolder.id, existingIdx);
    toastr.info('已取消收藏', '', { timeOut: 1200 });
  } else {
    manager.addToFavorites(firstFolder.id, {
      id: prompt.id,
      name: prompt.name,
      enabled: prompt.enabled ?? true,
      position: (prompt as any).position ?? { type: 'relative' as const },
      role: prompt.role,
      content: (prompt as any).content ?? '',
    });
    toastr.success('已收藏', '', { timeOut: 1200 });
  }
}

onMounted(() => {
  applyTheme(theme.value);

  const savedState = readWindowState();
  if (savedState) applyWindowState(savedState);

  removeCodeInspectorSelectListener =
    codeInspectorControls?.onSelect?.(detail => {
      devTheme.setSelectedElement(detail);
    }) ?? null;

  document.addEventListener('preset-manager-code-inspector-state', event => {
    codeInspectorEnabled.value = Boolean((event as CustomEvent<{ enabled: boolean }>).detail?.enabled);
  });

  document.addEventListener('preset-manager-code-inspector-select', event => {
    const detail = (event as CustomEvent<{ path: string; label: string; tag: string; matchedCount: number }>).detail;
    if (!detail?.path) return;
    devTheme.setSelectedElement(detail);
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      doUndo();
    } else if (e.ctrlKey && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      doRedo();
    }
  });
});

onUnmounted(() => {
  removeCodeInspectorSelectListener?.();
  removeCodeInspectorSelectListener = null;
  parentFloatingRoot?.remove();
  parentDoc.querySelector(`[data-preset-manager-floating-root-style="${instanceKey}"]`)?.remove();
});
</script>

<style>
html,
body {
  margin: 0 !important;
  padding: 0;
  overflow: hidden !important;
  height: 100%;
  background: transparent;
}
* {
  box-sizing: border-box;
}

body[data-pm-theme='dark'],
.theme-dark {
  /* Codex dark mode tokens — reverse-engineered from openai.com/codex via SkillUI */
  --pm-bg: #000000;
  --pm-bg-transparent: rgba(0, 0, 0, 0);
  --pm-bg-soft: #0a0a0c;
  --pm-bg-panel: #111114;
  --pm-bg-titlebar: #000000;
  --pm-bg-workspace: #000000;
  --pm-bg-sidebar: rgba(255, 255, 255, 0.025);
  --pm-bg-elevated: #1f1f23;
  --pm-bg-card: #16161a;

  /* Rows */
  --pm-row-bg: transparent;
  --pm-row-hover: rgba(255, 255, 255, 0.04);
  --pm-row-active: rgba(255, 255, 255, 0.08);
  --pm-row-border: rgba(255, 255, 255, 0.06);
  --pm-bg-hover: rgba(255, 255, 255, 0.045);
  --pm-bg-active: rgba(255, 255, 255, 0.08);

  /* Hairlines — Codex uses #343541 solid border + white-alpha for inner */
  --pm-border: rgba(255, 255, 255, 0.08);
  --pm-border-strong: #343541;
  --pm-divider: rgba(255, 255, 255, 0.28);
  --pm-sidebar-edge: rgba(255, 255, 255, 0.28);
  --pm-split-line: rgba(255, 255, 255, 0.28);
  --pm-split-line-hover: rgba(255, 255, 255, 0.38);

  /* Text */
  --pm-text: #ffffff;
  --pm-text-muted: #acacbe;
  --pm-text-subtle: #8e8ea0;
  --pm-text-faint: #565660;

  /* Brand action — white pill */
  --pm-accent: #ffffff;
  --pm-accent-text: #000000;

  /* Semantic */
  --pm-success: #4ade80;
  --pm-warning: #ffc533;
  --pm-danger: #ff6f6f;

  /* Inputs */
  --pm-input-bg: rgba(255, 255, 255, 0.04);

  --pm-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);

  /* AI dock */
  --pm-ai-surface: rgba(20, 20, 24, 0.85);
  --pm-ai-capsule: rgba(28, 28, 32, 0.78);
  --pm-control-highlight: rgba(255, 255, 255, 0.05);
  --pm-control-highlight-hover: rgba(255, 255, 255, 0.09);
  --pm-send-bg: #ffffff;
  --pm-send-fg: #000000;

  --pm-pill-primary-bg: #ffffff;
  --pm-pill-primary-bg-hover: #efeefe;
  --pm-pill-primary-fg: #000000;
  --pm-pill-border: rgba(255, 255, 255, 0.12);
  --pm-pill-border-hover: rgba(255, 255, 255, 0.22);
  --pm-pill-bg-hover: rgba(255, 255, 255, 0.06);
  --pm-pill-bg-active: rgba(255, 255, 255, 0.1);

  /* Acrylic refraction layer — extremely subtle radial tints in the corners so the sidebar's
     backdrop-blur has *something* faint to refract, instead of blurring pure flat black.
     Kept under 5% alpha so this never reads as a "decorative gradient". */
  --pm-glow-1: radial-gradient(ellipse 1200px 800px at 0% 0%, rgba(120, 130, 180, 0.04), transparent 65%);
  --pm-glow-2: radial-gradient(ellipse 900px 600px at 100% 100%, rgba(150, 110, 200, 0.025), transparent 65%);
  --pm-glow-3: none;

  --pm-sidebar-glow: rgba(255, 255, 255, 0);
  --pm-sidebar-glow-soft: rgba(255, 255, 255, 0);
  --pm-sidebar-shadow: rgba(0, 0, 0, 0.4);
  --pm-btn-radius: 8px;
  --pm-btn-radius-pill: 999px;
  --pm-btn-size: 30px;
  --pm-btn-size-sm: 26px;
  --pm-btn-hover: var(--pm-pill-bg-hover);
  --pm-btn-active: var(--pm-pill-bg-active);
  --pm-btn-active-border: var(--pm-pill-border-hover);
}

/* Backup of the previous (Raycast-inspired minimal) dark theme — switch to it by setting
   document.body.dataset.pmTheme = 'codex-minimal-v1' or root class 'theme-codex-minimal-v1' */
body[data-pm-theme='codex-minimal-v1'],
.theme-codex-minimal-v1 {
  --pm-bg: #15171a;
  --pm-bg-transparent: rgba(21, 23, 26, 0);
  --pm-bg-soft: #1a1c20;
  --pm-bg-panel: #1d2024;
  --pm-bg-titlebar: #15171a;
  --pm-bg-workspace: #15171a;
  --pm-bg-sidebar: #15171a;
  --pm-bg-elevated: #24272c;
  --pm-bg-card: #2a2d32;
  --pm-row-bg: transparent;
  --pm-row-hover: rgba(255, 255, 255, 0.04);
  --pm-row-active: rgba(255, 255, 255, 0.07);
  --pm-row-border: transparent;
  --pm-bg-hover: rgba(255, 255, 255, 0.045);
  --pm-bg-active: rgba(255, 255, 255, 0.08);
  --pm-border: rgba(255, 255, 255, 0.06);
  --pm-border-strong: rgba(255, 255, 255, 0.11);
  --pm-divider: rgba(255, 255, 255, 0.05);
  --pm-sidebar-edge: rgba(255, 255, 255, 0.06);
  --pm-split-line: rgba(255, 255, 255, 0.06);
  --pm-split-line-hover: rgba(255, 255, 255, 0.18);
  --pm-text: #ecedef;
  --pm-text-muted: #b0b3b9;
  --pm-text-subtle: #8c8f96;
  --pm-text-faint: #6e7079;
  --pm-accent: #f4f5f6;
  --pm-accent-text: #15171a;
  --pm-success: #59d499;
  --pm-warning: #ffc533;
  --pm-danger: #ff6f6f;
  --pm-input-bg: #1f2226;
  --pm-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  --pm-ai-surface: #1d2024;
  --pm-ai-capsule: rgba(36, 39, 44, 0.92);
  --pm-control-highlight: rgba(255, 255, 255, 0.05);
  --pm-control-highlight-hover: rgba(255, 255, 255, 0.09);
  --pm-send-bg: #f4f5f6;
  --pm-send-fg: #15171a;
  --pm-pill-primary-bg: #f4f5f6;
  --pm-pill-primary-bg-hover: #ffffff;
  --pm-pill-primary-fg: #15171a;
  --pm-pill-border: rgba(255, 255, 255, 0.11);
  --pm-pill-border-hover: rgba(255, 255, 255, 0.18);
  --pm-pill-bg-hover: rgba(255, 255, 255, 0.06);
  --pm-pill-bg-active: rgba(255, 255, 255, 0.1);
  --pm-glow-1: none;
  --pm-glow-2: none;
  --pm-glow-3: none;
  --pm-sidebar-glow: rgba(255, 255, 255, 0);
  --pm-sidebar-glow-soft: rgba(255, 255, 255, 0);
  --pm-sidebar-shadow: rgba(0, 0, 0, 0.22);
  --pm-btn-radius: 8px;
  --pm-btn-radius-pill: 999px;
  --pm-btn-size: 30px;
  --pm-btn-size-sm: 26px;
  --pm-btn-hover: var(--pm-pill-bg-hover);
  --pm-btn-active: var(--pm-pill-bg-active);
  --pm-btn-active-border: var(--pm-pill-border-hover);
}

body[data-pm-theme='light'],
.theme-light {
  --pm-bg: #f5f5f4;
  --pm-bg-transparent: rgba(245, 245, 244, 0);
  --pm-bg-soft: #fafaf9;
  --pm-bg-panel: #ffffff;
  --pm-bg-titlebar: #f5f5f4;
  --pm-bg-workspace: #f5f5f4;
  --pm-bg-sidebar: #f5f5f4;
  --pm-bg-elevated: #ffffff;
  --pm-bg-card: #fafaf9;

  --pm-row-bg: transparent;
  --pm-row-hover: rgba(15, 17, 21, 0.04);
  --pm-row-active: rgba(15, 17, 21, 0.06);
  --pm-row-border: transparent;
  --pm-bg-hover: rgba(15, 17, 21, 0.045);
  --pm-bg-active: rgba(15, 17, 21, 0.08);

  --pm-border: rgba(15, 17, 21, 0.07);
  --pm-border-strong: rgba(15, 17, 21, 0.12);
  --pm-divider: rgba(15, 17, 21, 0.06);
  --pm-sidebar-edge: rgba(15, 17, 21, 0.07);
  --pm-split-line: rgba(15, 17, 21, 0.07);
  --pm-split-line-hover: rgba(15, 17, 21, 0.18);

  --pm-text: #15171a;
  --pm-text-muted: #555960;
  --pm-text-subtle: #82868c;
  --pm-text-faint: #a1a4aa;

  --pm-accent: #15171a;
  --pm-accent-text: #ffffff;

  --pm-success: #197a36;
  --pm-warning: #9b6b00;
  --pm-danger: #c64545;

  --pm-input-bg: #ffffff;
  --pm-shadow: 0 24px 80px rgba(24, 31, 44, 0.16);

  --pm-ai-surface: #ffffff;
  --pm-ai-capsule: rgba(255, 255, 255, 0.92);
  --pm-control-highlight: rgba(15, 17, 21, 0.045);
  --pm-control-highlight-hover: rgba(15, 17, 21, 0.085);
  --pm-send-bg: #15171a;
  --pm-send-fg: #ffffff;

  --pm-pill-primary-bg: #15171a;
  --pm-pill-primary-bg-hover: #000000;
  --pm-pill-primary-fg: #ffffff;
  --pm-pill-border: rgba(15, 17, 21, 0.13);
  --pm-pill-border-hover: rgba(15, 17, 21, 0.22);
  --pm-pill-bg-hover: rgba(15, 17, 21, 0.05);
  --pm-pill-bg-active: rgba(15, 17, 21, 0.09);

  --pm-sidebar-glow: rgba(255, 255, 255, 0);
  --pm-sidebar-glow-soft: rgba(255, 255, 255, 0);
  --pm-sidebar-shadow: rgba(126, 143, 174, 0.16);
  --pm-btn-radius: 8px;
  --pm-btn-radius-pill: 999px;
  --pm-btn-size: 30px;
  --pm-btn-size-sm: 26px;
  --pm-btn-hover: var(--pm-pill-bg-hover);
  --pm-btn-active: var(--pm-pill-bg-active);
  --pm-btn-active-border: var(--pm-pill-border-hover);
}

button,
input,
select,
textarea {
  font: inherit;
  font-feature-settings: 'calt', 'kern', 'liga', 'ss03';
}

button {
  -webkit-tap-highlight-color: transparent;
}

::selection {
  background: color-mix(in srgb, var(--pm-accent) 24%, transparent);
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-thumb {
  background: var(--pm-border-strong);
  border-radius: 999px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

.text-slate-200,
.text-slate-300 {
  color: var(--pm-text) !important;
}

.text-slate-400,
.text-slate-500 {
  color: var(--pm-text-muted) !important;
}

.text-slate-600 {
  color: var(--pm-text-subtle) !important;
}

.text-indigo-400,
.text-indigo-500,
.text-amber-400,
.text-amber-500 {
  color: var(--pm-text) !important;
}

.text-red-400 {
  color: var(--pm-danger) !important;
}

.bg-slate-600 {
  background: var(--pm-border-strong) !important;
}

.app-root,
.app-root input,
.app-root select,
.app-root textarea,
.app-root button {
  font-size: var(--pm-font-size, 13px);
  font-family:
    'Inter Variable',
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    sans-serif;
  font-feature-settings: 'calt', 'kern', 'liga', 'ss03';
  letter-spacing: 0;
}

.app-root .text-xs,
.app-root .record-desc,
.app-root .snap-name,
.app-root .msg-content {
  font-size: var(--pm-small-font-size, 12px) !important;
}

.app-root .prompt-name {
  font-size: var(--pm-prompt-font-size, 15px) !important;
}

.app-root .prompt-preview {
  font-size: var(--pm-prompt-preview-font-size, 13px) !important;
}

.app-root.hide-prompt-preview .prompt-preview {
  display: none !important;
}

.hidden-file-input {
  display: none !important;
}
</style>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
  background: var(--pm-bg);
  color: var(--pm-text);
  font-family:
    'Inter Variable',
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    sans-serif;
  overflow: hidden;
  border: 1px solid var(--pm-border);
  border-radius: 12px;
  box-shadow: var(--pm-shadow);
}
/* Global radial glow — gives sidebar's backdrop-filter something to refract,
   producing the "acrylic glass over cloudy sky" feel from the brief. */
.app-root::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: var(--pm-glow-1, none), var(--pm-glow-2, none), var(--pm-glow-3, none);
  z-index: 0;
}
.app-root::after {
  display: none;
}
.app-root > * {
  position: relative;
  z-index: 1;
}
.app-root.fullscreen {
  border: 0;
  border-radius: 0;
}
.title-bar,
.main-body {
  position: relative;
}
.title-bar {
  z-index: 30;
  overflow: visible;
}
.main-body {
  z-index: 1;
}
.window-resize-handle {
  position: absolute;
  z-index: 200;
}
.resize-top {
  top: 0;
  left: 12px;
  right: 12px;
  height: 8px;
  cursor: ns-resize;
}
.resize-right {
  top: 12px;
  right: 0;
  width: 8px;
  bottom: 12px;
  cursor: ew-resize;
}
.resize-bottom {
  left: 12px;
  right: 12px;
  bottom: 0;
  height: 8px;
  cursor: ns-resize;
}
.resize-left {
  top: 12px;
  left: 0;
  width: 8px;
  bottom: 12px;
  cursor: ew-resize;
}
.resize-top-left,
.resize-top-right,
.resize-bottom-left,
.resize-bottom-right {
  width: 16px;
  height: 16px;
}
.resize-top-left {
  top: 0;
  left: 0;
  cursor: nwse-resize;
}
.resize-top-right {
  top: 0;
  right: 0;
  cursor: nesw-resize;
}
.resize-bottom-left {
  bottom: 0;
  left: 0;
  cursor: nesw-resize;
}
.resize-bottom-right {
  right: 0;
  bottom: 0;
  cursor: nwse-resize;
}
.main-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
  background: transparent;
}
.sidebar-edge-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 220;
  opacity: 0.08;
  transform: translateX(-1px);
}
.sidebar-edge-handle:hover,
.sidebar-edge-handle.dragging {
  opacity: 0.34;
}
.preset-workspace {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--pm-bg-workspace);
}
.preset-workspace-content,
.api-settings-page {
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.preset-workspace-content {
  display: flex;
  flex-direction: column;
}
.api-settings-page {
  z-index: 90;
  background: var(--pm-bg-workspace);
}
.preset-panels {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}
.center-area {
  min-width: 0;
  background: transparent;
}
.second-preset-area {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
}
.second-toggle {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-right: 0;
  border-radius: 8px 0 0 8px;
  background: color-mix(in srgb, var(--pm-bg-elevated) 24%, transparent);
  color: var(--pm-text-subtle);
  cursor: pointer;
  z-index: 20;
  backdrop-filter: blur(18px);
  transition:
    background 0.12s,
    color 0.12s,
    opacity 0.12s;
}
.second-toggle:hover {
  color: var(--pm-text);
  border-color: var(--pm-border);
  background: color-mix(in srgb, var(--pm-bg-hover) 62%, transparent);
}
.second-toggle.active {
  right: auto;
  position: relative;
  align-self: center;
  margin-left: -1px;
}
.ui-settings-panel {
  position: absolute;
  top: calc(var(--pm-titlebar-height, 52px) + 2px);
  right: 18px;
  z-index: 800;
  width: 260px;
  padding: 12px;
  border: 1px solid var(--pm-border-strong);
  border-radius: 14px;
  background: var(--pm-bg-panel);
  color: var(--pm-text);
  box-shadow: var(--pm-shadow);
}
.settings-head,
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.settings-head {
  margin-bottom: 12px;
  font-weight: 650;
}
.settings-presets {
  display: grid;
  gap: 7px;
  margin-bottom: 10px;
}
.settings-preset-slot {
  display: grid;
  grid-template-columns: 1fr 30px;
  gap: 6px;
}
.settings-preset-apply,
.settings-reset-btn {
  border: 1px solid var(--pm-border);
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
}
.settings-preset-apply {
  min-width: 0;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 9px;
  text-align: left;
}
.settings-preset-apply span {
  color: var(--pm-text);
  font-weight: 620;
}
.settings-preset-apply small {
  overflow: hidden;
  color: var(--pm-text-subtle);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.settings-preset-save {
  width: 30px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
}
.settings-preset-apply:hover,
.settings-preset-apply.active,
.settings-preset-save:hover,
.settings-reset-btn:hover {
  border-color: var(--pm-border-strong);
  background: var(--pm-bg-hover);
  color: var(--pm-text);
}
.settings-reset-btn {
  width: 100%;
  height: 30px;
  margin-bottom: 14px;
  border-radius: 9px;
}
.settings-close {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
}
.settings-close:hover {
  border-color: var(--pm-border);
  background: var(--pm-bg-hover);
  color: var(--pm-text);
}
.settings-row {
  color: var(--pm-text-muted);
  font-size: 12px;
}
.settings-row-spaced {
  margin-top: 14px;
}
.settings-value {
  color: var(--pm-text);
}
.settings-range {
  width: 100%;
  margin: 10px 0 12px;
  accent-color: var(--pm-accent);
}
.settings-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.settings-actions button {
  height: 28px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
}
.settings-actions button:hover,
.settings-actions button.active {
  border-color: var(--pm-accent);
  background: var(--pm-accent);
  color: var(--pm-accent-text);
}
.settings-pop-enter-active,
.settings-pop-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}
.settings-pop-enter-from,
.settings-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
