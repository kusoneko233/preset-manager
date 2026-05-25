<template>
  <button
    class="icon-btn"
    :class="[`icon-btn-${size}`, { 'is-active': active, 'is-danger': danger }]"
    :type="type"
    :disabled="disabled"
    :title="title"
    @click="$emit('click', $event)"
  >
    <Icon :name="name" :size="iconSize" :stroke-width="strokeWidth" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Icon from './Icon.vue';
import type { LucideIconName } from '../utils/lucideIcons';

const props = withDefaults(
  defineProps<{
    name: LucideIconName;
    size?: 'sm' | 'md' | 'lg';
    strokeWidth?: number;
    active?: boolean;
    danger?: boolean;
    disabled?: boolean;
    title?: string;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  {
    size: 'md',
    strokeWidth: 1.75,
    type: 'button',
  },
);

defineEmits<{
  (event: 'click', payload: MouseEvent): void;
}>();

const iconSize = computed(() => {
  if (props.size === 'sm') return 14;
  if (props.size === 'lg') return 18;
  return 16;
});
</script>

<style scoped>
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease, opacity 0.12s ease;
}
.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.icon-btn-sm {
  width: 26px;
  height: 26px;
}
.icon-btn-md {
  width: 30px;
  height: 30px;
}
.icon-btn-lg {
  width: 34px;
  height: 34px;
}
.icon-btn:hover:not(:disabled) {
  background: var(--pm-pill-bg-hover);
  color: var(--pm-text);
}
.icon-btn.is-active {
  background: var(--pm-pill-bg-active);
  color: var(--pm-text);
}
.icon-btn.is-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--pm-danger) 12%, transparent);
  color: var(--pm-danger);
}
</style>
