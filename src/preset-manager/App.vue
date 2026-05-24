<template>
  <div
    class="app-root"
    :class="[`theme-${theme}`, { fullscreen: isFullscreen, 'hide-prompt-preview': promptPreviewLines === 0, 'left-collapsed': leftCollapsed }]"
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
      @undo="doUndo"
      @redo="doRedo"
      @toggle-history="showHistory = !showHistory"
      @toggle-theme="toggleTheme"
      @toggle-ui-settings="showUiSettings = !showUiSettings"
      @toggle-annotation="showAnnotation = !showAnnotation"
      @toggle-dev-theme-panel="devTheme.togglePanel"
      @toggle-left-sidebar="leftCollapsed = !leftCollapsed"
      @select-preset="selectMainPreset"
      @create-preset="createOfficialPreset"
      @rename-preset="renameOfficialPreset"
      @delete-preset="deleteOfficialPreset"
      @create-prompt="createOfficialPrompt"
      @append-unused-prompt="openUnusedPromptPicker"
      @import-prompts="openOfficialPromptImport"
      @export-prompts="downloadPresetPromptExport"
      @reset-prompt-order="resetOfficialPromptOrder"
      @toggle-fullscreen="toggleFullscreen"
      @close="closePanel"
    />

    <input
      ref="officialPromptImportInput"
      class="hidden-file-input"
      type="file"
      accept=".json,application/json"
      @change="handleImportPromptsFile"
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

    <HistoryPanel :visible="showHistory" @close="showHistory = false" />

    <AnnotationOverlay v-if="showAnnotation" @close="showAnnotation = false" />

    <Transition name="unused-picker-pop">
      <div v-if="showUnusedPromptPicker" class="unused-picker-backdrop" @click.self="showUnusedPromptPicker = false">
        <div class="unused-picker-card">
          <div class="unused-picker-head">
            <div>
              <div class="unused-picker-title">添加未使用条目</div>
              <div class="unused-picker-subtitle">{{ manager.mainUnusedPrompts.length }} 个可添加条目</div>
            </div>
            <button class="unused-picker-close" title="关闭" @click="showUnusedPromptPicker = false">
              <i class="fas fa-times text-xs" />
            </button>
          </div>

          <div v-if="!manager.mainUnusedPrompts.length" class="unused-picker-empty">
            当前预设没有未使用条目
          </div>
          <div v-else class="unused-picker-list">
            <button
              v-for="prompt in manager.mainUnusedPrompts"
              :key="getPromptKey(prompt)"
              class="unused-picker-item"
              @click="appendOfficialUnusedPrompt(prompt)"
            >
              <span class="unused-picker-name">{{ prompt.name }}</span>
              <span class="unused-picker-role">{{ prompt.role }}</span>
            </button>
          </div>
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
              <small>{{ Math.round(uiPresets[preset.key].promptScale * 100) }}% · {{ previewLabel(uiPresets[preset.key].promptPreviewLines) }}</small>
            </button>
            <button class="settings-preset-save" :title="`保存当前比例到${preset.label}`" @click="saveCurrentToUiPreset(preset.key)">
              <i class="fas fa-save text-xs" />
            </button>
          </div>
        </div>

        <button class="settings-reset-btn" @click="resetUiSettingsDefaults">
          恢复默认比例
        </button>

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
      <div class="window-resize-handle resize-top-left" @mousedown.stop.prevent="onWindowResizeStart($event, 'top-left')" />
      <div class="window-resize-handle resize-top-right" @mousedown.stop.prevent="onWindowResizeStart($event, 'top-right')" />
      <div class="window-resize-handle resize-bottom-left" @mousedown.stop.prevent="onWindowResizeStart($event, 'bottom-left')" />
      <div class="window-resize-handle resize-bottom-right" @mousedown.stop.prevent="onWindowResizeStart($event, 'bottom-right')" />
    </template>
  </div>
</template>

<script setup lang="ts">
import TitleBar from './components/TitleBar.vue';
import LeftSidebar from './components/LeftSidebar.vue';
import SplitHandle from './components/SplitHandle.vue';
import PresetPanel from './components/PresetPanel.vue';
import AiAssistant from './components/AiAssistant.vue';
import HistoryPanel from './components/HistoryPanel.vue';
import AnnotationOverlay from './components/AnnotationOverlay.vue';
import DevThemePanel from './components/DevThemePanel.vue';
import DevThemeStyleInjector from './components/DevThemeStyleInjector.vue';
import { useDevThemeStore } from './stores/devTheme';
import { getPromptKey, useManagerStore } from './stores/manager';
import { useHistoryStore } from './stores/history';
import { startParentDrag } from './utils/drag';
import { clampSecondPresetWidth, getSecondPresetBounds } from './utils/panelLayout';
import { CODEX_REFERENCE_METRICS } from './designMetrics';
import { getInstanceStorageKey, type PresetManagerInstanceKey } from './utils/instanceConfig';

const manager = useManagerStore();
const history = useHistoryStore();
const devTheme = useDevThemeStore();

const isFullscreen = ref(false);
const showHistory = ref(false);
const showAnnotation = ref(false);
const showSecondPreset = ref(false);
const showUnusedPromptPicker = ref(false);
const leftCollapsed = ref(false);
const leftWidth = ref(CODEX_REFERENCE_METRICS.sidebar.width);
const rightWidth = ref(280);
const presetWorkspaceRef = ref<HTMLElement>();
const instanceKey = inject<PresetManagerInstanceKey>('presetManagerInstanceKey', 'default');

const WINDOW_STATE_KEY = getInstanceStorageKey(instanceKey, 'WindowState');
const WINDOW_STATE_VERSION_KEY = getInstanceStorageKey(instanceKey, 'WindowStateVersion');
const WINDOW_STATE_VERSION = `codex-${CODEX_REFERENCE_METRICS.window.width}x${CODEX_REFERENCE_METRICS.window.height}`;
const THEME_KEY = getInstanceStorageKey(instanceKey, 'Theme');
const UI_SCALE_KEY = getInstanceStorageKey(instanceKey, 'UiScale');
const PROMPT_SCALE_KEY = getInstanceStorageKey(instanceKey, 'PromptScale');
const PROMPT_PREVIEW_LINES_KEY = getInstanceStorageKey(instanceKey, 'PromptPreviewLines');
const UI_PRESETS_KEY = getInstanceStorageKey(instanceKey, 'UiPresets');
type WindowState = { top: number; left: number; width: number; height: number };
type AppTheme = 'dark' | 'light';
type UiPresetKey = 'compact' | 'standard' | 'large';
type UiPresetConfig = { uiScale: number; promptScale: number; promptPreviewLines: number };
type UiPresetMap = Record<UiPresetKey, UiPresetConfig>;
let lastWindowState: WindowState | null = null;
type WindowResizeDirection = 'top' | 'right' | 'bottom' | 'left' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
const MIN_WINDOW_WIDTH = 640;
const MIN_WINDOW_HEIGHT = 420;
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
const officialPromptImportInput = ref<HTMLInputElement>();
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
      ids.add(getPromptKey(item));
    }
  }
  return ids;
});

function normalizePromptForCollection(prompt: PresetPrompt): PresetNormalPrompt {
  const promptKey = getPromptKey(prompt) || prompt.id;
  const stored = {
    ...klona(prompt as any),
    id: prompt.id || promptKey,
    identifier: promptKey,
    name: prompt.name,
    enabled: prompt.enabled ?? true,
    position: (prompt as any).position ?? { type: 'relative' as const },
    role: prompt.role,
    content: (prompt as any).content ?? '',
  };
  stored.injection_position = stored.injection_position
    ?? (stored.position?.type === 'in_chat' ? 1 : 0);
  stored.injection_depth = stored.injection_depth ?? stored.position?.depth ?? 4;
  stored.injection_order = stored.injection_order ?? stored.position?.order ?? 100;
  stored.injection_trigger = Array.isArray(stored.injection_trigger) ? stored.injection_trigger : [];
  stored.forbid_overrides = Boolean(stored.forbid_overrides);

  return stored as PresetNormalPrompt;
}

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

function getMainPresetSnapshot() {
  return manager.presetName ? klona(getPreset(manager.presetName)) : null;
}

function getUniquePresetName(baseName: string) {
  const base = baseName.trim() || '新预设';
  if (!manager.presetNames.includes(base)) return base;

  let index = 2;
  while (manager.presetNames.includes(`${base} ${index}`)) {
    index += 1;
  }
  return `${base} ${index}`;
}

async function createOfficialPreset() {
  const defaultName = getUniquePresetName('新预设');
  const name = prompt('输入新预设名称', defaultName)?.trim();
  if (!name) return;

  const created = await manager.createPresetByName(name);
  if (created) {
    history.createSnapshot(name, undefined, true);
    toastr.success(`已新建预设 "${name}"`, '', { timeOut: 1600 });
  } else {
    toastr.warning('新建失败：名称为空、重复或不可用', '', { timeOut: 1800 });
  }
}

async function renameOfficialPreset() {
  if (!manager.presetName) {
    toastr.warning('请先选择主预设', '', { timeOut: 1400 });
    return;
  }

  const oldName = manager.presetName;
  const name = prompt('输入新的预设名称', oldName)?.trim();
  if (!name || name === oldName) return;

  const renamed = await manager.renamePresetByName(oldName, name);
  if (renamed) {
    history.createSnapshot(name, undefined, true);
    toastr.success(`已重命名为 "${name}"`, '', { timeOut: 1600 });
  } else {
    toastr.warning('重命名失败：名称为空、重复或不可用', '', { timeOut: 1800 });
  }
}

async function deleteOfficialPreset() {
  if (!manager.presetName) {
    toastr.warning('请先选择主预设', '', { timeOut: 1400 });
    return;
  }

  const name = manager.presetName;
  if (!confirm(`确定删除预设 "${name}" 吗？此操作会删除酒馆中的预设文件，不能通过插件历史撤销。`)) return;

  const deleted = await manager.deletePresetByName(name);
  if (deleted) {
    toastr.info(`已删除预设 "${name}"`, '', { timeOut: 1600 });
  } else {
    toastr.warning('删除失败：预设不存在或不可删除', '', { timeOut: 1800 });
  }
}

async function createOfficialPrompt() {
  if (!manager.presetName) {
    toastr.warning('请先选择主预设', '', { timeOut: 1400 });
    return;
  }

  const before = getMainPresetSnapshot();
  const prompt = await manager.createPromptInPreset('main');
  const after = getMainPresetSnapshot();
  if (before && after && prompt) {
    history.recordOperation(manager.presetName, before, after, `新建条目: ${prompt.name}`);
    toastr.success('已新建条目', '', { timeOut: 1400 });
  }
}

function openUnusedPromptPicker() {
  if (!manager.presetName) {
    toastr.warning('请先选择主预设', '', { timeOut: 1400 });
    return;
  }
  if (!manager.mainUnusedPrompts.length) {
    toastr.info('当前预设没有未使用条目', '', { timeOut: 1400 });
    return;
  }
  showUnusedPromptPicker.value = true;
}

async function appendOfficialUnusedPrompt(prompt: PresetPrompt) {
  if (!manager.presetName) return;

  const before = getMainPresetSnapshot();
  const appended = await manager.appendUnusedPromptToPreset(getPromptKey(prompt), 'main');
  const after = getMainPresetSnapshot();
  if (appended && before && after) {
    history.recordOperation(manager.presetName, before, after, `添加未使用条目: ${prompt.name}`);
    showUnusedPromptPicker.value = false;
    toastr.success(`已添加 "${prompt.name}"`, '', { timeOut: 1400 });
  }
}

function openOfficialPromptImport() {
  if (!manager.presetName) {
    toastr.warning('请先选择主预设', '', { timeOut: 1400 });
    return;
  }
  officialPromptImportInput.value?.click();
}

async function handleImportPromptsFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || !manager.presetName) return;

  try {
    const text = await file.text();
    const importData = JSON.parse(text);
    const before = getMainPresetSnapshot();
    const count = await manager.importPromptsToPreset(importData, 'main');
    const after = getMainPresetSnapshot();
    if (!count) {
      toastr.warning('未找到可导入的条目', '', { timeOut: 1600 });
      return;
    }
    if (before && after) {
      history.recordOperation(manager.presetName, before, after, `导入条目: ${count} 个`);
    }
    toastr.success(`已导入 ${count} 个条目`, '', { timeOut: 1600 });
  } catch (e) {
    console.error('[PresetManager] import prompts failed:', e);
    toastr.error('导入失败，请检查 JSON 格式', '', { timeOut: 2200 });
  }
}

function getFormattedDateForFile() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function downloadPresetPromptExport() {
  const exportData = manager.exportPromptsFromPreset('main');
  if (!exportData || !manager.presetName) {
    toastr.warning('请先选择主预设', '', { timeOut: 1400 });
    return;
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${manager.presetName}-prompts-${getFormattedDateForFile()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function resetOfficialPromptOrder() {
  if (!manager.presetName) {
    toastr.warning('请先选择主预设', '', { timeOut: 1400 });
    return;
  }
  if (!confirm('确定按注入顺序重排当前预设条目吗？可以通过撤销恢复。')) return;

  const before = getMainPresetSnapshot();
  const changed = await manager.resetPromptOrder('main');
  const after = getMainPresetSnapshot();
  if (changed && before && after) {
    history.recordOperation(manager.presetName, before, after, '重置预设顺序');
    toastr.success('已重置条目顺序', '', { timeOut: 1400 });
  }
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
provide('presetManagerWindowStateKey', WINDOW_STATE_KEY);
provide('presetManagerWindowStateVersionKey', WINDOW_STATE_VERSION_KEY);
provide('presetManagerWindowStateVersion', WINDOW_STATE_VERSION);

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
    promptPreviewLines: Math.max(0, Math.min(Math.round(Number.isFinite(nextPreviewLines) ? nextPreviewLines : fallback.promptPreviewLines), 3)),
  };
}

function readUiPresets(): UiPresetMap {
  try {
    const saved = JSON.parse(localStorage.getItem(UI_PRESETS_KEY) || '{}') as Partial<Record<UiPresetKey, Partial<UiPresetConfig>>>;
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
  return Math.abs(uiScale.value - preset.uiScale) < 0.001
    && Math.abs(promptScale.value - preset.promptScale) < 0.001
    && promptPreviewLines.value === preset.promptPreviewLines;
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
  lastWindowState = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
  localStorage.setItem(WINDOW_STATE_KEY, JSON.stringify(lastWindowState));
  localStorage.setItem(WINDOW_STATE_VERSION_KEY, WINDOW_STATE_VERSION);
}

function applyWindowState(state: WindowState) {
  const style = iframeEl.style;
  style.transform = '';
  style.right = '';
  style.bottom = '';
  style.top = `${Math.max(0, state.top)}px`;
  style.left = `${Math.max(0, state.left)}px`;
  style.width = `${Math.max(MIN_WINDOW_WIDTH, state.width)}px`;
  style.height = `${Math.max(MIN_WINDOW_HEIGHT, state.height)}px`;
  style.maxWidth = 'none';
  style.maxHeight = 'none';
  style.borderRadius = '12px';
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
  const cursor = direction.includes('top') && direction.includes('left') || direction.includes('bottom') && direction.includes('right')
    ? 'nwse-resize'
    : direction.includes('top') && direction.includes('right') || direction.includes('bottom') && direction.includes('left')
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

      style.transform = '';
      style.left = `${nextLeft}px`;
      style.top = `${nextTop}px`;
      style.width = `${nextW}px`;
      style.height = `${nextH}px`;
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
  const promptKey = getPromptKey(prompt);
  const existingIdx = firstFolder.items.findIndex(i => getPromptKey(i) === promptKey);
  if (existingIdx >= 0) {
    manager.removeFromFavorites(firstFolder.id, existingIdx);
    toastr.info('已取消收藏', '', { timeOut: 1200 });
  } else {
    manager.addToFavorites(firstFolder.id, normalizePromptForCollection(prompt));
    toastr.success('已收藏', '', { timeOut: 1200 });
  }
}

onMounted(() => {
  applyTheme(theme.value);

  const savedState = readWindowState();
  if (savedState) applyWindowState(savedState);

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
</script>

<style>
html, body {
  margin: 0 !important;
  padding: 0;
  overflow: hidden !important;
  height: 100%;
  background: transparent;
}
* { box-sizing: border-box; }

body[data-pm-theme="dark"],
.theme-dark {
  --pm-bg: oklch(0.155 0.008 255);
  --pm-bg-transparent: oklch(0.155 0.008 255 / 0);
  --pm-bg-soft: oklch(0.182 0.008 255);
  --pm-bg-panel: oklch(0.195 0.008 255);
  --pm-bg-titlebar: #1c1e25;
  --pm-bg-workspace: #1c1e25;
  --pm-bg-sidebar: rgba(34, 38, 48, 0.62);
  --pm-bg-elevated: oklch(0.225 0.008 255);
  --pm-row-bg: transparent;
  --pm-row-hover: rgba(255, 255, 255, 0.035);
  --pm-row-active: rgba(255, 255, 255, 0.055);
  --pm-row-border: rgba(255, 255, 255, 0.038);
  --pm-bg-hover: rgba(255, 255, 255, 0.045);
  --pm-bg-active: rgba(255, 255, 255, 0.065);
  --pm-border: rgba(255, 255, 255, 0.06);
  --pm-border-strong: rgba(255, 255, 255, 0.10);
  --pm-text: oklch(0.97 0 0);
  --pm-text-muted: oklch(0.72 0.01 255);
  --pm-text-subtle: oklch(0.55 0.01 255);
  --pm-accent: oklch(0.93 0 0);
  --pm-accent-text: oklch(0.16 0.008 255);
  --pm-success: #7bd99a;
  --pm-warning: #e7b96e;
  --pm-danger: #f08686;
  --pm-input-bg: rgba(255, 255, 255, 0.028);
  --pm-shadow: 0 28px 80px rgba(0, 0, 0, 0.42);
  --pm-sidebar-glow: rgba(255, 255, 255, 0);
  --pm-sidebar-glow-soft: rgba(255, 255, 255, 0);
  --pm-sidebar-shadow: rgba(0, 0, 0, 0.22);
  --pm-sidebar-edge: rgba(255, 255, 255, 0.08);
  --pm-divider: rgba(255, 255, 255, 0.05);
  --pm-split-line: rgba(255, 255, 255, 0.075);
  --pm-split-line-hover: rgba(255, 255, 255, 0.20);
  --pm-ai-surface: rgba(28, 32, 42, 0.92);
  --pm-ai-capsule: rgba(28, 32, 42, 0.78);
  --pm-control-highlight: rgba(255, 255, 255, 0.05);
  --pm-control-highlight-hover: rgba(255, 255, 255, 0.085);
  --pm-send-bg: oklch(0.97 0 0);
  --pm-send-fg: oklch(0.16 0.008 255);
  --pm-btn-radius: 6px;
  --pm-btn-radius-pill: 999px;
  --pm-btn-size: 30px;
  --pm-btn-size-sm: 26px;
  --pm-btn-hover: rgba(255, 255, 255, 0.05);
  --pm-btn-active: rgba(255, 255, 255, 0.07);
  --pm-btn-active-border: rgba(255, 255, 255, 0.10);
}

body[data-pm-theme="light"],
.theme-light {
  --pm-bg: #f6f6f2;
  --pm-bg-transparent: rgba(246, 246, 242, 0);
  --pm-bg-soft: #ffffff;
  --pm-bg-panel: #fbfbf8;
  --pm-bg-titlebar: #f6f6f2;
  --pm-bg-workspace: #f6f6f2;
  --pm-bg-sidebar: rgba(252, 252, 248, 0.62);
  --pm-bg-elevated: #ffffff;
  --pm-row-bg: transparent;
  --pm-row-hover: rgba(20, 24, 31, 0.038);
  --pm-row-active: rgba(20, 24, 31, 0.058);
  --pm-row-border: rgba(20, 24, 31, 0.05);
  --pm-bg-hover: rgba(20, 24, 31, 0.045);
  --pm-bg-active: rgba(20, 24, 31, 0.07);
  --pm-border: rgba(20, 24, 31, 0.07);
  --pm-border-strong: rgba(20, 24, 31, 0.12);
  --pm-text: #16181d;
  --pm-text-muted: #5d636e;
  --pm-text-subtle: #8a9099;
  --pm-accent: #1d1e22;
  --pm-accent-text: #ffffff;
  --pm-danger: #c74444;
  --pm-success: #197a36;
  --pm-warning: #9b6b00;
  --pm-shadow: 0 28px 80px rgba(24, 31, 44, 0.18);
  --pm-input-bg: #ffffff;
  --pm-sidebar-glow: rgba(255, 255, 255, 0);
  --pm-sidebar-glow-soft: rgba(255, 255, 255, 0);
  --pm-sidebar-shadow: rgba(126, 143, 174, 0.16);
  --pm-sidebar-edge: rgba(20, 24, 31, 0.08);
  --pm-divider: rgba(20, 24, 31, 0.05);
  --pm-split-line: rgba(20, 24, 31, 0.08);
  --pm-split-line-hover: rgba(20, 24, 31, 0.20);
  --pm-ai-surface: rgba(255, 255, 255, 0.92);
  --pm-ai-capsule: rgba(255, 255, 255, 0.78);
  --pm-control-highlight: rgba(20, 24, 31, 0.045);
  --pm-control-highlight-hover: rgba(20, 24, 31, 0.085);
  --pm-send-bg: #1d1e22;
  --pm-send-fg: #ffffff;
  --pm-btn-radius: 6px;
  --pm-btn-radius-pill: 999px;
  --pm-btn-size: 30px;
  --pm-btn-size-sm: 26px;
  --pm-btn-hover: rgba(20, 24, 31, 0.055);
  --pm-btn-active: rgba(20, 24, 31, 0.085);
  --pm-btn-active-border: rgba(20, 24, 31, 0.13);
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  -webkit-tap-highlight-color: transparent;
}

::selection {
  background: color-mix(in srgb, var(--pm-accent) 22%, transparent);
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
</style>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
  background: var(--pm-bg-transparent);
  color: var(--pm-text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
  border: 1px solid var(--pm-border);
  border-radius: 14px;
  box-shadow: var(--pm-shadow);
}
.app-root::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--pm-left-rail-width, 240px);
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.022), transparent 38%),
    var(--pm-bg-sidebar);
  backdrop-filter: blur(32px) saturate(140%);
  -webkit-backdrop-filter: blur(32px) saturate(140%);
  box-shadow: inset -0.8px 0 0 var(--pm-sidebar-edge);
  z-index: 0;
}
.app-root::after {
  display: none;
}
.app-root.left-collapsed::before,
.app-root.left-collapsed::after {
  display: none;
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
  transition: background 0.12s, color 0.12s, opacity 0.12s;
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
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.settings-pop-enter-from,
.settings-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.unused-picker-backdrop {
  position: absolute;
  inset: var(--pm-titlebar-height, 52px) 0 0;
  z-index: 820;
  display: flex;
  justify-content: center;
  padding-top: 18px;
  background: color-mix(in srgb, var(--pm-bg) 34%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.unused-picker-card {
  width: min(420px, calc(100% - 32px));
  max-height: min(520px, calc(100% - 36px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--pm-border-strong);
  border-radius: 14px;
  background: color-mix(in srgb, var(--pm-bg-elevated) 92%, transparent);
  color: var(--pm-text);
  box-shadow: var(--pm-shadow);
  backdrop-filter: blur(22px) saturate(116%);
  -webkit-backdrop-filter: blur(22px) saturate(116%);
}
.unused-picker-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 14px;
  border-bottom: 1px solid var(--pm-border);
}
.unused-picker-title {
  font-weight: 670;
}
.unused-picker-subtitle {
  margin-top: 3px;
  color: var(--pm-text-subtle);
  font-size: 12px;
}
.unused-picker-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--pm-btn-radius, 8px);
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
}
.unused-picker-close:hover {
  background: var(--pm-btn-hover);
  color: var(--pm-text);
}
.unused-picker-list {
  overflow-y: auto;
  padding: 6px;
}
.unused-picker-item {
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  text-align: left;
}
.unused-picker-item:hover {
  background: var(--pm-bg-hover);
  color: var(--pm-text);
}
.unused-picker-name {
  min-width: 0;
  overflow: hidden;
  color: var(--pm-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.unused-picker-role {
  flex-shrink: 0;
  color: var(--pm-text-subtle);
  font-size: 11px;
}
.unused-picker-empty {
  padding: 28px 18px;
  color: var(--pm-text-subtle);
  text-align: center;
}
.unused-picker-pop-enter-active,
.unused-picker-pop-leave-active {
  transition: opacity 0.12s ease;
}
.unused-picker-pop-enter-from,
.unused-picker-pop-leave-to {
  opacity: 0;
}
</style>
