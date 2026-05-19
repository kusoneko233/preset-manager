<template>
  <div
    class="title-bar flex items-center select-none"
    @mousedown.stop.prevent="onDragStart"
  >
    <div class="title-left flex items-center gap-2 flex-1 min-w-0">
      <div class="brand-mark">
        <i class="fas fa-sliders-h text-xs" />
      </div>
      <span class="title-text truncate">预设管理器</span>
    </div>

    <div class="flex items-center gap-1">
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
      <button class="title-btn" title="备份管理" @click="$emit('toggleHistory')">
        <i class="fas fa-save text-xs" />
      </button>
      <button
        class="title-btn"
        :class="{ active: aiVisible }"
        title="AI 助手"
        @click="$emit('toggleAi')"
      >
        <i class="fas fa-robot text-xs" />
      </button>

      <button
        class="title-btn"
        :title="theme === 'dark' ? '切换到白天模式' : '切换到黑夜模式'"
        @click="$emit('toggleTheme')"
      >
        <i :class="['fas text-xs', theme === 'dark' ? 'fa-sun' : 'fa-moon']" />
      </button>
      <button class="title-btn" title="界面设置" @click="$emit('toggleUiSettings')">
        <i class="fas fa-font text-xs" />
      </button>
      <button
        class="title-btn"
        :class="{ active: annotationVisible }"
        title="UI 批注模式"
        @click="$emit('toggleAnnotation')"
      >
        <i class="fas fa-highlighter text-xs" />
      </button>

      <div class="title-separator" />

      <button class="title-btn" :title="isFullscreen ? '还原' : '全屏'" @click="$emit('toggleFullscreen')">
        <i :class="['fas text-xs', isFullscreen ? 'fa-compress' : 'fa-expand']" />
      </button>
      <button class="title-btn hover:!bg-red-500/30 hover:!text-red-400" title="关闭" @click="$emit('close')">
        <i class="fas fa-times text-xs" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { startParentDrag } from '../utils/drag';

defineProps<{
  isFullscreen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  aiVisible: boolean;
  annotationVisible: boolean;
  theme: 'dark' | 'light';
}>();

defineEmits<{
  undo: [];
  redo: [];
  toggleHistory: [];
  toggleAi: [];
  toggleTheme: [];
  toggleUiSettings: [];
  toggleAnnotation: [];
  toggleFullscreen: [];
  close: [];
}>();

const parentDoc = inject<Document>('parentDocument')!;
const iframeEl = inject<HTMLIFrameElement>('iframeElement')!;

function onDragStart(e: MouseEvent) {
  if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;

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
</script>

<style scoped>
.title-bar {
  height: 40px;
  padding: 0 10px;
  background: color-mix(in srgb, var(--pm-bg-soft) 38%, var(--pm-bg));
  border-bottom: 1px solid var(--pm-divider);
  cursor: move;
}
.brand-mark {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--pm-border);
  border-radius: 7px;
  color: var(--pm-text);
  background: color-mix(in srgb, var(--pm-bg-elevated) 72%, transparent);
}
.title-text {
  font-size: 13px;
  font-weight: 650;
  color: var(--pm-text);
}
.title-separator {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: var(--pm-divider);
}
.title-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: var(--pm-text-muted);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
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
</style>
