<template>
  <div
    class="app-root"
    :class="[`theme-${theme}`, { fullscreen: isFullscreen, 'hide-prompt-preview': promptPreviewLines === 0 }]"
    :style="uiVars"
  >
    <TitleBar
      :is-fullscreen="isFullscreen"
      :can-undo="history.canUndo"
      :can-redo="history.canRedo"
      :ai-visible="ai.visible"
      :theme="theme"
      @undo="doUndo"
      @redo="doRedo"
      @toggle-history="showHistory = !showHistory"
      @toggle-ai="ai.toggleVisible()"
      @toggle-theme="toggleTheme"
      @toggle-ui-settings="showUiSettings = !showUiSettings"
      @toggle-fullscreen="toggleFullscreen"
      @close="closePanel"
    />

    <SplitHandle
      class="sidebar-edge-handle"
      direction="vertical"
      :style="sidebarSplitHandleStyle"
      @drag-start="onLeftDragStart"
      @resize="onLeftSplitResize"
    />

    <div class="main-body">
      <LeftSidebar ref="leftSidebarRef" :width="leftWidth" />

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
import { useManagerStore } from './stores/manager';
import { useHistoryStore } from './stores/history';
import { useAiStore } from './stores/ai';
import { startParentDrag } from './utils/drag';
import { clampSecondPresetWidth, getSecondPresetBounds } from './utils/panelLayout';

const manager = useManagerStore();
const history = useHistoryStore();
const ai = useAiStore();

const isFullscreen = ref(false);
const showHistory = ref(false);
const showSecondPreset = ref(false);
const leftWidth = ref(240);
const rightWidth = ref(280);
const leftSidebarRef = ref<any>();
const presetWorkspaceRef = ref<HTMLElement>();

const WINDOW_STATE_KEY = 'presetManagerWindowState';
const THEME_KEY = 'presetManagerTheme';
const UI_SCALE_KEY = 'presetManagerUiScale';
const PROMPT_SCALE_KEY = 'presetManagerPromptScale';
const PROMPT_PREVIEW_LINES_KEY = 'presetManagerPromptPreviewLines';
const UI_PRESETS_KEY = 'presetManagerUiPresets';
type WindowState = { top: number; left: number; width: number; height: number };
type AppTheme = 'dark' | 'light';
type UiPresetKey = 'compact' | 'standard' | 'large';
type UiPresetConfig = { uiScale: number; promptScale: number; promptPreviewLines: number };
type UiPresetMap = Record<UiPresetKey, UiPresetConfig>;
let lastWindowState: WindowState | null = null;
type WindowResizeDirection = 'top' | 'right' | 'bottom' | 'left' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
const MIN_WINDOW_WIDTH = 640;
const MIN_WINDOW_HEIGHT = 420;

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

const startLeftWidth = ref(240);
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
  };
});

const sidebarSplitHandleStyle = computed(() => ({
  position: 'absolute',
  top: '0',
  bottom: '0',
  left: `${leftSidebarRef.value?.isCollapsed ? 32 : leftWidth.value}px`,
  zIndex: 220,
}));

const favoritedIds = computed(() => {
  const ids = new Set<string>();
  for (const folder of manager.favorites) {
    for (const item of folder.items) {
      ids.add(item.id);
    }
  }
  return ids;
});

function onLeftDragStart() {
  startLeftWidth.value = leftWidth.value;
}

function onLeftSplitResize(delta: number) {
  leftWidth.value = Math.max(160, Math.min(startLeftWidth.value + delta, 500));
}

function onRightDragStart() {
  ensureSecondPresetWidth();
  startRightWidth.value = rightWidth.value;
}

function onRightSplitResize(delta: number) {
  rightWidth.value = clampSecondPresetWidth(startRightWidth.value - delta, getPresetWorkspaceWidth());
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
    applyWindowState(lastWindowState ?? readWindowState() ?? { top: 80, left: 120, width: 900, height: 600 });
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
  --pm-bg: #202126;
  --pm-bg-soft: #24262d;
  --pm-bg-panel: #22242a;
  --pm-bg-sidebar: #1b2230;
  --pm-bg-elevated: #292c34;
  --pm-row-bg: transparent;
  --pm-row-hover: rgba(255, 255, 255, 0.048);
  --pm-row-active: rgba(255, 255, 255, 0.07);
  --pm-row-border: rgba(255, 255, 255, 0.075);
  --pm-bg-hover: rgba(255, 255, 255, 0.055);
  --pm-bg-active: rgba(255, 255, 255, 0.085);
  --pm-border: rgba(255, 255, 255, 0.078);
  --pm-border-strong: rgba(255, 255, 255, 0.13);
  --pm-text: #f1f2f4;
  --pm-text-muted: #aaaeb7;
  --pm-text-subtle: #777d89;
  --pm-accent: #f4f1e8;
  --pm-accent-text: #171717;
  --pm-danger: #ff7676;
  --pm-success: #80d794;
  --pm-warning: #e8bf6a;
  --pm-shadow: 0 24px 68px rgba(0, 0, 0, 0.34);
  --pm-input-bg: #1d1f25;
  --pm-sidebar-glow: rgba(117, 144, 218, 0.25);
  --pm-sidebar-glow-soft: rgba(54, 76, 130, 0.28);
  --pm-sidebar-shadow: rgba(8, 13, 25, 0.23);
  --pm-divider: rgba(255, 255, 255, 0.06);
  --pm-split-line: rgba(255, 255, 255, 0.075);
  --pm-split-line-hover: rgba(244, 241, 232, 0.42);
  --pm-ai-surface: rgba(32, 33, 38, 0.96);
  --pm-ai-capsule: rgba(29, 31, 37, 0.96);
}

body[data-pm-theme="light"],
.theme-light {
  --pm-bg: #f6f6f2;
  --pm-bg-soft: #ffffff;
  --pm-bg-panel: #fbfbf8;
  --pm-bg-sidebar: #eef1f7;
  --pm-bg-elevated: #ffffff;
  --pm-row-bg: transparent;
  --pm-row-hover: rgba(20, 24, 31, 0.045);
  --pm-row-active: rgba(20, 24, 31, 0.068);
  --pm-row-border: rgba(20, 24, 31, 0.08);
  --pm-bg-hover: rgba(20, 24, 31, 0.052);
  --pm-bg-active: rgba(20, 24, 31, 0.08);
  --pm-border: rgba(20, 24, 31, 0.105);
  --pm-border-strong: rgba(20, 24, 31, 0.17);
  --pm-text: #16181d;
  --pm-text-muted: #5d636e;
  --pm-text-subtle: #8a9099;
  --pm-accent: #1d1e22;
  --pm-accent-text: #ffffff;
  --pm-danger: #c74444;
  --pm-success: #197a36;
  --pm-warning: #9b6b00;
  --pm-shadow: 0 24px 70px rgba(24, 31, 44, 0.16);
  --pm-input-bg: #ffffff;
  --pm-sidebar-glow: rgba(174, 191, 230, 0.62);
  --pm-sidebar-glow-soft: rgba(226, 233, 246, 0.92);
  --pm-sidebar-shadow: rgba(126, 143, 174, 0.16);
  --pm-divider: rgba(0, 0, 0, 0.08);
  --pm-split-line: rgba(20, 24, 31, 0.095);
  --pm-split-line-hover: rgba(20, 24, 31, 0.34);
  --pm-ai-surface: rgba(250, 250, 247, 0.97);
  --pm-ai-capsule: rgba(255, 255, 255, 0.98);
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
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-thumb {
  background: var(--pm-border-strong);
  border: 3px solid transparent;
  border-radius: 999px;
  background-clip: content-box;
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
.app-root .draft-name,
.app-root .folder-name,
.app-root .fav-item-name,
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

.app-root .title-text {
  font-size: var(--pm-title-font-size, 13px) !important;
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
  background: var(--pm-bg);
  color: var(--pm-text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
  border: 1px solid var(--pm-border);
  border-radius: 14px;
  box-shadow: var(--pm-shadow);
}
.app-root.fullscreen {
  border: 0;
  border-radius: 0;
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
  background: var(--pm-bg);
}
.sidebar-edge-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 220;
  opacity: 0.3;
  transform: translateX(-1px);
}
.sidebar-edge-handle:hover,
.sidebar-edge-handle.dragging {
  opacity: 0.72;
}
.preset-workspace {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--pm-bg-soft) 30%, transparent), transparent 140px),
    var(--pm-bg);
}
.preset-panels {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}
.center-area {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.second-preset-area {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: color-mix(in srgb, var(--pm-bg-soft) 18%, transparent);
}
.second-toggle {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--pm-bg-elevated) 86%, transparent);
  border: 1px solid var(--pm-border);
  border-right: none;
  border-radius: 7px 0 0 7px;
  color: var(--pm-text-subtle);
  cursor: pointer;
  z-index: 20;
  transition: all 0.12s;
}
.second-toggle:hover {
  color: var(--pm-text);
  background: var(--pm-bg-hover);
}
.second-toggle.active {
  right: auto;
  position: relative;
  align-self: center;
  margin-left: -1px;
}
.ui-settings-panel {
  position: absolute;
  top: 54px;
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
</style>
