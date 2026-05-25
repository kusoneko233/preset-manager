<template>
  <div class="favorite-folder">
    <div class="folder-row" @click="store.toggleFavoriteFolder(folder.id)">
      <Icon :name="folder.collapsed ? 'chevron-right' : 'chevron-down'" :size="12" class="folder-chevron" />

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
      <span v-else class="folder-name">{{ folder.name }}</span>

      <span class="folder-count" :class="{ 'is-empty': folder.items.length === 0 }">{{ folder.items.length }}</span>

      <div class="folder-actions" @click.stop>
        <button class="folder-action" title="重命名" @click="startEdit">
          <Icon name="pen-line" :size="12" />
        </button>
        <button class="folder-action folder-action-danger" title="删除文件夹" @click="$emit('delete')">
          <Icon name="trash-2" :size="12" />
        </button>
      </div>
    </div>

    <div
      v-if="!folder.collapsed"
      class="folder-items"
      :class="{ 'drag-over': isDragOver }"
      @dragover.prevent="onDragOver"
      @dragleave="isDragOver = false"
      @drop.prevent="onDrop"
    >
      <div v-if="!folder.items.length" class="empty-folder">拖拽条目到此处</div>
      <div
        v-for="(item, i) in folder.items"
        :key="`${folder.id}-${i}`"
        class="fav-item"
        :draggable="true"
        @dragstart="onItemDragStart($event, item, i)"
      >
        <Icon name="dot" :size="14" class="fav-item-dot" />
        <span class="fav-item-name">{{ item.name }}</span>
        <button class="fav-remove" title="移除" @click="store.removeFromFavorites(folder.id, i)">
          <Icon name="x" :size="11" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import { getPromptKey, useManagerStore, type FavoriteFolder } from '../stores/manager';

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
    stored.forbid_overrides = Boolean(stored.forbid_overrides);
    store.addToFavorites(props.folder.id, stored as PresetNormalPrompt);

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
  border-radius: 8px;
  background: transparent;
}
.folder-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s ease;
}
.folder-row:hover {
  background: var(--pm-row-hover);
}
.folder-chevron {
  flex-shrink: 0;
  color: var(--pm-text-subtle);
}
.folder-name {
  flex: 1;
  min-width: 0;
  color: var(--pm-text);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.005em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.folder-name-input {
  flex: 1;
  min-width: 0;
  height: 24px;
  padding: 0 7px;
  border: 1px solid var(--pm-border-strong);
  border-radius: 6px;
  background: var(--pm-input-bg);
  color: var(--pm-text);
  font-size: 12px;
  outline: none;
}
.folder-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--pm-bg-elevated);
  color: var(--pm-text-subtle);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1;
}
.folder-count.is-empty {
  color: var(--pm-text-faint);
  background: transparent;
}
.folder-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.12s ease;
}
.folder-row:hover .folder-actions {
  opacity: 1;
}
.folder-action {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}
.folder-action:hover {
  background: var(--pm-pill-bg-hover);
  color: var(--pm-text);
}
.folder-action.folder-action-danger:hover {
  background: color-mix(in srgb, var(--pm-danger) 14%, transparent);
  color: var(--pm-danger);
}
.folder-items {
  padding: 2px 4px 6px 22px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  transition: background 0.16s ease;
  border-radius: 8px;
  min-height: 24px;
}
.folder-items.drag-over {
  background: color-mix(in srgb, var(--pm-accent) 10%, transparent);
}
.empty-folder {
  padding: 8px 6px;
  color: var(--pm-text-faint);
  font-size: 11.5px;
  text-align: center;
}
.fav-item {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 4px 8px;
  border-radius: 6px;
  background: transparent;
  cursor: grab;
  transition: background 0.12s ease;
}
.fav-item:hover {
  background: var(--pm-row-hover);
}
.fav-item-dot {
  flex-shrink: 0;
  color: var(--pm-text-faint);
}
.fav-item-name {
  flex: 1;
  min-width: 0;
  color: var(--pm-text);
  font-size: 12.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fav-remove {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--pm-text-faint);
  opacity: 0;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s ease, color 0.12s ease, opacity 0.12s ease;
}
.fav-item:hover .fav-remove {
  opacity: 1;
}
.fav-remove:hover {
  background: color-mix(in srgb, var(--pm-danger) 14%, transparent);
  color: var(--pm-danger);
}
</style>
