<template>
  <div class="left-sidebar" :class="{ collapsed }" :style="{ width: collapsed ? '0px' : `${width}px` }">
    <template v-if="!collapsed">
      <div class="sidebar-content">
        <div class="workbench-area" :style="{ height: `${topHeight}px` }">
          <WorkbenchPanel />
        </div>

        <SplitHandle class="sidebar-section-handle" direction="horizontal" @drag-start="onHorizontalDragStart" @resize="onHorizontalResize" />

        <div class="favorites-area" style="flex: 1; min-height: 80px">
          <FavoritesPanel />
        </div>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import WorkbenchPanel from './WorkbenchPanel.vue';
import FavoritesPanel from './FavoritesPanel.vue';
import SplitHandle from './SplitHandle.vue';

defineProps<{
  width: number;
  collapsed: boolean;
}>();

const topHeight = ref(188);
const startTopHeight = ref(188);

function onHorizontalDragStart() {
  startTopHeight.value = topHeight.value;
}

function onHorizontalResize(delta: number) {
  topHeight.value = Math.max(80, Math.min(startTopHeight.value + delta, 500));
}
</script>

<style scoped>
.left-sidebar {
  flex-shrink: 0;
  position: relative;
  display: flex;
  background: transparent;
  border-right: 0;
  overflow: visible;
}
.left-sidebar::before {
  display: none;
}
.left-sidebar::after {
  display: none;
}
.left-sidebar.collapsed {
  min-width: 0;
  overflow: hidden;
}
.sidebar-content {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  padding: 6px 15px 14px;
  gap: 0;
}
.workbench-area {
  min-height: 80px;
  overflow: hidden;
  background: transparent;
}
.sidebar-section-handle {
  height: 0 !important;
  opacity: 0;
  margin: 0;
  overflow: visible;
  pointer-events: auto;
}
.sidebar-section-handle :deep(.split-handle-bar) {
  opacity: 0 !important;
}
.sidebar-section-handle:hover,
.sidebar-section-handle.dragging {
  opacity: 0;
}
.sidebar-section-handle:hover :deep(.split-handle-bar),
.sidebar-section-handle.dragging :deep(.split-handle-bar) {
  opacity: 0 !important;
  box-shadow: none !important;
}
.favorites-area {
  overflow: hidden;
  background: transparent;
}
</style>
