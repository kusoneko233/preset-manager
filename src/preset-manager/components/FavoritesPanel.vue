<template>
  <div class="favorites-panel">
    <div class="sidebar-section-head">
      <span class="sidebar-section-kicker">收藏</span>
      <IconButton name="plus" size="sm" title="新建收藏夹" @click="store.addFavoriteFolder()" />
    </div>

    <div class="folder-list">
      <div v-if="!folders.length" class="empty-hint">
        <Icon name="bookmark" :size="14" />
        <span>点击 + 新建收藏夹</span>
      </div>
      <FavoriteFolder
        v-for="folder in folders"
        :key="folder.id"
        :folder="folder"
        class="folder-entry"
        @delete="confirmDelete(folder)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import IconButton from './IconButton.vue';
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
.favorites-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.sidebar-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  padding: 4px 4px 6px;
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
  padding: 2px 0 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 8px;
  color: var(--pm-text-faint);
  font-size: 12px;
}
.folder-entry {
  margin: 0;
}
</style>
