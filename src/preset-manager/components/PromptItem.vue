<template>
  <div
    class="prompt-item"
    :class="{ expanded, dragging: isDragging, disabled: !prompt.enabled, 'is-placeholder': isPlaceholder }"
    :draggable="!isPlaceholder"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <div class="prompt-header" @click="toggle">
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <i v-if="isPlaceholder" class="fas fa-grip-lines flex-shrink-0 text-xs text-slate-600" />

        <span class="prompt-name">{{ prompt.name }}</span>
        <span v-if="relationLabel" class="relation-badge">{{ relationLabel }}</span>
      </div>

      <div class="flex flex-shrink-0 items-center gap-1">
        <button
          v-if="'enabled' in prompt"
          class="status-toggle"
          :class="{ enabled: prompt.enabled }"
          :disabled="isPlaceholder"
          :title="prompt.enabled ? '禁用条目' : '启用条目'"
          @click.stop="!isPlaceholder && $emit('toggleEnabled')"
        >
          <span class="status-dot" />
        </button>
        <span class="expand-chevron" :class="{ expanded }" aria-hidden="true" />
      </div>
    </div>

    <div v-if="!expanded && prompt.content" class="prompt-preview">
      {{ prompt.content }}
    </div>

    <div v-if="expanded" class="prompt-body">
      <div class="prompt-meta">
        <span class="role-badge" :class="prompt.role">{{ prompt.role }}</span>
        <span v-if="triggerLabel" class="meta-badge">{{ triggerLabel }}</span>
        <span v-if="positionLabel" class="meta-badge">{{ positionLabel }}</span>
      </div>
      <div v-if="prompt.content" class="content-preview expanded-content">{{ prompt.content }}</div>
      <div v-else class="text-xs text-slate-500 italic">[无内容]</div>

      <div class="prompt-actions">
        <button v-if="!isPlaceholder" class="action-btn" title="编辑条目" @click.stop="$emit('edit')">
          <i class="fas fa-edit text-xs" />
        </button>
        <button
          v-if="!isPlaceholder"
          class="action-btn"
          :title="prompt.enabled ? '禁用条目' : '启用条目'"
          @click.stop="$emit('toggleEnabled')"
        >
          <i :class="['fas text-xs', prompt.enabled ? 'fa-toggle-on' : 'fa-toggle-off']" />
        </button>
        <button v-if="canTransfer" class="action-btn transfer" :title="`复制到${transferTargetLabel}`" @click.stop="$emit('copyToOther')">
          <i class="fas fa-copy text-xs" />
        </button>
        <button v-if="canTransfer" class="action-btn transfer" :title="`迁移到${transferTargetLabel}`" @click.stop="$emit('moveToOther')">
          <i class="fas fa-arrow-right-arrow-left text-xs" />
        </button>
        <button v-if="canDetach" class="action-btn" title="移出列表" @click.stop="$emit('detach')">
          <i class="fas fa-minus-circle text-xs" />
        </button>
        <button v-if="canRestoreDefault" class="action-btn" title="恢复默认" @click.stop="$emit('restoreDefault')">
          <i class="fas fa-rotate-left text-xs" />
        </button>
        <button v-if="canDelete" class="action-btn danger" title="删除条目" @click.stop="$emit('delete')">
          <i class="fas fa-trash text-xs" />
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
  relationLabel?: string;
  canTransfer?: boolean;
  canDetach?: boolean;
  canDelete?: boolean;
  canRestoreDefault?: boolean;
  transferTargetLabel?: string;
}>();

defineEmits<{
  zoom: [];
  edit: [];
  toggleFavorite: [];
  toggleEnabled: [];
  delete: [];
  detach: [];
  restoreDefault: [];
  copyToOther: [];
  moveToOther: [];
}>();

const expanded = ref(false);
const isDragging = ref(false);

const isPlaceholder = computed(() => isPresetPlaceholderPrompt(props.prompt));
const promptAny = computed(() => props.prompt as any);

const triggerLabel = computed(() => {
  const triggers = promptAny.value.injection_trigger ?? promptAny.value.triggers;
  if (!Array.isArray(triggers) || triggers.length === 0) return '';
  return `触发 ${triggers.length}`;
});

const positionLabel = computed(() => {
  const position = promptAny.value.position;
  const injectionPosition = promptAny.value.injection_position;
  if (position?.type === 'in_chat' || injectionPosition === 1) {
    const depth = position?.depth ?? promptAny.value.injection_depth;
    const order = position?.order ?? promptAny.value.injection_order;
    return `聊天中 D${depth ?? '-'} / O${order ?? '-'}`;
  }
  return '相对位置';
});

function toggle() {
  expanded.value = !expanded.value;
}

function onDragStart(e: DragEvent) {
  if (isPlaceholder.value) {
    e.preventDefault();
    return;
  }
  isDragging.value = true;
  e.dataTransfer!.effectAllowed = props.dragType === 'preset-prompt' ? 'copyMove' : 'copy';
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
  position: relative;
  border: 0;
  border-bottom: 1px solid var(--pm-row-border);
  border-radius: 0;
  background: var(--pm-row-bg);
  transition: background 0.12s, opacity 0.12s;
  cursor: grab;
}
.prompt-item::before {
  content: '';
  position: absolute;
  inset: 6px auto 6px 0;
  width: 2px;
  border-radius: 999px;
  background: transparent;
  transition: background 0.12s;
}
.prompt-item:hover {
  background: var(--pm-row-hover);
}
.prompt-item.expanded {
  border: 0;
  border-top: 1px solid var(--pm-divider);
  border-bottom: 1px solid var(--pm-divider);
  border-radius: 0;
  background: var(--pm-row-active);
  margin: 0;
}
.prompt-item.expanded::before {
  background: var(--pm-text-muted);
}
.prompt-item.dragging {
  opacity: 0.5;
  cursor: grabbing;
}
.prompt-item.disabled {
  opacity: 0.62;
}
.prompt-item.is-placeholder {
  cursor: default;
  border: 0;
  border-bottom: 1px dashed var(--pm-row-border);
  border-radius: 0;
  opacity: 0.7;
}
.prompt-header {
  display: flex;
  align-items: center;
  min-height: var(--pm-prompt-row-min, 44px);
  padding: var(--pm-prompt-pad-y, 8px) calc(var(--pm-prompt-pad-x, 10px) + 2px);
  cursor: pointer;
  gap: 8px;
}
.prompt-name {
  color: var(--pm-text);
  word-break: break-all;
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: 0;
}
.relation-badge {
  flex-shrink: 0;
  padding: 1px 6px;
  border: 1px solid var(--pm-border);
  border-radius: 6px;
  color: var(--pm-text-subtle);
  font-size: 10px;
  line-height: 1.5;
  background: color-mix(in srgb, var(--pm-bg-elevated) 48%, transparent);
}
.prompt-preview {
  display: -webkit-box;
  margin: calc(-1 * var(--pm-prompt-pad-y, 8px) + 1px) calc(var(--pm-prompt-pad-x, 10px) + 48px) var(--pm-prompt-pad-y, 8px) calc(var(--pm-prompt-pad-x, 10px) + var(--pm-prompt-icon-size, 22px) + 8px);
  color: var(--pm-text-subtle);
  line-height: 1.45;
  word-break: break-all;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--pm-prompt-preview-lines, 1);
}
.expand-chevron {
  width: 15px;
  height: 15px;
  position: relative;
  flex: 0 0 15px;
  opacity: 0.56;
  transition: opacity 0.12s, transform 0.12s;
}
.expand-chevron::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 4px;
  width: 6px;
  height: 6px;
  border-right: 1.2px solid var(--pm-text-muted);
  border-bottom: 1.2px solid var(--pm-text-muted);
  transform: rotate(45deg);
}
.expand-chevron.expanded::before {
  top: 6px;
  transform: rotate(225deg);
}
.prompt-header:hover .expand-chevron {
  opacity: 0.9;
}
.role-badge {
  font-size: 10px;
  min-width: 0;
  padding: 1px 6px;
  border-radius: 999px;
  font-weight: 500;
  text-align: center;
  text-transform: uppercase;
  border: 1px solid var(--pm-border);
}
.role-badge.system {
  background: color-mix(in srgb, var(--pm-bg-elevated) 68%, transparent);
  color: var(--pm-text);
}
.role-badge.user {
  background: color-mix(in srgb, var(--pm-success) 12%, transparent);
  color: var(--pm-success);
}
.role-badge.assistant {
  background: color-mix(in srgb, var(--pm-warning) 12%, transparent);
  color: var(--pm-warning);
}
.status-toggle {
  width: 30px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 2px;
  border: 1px solid color-mix(in srgb, var(--pm-border) 68%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--pm-text-subtle) 12%, transparent);
  color: var(--pm-text-subtle);
  cursor: pointer;
  transition: opacity 0.14s;
}
.status-toggle:hover:not(:disabled) {
  background: var(--pm-bg-hover);
  border-color: var(--pm-border-strong);
}
.status-toggle.enabled {
  background: color-mix(in srgb, var(--pm-text-subtle) 12%, transparent);
  border-color: color-mix(in srgb, var(--pm-border) 68%, transparent);
}
.status-toggle:disabled {
  cursor: default;
}
.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--pm-text-subtle) 88%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--pm-border-strong) 50%, transparent);
  transition: transform 0.14s, background 0.14s;
}
.status-toggle.enabled .status-dot {
  background: var(--pm-success);
  box-shadow: none;
  transform: translateX(12px);
}
.prompt-body {
  padding: 0 var(--pm-prompt-pad-x, 10px) var(--pm-prompt-pad-y, 8px);
  border-top: 1px solid var(--pm-divider);
  margin-top: 0;
  padding-top: var(--pm-prompt-pad-y, 8px);
}
.prompt-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
}
.meta-badge {
  min-width: 0;
  padding: 1px 6px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  color: var(--pm-text-subtle);
  font-size: 10px;
  line-height: 1.5;
  background: color-mix(in srgb, var(--pm-bg-elevated) 42%, transparent);
}
.content-preview {
  font-size: var(--pm-prompt-preview-font-size, 13px);
  color: var(--pm-text-muted);
  line-height: 1.5;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  background: color-mix(in srgb, var(--pm-input-bg) 70%, transparent);
  border: 1px solid var(--pm-divider);
  border-radius: 7px;
  padding: var(--pm-prompt-pad-y, 8px);
}
.expanded-content {
  max-height: clamp(220px, 34vh, 460px);
}
.prompt-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: var(--pm-prompt-pad-y, 8px);
}
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--pm-text-subtle);
  font-size: 11px;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.action-btn:hover {
  background: var(--pm-bg-hover);
  color: var(--pm-text);
}
.action-btn.danger:hover {
  color: var(--pm-danger);
  background: color-mix(in srgb, var(--pm-danger) 10%, transparent);
}
.action-btn.transfer:hover {
  color: var(--pm-text);
  background: color-mix(in srgb, var(--pm-accent) 10%, transparent);
}
</style>
