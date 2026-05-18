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
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  z-index: 10;
}
.split-handle.vertical {
  width: 6px;
  cursor: col-resize;
}
.split-handle.horizontal {
  height: 6px;
  cursor: row-resize;
}
.split-handle:hover,
.split-handle.dragging {
  background: rgba(99, 102, 241, 0.3);
}
.split-handle-bar {
  border-radius: 2px;
  background: rgba(148, 163, 184, 0.4);
  transition: background 0.15s;
}
.split-handle.vertical .split-handle-bar {
  width: 2px;
  height: 32px;
}
.split-handle.horizontal .split-handle-bar {
  height: 2px;
  width: 32px;
}
.split-handle:hover .split-handle-bar,
.split-handle.dragging .split-handle-bar {
  background: rgba(99, 102, 241, 0.7);
}
</style>
