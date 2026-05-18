<template>
  <div class="left-sidebar" :class="{ collapsed: isCollapsed }" :style="{ width: isCollapsed ? '32px' : `${width}px` }">
    <template v-if="!isCollapsed">
      <div class="sidebar-content">
        <div class="workbench-area" :style="{ height: `${topHeight}px` }">
          <WorkbenchPanel />
        </div>

        <SplitHandle direction="horizontal" @drag-start="onHorizontalDragStart" @resize="onHorizontalResize" />

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
  background: var(--pm-bg-sidebar);
  border-right: 1px solid var(--pm-border);
  overflow: hidden;
}
.left-sidebar.collapsed {
  min-width: 32px;
}
.collapse-toggle {
  position: absolute;
  top: 52px;
  right: 8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid var(--pm-border);
  background: var(--pm-bg-elevated);
  color: var(--pm-text-subtle);
  cursor: pointer;
  z-index: 30;
  transition: all 0.12s;
}
.collapse-toggle:hover {
  color: var(--pm-text);
  background: var(--pm-bg-hover);
}
.left-sidebar.collapsed .collapse-toggle {
  right: 50%;
  transform: translateX(50%);
  top: 50%;
  margin-top: -12px;
}
.sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}
.workbench-area {
  min-height: 80px;
  overflow: hidden;
  background: var(--pm-bg-sidebar);
}
.favorites-area {
  overflow: hidden;
  background: var(--pm-bg-sidebar);
}
</style>
