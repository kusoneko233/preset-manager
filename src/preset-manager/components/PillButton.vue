<template>
  <button
    class="pill-btn"
    :class="[`pill-btn-${variant}`, `pill-btn-${size}`, { 'pill-btn-icon-only': iconOnly }]"
    :type="type"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <Icon v-if="leadingIcon" :name="leadingIcon" :size="iconSize" />
    <span v-if="$slots.default" class="pill-btn-label"><slot /></span>
    <Icon v-if="trailingIcon" :name="trailingIcon" :size="iconSize" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Icon from './Icon.vue';
import type { LucideIconName } from '../utils/lucideIcons';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    leadingIcon?: LucideIconName;
    trailingIcon?: LucideIconName;
    iconOnly?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    type: 'button',
  },
);

defineEmits<{
  (event: 'click', payload: MouseEvent): void;
}>();

const iconSize = computed(() => {
  if (props.size === 'sm') return 13;
  if (props.size === 'lg') return 17;
  return 15;
});
</script>

<style scoped>
.pill-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--pm-text);
  font: inherit;
  letter-spacing: -0.005em;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease, opacity 0.12s ease;
}
.pill-btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}
.pill-btn-sm {
  height: 26px;
  padding: 0 11px;
  font-size: 12.5px;
  font-weight: 500;
}
.pill-btn-md {
  height: 32px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 500;
}
.pill-btn-lg {
  height: 36px;
  padding: 0 16px;
  font-size: 13.5px;
  font-weight: 500;
}
.pill-btn-icon-only.pill-btn-sm {
  width: 26px;
  padding: 0;
}
.pill-btn-icon-only.pill-btn-md {
  width: 32px;
  padding: 0;
}
.pill-btn-icon-only.pill-btn-lg {
  width: 36px;
  padding: 0;
}
.pill-btn-label {
  line-height: 1;
}

.pill-btn-primary {
  background: var(--pm-pill-primary-bg);
  color: var(--pm-pill-primary-fg);
}
.pill-btn-primary:hover:not(:disabled) {
  background: var(--pm-pill-primary-bg-hover);
}

.pill-btn-secondary {
  border-color: var(--pm-pill-border);
  color: var(--pm-text);
}
.pill-btn-secondary:hover:not(:disabled) {
  border-color: var(--pm-pill-border-hover);
  background: var(--pm-pill-bg-hover);
}

.pill-btn-ghost {
  color: var(--pm-text-muted);
}
.pill-btn-ghost:hover:not(:disabled) {
  background: var(--pm-pill-bg-hover);
  color: var(--pm-text);
}

.pill-btn-danger {
  border-color: transparent;
  color: var(--pm-danger);
}
.pill-btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--pm-danger) 14%, transparent);
  color: var(--pm-danger);
}
</style>
