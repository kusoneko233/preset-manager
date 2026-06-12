<template>
  <div
    class="favorites-panel"
    @dragover.prevent="onPanelDragOver"
    @dragleave="onPanelDragLeave"
    @drop.prevent="onPanelDrop"
  >
    <div class="sidebar-section-head">
      <span class="sidebar-section-kicker">收藏</span>
      <IconButton name="plus" size="sm" title="新建收藏夹" @click="store.addFavoriteFolder()" />
    </div>

    <div class="folder-list">
      <FavoriteFolder
        v-for="folder in folders"
        :key="folder.id"
        :folder="folder"
        :drag-active="activeDropFolderId === folder.id"
        class="folder-entry"
        @drag-focus="setActiveDropFolder"
        @drag-clear="clearActiveDropFolder"
        @delete="confirmDelete(folder)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import IconButton from './IconButton.vue';
import FavoriteFolder from './FavoriteFolder.vue';
import { getPromptKey, useManagerStore, type FavoriteFolder as FavFolderType } from '../stores/manager';
import { useConfirmStore } from '../stores/confirm';
import { isPresetPlaceholderPrompt } from '../utils/officialPromptManager';

const store = useManagerStore();
const confirmDialog = useConfirmStore();
const folders = computed(() => store.favorites);
const activeDropFolderId = ref('');

async function confirmDelete(folder: FavFolderType) {
  if (folder.items.length > 0) {
    if (!await confirmDialog.confirm({
      title: '删除收藏夹',
      message: `确定删除收藏夹 "${folder.name}"？`,
      details: `其中有 ${folder.items.length} 个条目将一并删除。`,
      confirmLabel: '删除',
      tone: 'danger',
    })) return;
  }
  store.removeFavoriteFolder(folder.id);
}

function findDropFolderId(e: DragEvent) {
  const folderElement = (e.target as HTMLElement | null)?.closest?.('[data-folder-id]') as HTMLElement | null;
  if (folderElement?.dataset.folderId) return folderElement.dataset.folderId;

  const panel = e.currentTarget as HTMLElement | null;
  const folderElements = Array.from(panel?.querySelectorAll<HTMLElement>('.folder-list [data-folder-id]') ?? []);
  if (!folderElements.length) return folders.value[0]?.id || '';

  const clientY = e.clientY;
  let matchedFolderId = folderElements[0]?.dataset.folderId || '';
  for (const element of folderElements) {
    const rect = element.getBoundingClientRect();
    if (rect.top <= clientY) {
      matchedFolderId = element.dataset.folderId || matchedFolderId;
    }
  }
  return matchedFolderId;
}

function normalizeDroppedPrompt(prompt: PresetPrompt) {
  const promptKey = getPromptKey(prompt) || prompt.id;
  const stored = {
    ...klona(prompt as any),
    id: prompt.id || promptKey,
    identifier: promptKey,
    name: prompt.name,
    enabled: prompt.enabled ?? true,
    position: (prompt as any).position ?? { type: 'relative' as const },
    role: prompt.role,
    content: (prompt as any).content ?? '',
  };
  stored.injection_position = stored.injection_position
    ?? (stored.position?.type === 'in_chat' ? 1 : 0);
  stored.injection_depth = stored.injection_depth ?? stored.position?.depth ?? 4;
  stored.injection_order = stored.injection_order ?? stored.position?.order ?? 100;
  stored.injection_trigger = Array.isArray(stored.injection_trigger) ? stored.injection_trigger : [];
  stored.forbid_overrides = false;
  return stored as PresetNormalPrompt;
}

function addDroppedPromptToFolder(folderId: string, prompt: PresetPrompt) {
  if (!folderId || !prompt || isPresetPlaceholderPrompt(prompt)) return;
  const added = store.addToFavorites(folderId, normalizeDroppedPrompt(prompt));
  if (added) toastr.success(`已收藏 "${prompt.name}"`, '', { timeOut: 1500 });
  else toastr.warning(`"${prompt.name}" 已在这个收藏夹中`, '', { timeOut: 1500 });
}

function setActiveDropFolder(folderId: string) {
  activeDropFolderId.value = folderId;
}

function clearActiveDropFolder(folderId?: string) {
  if (!folderId || activeDropFolderId.value === folderId) {
    activeDropFolderId.value = '';
  }
}

function onPanelDragOver(e: DragEvent) {
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  activeDropFolderId.value = findDropFolderId(e);
}

function onPanelDragLeave(e: DragEvent) {
  const current = e.currentTarget as Node | null;
  const related = e.relatedTarget as Node | null;
  if (current && related && current.contains(related)) return;
  clearActiveDropFolder();
}

function onPanelDrop(e: DragEvent) {
  const folderId = activeDropFolderId.value || findDropFolderId(e);
  clearActiveDropFolder();
  const raw = e.dataTransfer?.getData('application/json');
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    if (!folderId) return;

    if (data.type === 'favorite' && typeof data.source === 'string' && typeof data.index === 'number') {
      const targetIndex = data.targetIndex;
      const folder = folders.value.find(item => item.id === folderId);
      store.moveFavoriteItem(
        data.source,
        data.index,
        folderId,
        typeof targetIndex === 'number' ? targetIndex : folder?.items.length ?? 0,
      );
      return;
    }

    addDroppedPromptToFolder(folderId, data.prompt as PresetPrompt);
  } catch (err) {
    console.error('[FavoritesPanel] Drop error:', err);
  }
}
</script>

<style scoped>
.favorites-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 8px;
}
.sidebar-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 26px;
  padding: 0 0 3px 12px;
}
.sidebar-section-kicker {
  color: var(--pm-text-subtle);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}
.folder-list {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.folder-entry {
  margin: 0;
}
</style>
