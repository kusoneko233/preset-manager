<template>
  <div class="favorite-folder">
    <div class="folder-header" @click="store.toggleFavoriteFolder(folder.id)">
      <i :class="['fas text-xs text-slate-500 mr-1', folder.collapsed ? 'fa-chevron-right' : 'fa-chevron-down']" />

      <template v-if="isEditing">
        <input
          ref="nameInput"
          v-model="editName"
          class="folder-name-input"
          @keydown.enter="finishEdit"
          @keydown.escape="cancelEdit"
          @blur="finishEdit"
          @click.stop
        />
      </template>
      <span v-else class="folder-name flex-1 truncate">{{ folder.name }}</span>

      <div class="folder-actions" @click.stop>
        <button class="folder-btn" title="重命名" @click="startEdit">
          <i class="fas fa-pen text-xs" />
        </button>
        <button class="folder-btn" title="删除文件夹" @click="$emit('delete')">
          <i class="fas fa-trash text-xs" />
        </button>
      </div>
    </div>

    <div
      v-if="!folder.collapsed"
      class="folder-items"
      @dragover.prevent="onDragOver"
      @dragleave="isDragOver = false"
      @drop.prevent="onDrop"
      :class="{ 'drag-over': isDragOver }"
    >
      <div v-if="!folder.items.length" class="empty-folder text-slate-600 text-xs text-center py-2">
        拖拽条目到此处
      </div>
      <div
        v-for="(item, i) in folder.items"
        :key="`${folder.id}-${i}`"
        class="fav-item"
        :draggable="true"
        @dragstart="onItemDragStart($event, item, i)"
      >
        <span class="fav-item-name">{{ item.name }}</span>
        <button class="fav-remove-btn" title="移除" @click="store.removeFromFavorites(folder.id, i)">
          <i class="fas fa-times text-xs" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useManagerStore, type FavoriteFolder } from '../stores/manager';

const props = defineProps<{
  folder: FavoriteFolder;
}>();

const emit = defineEmits<{
  delete: [];
}>();

const store = useManagerStore();
const isEditing = ref(false);
const editName = ref('');
const nameInput = ref<HTMLInputElement>();
const isDragOver = ref(false);

function startEdit() {
  editName.value = props.folder.name;
  isEditing.value = true;
  nextTick(() => nameInput.value?.focus());
}

function finishEdit() {
  if (isEditing.value && editName.value.trim()) {
    store.renameFavoriteFolder(props.folder.id, editName.value.trim());
  }
  isEditing.value = false;
}

function cancelEdit() {
  isEditing.value = false;
}

function onDragOver(e: DragEvent) {
  e.dataTransfer!.dropEffect = 'copy';
  isDragOver.value = true;
}

function onDrop(e: DragEvent) {
  isDragOver.value = false;
  const raw = e.dataTransfer?.getData('application/json');
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    const prompt = data.prompt as PresetPrompt;
    if (!prompt || isPresetPlaceholderPrompt(prompt)) return;

    store.addToFavorites(props.folder.id, {
      id: prompt.id,
      name: prompt.name,
      enabled: prompt.enabled ?? true,
      position: (prompt as any).position ?? { type: 'relative' as const },
      role: prompt.role,
      content: (prompt as any).content ?? '',
    });

    toastr.success(`已收藏 "${prompt.name}"`, '', { timeOut: 1500 });
  } catch (err) {
    console.error('[FavoriteFolder] Drop error:', err);
  }
}

function onItemDragStart(e: DragEvent, item: PresetNormalPrompt, index: number) {
  e.dataTransfer!.effectAllowed = 'copy';
  e.dataTransfer!.setData(
    'application/json',
    JSON.stringify({
      type: 'favorite',
      source: props.folder.id,
      index,
      prompt: item,
    }),
  );
}
</script>

<style scoped>
.favorite-folder {
  border: 1px solid rgba(51, 65, 85, 0.3);
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.4);
  overflow: hidden;
}
.folder-header {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  gap: 4px;
}
.folder-header:hover {
  background: rgba(51, 65, 85, 0.2);
}
.folder-name {
  font-size: 12px;
  color: #cbd5e1;
  font-weight: 500;
}
.folder-name-input {
  flex: 1;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid rgba(99, 102, 241, 0.5);
  background: rgba(0, 0, 0, 0.3);
  color: #e2e8f0;
  font-size: 12px;
  outline: none;
}
.folder-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.12s;
}
.folder-header:hover .folder-actions {
  opacity: 1;
}
.folder-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.12s;
}
.folder-btn:hover {
  color: #94a3b8;
  background: rgba(51, 65, 85, 0.4);
}
.folder-items {
  padding: 2px 6px 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: background 0.15s;
  min-height: 24px;
}
.folder-items.drag-over {
  background: rgba(99, 102, 241, 0.05);
}
.fav-item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 5px;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(51, 65, 85, 0.3);
  cursor: grab;
  gap: 4px;
}
.fav-item:hover {
  border-color: rgba(99, 102, 241, 0.3);
}
.fav-item-name {
  flex: 1;
  font-size: 11px;
  color: #cbd5e1;
  word-break: break-all;
}
.fav-remove-btn {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  border: none;
  background: transparent;
  color: #475569;
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0;
  transition: all 0.12s;
}
.fav-item:hover .fav-remove-btn {
  opacity: 1;
}
.fav-remove-btn:hover {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
}
</style>
