<template>
  <div
    class="app-root"
    :class="[
      `theme-${theme}`,
      { fullscreen: isFullscreen, 'hide-prompt-preview': promptPreviewLines === 0, 'left-collapsed': leftCollapsed },
    ]"
    :style="uiVars"
    :data-dev-sidebar="devTheme.enabled && devTheme.currentTargets.sidebar ? 'on' : undefined"
    :data-dev-sidebar-width="leftCollapsed ? 0 : leftWidth"
    :data-dev-workspace="devTheme.enabled && devTheme.currentTargets.workspace ? 'on' : undefined"
    :data-dev-panel="devTheme.enabled && devTheme.currentTargets.panel ? 'on' : undefined"
  >
    <TitleBar
      :is-fullscreen="isFullscreen"
      :can-undo="history.canUndo"
      :can-redo="history.canRedo"
      :left-collapsed="leftCollapsed"
      :current-preset-name="activeMainPresetName"
      :preset-names="manager.presetNames"
      :preset-token-total="mainPresetTokenTotal"
      :native-token-total="nativePromptTokenTotal"
      :right-sidebar-open="showRightAuxArea"
      @undo="doUndo"
      @redo="doRedo"
      @save-preset="saveCurrentPresetToTavern"
      @toggle-left-sidebar="leftCollapsed = !leftCollapsed"
      @select-preset="selectMainPreset"
      @toggle-right-sidebar="toggleRightSidebar"
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
      <LeftSidebar
        :width="leftWidth"
        :collapsed="leftCollapsed"
        :active-preset-name="activeMainPresetName"
        :active-mode="sidebarMode"
        :chat-tabs="mainChatTabs"
        :active-chat-id="activeMainChatTabId"
        :annotation-visible="showAnnotation"
        :code-inspector-enabled="codeInspectorEnabled"
        :theme="theme"
        :ui-scale="uiScale"
        :prompt-scale="promptScale"
        :prompt-preview-lines="promptPreviewLines"
        :ui-presets="uiPresets"
        :ui-preset-options="uiPresetOptions"
        @change-mode="setSidebarMode"
        @new-chat="createMainChatTab"
        @select-chat="selectMainChatTab"
        @close-chat="closeMainChatTab"
        @select-preset="selectMainPreset"
        @preset-action="runSidebarPresetAction"
        @open-api-settings="openAiConfig"
        @toggle-history="showHistory = !showHistory"
        @toggle-theme="toggleTheme"
        @toggle-annotation="showAnnotation = !showAnnotation"
        @toggle-dev-theme-panel="devTheme.togglePanel()"
        @toggle-code-inspector="toggleCodeInspector"
        @set-ui-scale="setUiScale"
        @set-prompt-scale="setPromptScale"
        @set-prompt-preview-lines="setPromptPreviewLines"
        @apply-ui-preset="applyUiPreset"
        @save-current-to-ui-preset="saveCurrentToUiPreset"
        @reset-ui-settings-defaults="resetUiSettingsDefaults"
      />

      <div ref="presetWorkspaceRef" class="preset-workspace">
        <div class="preset-workspace-content">
          <div class="preset-panels">
            <div class="center-area" style="flex: 1; min-width: 200px">
              <AiAssistant
                v-if="sidebarMode === 'chat'"
                variant="main"
                :session-id="mainChatSessionId"
                :title="mainChatTitle"
                @open-config="openAiConfig"
                @session-title="renameChatTabBySession"
              />
              <template v-else>
                <PresetPanel
                  ref="mainPresetPanelRef"
                  panel-id="main"
                  :active-preset-name="activeMainPresetName"
                  :favorited-ids="favoritedIds"
                  :migration-active="activeMigrationOpen"
                  :migration-diff-items="presetMigrationDiff.items"
                  @favorite="onFavorite"
                  @focus-migration-prompt="focusMigrationPromptFromPanel"
                />
                <AiAssistant @open-config="openAiConfig" />
              </template>
            </div>

            <template v-if="showRightAuxArea">
              <SplitHandle hit-area="narrow" direction="vertical" @drag-start="onRightDragStart" @resize="onRightSplitResize" />
              <div class="right-aux-area" :style="{ width: `${effectiveRightWidth}px` }">
                <div v-if="rightAuxTabs.length" class="right-aux-tab-strip">
                  <div
                    v-for="tab in rightAuxTabs"
                    :key="tab.id"
                    class="right-aux-tab-item"
                    :class="{ active: tab.id === activeRightAuxTabId }"
                  >
                    <button class="right-aux-tab" type="button" @click="setActiveRightAuxTab(tab.id)">
                      <Icon :name="tab.type === 'preset' ? 'folder' : tab.type === 'chat' ? 'message-square' : 'plus'" :size="13" />
                      <span>{{ tab.title }}</span>
                    </button>
                    <button class="right-aux-tab-close" type="button" title="关闭标签页" @click.stop="closeRightAuxTab(tab.id)">
                      <Icon name="x" :size="12" />
                    </button>
                  </div>

                  <div class="right-aux-add-wrap">
                    <button
                      class="right-aux-add-button"
                      type="button"
                      title="新建侧边栏标签页"
                      @click.stop="createEmptyRightAuxTab"
                    >
                      <Icon name="plus" :size="14" />
                    </button>
                  </div>
                </div>

                <div v-if="activeRightAuxTab?.type === 'empty'" class="right-aux-empty">
                  <div class="right-aux-choice-grid">
                    <button type="button" class="right-aux-choice-card" @click="replaceRightAuxTabWithPreset(activeRightAuxTab.id)">
                      <span class="right-aux-choice-icon"><Icon name="folder" :size="20" /></span>
                      <span class="right-aux-choice-title">第二预设</span>
                      <small>把一个预设作为侧边栏参考打开</small>
                    </button>
                    <button type="button" class="right-aux-choice-card" @click="replaceRightAuxTabWithChat(activeRightAuxTab.id)">
                      <span class="right-aux-choice-icon"><Icon name="message-square" :size="20" /></span>
                      <span class="right-aux-choice-title">侧边聊天</span>
                      <small>发起侧边对话</small>
                    </button>
                  </div>
                </div>

                <div v-else-if="!activeRightAuxTab" class="right-aux-empty">
                  <div class="right-aux-choice-grid">
                    <button type="button" class="right-aux-choice-card" @click="openFirstAvailablePresetInRightSidebar()">
                      <span class="right-aux-choice-icon"><Icon name="folder" :size="20" /></span>
                      <span class="right-aux-choice-title">第二预设</span>
                      <small>把一个预设作为侧边栏参考打开</small>
                    </button>
                    <button type="button" class="right-aux-choice-card" @click="createSideChatTab()">
                      <span class="right-aux-choice-icon"><Icon name="message-square" :size="20" /></span>
                      <span class="right-aux-choice-title">侧边聊天</span>
                      <small>发起侧边对话</small>
                    </button>
                  </div>
                </div>

                <template v-else-if="activeRightAuxTab?.type === 'preset'">
                  <div class="right-preset-select-row">
                    <div
                      class="right-preset-select-wrap"
                      :class="{ open: rightPresetMenuTabId === activeRightAuxTab.id }"
                      :data-right-preset-menu-id="activeRightAuxTab.id"
                    >
                      <button
                        class="right-preset-select"
                        :class="{ open: rightPresetMenuTabId === activeRightAuxTab.id }"
                        type="button"
                        :title="activeRightAuxTab.presetName"
                        @click.stop="toggleRightPresetMenu(activeRightAuxTab.id)"
                      >
                        <span>{{ activeRightAuxTab.presetName }}</span>
                        <Icon name="chevron-down" :size="12" class="right-preset-select-chevron" />
                      </button>
                      <Transition name="preset-context-pop">
                        <div
                          v-if="rightPresetMenuTabId === activeRightAuxTab.id"
                          class="right-preset-menu"
                          @pointerdown.stop
                          @mousedown.stop
                          @click.stop
                        >
                          <button
                            v-for="name in manager.presetNames"
                            :key="name"
                            class="right-preset-menu-item"
                            :class="{ active: name === activeRightAuxTab.presetName }"
                            type="button"
                            :title="name"
                            @click.stop="selectRightPresetFromMenu(activeRightAuxTab.id, name)"
                          >
                            <span>{{ name }}</span>
                            <Icon v-if="name === activeRightAuxTab.presetName" name="check" :size="13" />
                          </button>
                          <div v-if="manager.presetNames.length === 0" class="right-preset-menu-empty">暂无预设</div>
                        </div>
                      </Transition>
                    </div>
                    <button
                      class="right-preset-migration-action"
                      :class="{ active: activeRightAuxTab.migrationOpen }"
                      type="button"
                      @click="toggleRightPresetMigration(activeRightAuxTab.id)"
                    >
                      <Icon name="refresh-cw" :size="13" />
                      <span>迁移</span>
                    </button>
                  </div>
                  <PresetMigrationPanel
                    v-show="activeRightAuxTab.migrationOpen"
                    @focus-main-prompt="focusMainPromptFromMigration"
                    @focus-second-prompt="focusSecondPromptFromMigration"
                  />
                  <PresetPanel
                    ref="secondPresetPanelRef"
                    panel-id="second"
                    :active-preset-name="activeRightAuxTab.presetName"
                    :favorited-ids="favoritedIds"
                    :show-second-header="false"
                    :migration-active="activeRightAuxTab.migrationOpen"
                    :migration-diff-items="presetMigrationDiff.items"
                    @favorite="onFavorite"
                    @focus-migration-prompt="focusMigrationPromptFromPanel"
                  />
                </template>

                <AiAssistant
                  v-else-if="activeRightAuxTab?.type === 'chat'"
                  variant="side"
                  :session-id="activeRightAuxTab.sessionId"
                  :title="activeRightAuxTab.title"
                  @open-config="openAiConfig"
                  @session-title="renameChatTabBySession"
                />
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <HistoryPanel :visible="showHistory" @close="showHistory = false" />
    <ConfirmDialog />
    <TextPromptDialog />

    <AnnotationOverlay v-if="showAnnotation" @close="showAnnotation = false" />

    <div v-if="ai.showConfig" class="api-settings-page">
      <AiConfig variant="page" @close="ai.showConfig = false" />
    </div>

    <input
      ref="officialPromptImportInput"
      class="hidden-file-input"
      type="file"
      accept="application/json,.json"
      @change="handleImportPromptsFile"
    />
    <input
      ref="presetImportInput"
      class="hidden-file-input"
      type="file"
      accept="application/json,.json"
      @change="handleImportPresetFile"
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
import type { SidebarPresetActionPayload } from './components/SidebarPresetList.vue';
import Icon from './components/Icon.vue';
import SplitHandle from './components/SplitHandle.vue';
import PresetPanel from './components/PresetPanel.vue';
import PresetMigrationPanel from './components/PresetMigrationPanel.vue';
import AiAssistant from './components/AiAssistant.vue';
import AiConfig from './components/AiConfig.vue';
import HistoryPanel from './components/HistoryPanel.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import TextPromptDialog from './components/TextPromptDialog.vue';
import AnnotationOverlay from './components/AnnotationOverlay.vue';
import DevThemeStyleInjector from './components/DevThemeStyleInjector.vue';
import DevThemePanel from './components/DevThemePanel.vue';
import { useDevThemeStore } from './stores/devTheme';
import { useAiStore } from './stores/ai';
import { useConfirmStore } from './stores/confirm';
import { useTextPromptStore } from './stores/textPrompt';
import { getPromptKey, useManagerStore } from './stores/manager';
import { useHistoryStore } from './stores/history';
import { startParentDrag } from './utils/drag';
import { buildPresetMigrationDiff } from './utils/presetCompare';
import {
  clampSecondPresetWidth,
  clampWindowState,
  clampWindowStateWithVisibleArea,
  getCollapsedSecondPresetWidth,
  getSecondPresetBounds,
  type WindowState,
} from './utils/panelLayout';
import { CODEX_REFERENCE_METRICS } from './designMetrics';
import { getInstanceStorageKey, type PresetManagerInstanceKey } from './utils/instanceConfig';
import { CODEX_DARK_GLASS_WALLPAPER_DATA_URL } from './utils/codexDarkGlassWallpaper';

const manager = useManagerStore();
const history = useHistoryStore();
const devTheme = useDevThemeStore();
const ai = useAiStore();
const confirmDialog = useConfirmStore();
const textPrompt = useTextPromptStore();

const isFullscreen = ref(false);
const showHistory = ref(false);
const showAnnotation = ref(false);
const showUnusedPromptPicker = ref(false);
const activeMainPresetName = computed(() => manager.presetName);
const sidebarMode = ref<SidebarMode>('presets');
const mainChatTabs = ref<ChatWorkspaceTab[]>([]);
const activeMainChatTabId = ref('');
const rightAuxOpen = ref(false);
const rightAuxTabs = ref<RightAuxTab[]>([]);
const activeRightAuxTabId = ref('');
const rightPresetMenuTabId = ref('');
const leftCollapsed = ref(false);
const leftWidth = ref(CODEX_REFERENCE_METRICS.sidebar.width);
const rightWidth = ref(280);
const presetWorkspaceWidth = ref(900);
const presetWorkspaceRef = ref<HTMLElement>();
type PresetPanelExpose = {
  scrollToPromptAnchor?: (payload: { key?: string; index?: number; mainAnchorIndex?: number; alignViewportTop?: number }) => void;
  getPromptListViewportTop?: () => number | null;
};
const mainPresetPanelRef = ref<PresetPanelExpose | null>(null);
const secondPresetPanelRef = ref<PresetPanelExpose | null>(null);
const officialPromptImportInput = ref<HTMLInputElement | null>(null);
const presetImportInput = ref<HTMLInputElement | null>(null);
const creatingOfficialPrompt = ref(false);
const unusedPromptSearch = ref('');
const instanceKey = inject<PresetManagerInstanceKey>('presetManagerInstanceKey', 'default');
const codeInspectorControls = inject<CodeInspectorControls | null>('presetManagerCodeInspector', null);
const codeInspectorEnabled = ref(codeInspectorControls?.isEnabled() ?? false);
let removeCodeInspectorSelectListener: (() => void) | null = null;
let presetSyncTimer: number | null = null;
let nativeTokenObserver: MutationObserver | null = null;
let nativeTokenPollTimer: number | null = null;
let presetWorkspaceResizeObserver: ResizeObserver | null = null;
let pendingTavernPresetName = '';
let pendingTavernPresetUntil = 0;

const WINDOW_STATE_KEY = getInstanceStorageKey(instanceKey, 'WindowState');
const WINDOW_STATE_VERSION_KEY = getInstanceStorageKey(instanceKey, 'WindowStateVersion');
const WINDOW_STATE_VERSION = `codex-${CODEX_REFERENCE_METRICS.window.width}x${CODEX_REFERENCE_METRICS.window.height}`;
const THEME_KEY = getInstanceStorageKey(instanceKey, 'Theme');
const UI_SCALE_KEY = getInstanceStorageKey(instanceKey, 'UiScale');
const PROMPT_SCALE_KEY = getInstanceStorageKey(instanceKey, 'PromptScale');
const PROMPT_PREVIEW_LINES_KEY = getInstanceStorageKey(instanceKey, 'PromptPreviewLines');
const UI_PRESETS_KEY = getInstanceStorageKey(instanceKey, 'UiPresets');
type AppTheme = 'dark' | 'light';
type SidebarMode = 'presets' | 'workbench' | 'favorites' | 'chat';
type RightAuxTabType = 'empty' | 'preset' | 'chat';
type ChatWorkspaceTab = {
  id: string;
  type: 'chat';
  title: string;
  sessionId: string;
};
type EmptyRightAuxTab = {
  id: string;
  type: 'empty';
  title: string;
};
type PresetRightAuxTab = {
  id: string;
  type: 'preset';
  title: string;
  presetName: string;
  migrationOpen: boolean;
};
type ChatRightAuxTab = {
  id: string;
  type: 'chat';
  title: string;
  sessionId: string;
};
type RightAuxTab = EmptyRightAuxTab | PresetRightAuxTab | ChatRightAuxTab;
type UiPresetKey = 'compact' | 'standard' | 'large';
type UiPresetConfig = { uiScale: number; promptScale: number; promptPreviewLines: number };
type UiPresetMap = Record<UiPresetKey, UiPresetConfig>;
type CodeInspectorSelectPayload = {
  path: string;
  selectors?: string[];
  label: string;
  tag: string;
  stability?: 'source' | 'stable' | 'fallback';
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
const TAVERN_PRESET_SWITCH_GRACE_MS = 2500;

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
    '--pm-prompt-editor-font-size': `${14.5 * font * Math.min(prompt, 1.18)}px`,
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
    '--pm-sidebar-default-image': `url('${CODEX_DARK_GLASS_WALLPAPER_DATA_URL}')`,
    '--pm-sidebar-default-bottom-fade': 'linear-gradient(180deg, rgba(0, 0, 0, 0) 54%, rgba(0, 0, 0, 0.59) 65%, rgba(0, 0, 0, 0.59) 100%)',
    '--pm-sidebar-default-mask': 'linear-gradient(rgba(48, 51, 68, 0.70), rgba(48, 51, 68, 0.70))',
    '--pm-sidebar-default-backdrop': 'blur(0px) saturate(90%) brightness(55%) contrast(105%)',
  };
});

const sidebarSplitHandleStyle = computed(() => ({
  position: 'absolute',
  top: '0',
  bottom: '0',
  left: `${leftCollapsed.value ? 0 : leftWidth.value}px`,
  zIndex: 220,
}));

const nativePromptTokenTotal = ref<number | null>(null);
const mainPresetTokenTotal = ref<number | null>(null);

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

const showRightAuxArea = computed(() => rightAuxOpen.value);
const activeRightAuxTab = computed(() => rightAuxTabs.value.find(tab => tab.id === activeRightAuxTabId.value) ?? null);
const activeMigrationOpen = computed(() => activeRightAuxTab.value?.type === 'preset' && activeRightAuxTab.value.migrationOpen);
const effectiveRightWidth = computed(() =>
  leftCollapsed.value
    ? getCollapsedSecondPresetWidth(rightWidth.value, presetWorkspaceWidth.value)
    : rightWidth.value,
);
const presetMigrationDiff = computed(() => buildPresetMigrationDiff({
  mainPrompts: manager.mainPrompts,
  secondPrompts: manager.secondPrompts,
  isLocked: key => manager.isPromptLocked(key, 'main'),
}));
const mainChatTab = computed(() => mainChatTabs.value.find(tab => tab.id === activeMainChatTabId.value) ?? null);
const mainChatSessionId = computed(() => mainChatTab.value?.sessionId ?? 'main-chat-default');
const mainChatTitle = computed(() => mainChatTab.value?.title ?? '新聊天');

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

function createChatWorkspaceTab(scope: 'main' | 'side', index: number): ChatWorkspaceTab {
  const id = `${scope}-chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    type: 'chat',
    title: index <= 1 ? '新聊天' : `新聊天 ${index}`,
    sessionId: id,
  };
}

function createMainChatTab() {
  const tab = createChatWorkspaceTab('main', mainChatTabs.value.length + 1);
  mainChatTabs.value.push(tab);
  activeMainChatTabId.value = tab.id;
  sidebarMode.value = 'chat';
  return tab;
}

function ensureMainChatTab() {
  const existing = mainChatTabs.value.find(tab => tab.id === activeMainChatTabId.value) ?? mainChatTabs.value[0];
  if (existing) {
    activeMainChatTabId.value = existing.id;
    return existing;
  }

  return createMainChatTab();
}

function setSidebarMode(mode: SidebarMode) {
  sidebarMode.value = mode;
  if (mode === 'chat') ensureMainChatTab();
}

function selectMainChatTab(tabId: string) {
  const tab = mainChatTabs.value.find(item => item.id === tabId);
  if (!tab) return;
  activeMainChatTabId.value = tab.id;
  sidebarMode.value = 'chat';
}

function closeMainChatTab(tabId: string) {
  const closedIndex = mainChatTabs.value.findIndex(tab => tab.id === tabId);
  if (closedIndex < 0) return;
  const closed = mainChatTabs.value[closedIndex];
  mainChatTabs.value.splice(closedIndex, 1);
  ai.clearMessages(closed.sessionId);

  if (activeMainChatTabId.value !== tabId) return;
  const nextTab = mainChatTabs.value[Math.min(closedIndex, mainChatTabs.value.length - 1)] ?? null;
  if (nextTab) {
    activeMainChatTabId.value = nextTab.id;
  } else {
    createMainChatTab();
  }
}

function isGeneratedChatTitle(title: string) {
  return title === '新聊天' || /^新聊天 \d+$/.test(title);
}

function renameChatTabBySession(payload: { sessionId: string; title: string }) {
  const title = payload.title.trim();
  if (!payload.sessionId || !title) return;

  const mainTab = mainChatTabs.value.find(tab => tab.sessionId === payload.sessionId);
  if (mainTab && isGeneratedChatTitle(mainTab.title)) mainTab.title = title;

  const sideTab = rightAuxTabs.value.find(tab => tab.type === 'chat' && tab.sessionId === payload.sessionId);
  if (sideTab && sideTab.type === 'chat' && isGeneratedChatTitle(sideTab.title)) sideTab.title = title;
}

function setActiveRightAuxTab(tabId: string) {
  const tab = rightAuxTabs.value.find(item => item.id === tabId);
  if (!tab) return;
  activeRightAuxTabId.value = tab.id;
  if (tab.type === 'preset') manager.loadSecondPreset(tab.presetName);
}

function upsertRightAuxTab(tab: RightAuxTab) {
  const existingIndex = rightAuxTabs.value.findIndex(item =>
    tab.type === 'preset' && item.type === 'preset' ? item.presetName === tab.presetName : item.id === tab.id,
  );

  if (existingIndex >= 0) {
    rightAuxTabs.value.splice(existingIndex, 1, { ...rightAuxTabs.value[existingIndex], ...tab } as RightAuxTab);
    return rightAuxTabs.value[existingIndex];
  }

  rightAuxTabs.value.push(tab);
  return tab;
}

function closeRightAuxTab(tabId: string) {
  const closedIndex = rightAuxTabs.value.findIndex(tab => tab.id === tabId);
  if (closedIndex < 0) return;
  rightAuxTabs.value.splice(closedIndex, 1);
  if (activeRightAuxTabId.value !== tabId) return;

  const nextTab = rightAuxTabs.value[Math.min(closedIndex, rightAuxTabs.value.length - 1)] ?? null;
  activeRightAuxTabId.value = nextTab?.id ?? '';
  if (nextTab?.type === 'preset') manager.loadSecondPreset(nextTab.presetName);
}

function createEmptyRightAuxTab() {
  const tab = upsertRightAuxTab({
    id: `empty-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'empty',
    title: '新标签页',
  });
  rightAuxOpen.value = true;
  ensureSecondPresetWidth();
  setActiveRightAuxTab(tab.id);
  return tab;
}

function createSideChatTab(tabIdToReplace?: string) {
  const chatIndex = rightAuxTabs.value.filter(tab => tab.type === 'chat').length + 1;
  const chatTab = createChatWorkspaceTab('side', chatIndex);
  const nextTab: ChatRightAuxTab = {
    id: chatTab.id,
    type: 'chat',
    title: chatTab.title,
    sessionId: chatTab.sessionId,
  };
  if (tabIdToReplace) {
    const replaceIndex = rightAuxTabs.value.findIndex(tab => tab.id === tabIdToReplace);
    if (replaceIndex >= 0) {
      rightAuxTabs.value.splice(replaceIndex, 1, nextTab);
    } else {
      rightAuxTabs.value.push(nextTab);
    }
  } else {
    upsertRightAuxTab(nextTab);
  }
  rightAuxOpen.value = true;
  ensureSecondPresetWidth();
  setActiveRightAuxTab(nextTab.id);
}

function replaceRightAuxTabWithChat(tabId: string) {
  createSideChatTab(tabId);
}

function openFirstAvailablePresetInRightSidebar(tabIdToReplace?: string) {
  const candidate = manager.presetNames.find(name => name !== manager.presetName) ?? manager.presetNames[0] ?? manager.presetName;
  if (candidate) openPresetInRightSidebar(candidate, tabIdToReplace);
}

function replaceRightAuxTabWithPreset(tabId: string) {
  openFirstAvailablePresetInRightSidebar(tabId);
}

function toggleRightPresetMigration(tabId: string) {
  const tab = rightAuxTabs.value.find(item => item.id === tabId);
  if (!tab || tab.type !== 'preset') return;
  tab.migrationOpen = !tab.migrationOpen;
}

function toggleRightPresetMenu(tabId: string) {
  const nextOpen = rightPresetMenuTabId.value !== tabId;
  rightPresetMenuTabId.value = nextOpen ? tabId : '';
  if (nextOpen) announceMenuOpen(`right-preset-menu:${tabId}`);
}

function selectRightPresetFromMenu(tabId: string, presetName: string) {
  rightPresetMenuTabId.value = '';
  changeRightPresetTabPreset(tabId, presetName);
}

function closeRightPresetMenuFromOutside(event?: Event) {
  if (!rightPresetMenuTabId.value) return;
  const target = event?.target as HTMLElement | null;
  if (target?.closest?.('[data-right-preset-menu-id]')) return;
  rightPresetMenuTabId.value = '';
}

function getPanelDocument() {
  return iframeEl.contentDocument ?? document;
}

function closeRightPresetMenuFromKey(event: KeyboardEvent) {
  if (event.key === 'Escape') rightPresetMenuTabId.value = '';
}

function closeRightPresetMenuFromPeer(event: Event) {
  const source = (event as CustomEvent<{ source?: string }>).detail?.source ?? '';
  if (source !== `right-preset-menu:${rightPresetMenuTabId.value}`) rightPresetMenuTabId.value = '';
}

function announceMenuOpen(source: string) {
  getPanelDocument().dispatchEvent(new CustomEvent('preset-manager-menu-opened', { detail: { source } }));
}

type MigrationFocusPayload = {
  key?: string;
  index?: number;
  mainIndex?: number;
  secondIndex?: number;
  mainAnchorIndex?: number;
};

function focusMainPromptFromMigration(payload: MigrationFocusPayload) {
  mainPresetPanelRef.value?.scrollToPromptAnchor?.({
    key: payload.key,
    index: payload.mainIndex ?? payload.index,
    mainAnchorIndex: payload.mainAnchorIndex,
    alignViewportTop: getMigrationAlignViewportTop(),
  });
}

function focusSecondPromptFromMigration(payload: MigrationFocusPayload) {
  secondPresetPanelRef.value?.scrollToPromptAnchor?.({
    key: payload.key,
    index: payload.secondIndex ?? payload.index,
    mainAnchorIndex: payload.secondIndex ?? payload.index,
    alignViewportTop: getMigrationAlignViewportTop(),
  });
}

function getMigrationAlignViewportTop() {
  const tops = [
    mainPresetPanelRef.value?.getPromptListViewportTop?.(),
    secondPresetPanelRef.value?.getPromptListViewportTop?.(),
  ].filter((top): top is number => typeof top === 'number' && Number.isFinite(top));
  return tops.length ? Math.max(...tops) : undefined;
}

function focusMigrationPromptFromPanel(payload: MigrationFocusPayload) {
  focusMainPromptFromMigration(payload);
  focusSecondPromptFromMigration(payload);
}

function selectMainPreset(name: string) {
  if (!name) return;
  const tavernPresetName = getTavernPresetName();
  if (name === manager.presetName && manager.preset && tavernPresetName === name) return;
  const loaded = manager.loadMainPreset(name);
  if (!loaded) return;

  pendingTavernPresetName = name;
  pendingTavernPresetUntil = Date.now() + TAVERN_PRESET_SWITCH_GRACE_MS;
  if (tavernPresetName !== name) loadPreset(name);
  history.createSnapshot(name, undefined, true);
}

async function runSidebarPresetAction(payload: SidebarPresetActionPayload) {
  if (payload.action === 'createPreset') await createOfficialPreset();
  if (payload.action === 'importPreset') triggerPresetImport();
  if (!payload.presetName) return;
  if (payload.action === 'openSecondPreset') openPresetInRightSidebar(payload.presetName);
  if (payload.action === 'renamePreset') await renameOfficialPreset(payload.presetName);
  if (payload.action === 'deletePreset') await deleteOfficialPreset(payload.presetName, payload.anchor);
}

function changeRightPresetTabPreset(tabId: string, presetName: string) {
  if (!presetName) return;
  const tab = rightAuxTabs.value.find(item => item.id === tabId);
  if (!tab || tab.type !== 'preset') return;
  const loaded = manager.loadSecondPreset(presetName);
  if (!loaded) return;
  const duplicateIndex = rightAuxTabs.value.findIndex(item =>
    item.id !== tabId && item.type === 'preset' && item.presetName === presetName,
  );
  if (duplicateIndex >= 0) {
    const duplicateTab = rightAuxTabs.value[duplicateIndex];
    if (duplicateTab.type === 'preset') duplicateTab.migrationOpen = false;
    rightAuxTabs.value = rightAuxTabs.value.filter(item => item.id !== tabId);
    setActiveRightAuxTab(duplicateTab.id);
    history.createSnapshot(presetName, undefined, true);
    return;
  }
  tab.id = `preset-${presetName}`;
  tab.presetName = presetName;
  tab.title = presetName;
  tab.migrationOpen = false;
  activeRightAuxTabId.value = tab.id;
  history.createSnapshot(presetName, undefined, true);
}

function openPresetInRightSidebar(presetName: string, tabIdToReplace?: string) {
  if (!presetName) return;
  const loaded = manager.loadSecondPreset(presetName);
  if (!loaded) return;
  const existingPreset = rightAuxTabs.value.find(tab =>
    tab.type === 'preset' && tab.presetName === presetName && tab.id !== tabIdToReplace,
  );
  if (existingPreset) {
    existingPreset.migrationOpen = false;
    if (tabIdToReplace) rightAuxTabs.value = rightAuxTabs.value.filter(tab => tab.id !== tabIdToReplace);
    rightAuxOpen.value = true;
    setActiveRightAuxTab(existingPreset.id);
    ensureSecondPresetWidth();
    history.createSnapshot(presetName, undefined, true);
    return;
  }
  const nextTab: PresetRightAuxTab = {
    id: `preset-${presetName}`,
    type: 'preset',
    title: presetName,
    presetName,
    migrationOpen: false,
  };
  const replaceIndex = tabIdToReplace ? rightAuxTabs.value.findIndex(tab => tab.id === tabIdToReplace) : -1;
  const tab = replaceIndex >= 0
    ? (rightAuxTabs.value.splice(replaceIndex, 1, nextTab), nextTab)
    : upsertRightAuxTab(nextTab);
  rightAuxOpen.value = true;
  setActiveRightAuxTab(tab.id);
  ensureSecondPresetWidth();
  nextTick(() => {
    rightWidth.value = getSecondPresetBounds(getPresetWorkspaceWidth()).center;
  });
  history.createSnapshot(presetName, undefined, true);
}

function openAiConfig() {
  ai.showConfig = true;
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
  if (creatingOfficialPrompt.value) return;
  creatingOfficialPrompt.value = true;
  try {
    const created = await recordMainOfficialChange('新建条目', () => manager.createPromptInPreset('main'));
    if (created) toastr.success('条目已新建', '', { timeOut: 1400 });
  } finally {
    creatingOfficialPrompt.value = false;
  }
}

async function createOfficialPreset() {
  const name = await textPrompt.prompt({
    title: '新建预设',
    label: '预设名称',
    placeholder: '输入新预设名称',
    confirmLabel: '新建',
  });
  const presetName = name?.trim();
  if (!presetName) return;

  const created = await manager.createPresetByName(presetName);
  if (created) {
    history.createSnapshot(manager.presetName, undefined, true);
    toastr.success('预设已新建', '', { timeOut: 1400 });
  } else {
    toastr.warning('预设名称不可用或已存在', '', { timeOut: 1600 });
  }
}

async function saveCurrentPresetToTavern() {
  const presetName = manager.presetName;
  if (!presetName) {
    toastr.warning('请先选择一个预设', '', { timeOut: 1600 });
    return;
  }

  try {
    const before = snapshotMainPreset();
    const nextPreset = klona(manager.preset ?? getPreset('in_use'));
    await replacePreset(presetName, nextPreset, { render: 'immediate' });
    await replacePreset('in_use', nextPreset, { render: 'immediate' });
    const after = snapshotMainPreset();
    if (before && after) history.recordOperation(presetName, before, after, '保存当前预设');
    manager.refreshMainPreset();
    toastr.success('预设已保存', '', { timeOut: 1400 });
  } catch (error) {
    console.error('[PresetManager] save current preset failed:', error);
    toastr.error('保存失败，请稍后重试', '', { timeOut: 2200 });
  }
}

async function renameOfficialPreset(targetPresetName = manager.presetName) {
  const currentName = targetPresetName;
  if (!currentName) {
    toastr.warning('请先选择一个预设', '', { timeOut: 1600 });
    return;
  }

  const name = await textPrompt.prompt({
    title: '重命名预设',
    label: '新的预设名称',
    defaultValue: currentName,
    confirmLabel: '重命名',
  });
  const nextName = name?.trim();
  if (!nextName || nextName === currentName) return;

  const renamed = await manager.renamePresetByName(currentName, nextName);
  if (renamed) {
    history.createSnapshot(manager.presetName, undefined, true);
    toastr.success('预设已重命名', '', { timeOut: 1400 });
  } else {
    toastr.warning('重命名失败，可能是名称已存在', '', { timeOut: 1800 });
  }
}

async function deleteOfficialPreset(targetPresetName = manager.presetName, anchor?: SidebarPresetActionPayload['anchor']) {
  const presetName = targetPresetName;
  if (!presetName) {
    toastr.warning('请先选择一个预设', '', { timeOut: 1600 });
    return;
  }
  if (!await confirmDialog.confirm({
    title: '删除预设',
    message: `确定删除预设 "${presetName}" 吗？此操作无法用撤回恢复。`,
    confirmLabel: '删除',
    tone: 'danger',
    anchor,
  })) return;

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

function getPresetImportName(file: File) {
  return file.name.replace(/\.[^.]+$/, '').trim() || 'imported-preset';
}

function triggerPresetImport() {
  presetImportInput.value?.click();
}

async function handleImportPresetFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const presetName = getPresetImportName(file);
    const imported = await importRawPreset(presetName, await file.text());
    manager.refreshPresetList();
    if (imported || manager.presetNames.includes(presetName)) {
      selectMainPreset(presetName);
      toastr.success('预设已导入', '', { timeOut: 1600 });
    } else {
      toastr.warning('导入预设失败', '', { timeOut: 1800 });
    }
  } catch (error) {
    console.error('[PresetManager] import preset failed:', error);
    toastr.error('导入失败，请确认文件是有效预设 JSON', '', { timeOut: 2200 });
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
  if (!await confirmDialog.confirm({
    title: '重置条目顺序',
    message: '确定按官方默认顺序重置当前预设的条目吗？',
    confirmLabel: '重置',
  })) return;

  const reset = await recordMainOfficialChange('重置条目顺序', () => manager.resetPromptOrder('main'));
  if (reset) toastr.success('条目顺序已重置', '', { timeOut: 1400 });
  else toastr.warning('重置顺序失败', '', { timeOut: 1600 });
}

function getPresetWorkspaceWidth() {
  return presetWorkspaceRef.value?.clientWidth ?? iframeEl?.getBoundingClientRect().width ?? presetWorkspaceWidth.value;
}

function refreshPresetWorkspaceWidth() {
  presetWorkspaceWidth.value = Math.max(1, Math.round(getPresetWorkspaceWidth()));
}

function ensureSecondPresetWidth() {
  refreshPresetWorkspaceWidth();
  rightWidth.value = clampSecondPresetWidth(rightWidth.value, presetWorkspaceWidth.value);
}

function toggleRightSidebar() {
  if (showRightAuxArea.value) {
    rightAuxOpen.value = false;
    return;
  }

  rightAuxOpen.value = true;
  ensureSecondPresetWidth();
}

watch(rightAuxOpen, visible => {
  if (!visible) return;
  nextTick(() => {
    refreshPresetWorkspaceWidth();
    rightWidth.value = getSecondPresetBounds(presetWorkspaceWidth.value).center;
  });
});

watch(
  () =>
    manager.mainPrompts
      .map(prompt => `${String((prompt as any).identifier ?? getPromptKey(prompt))}:${String((prompt as any).content ?? '').length}`)
      .join('|'),
  () => readMainPresetTokenTotal(),
);

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

function syncPresetFromTavern() {
  if (isWaitingForTavernPresetSwitch()) return;
  const tavernPresetName = getTavernPresetName();
  if (!tavernPresetName) return;
  if (tavernPresetName === manager.presetName) return;
  const synced = manager.syncMainPresetFromTavern(tavernPresetName);
  if (synced && manager.presetName) {
    history.createSnapshot(manager.presetName, undefined, true);
  }
}

function isWaitingForTavernPresetSwitch() {
  if (!pendingTavernPresetName) return false;
  if (getTavernPresetName() === pendingTavernPresetName) {
    pendingTavernPresetName = '';
    pendingTavernPresetUntil = 0;
    return false;
  }
  if (Date.now() > pendingTavernPresetUntil) {
    pendingTavernPresetName = '';
    pendingTavernPresetUntil = 0;
    return false;
  }
  return true;
}

function getTavernPresetName() {
  try {
    return getLoadedPresetName();
  } catch (error) {
    console.warn('[PresetManager] failed to read current tavern preset:', error);
    return '';
  }
}

function startPresetSyncFromTavern() {
  syncPresetFromTavern();
  if (presetSyncTimer !== null) return;
  presetSyncTimer = window.setInterval(syncPresetFromTavern, 700);
}

function parseNativeTokenText(text: string | null | undefined) {
  if (!text) return null;
  const compact = text.replace(/\s+/g, ' ').trim();
  const match = compact.match(/[\d,.]+/);
  if (!match) return null;
  const value = Number(match[0].replace(/,/g, ''));
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : null;
}

function readPromptManagerHeaderTokenTotal() {
  const headerNode = parentDoc.querySelector('.completion_prompt_manager_header') ?? null;
  if (!headerNode) return null;

  const totalNode = Array.from(headerNode.querySelectorAll('div')).find(node =>
    /Total Tokens:/i.test(node.textContent ?? ''),
  ) ?? headerNode;
  return parseNativeTokenText(totalNode.textContent);
}

function readPromptManagerRowTokenTotal() {
  let total = 0;
  let matched = 0;
  parentDoc.querySelectorAll('#completion_prompt_manager [data-pm-identifier]').forEach(row => {
    const tokenValue = row.querySelector('.prompt_manager_prompt_tokens')?.getAttribute('data-pm-tokens') ?? '';
    const parsed = parseNativeTokenText(tokenValue);
    if (parsed === null) return;
    total += parsed;
    matched += 1;
  });
  return matched > 0 ? total : null;
}

function readLegacyResultTokenTotal() {
  return parseNativeTokenText(parentDoc.querySelector('#result_info_total_tokens')?.textContent);
}

function readNativePromptTokenTotal() {
  nativePromptTokenTotal.value =
    readPromptManagerHeaderTokenTotal()
    ?? readLegacyResultTokenTotal()
    ?? readPromptManagerRowTokenTotal();
}

function readMainPresetTokenTotal() {
  const visiblePromptKeys = new Set(manager.mainPrompts.map(prompt => String((prompt as any).identifier ?? getPromptKey(prompt))));
  if (!visiblePromptKeys.size) {
    mainPresetTokenTotal.value = 0;
    return;
  }

  let total = 0;
  let matched = 0;
  parentDoc.querySelectorAll('#completion_prompt_manager [data-pm-identifier]').forEach(row => {
    const identifier = row.getAttribute('data-pm-identifier');
    if (!identifier || !visiblePromptKeys.has(identifier)) return;
    const tokenValue = row.querySelector('.prompt_manager_prompt_tokens')?.getAttribute('data-pm-tokens') ?? '';
    const parsed = parseNativeTokenText(tokenValue);
    if (parsed === null) return;
    total += parsed;
    matched += 1;
  });

  mainPresetTokenTotal.value = matched > 0 ? total : null;
}

function startNativePromptTokenSync() {
  readNativePromptTokenTotal();
  readMainPresetTokenTotal();
  const tokenTotalNode = parentDoc.querySelector('.completion_prompt_manager_header') ?? parentDoc.querySelector('#result_info_total_tokens');
  const promptManagerNode = parentDoc.querySelector('#completion_prompt_manager');
  const observedNodes = [tokenTotalNode, promptManagerNode].filter((node): node is Element => Boolean(node));
  if (observedNodes.length) {
    nativeTokenObserver = new MutationObserver(() => {
      readNativePromptTokenTotal();
      readMainPresetTokenTotal();
    });
    observedNodes.forEach(node => {
      nativeTokenObserver?.observe(node, { childList: true, characterData: true, subtree: true, attributes: true });
    });
  }
  nativeTokenPollTimer = window.setInterval(() => {
    readNativePromptTokenTotal();
    readMainPresetTokenTotal();
  }, 1200);
}

function exposePresetManagerDebug() {
  const debugWindow = window as typeof window & {
    __presetManagerDebug?: () => Record<string, unknown>;
  };
  debugWindow.__presetManagerDebug = () => ({
    presetName: manager.presetName,
    activeMainPresetName: activeMainPresetName.value,
    currentPresetName: manager.currentPresetName,
    tavernPresetName: getTavernPresetName(),
    aiShowConfig: ai.showConfig,
    sidebarMode: sidebarMode.value,
    contextMenuCount: document.querySelectorAll('.preset-context-menu').length,
    runtimeMarker: 'preset-manager-runtime-fix-20260605',
    mainPromptCount: manager.mainPrompts.length,
    mainPresetTokenTotal: mainPresetTokenTotal.value,
    nativePromptTokenTotal: nativePromptTokenTotal.value,
    presetNames: manager.presetNames.slice(0, 12),
    titleText: document.querySelector('.preset-title-text')?.textContent ?? null,
    activeSidebarItems: Array.from(document.querySelectorAll('.sidebar-preset-item.active')).map(
      item => item.textContent?.trim() ?? '',
    ),
    sidebarItems: Array.from(document.querySelectorAll('.sidebar-preset-item')).slice(0, 12).map(
      item => item.textContent?.trim() ?? '',
    ),
  });
}

onMounted(() => {
  applyTheme(theme.value);
  exposePresetManagerDebug();
  ai.startTavernApiProfileSync();
  startPresetSyncFromTavern();
  startNativePromptTokenSync();
  refreshPresetWorkspaceWidth();
  presetWorkspaceResizeObserver = new ResizeObserver(refreshPresetWorkspaceWidth);
  if (presetWorkspaceRef.value) presetWorkspaceResizeObserver.observe(presetWorkspaceRef.value);

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
    const detail = (event as CustomEvent<CodeInspectorSelectPayload>).detail;
    if (!detail?.path) return;
    devTheme.setSelectedElement(detail);
  });

  getPanelDocument().addEventListener('pointerdown', closeRightPresetMenuFromOutside, true);
  getPanelDocument().addEventListener('mousedown', closeRightPresetMenuFromOutside, true);
  getPanelDocument().addEventListener('click', closeRightPresetMenuFromOutside, true);
  parentDoc.addEventListener('pointerdown', closeRightPresetMenuFromOutside, true);
  parentDoc.addEventListener('mousedown', closeRightPresetMenuFromOutside, true);
  parentDoc.addEventListener('click', closeRightPresetMenuFromOutside, true);
  getPanelDocument().defaultView?.addEventListener('keydown', closeRightPresetMenuFromKey, true);
  parentDoc.defaultView?.addEventListener('keydown', closeRightPresetMenuFromKey, true);
  getPanelDocument().addEventListener('preset-manager-menu-opened', closeRightPresetMenuFromPeer);

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
  if (presetSyncTimer !== null) {
    window.clearInterval(presetSyncTimer);
    presetSyncTimer = null;
  }
  if (nativeTokenPollTimer !== null) {
    window.clearInterval(nativeTokenPollTimer);
    nativeTokenPollTimer = null;
  }
  nativeTokenObserver?.disconnect();
  nativeTokenObserver = null;
  presetWorkspaceResizeObserver?.disconnect();
  presetWorkspaceResizeObserver = null;
  getPanelDocument().removeEventListener('pointerdown', closeRightPresetMenuFromOutside, true);
  getPanelDocument().removeEventListener('mousedown', closeRightPresetMenuFromOutside, true);
  getPanelDocument().removeEventListener('click', closeRightPresetMenuFromOutside, true);
  parentDoc.removeEventListener('pointerdown', closeRightPresetMenuFromOutside, true);
  parentDoc.removeEventListener('mousedown', closeRightPresetMenuFromOutside, true);
  parentDoc.removeEventListener('click', closeRightPresetMenuFromOutside, true);
  getPanelDocument().defaultView?.removeEventListener('keydown', closeRightPresetMenuFromKey, true);
  parentDoc.defaultView?.removeEventListener('keydown', closeRightPresetMenuFromKey, true);
  getPanelDocument().removeEventListener('preset-manager-menu-opened', closeRightPresetMenuFromPeer);
  ai.stopTavernApiProfileSync();
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
  scrollbar-width: thin;
  scrollbar-color: var(--pm-scrollbar-thumb) transparent;
}

body[data-pm-theme='dark'],
.theme-dark {
  /* Codex dark mode tokens — reverse-engineered from openai.com/codex via SkillUI */
  --pm-bg: #15171a;
  --pm-bg-transparent: rgba(21, 23, 26, 0);
  --pm-bg-soft: #0a0a0c;
  --pm-bg-panel: #111114;
  --pm-bg-titlebar: #15171a;
  --pm-bg-workspace: #15171a;
  --pm-bg-sidebar: rgba(255, 255, 255, 0.025);
  --pm-bg-elevated: #1f1f23;
  --pm-bg-card: #2a2d32;
  --pm-bg-card-hover: #30343a;

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
  --pm-scrollbar-thumb: rgba(255, 255, 255, 0.06);
  --pm-scrollbar-thumb-hover: rgba(255, 255, 255, 0.1);
  --pm-scrollbar-thumb-active: rgba(255, 255, 255, 0.2);

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
  --pm-left-entry-editor-bg: rgba(255, 255, 255, 0.06);

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
  --pm-sidebar-default-backdrop: blur(0px) saturate(90%) brightness(55%) contrast(105%);
  --pm-sidebar-default-bottom-fade: linear-gradient(180deg, rgba(0, 0, 0, 0) 54%, rgba(0, 0, 0, 0.59) 65%, rgba(0, 0, 0, 0.59) 100%);
  --pm-sidebar-default-mask: linear-gradient(rgba(48, 51, 68, 0.7), rgba(48, 51, 68, 0.7));
  --pm-sidebar-default-image: none;
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
  --pm-bg-card-hover: #30343a;
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
  --pm-scrollbar-thumb: rgba(255, 255, 255, 0.05);
  --pm-scrollbar-thumb-hover: rgba(255, 255, 255, 0.08);
  --pm-scrollbar-thumb-active: rgba(255, 255, 255, 0.16);
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
  --pm-left-entry-editor-bg: rgba(255, 255, 255, 0.055);
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
  --pm-sidebar-default-backdrop: blur(0px) saturate(90%) brightness(55%) contrast(105%);
  --pm-sidebar-default-bottom-fade: linear-gradient(180deg, rgba(0, 0, 0, 0) 54%, rgba(0, 0, 0, 0.59) 65%, rgba(0, 0, 0, 0.59) 100%);
  --pm-sidebar-default-mask: linear-gradient(rgba(48, 51, 68, 0.7), rgba(48, 51, 68, 0.7));
  --pm-sidebar-default-image: none;
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
  --pm-bg-card-hover: #ffffff;

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
  --pm-scrollbar-thumb: rgba(15, 17, 21, 0.08);
  --pm-scrollbar-thumb-hover: rgba(15, 17, 21, 0.12);
  --pm-scrollbar-thumb-active: rgba(15, 17, 21, 0.22);

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
  --pm-left-entry-editor-bg: rgba(255, 255, 255, 0.78);
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
  --pm-sidebar-default-backdrop: blur(0px) saturate(97%) brightness(100%) contrast(105%);
  --pm-sidebar-default-bottom-fade: none;
  --pm-sidebar-default-mask: linear-gradient(rgba(245, 245, 244, 0.72), rgba(245, 245, 244, 0.72));
  --pm-sidebar-default-image: linear-gradient(135deg, rgba(103, 129, 255, 0.28), rgba(188, 211, 255, 0.52));
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
  background: var(--pm-scrollbar-thumb);
  background-clip: content-box;
  border-radius: 999px;
  border: 1px solid transparent;
  transition: background 0.12s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--pm-scrollbar-thumb-hover);
  background-clip: content-box;
}

::-webkit-scrollbar-thumb:active {
  background: var(--pm-scrollbar-thumb-active);
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
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: var(--pm-left-rail-width);
  height: 100%;
  z-index: 0;
  pointer-events: none;
  background-color: rgba(48, 51, 68, 0.7);
  background-image: var(--pm-sidebar-default-bottom-fade), var(--pm-sidebar-default-mask), var(--pm-sidebar-default-image);
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  backdrop-filter: var(--pm-sidebar-default-backdrop);
  -webkit-backdrop-filter: var(--pm-sidebar-default-backdrop);
  filter: var(--pm-sidebar-default-backdrop);
  box-shadow:
    inset -1px 0 0 var(--pm-sidebar-edge),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
.app-root[data-dev-sidebar='on'] :deep(.left-sidebar),
.app-root[data-dev-sidebar='on'] :deep(.title-left) {
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.app-root > * {
  position: relative;
  z-index: 1;
}
.app-root > .annotation-overlay {
  position: absolute;
  inset: 0;
  z-index: 950;
}
.app-root > .api-settings-page {
  position: absolute;
  inset: 0;
  z-index: 900;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--pm-bg-workspace);
}
.app-root > :deep(.preset-context-menu) {
  position: absolute;
  z-index: 940;
}
.app-root > :deep(.prompt-context-menu) {
  position: absolute;
  z-index: 940;
}
.app-root > :deep(.prompt-context-backdrop) {
  position: absolute;
  z-index: 939;
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
  z-index: 300;
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
.preset-workspace-content {
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.preset-panels {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}
.center-area {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
}
.right-aux-area {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  --pm-right-aux-gutter: 24px;
}
.right-aux-tab-strip {
  flex: 0 0 42px;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px var(--pm-right-aux-gutter) 8px;
  border-bottom: 0;
  overflow-x: auto;
  overflow-y: visible;
}
.right-aux-tab-item {
  min-width: 0;
  max-width: 138px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  border-radius: 8px;
  background: transparent;
  color: var(--pm-text-subtle);
  transition:
    background 0.12s ease,
    color 0.12s ease;
}
.right-aux-tab-item:hover,
.right-aux-tab-item.active {
  background: var(--pm-row-active);
  color: var(--pm-text);
}
.right-aux-tab {
  min-width: 0;
  height: 28px;
  flex: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px 0 8px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
  font-weight: 560;
}
.right-aux-tab span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.right-aux-tab-close,
.right-aux-add-button {
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
}
.right-aux-tab-close:hover,
.right-aux-add-button:hover {
  background: var(--pm-row-hover);
  color: var(--pm-text);
}
.right-aux-add-wrap {
  position: relative;
  flex: 0 0 auto;
}
.right-aux-empty {
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
  padding: 48px var(--pm-right-aux-gutter);
}
.right-aux-choice-grid {
  width: min(100%, 460px);
  display: grid;
  gap: 56px;
}
.right-aux-choice-card {
  min-height: 118px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 16px 14px;
  border: 0;
  border-radius: 8px;
  background: color-mix(in srgb, var(--pm-bg-elevated) 70%, transparent);
  color: var(--pm-text);
  cursor: pointer;
  text-align: center;
  transition:
    background 0.14s ease,
    color 0.14s ease;
}
.right-aux-choice-card:hover {
  background: color-mix(in srgb, var(--pm-bg-elevated) 90%, transparent);
}
.right-aux-choice-icon {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: var(--pm-row-active);
  color: var(--pm-text);
}
.right-aux-choice-title {
  font-size: 14px;
  font-weight: 650;
  line-height: 1.2;
}
.right-aux-choice-card small {
  color: var(--pm-text-subtle);
  font-size: 12px;
  line-height: 1.35;
}
.right-preset-select-row {
  flex: 0 0 40px;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px var(--pm-right-aux-gutter) 10px;
  border-bottom: 0;
}
.right-preset-select-wrap {
  position: relative;
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
}
.right-preset-select {
  width: 100%;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--pm-text);
  font-size: 13px;
  font-weight: 650;
  outline: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.right-preset-select:hover,
.right-preset-select.open {
  background: var(--pm-pill-bg-hover);
  color: var(--pm-text);
}
.right-preset-select span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.right-preset-select-chevron {
  flex: 0 0 auto;
  color: var(--pm-text-subtle);
  transition: transform 0.14s ease, color 0.12s ease;
}
.right-preset-select:hover .right-preset-select-chevron,
.right-preset-select.open .right-preset-select-chevron {
  color: var(--pm-text);
}
.right-preset-select.open .right-preset-select-chevron {
  transform: rotate(180deg);
}
.right-preset-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 920;
  width: 100%;
  min-width: 0;
  max-height: 320px;
  padding: 4px;
  overflow: auto;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--pm-bg-elevated) 94%, transparent);
  box-shadow: var(--pm-menu-shadow, 0 8px 24px rgba(0, 0, 0, 0.28));
  backdrop-filter: var(--pm-menu-backdrop, blur(16px) saturate(150%));
  -webkit-backdrop-filter: var(--pm-menu-backdrop, blur(16px) saturate(150%));
}
.right-preset-menu-item {
  width: 100%;
  min-height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  text-align: left;
  font-size: 13px;
}
.right-preset-menu-item span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.right-preset-menu-item:hover,
.right-preset-menu-item.active {
  background: var(--pm-pill-bg-hover);
  color: var(--pm-text);
}
.right-preset-menu-empty {
  padding: 8px 10px;
  color: var(--pm-text-subtle);
  font-size: 12px;
}
.right-preset-migration-action {
  height: 28px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  font-size: 12px;
  font-weight: 560;
}
.right-preset-migration-action:hover,
.right-preset-migration-action.active {
  background: var(--pm-row-hover);
  color: var(--pm-text);
}
.right-aux-area :deep(.preset-panel) {
  width: auto;
  margin-inline: 0;
  padding: 0 0 14px;
}
</style>
