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
  background: var(--pm-border);
  transition: background 0.15s;
  z-index: 10;
}
.split-handle.vertical {
  width: 5px;
  cursor: col-resize;
}
.split-handle.horizontal {
  height: 5px;
  cursor: row-resize;
}
.split-handle:hover,
.split-handle.dragging {
  background: color-mix(in srgb, var(--pm-accent) 22%, var(--pm-border));
}
.split-handle-bar {
  border-radius: 999px;
  background: var(--pm-text-subtle);
  opacity: 0;
  transition: background 0.15s;
}
.split-handle.vertical .split-handle-bar {
  width: 1px;
  height: 42px;
}
.split-handle.horizontal .split-handle-bar {
  height: 1px;
  width: 42px;
}
.split-handle:hover .split-handle-bar,
.split-handle.dragging .split-handle-bar {
  background: var(--pm-accent);
  opacity: 0.8;
}
</style>
