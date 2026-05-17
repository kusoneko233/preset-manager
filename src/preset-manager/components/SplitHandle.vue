<template>
  <div
    ref="handleRef"
    :class="['split-handle', direction, { dragging: isDragging }]"
    @mousedown.prevent="onMouseDown"
  >
    <div class="split-handle-bar" />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  direction: 'horizontal' | 'vertical';
}>();

const emit = defineEmits<{
  resize: [delta: number];
  dragStart: [];
  dragEnd: [];
}>();

const handleRef = ref<HTMLElement>();
const isDragging = ref(false);

function onMouseDown(e: MouseEvent) {
  isDragging.value = true;
  emit('dragStart');
  const startPos = props.direction === 'vertical' ? e.clientX : e.clientY;

  const onMove = (ev: MouseEvent) => {
    const currentPos = props.direction === 'vertical' ? ev.clientX : ev.clientY;
    emit('resize', currentPos - startPos);
  };

  const onUp = () => {
    isDragging.value = false;
    emit('dragEnd');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
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
