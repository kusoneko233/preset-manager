<template>
  <div
    class="title-bar flex items-center select-none"
    :class="{ 'left-collapsed': leftCollapsed }"
    @mousedown.stop.prevent="onDragStart"
  >
    <div class="title-left flex items-center min-w-0">
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
        <button class="title-btn hover:!bg-red-500/30 hover:!text-red-400" title="关闭" @click="$emit('close')">
          <i class="fas fa-times text-xs" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { startParentDrag } from '../utils/drag';

const props = defineProps<{
  isFullscreen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  annotationVisible: boolean;
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
  toggleLeftSidebar: [];
  selectPreset: [name: string];
  toggleFullscreen: [];
  close: [];
}>();

const parentDoc = inject<Document>('parentDocument')!;
const iframeEl = inject<HTMLIFrameElement>('iframeElement')!;

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

function runMoreAction(action: 'history' | 'theme' | 'ui') {
  moreMenuOpen.value = false;
  if (action === 'history') emit('toggleHistory');
  if (action === 'theme') emit('toggleTheme');
  if (action === 'ui') emit('toggleUiSettings');
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

  startParentDrag(parentDoc, {
    startEvent: e,
    cursor: 'move',
    onMove: ev => {
      style.top = `${startTop + ev.screenY - startY}px`;
      style.left = `${startLeft + ev.screenX - startX}px`;
    },
    onEnd: () => {
      localStorage.setItem('presetManagerWindowState', JSON.stringify({
        top: iframe.getBoundingClientRect().top,
        left: iframe.getBoundingClientRect().left,
        width: iframe.getBoundingClientRect().width,
        height: iframe.getBoundingClientRect().height,
      }));
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
  background: transparent;
  border-bottom: 0;
  cursor: move;
}
.title-left {
  position: relative;
  align-self: stretch;
  flex: 0 0 var(--pm-left-rail-width, 240px);
  justify-content: flex-end;
  padding: 0 18px;
  background: transparent;
  border-right: 0;
}
.sidebar-toggle {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s, transform 0.12s;
}
.sidebar-toggle.collapsed {
  transform: translateX(8px);
}
.title-bar.left-collapsed .title-left {
  flex-basis: 0;
  width: 0;
  padding: 0;
  overflow: visible;
}
.title-bar.left-collapsed .sidebar-toggle.collapsed {
  position: absolute;
  top: 9px;
  left: 14px;
  z-index: 3;
  transform: none;
}
.sidebar-toggle:hover,
.sidebar-toggle.collapsed {
  border-color: var(--pm-border);
  background: var(--pm-bg-hover);
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
  background: color-mix(in srgb, var(--pm-bg-soft) 14%, transparent);
  border-bottom: 1px solid var(--pm-divider);
}
.title-bar.left-collapsed .title-actions {
  padding-left: 62px;
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
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: var(--pm-text-muted);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.14s, border-color 0.14s, color 0.14s, opacity 0.14s;
}
.title-btn:hover:not(:disabled) {
  background: var(--pm-bg-hover);
  border-color: var(--pm-border);
  color: var(--pm-text);
}
.title-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.title-btn.active {
  color: var(--pm-text);
  background: var(--pm-bg-active);
  border-color: var(--pm-border-strong);
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
