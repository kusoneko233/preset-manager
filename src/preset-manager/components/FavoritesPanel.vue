<template>
  <div class="favorites-panel flex flex-col h-full">
    <div class="panel-title flex items-center justify-between px-3 py-2">
      <span class="text-xs font-medium text-slate-400 uppercase tracking-wider">
        <i class="fas fa-star mr-1 text-amber-500" /> 收藏夹
      </span>
      <button class="add-btn" title="新建收藏夹" @click="store.addFavoriteFolder()">
        <i class="fas fa-plus text-xs" />
      </button>
    </div>

    <div class="folder-list flex-1 overflow-y-auto px-2 pb-2">
      <div v-if="!folders.length" class="empty-hint text-slate-600 text-xs text-center py-4">
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
  border-bottom: 1px solid rgba(51, 65, 85, 0.3);
}
.add-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  border: 1px solid rgba(51, 65, 85, 0.5);
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.12s;
}
.add-btn:hover {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.4);
}
</style>
