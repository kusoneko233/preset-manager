<template>
  <svg
    class="lucide-icon"
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    v-html="iconBody"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { LUCIDE_ICONS, type LucideIconName } from '../utils/lucideIcons';

const props = defineProps<{
  name: LucideIconName;
  size?: number | string;
  strokeWidth?: number | string;
}>();

const size = computed(() => props.size ?? 16);
const strokeWidth = computed(() => props.strokeWidth ?? 1.75);
const iconBody = computed(() => LUCIDE_ICONS[props.name] ?? '');
</script>

<style scoped>
.lucide-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
