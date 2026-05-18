<template>
  <div class="left-sidebar" :class="{ collapsed: isCollapsed }" :style="{ width: isCollapsed ? '32px' : `${width}px` }">
    <template v-if="!isCollapsed">
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

    <button class="collapse-toggle" @click="isCollapsed = !isCollapsed">
      <i :class="['fas text-xs', isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left']" />
    </button>
  </div>
</template>

<script setup lang="ts">
import WorkbenchPanel from './WorkbenchPanel.vue';
import FavoritesPanel from './FavoritesPanel.vue';
import SplitHandle from './SplitHandle.vue';

defineProps<{
  width: number;
}>();

const isCollapsed = ref(false);
const topHeight = ref(200);
const startTopHeight = ref(200);

function onHorizontalDragStart() {
  startTopHeight.value = topHeight.value;
}

function onHorizontalResize(delta: number) {
  topHeight.value = Math.max(80, Math.min(startTopHeight.value + delta, 500));
}

defineExpose({ isCollapsed });
</script>

<style scoped>
.left-sidebar {
  flex-shrink: 0;
  position: relative;
  display: flex;
  background:
    radial-gradient(360px 250px at -70px -60px, var(--pm-sidebar-glow) 0%, transparent 68%),
    radial-gradient(300px 520px at -120px 44%, var(--pm-sidebar-glow-soft) 0%, transparent 72%),
    linear-gradient(180deg, transparent 0%, var(--pm-sidebar-shadow) 100%),
    var(--pm-bg-sidebar);
  border-right: 0;
  overflow: hidden;
}
.left-sidebar::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.08), transparent 38%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent 28%);
  opacity: 0.2;
}
.left-sidebar::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(90deg, transparent calc(100% - 42px), rgba(0, 0, 0, 0.1));
  opacity: 0.34;
}
.left-sidebar.collapsed {
  min-width: 32px;
}
.collapse-toggle {
  position: absolute;
  top: 50%;
  right: 8px;
  width: 26px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid var(--pm-border);
  background: var(--pm-bg-elevated);
  color: var(--pm-text-subtle);
  cursor: pointer;
  z-index: 30;
  transform: translateY(-50%);
  transition: all 0.12s;
}
.collapse-toggle:hover {
  color: var(--pm-text);
  background: var(--pm-bg-hover);
}
.left-sidebar.collapsed .collapse-toggle {
  top: 50%;
  right: 3px;
  width: 26px;
  height: 46px;
  transform: translateY(-50%);
}
.sidebar-content {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  padding: 8px 10px 10px;
}
.workbench-area {
  min-height: 80px;
  overflow: hidden;
  background: transparent;
}
.sidebar-section-handle {
  height: 14px;
  opacity: 0;
  margin: 2px 0;
  transition: opacity 0.12s ease;
}
.sidebar-section-handle:hover,
.sidebar-section-handle.dragging {
  opacity: 0.45;
}
.favorites-area {
  overflow: hidden;
  background: transparent;
}
</style>
