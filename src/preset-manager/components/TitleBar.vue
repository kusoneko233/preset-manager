<template>
  <div
    class="title-bar"
    :class="{ 'left-collapsed': leftCollapsed }"
    @mousedown.stop="onDragStart"
  >
    <div class="title-left">
      <IconButton
        :name="leftCollapsed ? 'panel-left-open' : 'panel-left-close'"
        size="md"
        :title="leftCollapsed ? '展开侧栏' : '折叠侧栏'"
        @click="$emit('toggleLeftSidebar')"
      />
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
            <Icon name="chevron-down" :size="13" class="preset-title-arrow" />
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
                <Icon v-if="name === currentPresetName" name="check" :size="13" />
              </button>
              <div v-if="presetNames.length === 0" class="preset-menu-empty">暂无预设</div>
            </div>
          </Transition>
        </div>

        <div class="preset-meta-group">
          <span v-if="currentPresetName" class="preset-meta-chip">{{ promptCount }} 条</span>
          <span v-if="currentPresetName && tokenEstimate" class="preset-meta-chip">约 {{ tokenLabel }} tokens</span>
        </div>
      </div>

      <div class="title-controls">
        <IconButton name="corner-up-left" size="md" :disabled="!canUndo" title="撤回 (Ctrl+Z)" @click="$emit('undo')" />
        <IconButton name="corner-up-right" size="md" :disabled="!canRedo" title="重做 (Ctrl+Shift+Z)" @click="$emit('redo')" />
        <IconButton name="highlighter" size="md" :active="annotationVisible" title="UI 批注模式" @click="$emit('toggleAnnotation')" />
        <IconButton name="crosshair" size="md" :active="codeInspectorEnabled" title="开发者检查器" @click="$emit('toggleCodeInspector')" />
        <IconButton name="palette" size="md" title="开发者背景面板" @click="$emit('toggleDevThemePanel')" />

        <div ref="moreMenuRef" class="more-menu-wrap">
          <IconButton
            name="more-horizontal"
            size="md"
            :active="moreMenuOpen"
            title="更多"
            @click="onMoreButtonClick"
          />

          <Transition name="title-menu-pop">
            <div v-if="moreMenuOpen" class="title-more-menu" @mousedown.stop>
              <button class="title-more-item" @click="runMoreAction('history')">
                <Icon name="history" :size="14" />
                <span>历史备份</span>
              </button>
              <button class="title-more-item" @click="runMoreAction('createPreset')">
                <Icon name="folder" :size="14" />
                <span>新建预设</span>
              </button>
              <button class="title-more-item" @click="runMoreAction('renamePreset')">
                <Icon name="pen-line" :size="14" />
                <span>重命名预设</span>
              </button>
              <button class="title-more-item danger" @click="runMoreAction('deletePreset')">
                <Icon name="trash-2" :size="14" />
                <span>删除预设</span>
              </button>
              <div class="title-more-divider" />
              <button class="title-more-item" @click="runMoreAction('appendUnusedPrompt')">
                <Icon name="list" :size="14" />
                <span>添加未使用条目</span>
              </button>
              <button class="title-more-item" @click="runMoreAction('importPrompts')">
                <Icon name="upload" :size="14" />
                <span>导入条目</span>
              </button>
              <button class="title-more-item" @click="runMoreAction('exportPrompts')">
                <Icon name="download" :size="14" />
                <span>导出条目</span>
              </button>
              <button class="title-more-item" @click="runMoreAction('resetPromptOrder')">
                <Icon name="refresh-cw" :size="14" />
                <span>重置顺序</span>
              </button>
              <div class="title-more-divider" />
              <button class="title-more-item" @click="runMoreAction('ui')">
                <Icon name="sliders-horizontal" :size="14" />
                <span>界面比例</span>
              </button>
              <button class="title-more-item" @click="runMoreAction('theme')">
                <Icon :name="theme === 'dark' ? 'sun' : 'moon'" :size="14" />
                <span>{{ theme === 'dark' ? '白天模式' : '黑夜模式' }}</span>
              </button>
            </div>
          </Transition>
        </div>

        <PillButton
          variant="primary"
          size="sm"
          leading-icon="plus"
          class="title-cta"
          title="新建条目"
          @click="$emit('createPrompt')"
        >
          新建条目
        </PillButton>

        <div class="title-separator" />

        <IconButton
          :name="isFullscreen ? 'minimize-2' : 'maximize-2'"
          size="md"
          :title="isFullscreen ? '还原' : '全屏'"
          @click="$emit('toggleFullscreen')"
        />
        <IconButton name="x" size="md" danger title="关闭" @click="$emit('close')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import IconButton from './IconButton.vue';
import PillButton from './PillButton.vue';
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

function onMoreButtonClick(event: MouseEvent) {
  event.stopPropagation();
  toggleMoreMenu();
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
  display: flex;
  align-items: stretch;
  height: var(--pm-titlebar-height, 56px);
  padding: 0;
  background: var(--pm-bg-titlebar);
  border-bottom: 1px solid var(--pm-divider);
  cursor: move;
  user-select: none;
}
.title-left {
  position: relative;
  align-self: stretch;
  flex: 0 0 var(--pm-left-rail-width, 240px);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 14px 0 20px;
  background: transparent;
  border-right: 0;
}
.title-bar.left-collapsed .title-left {
  flex-basis: 0;
  width: 0;
  padding: 0;
  overflow: visible;
}
.title-bar.left-collapsed .title-left :deep(.icon-btn) {
  position: absolute;
  top: 50%;
  left: 14px;
  z-index: 3;
  transform: translateY(-50%);
}
.title-actions {
  flex: 1;
  min-width: 0;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 16px 0 22px;
  background: transparent;
}
.title-bar.left-collapsed .title-actions {
  padding-left: 60px;
}
.title-main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.preset-title-wrap {
  position: relative;
  min-width: 0;
  max-width: min(46vw, 520px);
  display: inline-flex;
  align-items: center;
}
.preset-title-button {
  min-width: 0;
  max-width: 100%;
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--pm-text);
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.preset-title-button:hover,
.preset-title-button.open {
  background: var(--pm-pill-bg-hover);
}
.preset-title-text {
  min-width: 0;
  max-width: min(38vw, 460px);
  overflow: hidden;
  color: var(--pm-text);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.005em;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preset-title-arrow {
  flex-shrink: 0;
  color: var(--pm-text-muted);
  transition: transform 0.16s ease, color 0.12s ease;
}
.preset-title-button:hover .preset-title-arrow,
.preset-title-button.open .preset-title-arrow {
  color: var(--pm-text);
}
.preset-title-button.open .preset-title-arrow {
  transform: rotate(180deg);
}
.preset-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 900;
  width: max-content;
  min-width: min(320px, 72vw);
  max-width: min(520px, 84vw);
  max-height: 320px;
  padding: 4px;
  overflow: auto;
  border: 1px solid var(--pm-border-strong);
  border-radius: 10px;
  background: var(--pm-bg-elevated);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
}
.preset-menu-item {
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
.preset-menu-item span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preset-menu-item:hover,
.preset-menu-item.active {
  background: var(--pm-pill-bg-hover);
  color: var(--pm-text);
}
.preset-menu-empty {
  padding: 8px 12px;
  color: var(--pm-text-subtle);
  font-size: 12px;
}
.preset-menu-pop-enter-active,
.preset-menu-pop-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}
.preset-menu-pop-enter-from,
.preset-menu-pop-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}
.preset-meta-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.preset-meta-chip {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  color: var(--pm-text-subtle);
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1;
  white-space: nowrap;
}
.title-controls {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 2px;
}
.title-cta {
  margin-left: 4px;
}
.title-separator {
  width: 1px;
  height: 18px;
  margin: 0 6px;
  background: var(--pm-divider);
}
.more-menu-wrap {
  position: relative;
}
.title-more-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 900;
  width: 184px;
  padding: 4px;
  border: 1px solid var(--pm-border-strong);
  border-radius: 10px;
  background: var(--pm-bg-elevated);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
}
.title-more-item {
  width: 100%;
  min-height: 32px;
  display: flex;
  align-items: center;
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
.title-more-item:hover {
  background: var(--pm-pill-bg-hover);
  color: var(--pm-text);
}
.title-more-item.danger {
  color: var(--pm-danger);
}
.title-more-item.danger:hover {
  color: var(--pm-danger);
  background: color-mix(in srgb, var(--pm-danger) 14%, transparent);
}
.title-more-divider {
  height: 1px;
  margin: 4px 6px;
  background: var(--pm-divider);
}
.title-menu-pop-enter-active,
.title-menu-pop-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}
.title-menu-pop-enter-from,
.title-menu-pop-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}
</style>
