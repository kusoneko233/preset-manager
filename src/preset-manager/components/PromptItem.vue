<template>
  <div
    class="prompt-item"
    :class="{ expanded, dragging: isDragging, 'is-placeholder': isPlaceholder }"
    :draggable="!isPlaceholder"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <div class="prompt-header" @click="toggle">
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <button
          v-if="!isPlaceholder"
          class="star-btn"
          :class="{ favorited: isFavorited }"
          title="收藏"
          @click.stop="$emit('toggleFavorite')"
        >
          <i :class="['text-xs', isFavorited ? 'fas fa-star' : 'far fa-star']" />
        </button>
        <i v-else class="fas fa-grip-lines text-slate-600 text-xs flex-shrink-0" />

        <span class="prompt-name">{{ prompt.name }}</span>
      </div>

      <div class="flex items-center gap-2 flex-shrink-0">
        <span class="role-badge" :class="prompt.role">{{ prompt.role }}</span>
        <span v-if="'enabled' in prompt" class="status-dot" :class="{ enabled: prompt.enabled }" />
        <i :class="['fas text-xs text-slate-500 transition-transform', expanded ? 'fa-chevron-up' : 'fa-chevron-down']" />
      </div>
    </div>

    <div v-if="expanded" class="prompt-body">
      <div v-if="prompt.content" class="content-preview">{{ prompt.content }}</div>
      <div v-else class="text-slate-500 text-xs italic">[占位符 - 无内容]</div>

      <div class="prompt-actions">
        <button class="action-btn" title="放大查看" @click="$emit('zoom')">
          <i class="fas fa-search-plus text-xs" />
          <span>放大</span>
        </button>
        <button v-if="!isPlaceholder" class="action-btn" title="编辑" @click="$emit('edit')">
          <i class="fas fa-edit text-xs" />
          <span>编辑</span>
        </button>
        <button v-if="!isPlaceholder" class="action-btn" title="收藏" @click="$emit('toggleFavorite')">
          <i :class="['text-xs', isFavorited ? 'fas fa-star text-amber-400' : 'far fa-star']" />
          <span>{{ isFavorited ? '取消收藏' : '收藏' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  prompt: PresetPrompt;
  isFavorited?: boolean;
  dragType?: string;
  dragSource?: string;
  dragIndex?: number;
}>();

defineEmits<{
  zoom: [];
  edit: [];
  toggleFavorite: [];
}>();

const expanded = ref(false);
const isDragging = ref(false);

const isPlaceholder = computed(() => isPresetPlaceholderPrompt(props.prompt));

function toggle() {
  expanded.value = !expanded.value;
}

function onDragStart(e: DragEvent) {
  if (isPlaceholder.value) {
    e.preventDefault();
    return;
  }
  isDragging.value = true;
  e.dataTransfer!.effectAllowed = 'copy';
  e.dataTransfer!.setData(
    'application/json',
    JSON.stringify({
      type: props.dragType ?? 'prompt',
      source: props.dragSource ?? '',
      index: props.dragIndex ?? 0,
      prompt: props.prompt,
    }),
  );
}

function onDragEnd() {
  isDragging.value = false;
}

defineExpose({ expanded });
</script>

<style scoped>
.prompt-item {
  border: 1px solid rgba(51, 65, 85, 0.4);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.6);
  transition: all 0.15s;
  cursor: grab;
}
.prompt-item:hover {
  border-color: rgba(99, 102, 241, 0.3);
  background: rgba(15, 23, 42, 0.8);
}
.prompt-item.dragging {
  opacity: 0.5;
  cursor: grabbing;
}
.prompt-item.is-placeholder {
  cursor: default;
  border-style: dashed;
  opacity: 0.7;
}
.prompt-header {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  cursor: pointer;
  gap: 8px;
}
.prompt-name {
  font-size: 13px;
  color: #e2e8f0;
  word-break: break-all;
}
.star-btn {
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
  flex-shrink: 0;
  transition: all 0.15s;
}
.star-btn:hover {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
}
.star-btn.favorited {
  color: #fbbf24;
}
.role-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
  text-transform: uppercase;
}
.role-badge.system {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}
.role-badge.user {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}
.role-badge.assistant {
  background: rgba(251, 146, 60, 0.15);
  color: #fb923c;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #475569;
}
.status-dot.enabled {
  background: #4ade80;
}
.prompt-body {
  padding: 0 10px 10px;
  border-top: 1px solid rgba(51, 65, 85, 0.3);
  margin-top: 0;
  padding-top: 8px;
}
.content-preview {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 8px;
}
.prompt-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 5px;
  border: 1px solid rgba(51, 65, 85, 0.4);
  background: rgba(30, 41, 59, 0.6);
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.12s;
}
.action-btn:hover {
  background: rgba(51, 65, 85, 0.6);
  color: #e2e8f0;
  border-color: rgba(99, 102, 241, 0.4);
}
</style>
