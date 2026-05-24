<script setup lang="ts">
import { useDevThemeStore } from '../stores/devTheme';
import { buildDevThemeCss } from '../utils/devThemeCss';

const store = useDevThemeStore();
let styleEl: HTMLStyleElement | null = null;

function ensureStyleElement() {
  if (styleEl) return styleEl;
  styleEl = document.getElementById('pm-dev-theme') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'pm-dev-theme';
    document.head.appendChild(styleEl);
  }
  return styleEl;
}

function syncStyle() {
  const css = buildDevThemeCss({
    enabled: store.enabled,
    targets: store.currentTargets,
    background: store.currentDraft,
  });
  ensureStyleElement().textContent = css;
}

watch(
  () => [store.enabled, store.currentTargets, store.currentDraft],
  syncStyle,
  { deep: true, immediate: true },
);

onUnmounted(() => {
  if (styleEl) styleEl.textContent = '';
});
</script>

<template>
  <span class="dev-theme-style-injector" aria-hidden="true" />
</template>

<style scoped>
.dev-theme-style-injector {
  display: none;
}
</style>
