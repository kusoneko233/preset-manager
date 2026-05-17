<template>
  <div
    class="title-bar flex items-center px-3 py-2 select-none"
    @mousedown.prevent="onDragStart"
  >
    <div class="flex items-center gap-2 flex-1 min-w-0">
      <i class="fas fa-sliders-h text-indigo-400 text-sm" />
      <span class="text-sm font-medium text-slate-200 truncate">预设管理器</span>
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

      <div class="w-px h-4 bg-slate-600 mx-1" />

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
defineProps<{
  isFullscreen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  aiVisible: boolean;
}>();

defineEmits<{
  undo: [];
  redo: [];
  toggleHistory: [];
  toggleAi: [];
  toggleFullscreen: [];
  close: [];
}>();

const parentDoc = inject<Document>('parentDocument')!;
const iframeEl = inject<HTMLIFrameElement>('iframeElement')!;

function onDragStart(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('button')) return;

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
  const startTop = parseInt(style.top) || 0;
  const startLeft = parseInt(style.left) || 0;

  const onMove = (ev: MouseEvent) => {
    style.top = `${startTop + (ev.screenY - startY)}px`;
    style.left = `${startLeft + (ev.screenX - startX)}px`;
  };

  const onUp = () => {
    parentDoc.removeEventListener('mousemove', onMove);
    parentDoc.removeEventListener('mouseup', onUp);
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  parentDoc.addEventListener('mousemove', onMove);
  parentDoc.addEventListener('mouseup', onUp);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}
</script>

<style scoped>
.title-bar {
  background: #0f172a;
  border-bottom: 1px solid rgba(51, 65, 85, 0.6);
  cursor: move;
}
.title-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: #94a3b8;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.12s;
}
.title-btn:hover:not(:disabled) {
  background: rgba(51, 65, 85, 0.6);
  color: #e2e8f0;
}
.title-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.title-btn.active {
  color: #818cf8;
  background: rgba(99, 102, 241, 0.15);
}
</style>
