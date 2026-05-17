<template>
  <div class="app-root" :class="{ fullscreen: isFullscreen }">
    <TitleBar
      :is-fullscreen="isFullscreen"
      :can-undo="history.canUndo"
      :can-redo="history.canRedo"
      :ai-visible="ai.visible"
      @undo="doUndo"
      @redo="doRedo"
      @toggle-history="showHistory = !showHistory"
      @toggle-ai="ai.toggleVisible()"
      @toggle-fullscreen="toggleFullscreen"
      @close="closePanel"
    />

    <div class="main-body">
      <LeftSidebar ref="leftSidebarRef" :width="leftWidth" />

      <SplitHandle direction="vertical" @drag-start="onLeftDragStart" @resize="onLeftSplitResize" />

      <div class="center-area" style="flex: 1; min-width: 200px">
        <PresetPanel panel-id="main" :favorited-ids="favoritedIds" @favorite="onFavorite" />
      </div>

      <template v-if="showSecondPreset">
        <SplitHandle direction="vertical" @drag-start="onRightDragStart" @resize="onRightSplitResize" />
        <div class="second-preset-area" :style="{ width: `${rightWidth}px` }">
          <PresetPanel panel-id="second" :favorited-ids="favoritedIds" @favorite="onFavorite" />
        </div>
      </template>

      <button
        class="second-toggle"
        :class="{ active: showSecondPreset }"
        :title="showSecondPreset ? '收起第二预设' : '展开第二预设'"
        @click="showSecondPreset = !showSecondPreset"
      >
        <i :class="['fas text-xs', showSecondPreset ? 'fa-chevron-right' : 'fa-chevron-left']" />
      </button>
    </div>

    <AiAssistant />
    <HistoryPanel :visible="showHistory" @close="showHistory = false" />
  </div>
</template>

<script setup lang="ts">
import TitleBar from './components/TitleBar.vue';
import LeftSidebar from './components/LeftSidebar.vue';
import SplitHandle from './components/SplitHandle.vue';
import PresetPanel from './components/PresetPanel.vue';
import AiAssistant from './components/AiAssistant.vue';
import HistoryPanel from './components/HistoryPanel.vue';
import { useManagerStore } from './stores/manager';
import { useHistoryStore } from './stores/history';
import { useAiStore } from './stores/ai';

const manager = useManagerStore();
const history = useHistoryStore();
const ai = useAiStore();

const isFullscreen = ref(false);
const showHistory = ref(false);
const showSecondPreset = ref(false);
const leftWidth = ref(240);
const rightWidth = ref(280);
const leftSidebarRef = ref<any>();

const startLeftWidth = ref(240);
const startRightWidth = ref(280);

const favoritedIds = computed(() => {
  const ids = new Set<string>();
  for (const folder of manager.favorites) {
    for (const item of folder.items) {
      ids.add(item.id);
    }
  }
  return ids;
});

function onLeftDragStart() {
  startLeftWidth.value = leftWidth.value;
}

function onLeftSplitResize(delta: number) {
  leftWidth.value = Math.max(160, Math.min(startLeftWidth.value + delta, 500));
}

function onRightDragStart() {
  startRightWidth.value = rightWidth.value;
}

function onRightSplitResize(delta: number) {
  rightWidth.value = Math.max(160, Math.min(startRightWidth.value - delta, 500));
}

const parentDoc = inject<Document>('parentDocument')!;
const iframeEl = inject<HTMLIFrameElement>('iframeElement')!;

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  const style = iframeEl.style;
  if (isFullscreen.value) {
    style.top = '0';
    style.left = '0';
    style.right = '0';
    style.bottom = '0';
    style.width = '100%';
    style.height = '100%';
    style.maxWidth = '100%';
    style.maxHeight = '100%';
    style.transform = '';
    style.borderRadius = '0';
  } else {
    style.top = '50%';
    style.left = '50%';
    style.right = '';
    style.bottom = '';
    style.width = '900px';
    style.height = '600px';
    style.maxWidth = '95vw';
    style.maxHeight = '90vh';
    style.transform = 'translate(-50%, -50%)';
    style.borderRadius = '12px';
  }
}

function closePanel() {
  const $iframe = $(iframeEl);
  $iframe.hide();
}

async function doUndo() {
  const record = await history.undo();
  if (record) {
    manager.refreshMainPreset();
    manager.refreshSecondPreset();
    toastr.info(`已撤回: ${record.description}`, '', { timeOut: 1500 });
  }
}

async function doRedo() {
  const record = await history.redo();
  if (record) {
    manager.refreshMainPreset();
    manager.refreshSecondPreset();
    toastr.info(`已重做: ${record.description}`, '', { timeOut: 1500 });
  }
}

function onFavorite(prompt: PresetPrompt) {
  if (manager.favorites.length === 0) {
    manager.addFavoriteFolder('收藏夹 1');
  }
  const firstFolder = manager.favorites[0];
  const existingIdx = firstFolder.items.findIndex(i => i.id === prompt.id);
  if (existingIdx >= 0) {
    manager.removeFromFavorites(firstFolder.id, existingIdx);
    toastr.info('已取消收藏', '', { timeOut: 1200 });
  } else {
    manager.addToFavorites(firstFolder.id, {
      id: prompt.id,
      name: prompt.name,
      enabled: prompt.enabled ?? true,
      position: (prompt as any).position ?? { type: 'relative' as const },
      role: prompt.role,
      content: (prompt as any).content ?? '',
    });
    toastr.success('已收藏', '', { timeOut: 1200 });
  }
}

onMounted(() => {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      doUndo();
    } else if (e.ctrlKey && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      doRedo();
    }
  });
});
</script>

<style>
html, body {
  margin: 0 !important;
  padding: 0;
  overflow: hidden !important;
  height: 100%;
  background: transparent;
}
* { box-sizing: border-box; }
</style>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1a1a2e;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
  border-radius: 12px;
}
.app-root.fullscreen {
  border-radius: 0;
}
.main-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}
.center-area {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.second-preset-area {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid rgba(51, 65, 85, 0.3);
}
.second-toggle {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(51, 65, 85, 0.4);
  border-right: none;
  border-radius: 6px 0 0 6px;
  color: #64748b;
  cursor: pointer;
  z-index: 20;
  transition: all 0.12s;
}
.second-toggle:hover {
  color: #94a3b8;
  background: rgba(51, 65, 85, 0.9);
}
.second-toggle.active {
  right: auto;
  position: relative;
}
</style>
