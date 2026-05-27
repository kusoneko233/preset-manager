<script setup lang="ts">
import { computed, inject, onUnmounted, watch } from 'vue';
import { buildDevThemeCss } from '../utils/devThemeCss';
import { useDevThemeStore } from '../stores/devTheme';

const store = useDevThemeStore();
const parentDoc = inject<Document | null>('parentDocument', null);
const iframeElement = inject<HTMLIFrameElement | null>('iframeElement', null);
const styleEls = new Map<Document, HTMLStyleElement>();

const selectedPaths = computed(() => {
  if (!store.currentTargets.selected) return [] as string[];
  return store.selectedElement?.path ? [store.selectedElement.path] : [];
});

const livePreviewTargets = computed(() => ({
  ...store.currentTargets,
  selected: store.currentTargets.selected || Boolean(store.selectedElement),
}));

const livePreviewSelectedPaths = computed(() => {
  if (!livePreviewTargets.value.selected) return [] as string[];
  return store.selectedElement?.path ? [store.selectedElement.path] : [];
});

function styleIdFor(styleDocument: Document) {
  return styleDocument === parentDoc ? 'pm-dev-theme-parent' : 'pm-dev-theme-iframe';
}

function ensureStyleElement(styleDocument: Document) {
  const existing = styleEls.get(styleDocument);
  if (existing?.ownerDocument === styleDocument) return existing;
  const styleId = styleIdFor(styleDocument);
  let styleEl = styleDocument.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = styleDocument.createElement('style');
    styleEl.id = styleId;
    styleDocument.head.appendChild(styleEl);
  }
  styleEls.set(styleDocument, styleEl);
  return styleEl;
}

function syncStyleElement(styleDocument: Document, css: string) {
  ensureStyleElement(styleDocument).textContent = css;
}

function getIframeDocument() {
  return iframeElement?.contentDocument ?? document;
}

function syncStyle() {
  const css = buildDevThemeCss({
    enabled: store.enabled,
    targets: store.livePreviewActive ? livePreviewTargets.value : store.currentTargets,
    background: store.currentDraft,
    selectedPaths: store.livePreviewActive ? livePreviewSelectedPaths.value : selectedPaths.value,
  });
  const iframeDoc = getIframeDocument();
  syncStyleElement(iframeDoc, css);
  if (parentDoc && parentDoc !== iframeDoc) syncStyleElement(parentDoc, css);
}

watch(
  () => [store.enabled, store.currentTargets, store.currentDraft, store.livePreviewActive, selectedPaths.value, livePreviewSelectedPaths.value],
  syncStyle,
  { deep: true, immediate: true },
);

onUnmounted(() => {
  styleEls.forEach(styleEl => {
    styleEl.textContent = '';
  });
  styleEls.clear();
});
</script>

<template>
  <span hidden aria-hidden="true"></span>
</template>
