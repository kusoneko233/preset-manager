<template>
  <div class="favorites-panel flex flex-col h-full">
    <div class="panel-title flex items-center justify-between px-3 py-2">
      <span class="panel-label">收藏</span>
      <button class="add-btn" title="新建收藏夹" @click="store.addFavoriteFolder()">
        <i class="fas fa-plus text-xs" />
      </button>
    </div>

    <div class="folder-list flex-1 overflow-y-auto">
      <div v-if="!folders.length" class="empty-hint">
        点击 + 新建收藏夹
      </div>
      <FavoriteFolder
        v-for="folder in folders"
        :key="folder.id"
        :folder="folder"
        class="mb-1"
        @delete="confirmDelete(folder)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import FavoriteFolder from './FavoriteFolder.vue';
import { useManagerStore, type FavoriteFolder as FavFolderType } from '../stores/manager';

const store = useManagerStore();

const folders = computed(() => store.favorites);

function confirmDelete(folder: FavFolderType) {
  if (folder.items.length > 0) {
    if (!confirm(`确定删除收藏夹 "${folder.name}"？其中有 ${folder.items.length} 个条目将一并删除。`)) return;
  }
  store.removeFavoriteFolder(folder.id);
}
</script>

<style scoped>
.panel-title {
  min-height: 32px;
  padding: 7px 4px 6px !important;
  border-bottom: 0;
}
.panel-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--pm-text-subtle);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1;
  text-transform: uppercase;
}
.add-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  transition: all 0.12s;
}
.add-btn:hover {
  background: var(--pm-bg-hover);
  color: var(--pm-text);
  border-color: var(--pm-border);
}
.folder-list {
  padding: 0 1px 8px;
}
.empty-hint {
  padding: 14px 8px;
  color: var(--pm-text-subtle);
  font-size: 12px;
  text-align: center;
}
</style>
