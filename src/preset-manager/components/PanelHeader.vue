<template>
  <header class="panel-header" :class="{ 'is-compact': compact }">
    <div class="panel-header-text">
      <span v-if="kicker" class="panel-header-kicker">{{ kicker }}</span>
      <h3 class="panel-header-title">
        <slot name="title">{{ title }}</slot>
      </h3>
      <span v-if="$slots.meta || meta" class="panel-header-meta">
        <slot name="meta">{{ meta }}</slot>
      </span>
    </div>
    <div v-if="$slots.actions" class="panel-header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  kicker?: string;
  title?: string;
  meta?: string;
  compact?: boolean;
}>();
</script>

<style scoped>
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 12px;
}
.panel-header.is-compact {
  padding: 10px 14px 8px;
}
.panel-header-text {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.panel-header-kicker {
  color: var(--pm-text-subtle);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.panel-header-title {
  margin: 0;
  color: var(--pm-text);
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.panel-header-meta {
  color: var(--pm-text-subtle);
  font-size: 12px;
  font-weight: 400;
  white-space: nowrap;
}
.panel-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
