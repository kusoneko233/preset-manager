<template>
  <div
    class="title-bar flex items-center px-3 py-2 select-none"
    @mousedown.stop.prevent="onDragStart"
  >
    <div class="title-left flex items-center gap-3 flex-1 min-w-0">
      <div class="window-dots" aria-hidden="true">
        <span class="dot close" />
        <span class="dot minimize" />
        <span class="dot maximize" />
      </div>
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
  theme: 'dark' | 'light';
}>();

defineEmits<{
  undo: [];
  redo: [];
  toggleHistory: [];
  toggleAi: [];
  toggleTheme: [];
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
  height: 46px;
  background: var(--pm-bg);
  border-bottom: 1px solid var(--pm-border);
  cursor: move;
}
.window-dots {
  display: flex;
  gap: 7px;
  flex-shrink: 0;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  opacity: 0.95;
}
.dot.close {
  background: #ff5f57;
}
.dot.minimize {
  background: #ffbd2e;
}
.dot.maximize {
  background: #28c840;
}
.brand-mark {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  color: var(--pm-text);
  background: var(--pm-bg-elevated);
}
.title-text {
  font-size: 13px;
  font-weight: 650;
  color: var(--pm-text);
}
.title-separator {
  width: 1px;
  height: 18px;
  margin: 0 6px;
  background: var(--pm-border);
}
.title-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: var(--pm-text-muted);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.12s;
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
  color: var(--pm-accent-text);
  background: var(--pm-accent);
  border-color: var(--pm-accent);
}
</style>
