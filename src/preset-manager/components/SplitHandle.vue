<template>
  <div
    ref="handleRef"
    :class="['split-handle', direction, { dragging: isDragging }]"
    @mousedown.stop.prevent="onMouseDown"
  >
    <div class="split-handle-bar" />
  </div>
</template>

<script setup lang="ts">
import { startParentDrag } from '../utils/drag';

const props = defineProps<{
  direction: 'horizontal' | 'vertical';
}>();

const parentDoc = inject<Document>('parentDocument')!;

const emit = defineEmits<{
  resize: [delta: number];
  dragStart: [];
  dragEnd: [];
}>();

const handleRef = ref<HTMLElement>();
const isDragging = ref(false);

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return;
  isDragging.value = true;
  emit('dragStart');

  const startX = e.screenX;
  const startY = e.screenY;

  startParentDrag(parentDoc, {
    startEvent: e,
    cursor: props.direction === 'vertical' ? 'col-resize' : 'row-resize',
    onMove: ev => {
      const delta = props.direction === 'vertical' ? ev.screenX - startX : ev.screenY - startY;
      emit('resize', delta);
    },
    onEnd: () => {
      isDragging.value = false;
      emit('dragEnd');
    },
  });
}
</script>

<style scoped>
.split-handle {
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  z-index: 10;
}
.split-handle::before {
  content: '';
  position: absolute;
  z-index: 1;
}
.split-handle.vertical {
  width: 1px;
  cursor: col-resize;
}
.split-handle.horizontal {
  height: 1px;
  cursor: row-resize;
}
.split-handle.vertical::before {
  inset-block: 0;
  left: -6px;
  width: 13px;
}
.split-handle.horizontal::before {
  inset-inline: 0;
  top: -6px;
  height: 13px;
}
.split-handle-bar {
  position: absolute;
  border-radius: 999px;
  background: var(--pm-split-line);
  opacity: 0.85;
  transition: background 0.12s, opacity 0.12s, box-shadow 0.12s;
}
.split-handle.vertical .split-handle-bar {
  width: 1px;
  inset-block: 0;
}
.split-handle.horizontal .split-handle-bar {
  height: 1px;
  inset-inline: 0;
}
.split-handle:hover .split-handle-bar,
.split-handle.dragging .split-handle-bar {
  background: var(--pm-split-line-hover);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--pm-split-line-hover) 32%, transparent);
  opacity: 1;
}
</style>
