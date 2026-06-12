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
            type="button"
            class="preset-title-button"
            :class="{ open: presetMenuOpen }"
            :title="currentPresetName || '选择预设'"
            @pointerdown.stop
            @click.stop="togglePresetMenu"
          >
            <span class="preset-title-text">{{ currentPresetName || '选择预设' }}</span>
            <Icon name="chevron-down" :size="13" class="preset-title-arrow" />
          </button>
          <span v-if="currentPresetName && tokenRatioLabel" class="preset-token-ratio">{{ tokenRatioLabel }}</span>

          <Transition name="preset-menu-pop">
            <div v-if="presetMenuOpen" class="preset-menu" @pointerdown.stop @mousedown.stop>
              <button
                v-for="name in presetNames"
                :key="name"
                type="button"
                class="preset-menu-item"
                :class="{ active: name === currentPresetName }"
                @pointerdown.stop
                @mousedown.stop
                @click.stop="selectPreset(name)"
              >
                <span>{{ name }}</span>
                <Icon v-if="name === currentPresetName" name="check" :size="13" />
              </button>
              <div v-if="presetNames.length === 0" class="preset-menu-empty">暂无预设</div>
            </div>
          </Transition>
        </div>

      </div>

      <div class="title-controls">
        <IconButton name="corner-up-left" size="md" :disabled="!canUndo" title="撤回 (Ctrl+Z)" @click="$emit('undo')" />
        <IconButton name="corner-up-right" size="md" :disabled="!canRedo" title="重做 (Ctrl+Shift+Z)" @click="$emit('redo')" />
        <button
          type="button"
          class="sidebar-toggle-button"
          :class="{ active: rightSidebarOpen }"
          :title="rightSidebarOpen ? '收起侧边栏辅助区' : '打开侧边栏辅助区'"
          @click="$emit('toggleRightSidebar')"
        >
          <span>侧边栏</span>
          <span class="sidebar-status-dot" :class="{ active: rightSidebarOpen }" aria-hidden="true" />
        </button>

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
import { startParentDrag } from '../utils/drag';
import { clampWindowStateWithVisibleArea, type WindowState } from '../utils/panelLayout';

const props = defineProps<{
  isFullscreen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  leftCollapsed: boolean;
  currentPresetName: string;
  presetNames: string[];
  presetTokenTotal: number | null;
  nativeTokenTotal: number | null;
  rightSidebarOpen: boolean;
}>();

const emit = defineEmits<{
  undo: [];
  redo: [];
  toggleLeftSidebar: [];
  toggleRightSidebar: [];
  selectPreset: [name: string];
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
const presetMenuRef = ref<HTMLElement>();
const tokenRatioLabel = computed(() => {
  const preset = formatTokenAmount(props.presetTokenTotal);
  const total = formatTokenAmount(props.nativeTokenTotal);
  return `${preset} / ${total} tokens`;
});

const tokenNumberFormatter = new Intl.NumberFormat('en-US');

function formatTokenAmount(value: number | null | undefined) {
  // Example: 12,345 / 134,817 tokens
  if (value === null || value === undefined || !Number.isFinite(value)) return '--';
  return tokenNumberFormatter.format(Math.max(0, Math.round(value)));
}

function togglePresetMenu() {
  presetMenuOpen.value = !presetMenuOpen.value;
}

function selectPreset(name: string) {
  presetMenuOpen.value = false;
  if (name) emit('selectPreset', name);
}

function closePresetMenuFromOutside(event?: Event) {
  const target = event?.target as Node | null;
  if (target && presetMenuRef.value?.contains(target)) return;
  presetMenuOpen.value = false;
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
  document.addEventListener('pointerdown', closePresetMenuFromOutside, true);
  document.addEventListener('mousedown', closePresetMenuFromOutside, true);
  document.addEventListener('click', closePresetMenuFromOutside, true);
  parentDoc.addEventListener('pointerdown', closePresetMenuFromOutside, true);
  parentDoc.addEventListener('mousedown', closePresetMenuFromOutside, true);
  parentDoc.addEventListener('click', closePresetMenuFromOutside, true);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', closePresetMenuFromOutside, true);
  document.removeEventListener('mousedown', closePresetMenuFromOutside, true);
  document.removeEventListener('click', closePresetMenuFromOutside, true);
  parentDoc.removeEventListener('pointerdown', closePresetMenuFromOutside, true);
  parentDoc.removeEventListener('mousedown', closePresetMenuFromOutside, true);
  parentDoc.removeEventListener('click', closePresetMenuFromOutside, true);
});
</script>

<style scoped>
.title-bar {
  display: flex;
  align-items: stretch;
  height: var(--pm-titlebar-height, 56px);
  padding: 0;
  background: transparent;
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
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-right: 1px solid var(--pm-sidebar-edge);
}
.title-bar.left-collapsed .title-left {
  flex-basis: 0;
  width: 0;
  padding: 0;
  overflow: visible;
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  box-shadow: none;
  border-right: 0;
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
  padding: 0 16px 0 12px;
  background: var(--pm-bg-titlebar);
  /* Bottom rule only on the right side — sidebar + title-left stay one continuous glass. */
  border-bottom: 1px solid var(--pm-divider);
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
.preset-token-ratio {
  flex: 0 0 auto;
  margin-left: 4px;
  color: var(--pm-text-subtle);
  font-size: 12px;
  font-weight: 520;
  line-height: 1;
  white-space: nowrap;
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
.title-controls {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 2px;
}
.sidebar-toggle-button {
  min-width: 0;
  height: 28px;
  margin-left: 4px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pm-bg-elevated) 72%, transparent);
  color: var(--pm-text);
  cursor: pointer;
  font-size: 13px;
  font-weight: 580;
  letter-spacing: 0;
  white-space: nowrap;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}
.sidebar-toggle-button:hover {
  background: color-mix(in srgb, var(--pm-bg-elevated) 92%, transparent);
  color: var(--pm-text);
}
.sidebar-status-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pm-text-muted) 58%, transparent);
  transition: background 0.14s ease;
}
.sidebar-status-dot.active {
  background: var(--pm-success);
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
