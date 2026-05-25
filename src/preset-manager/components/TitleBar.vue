<template>
  <div
    class="title-bar flex items-center select-none"
    :class="{ 'left-collapsed': leftCollapsed }"
    @mousedown.stop="onDragStart"
  >
    <div class="title-left flex min-w-0 items-center">
      <button
        class="sidebar-toggle"
        :class="{ collapsed: leftCollapsed }"
        :title="leftCollapsed ? '展开侧栏' : '折叠侧栏'"
        @click="$emit('toggleLeftSidebar')"
      >
        <span class="sidebar-glyph" />
      </button>
    </div>

    <div class="title-actions">
      <div class="title-main">
        <div ref="presetMenuRef" class="preset-title-wrap">
          <button
            class="preset-title-button"
            :class="{ open: presetMenuOpen }"
            :title="currentPresetName || '选择预设'"
            @click.stop="togglePresetMenu"
          >
            <span class="preset-title-text">{{ currentPresetName || '选择预设' }}</span>
            <span class="preset-title-arrow">
              <i class="fas fa-chevron-down text-xs" />
            </span>
          </button>

          <Transition name="preset-menu-pop">
            <div v-if="presetMenuOpen" class="preset-menu" @mousedown.stop>
              <button
                v-for="name in presetNames"
                :key="name"
                class="preset-menu-item"
                :class="{ active: name === currentPresetName }"
                @click="selectPreset(name)"
              >
                <span>{{ name }}</span>
                <i v-if="name === currentPresetName" class="fas fa-check text-xs" />
              </button>
              <div v-if="presetNames.length === 0" class="preset-menu-empty">暂无预设</div>
            </div>
          </Transition>
        </div>
        <span v-if="currentPresetName" class="preset-meta">{{ promptCount }} 条</span>
        <span v-if="currentPresetName && tokenEstimate" class="preset-meta">约 {{ tokenLabel }} tokens</span>
      </div>

      <div class="title-controls flex items-center gap-1">
        <button
          class="title-btn"
          title="撤回 (Ctrl+Z)"
          :disabled="!canUndo"
          @click="$emit('undo')"
        >
          <i class="fas fa-undo text-xs" />
        </button>
        <button
          class="title-btn"
          title="重做 (Ctrl+Shift+Z)"
          :disabled="!canRedo"
          @click="$emit('redo')"
        >
          <i class="fas fa-redo text-xs" />
        </button>
        <button
          class="title-btn"
          :class="{ active: annotationVisible }"
          title="UI 批注模式"
          @click="$emit('toggleAnnotation')"
        >
          <i class="fas fa-highlighter text-xs" />
        </button>
        <button
          class="title-btn"
          :class="{ active: codeInspectorEnabled }"
          title="开发者检查器"
          @click="$emit('toggleCodeInspector')"
        >
          <i class="fas fa-crosshairs text-xs" />
        </button>
        <button
          class="title-btn"
          title="开发者背景面板"
          @click="$emit('toggleDevThemePanel')"
        >
          <i class="fas fa-palette text-xs" />
        </button>
        <div ref="moreMenuRef" class="more-menu-wrap">
          <button
            class="title-btn"
            :class="{ active: moreMenuOpen }"
            title="更多"
            @click.stop="toggleMoreMenu"
          >
            <i class="fas fa-ellipsis text-xs" />
          </button>

          <Transition name="title-menu-pop">
            <div v-if="moreMenuOpen" class="title-more-menu" @mousedown.stop>
              <button class="title-more-item" @click="runMoreAction('history')">
                <i class="fas fa-clock-rotate-left text-xs" />
                <span>历史备份</span>
              </button>
              <button class="title-more-item" @click="runMoreAction('createPreset')">
                <i class="fas fa-folder-plus text-xs" />
                <span>新建预设</span>
              </button>
              <button class="title-more-item" @click="runMoreAction('renamePreset')">
                <i class="fas fa-pen text-xs" />
                <span>重命名预设</span>
              </button>
              <button class="title-more-item danger" @click="runMoreAction('deletePreset')">
                <i class="fas fa-trash text-xs" />
                <span>删除预设</span>
              </button>
              <button class="title-more-item" @click="runMoreAction('createPrompt')">
                <i class="fas fa-plus text-xs" />
                <span>新建条目</span>
              </button>
              <button class="title-more-item" @click="runMoreAction('appendUnusedPrompt')">
                <i class="fas fa-inbox text-xs" />
                <span>添加未使用条目</span>
              </button>
              <button class="title-more-item" @click="runMoreAction('importPrompts')">
                <i class="fas fa-file-import text-xs" />
                <span>导入条目</span>
              </button>
              <button class="title-more-item" @click="runMoreAction('exportPrompts')">
                <i class="fas fa-file-export text-xs" />
                <span>导出条目</span>
              </button>
              <button class="title-more-item" @click="runMoreAction('resetPromptOrder')">
                <i class="fas fa-arrow-down-wide-short text-xs" />
                <span>重置顺序</span>
              </button>
              <button class="title-more-item" @click="runMoreAction('ui')">
                <i class="fas fa-sliders text-xs" />
                <span>界面比例</span>
              </button>
              <button class="title-more-item" @click="runMoreAction('theme')">
                <i :class="['fas text-xs', theme === 'dark' ? 'fa-sun' : 'fa-moon']" />
                <span>{{ theme === 'dark' ? '白天模式' : '黑夜模式' }}</span>
              </button>
            </div>
          </Transition>
        </div>

        <div class="title-separator" />

        <button class="title-btn" :title="isFullscreen ? '还原' : '全屏'" @click="$emit('toggleFullscreen')">
          <i :class="['fas text-xs', isFullscreen ? 'fa-compress' : 'fa-expand']" />
        </button>
        <button class="title-btn close-btn" title="关闭" @click="$emit('close')">
          <i class="fas fa-times text-xs" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { startParentDrag } from '../utils/drag';
import { clampWindowStateWithVisibleArea, type WindowState } from '../utils/panelLayout';

const props = defineProps<{
  isFullscreen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  annotationVisible: boolean;
  codeInspectorEnabled: boolean;
  theme: 'dark' | 'light';
  leftCollapsed: boolean;
  currentPresetName: string;
  presetNames: string[];
  promptCount: number;
  tokenEstimate: number;
}>();

const emit = defineEmits<{
  undo: [];
  redo: [];
  toggleHistory: [];
  toggleTheme: [];
  toggleUiSettings: [];
  toggleAnnotation: [];
  toggleDevThemePanel: [];
  toggleCodeInspector: [];
  toggleLeftSidebar: [];
  selectPreset: [name: string];
  createPrompt: [];
  createPreset: [];
  renamePreset: [];
  deletePreset: [];
  appendUnusedPrompt: [];
  importPrompts: [];
  exportPrompts: [];
  resetPromptOrder: [];
  toggleFullscreen: [];
  close: [];
}>();

const parentDoc = inject<Document>('parentDocument')!;
const iframeEl = inject<HTMLIFrameElement>('iframeElement')!;
const windowStateKey = inject<string>('presetManagerWindowStateKey', 'presetManagerWindowState');
const windowStateVersionKey = inject<string>('presetManagerWindowStateVersionKey', 'presetManagerWindowStateVersion');
const windowStateVersion = inject<string>('presetManagerWindowStateVersion', '');
const windowMinVisibleRatio = inject<number>('presetManagerWindowMinVisibleRatio', 0.1);

const presetMenuOpen = ref(false);
const moreMenuOpen = ref(false);
const presetMenuRef = ref<HTMLElement>();
const moreMenuRef = ref<HTMLElement>();
const tokenLabel = computed(() => props.tokenEstimate >= 1000 ? `${(props.tokenEstimate / 1000).toFixed(1)}k` : String(props.tokenEstimate));

function togglePresetMenu() {
  presetMenuOpen.value = !presetMenuOpen.value;
  if (presetMenuOpen.value) moreMenuOpen.value = false;
}

function toggleMoreMenu() {
  moreMenuOpen.value = !moreMenuOpen.value;
  if (moreMenuOpen.value) presetMenuOpen.value = false;
}

function runMoreAction(
  action:
    | 'history'
    | 'theme'
    | 'ui'
    | 'createPrompt'
    | 'createPreset'
    | 'renamePreset'
    | 'deletePreset'
    | 'appendUnusedPrompt'
    | 'importPrompts'
    | 'exportPrompts'
    | 'resetPromptOrder',
) {
  moreMenuOpen.value = false;
  if (action === 'history') emit('toggleHistory');
  if (action === 'theme') emit('toggleTheme');
  if (action === 'ui') emit('toggleUiSettings');
  if (action === 'createPrompt') emit('createPrompt');
  if (action === 'createPreset') emit('createPreset');
  if (action === 'renamePreset') emit('renamePreset');
  if (action === 'deletePreset') emit('deletePreset');
  if (action === 'appendUnusedPrompt') emit('appendUnusedPrompt');
  if (action === 'importPrompts') emit('importPrompts');
  if (action === 'exportPrompts') emit('exportPrompts');
  if (action === 'resetPromptOrder') emit('resetPromptOrder');
}

function selectPreset(name: string) {
  presetMenuOpen.value = false;
  if (name) emit('selectPreset', name);
}

function closePresetMenu(e: MouseEvent) {
  if (!presetMenuRef.value?.contains(e.target as Node)) {
    presetMenuOpen.value = false;
  }
  if (!moreMenuRef.value?.contains(e.target as Node)) {
    moreMenuOpen.value = false;
  }
}

function onDragStart(e: MouseEvent) {
  if (e.button !== 0 || (e.target as HTMLElement).closest('button, select, input, textarea')) return;

  const iframe = iframeEl;
  const style = iframe.style;
  if (style.transform) {
    const rect = iframe.getBoundingClientRect();
    style.transform = '';
    style.top = `${rect.top}px`;
    style.left = `${rect.left}px`;
  }

  const startX = e.screenX;
  const startY = e.screenY;
  const startTop = parseFloat(style.top) || 0;
  const startLeft = parseFloat(style.left) || 0;
  const startWidth = iframe.getBoundingClientRect().width;
  const startHeight = iframe.getBoundingClientRect().height;

  const getParentViewportSize = () => ({
    width: parentDoc.documentElement.clientWidth || parentDoc.defaultView?.innerWidth || startWidth,
    height: parentDoc.documentElement.clientHeight || parentDoc.defaultView?.innerHeight || startHeight,
  });

  const clampDraggedWindowState = (state: WindowState) => {
    const viewport = getParentViewportSize();
    return clampWindowStateWithVisibleArea(
      state,
      viewport.width,
      viewport.height,
      640,
      420,
      windowMinVisibleRatio,
    );
  };

  const applyDraggedWindowState = (state: WindowState) => {
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
  };

  startParentDrag(parentDoc, {
    startEvent: e,
    cursor: 'move',
    onMove: ev => {
      applyDraggedWindowState(clampDraggedWindowState({
        top: startTop + ev.screenY - startY,
        left: startLeft + ev.screenX - startX,
        width: startWidth,
        height: startHeight,
      }));
    },
    onEnd: () => {
      const nextState = clampDraggedWindowState({
        top: iframe.getBoundingClientRect().top,
        left: iframe.getBoundingClientRect().left,
        width: iframe.getBoundingClientRect().width,
        height: iframe.getBoundingClientRect().height,
      });
      applyDraggedWindowState(nextState);
      localStorage.setItem(windowStateKey, JSON.stringify(nextState));
      if (windowStateVersion) {
        localStorage.setItem(windowStateVersionKey, windowStateVersion);
      }
    },
  });
}

onMounted(() => {
  document.addEventListener('mousedown', closePresetMenu);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', closePresetMenu);
});
</script>

<style scoped>
.title-bar {
  height: var(--pm-titlebar-height, 52px);
  padding: 0;
  background: var(--pm-bg-titlebar);
  border-bottom: 0;
  cursor: move;
}
.title-left {
  position: relative;
  align-self: stretch;
  flex: 0 0 var(--pm-left-rail-width, 240px);
  justify-content: flex-end;
  padding: 0 12px 0 18px;
  background: transparent;
  border-right: 0;
}
.sidebar-toggle {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--pm-btn-radius, 8px);
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s, transform 0.12s;
}
.sidebar-toggle.collapsed {
  transform: translateX(12px);
}
.title-bar.left-collapsed .title-left {
  flex-basis: 0;
  width: 0;
  padding: 0;
  overflow: visible;
}
.title-bar.left-collapsed .sidebar-toggle.collapsed {
  position: absolute;
  top: 10px;
  left: 18px;
  z-index: 3;
  transform: none;
}
.sidebar-toggle:hover {
  background: var(--pm-btn-hover);
  color: var(--pm-text);
}
.sidebar-toggle.collapsed {
  color: var(--pm-text);
}
.sidebar-glyph {
  width: 14px;
  height: 13px;
  position: relative;
  display: block;
  border: 1.3px solid currentColor;
  border-radius: 4px;
}
.sidebar-glyph::before {
  content: '';
  position: absolute;
  top: 1px;
  bottom: 1px;
  left: 4px;
  width: 1px;
  background: currentColor;
  opacity: 0.75;
}
.title-actions {
  flex: 1;
  min-width: 0;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 14px 0 22px;
  background: transparent;
  border-bottom: 0;
}
.title-bar.left-collapsed .title-actions {
  padding-left: 66px;
}
.title-main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.preset-title-wrap {
  position: relative;
  min-width: 0;
  max-width: min(48vw, 560px);
  display: inline-flex;
  align-items: center;
}
.preset-title-button {
  min-width: 0;
  max-width: 100%;
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--pm-text);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}
.preset-title-button:hover,
.preset-title-button.open {
  background: color-mix(in srgb, var(--pm-bg-hover) 42%, transparent);
}
.preset-title-text {
  min-width: 0;
  max-width: min(38vw, 470px);
  overflow: hidden;
  color: var(--pm-text);
  font-size: 14px;
  font-weight: 660;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preset-title-arrow {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--pm-border);
  border-radius: 7px;
  background: color-mix(in srgb, var(--pm-bg-hover) 48%, transparent);
  color: var(--pm-text-muted);
  transition: background 0.12s, border-color 0.12s, color 0.12s, transform 0.12s;
}
.preset-title-button:hover .preset-title-arrow,
.preset-title-button.open .preset-title-arrow {
  border-color: var(--pm-border-strong);
  background: color-mix(in srgb, var(--pm-bg-hover) 82%, transparent);
  color: var(--pm-text);
}
.preset-title-button.open .preset-title-arrow {
  transform: rotate(180deg);
}
.preset-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 900;
  width: max-content;
  min-width: min(320px, 72vw);
  max-width: min(520px, 84vw);
  max-height: 320px;
  padding: 6px;
  overflow: auto;
  border: 1px solid var(--pm-border-strong);
  border-radius: 12px;
  background: color-mix(in srgb, var(--pm-bg-elevated) 92%, transparent);
  box-shadow: 0 18px 52px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(24px) saturate(112%);
  -webkit-backdrop-filter: blur(24px) saturate(112%);
}
.preset-menu-item {
  width: 100%;
  min-height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  text-align: left;
}
.preset-menu-item span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preset-menu-item:hover,
.preset-menu-item.active {
  background: var(--pm-bg-hover);
  color: var(--pm-text);
}
.preset-menu-item.active {
  border-color: var(--pm-border);
}
.preset-menu-empty {
  padding: 9px 12px;
  color: var(--pm-text-subtle);
  font-size: 12px;
}
.preset-menu-pop-enter-active,
.preset-menu-pop-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.preset-menu-pop-enter-from,
.preset-menu-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.preset-meta {
  flex-shrink: 0;
  color: var(--pm-text-subtle);
  font-size: 12px;
  line-height: 20px;
}
.title-controls {
  flex-shrink: 0;
}
.title-separator {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: var(--pm-divider);
}
.more-menu-wrap {
  position: relative;
}
.title-btn {
  width: var(--pm-btn-size, 30px);
  height: var(--pm-btn-size, 30px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--pm-btn-radius, 8px);
  color: var(--pm-text-muted);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.14s, border-color 0.14s, color 0.14s, opacity 0.14s;
}
.title-btn:hover:not(:disabled) {
  background: var(--pm-btn-hover);
  border-color: transparent;
  color: var(--pm-text);
}
.title-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.title-btn.active {
  color: var(--pm-text);
  background: var(--pm-btn-active);
  border-color: var(--pm-btn-active-border);
}
.title-btn.close-btn:hover:not(:disabled) {
  color: var(--pm-danger);
  background: color-mix(in srgb, var(--pm-danger) 14%, transparent);
  border-color: color-mix(in srgb, var(--pm-danger) 30%, transparent);
}
.title-more-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 900;
  width: 164px;
  padding: 6px;
  border: 1px solid var(--pm-border-strong);
  border-radius: 12px;
  background: color-mix(in srgb, var(--pm-bg-elevated) 92%, transparent);
  box-shadow: 0 18px 52px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(24px) saturate(112%);
  -webkit-backdrop-filter: blur(24px) saturate(112%);
}
.title-more-item {
  width: 100%;
  min-height: 32px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  text-align: left;
}
.title-more-item:hover {
  background: var(--pm-bg-hover);
  color: var(--pm-text);
}
.title-more-item.danger:hover {
  color: var(--pm-danger);
  background: color-mix(in srgb, var(--pm-danger) 12%, transparent);
}
.title-more-item i {
  width: 14px;
  color: inherit;
  text-align: center;
}
.title-menu-pop-enter-active,
.title-menu-pop-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.title-menu-pop-enter-from,
.title-menu-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
