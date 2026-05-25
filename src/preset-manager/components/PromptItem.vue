<template>
  <div
    class="prompt-item"
    :class="{ expanded, dragging: isDragging, disabled: !prompt.enabled, 'is-placeholder': isPlaceholder }"
    :draggable="!isPlaceholder"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <div class="prompt-row" @click="toggle">
      <span class="prompt-role-dot" :class="`role-${prompt.role}`" :title="prompt.role || ''" />

      <span class="prompt-name">{{ prompt.name }}</span>
      <span v-if="relationLabel" class="prompt-relation">{{ relationLabel }}</span>

      <span class="prompt-row-spacer" />

      <button
        v-if="'enabled' in prompt"
        class="status-toggle"
        :class="{ on: prompt.enabled }"
        :disabled="isPlaceholder"
        :title="prompt.enabled ? '禁用条目' : '启用条目'"
        @click.stop="!isPlaceholder && $emit('toggleEnabled')"
      >
        <span class="status-dot" />
      </button>

      <Icon
        :name="expanded ? 'chevron-up' : 'chevron-down'"
        :size="13"
        class="prompt-chevron"
        :class="{ expanded }"
      />
    </div>

    <div v-if="!expanded && prompt.content" class="prompt-preview">
      {{ prompt.content }}
    </div>

    <div v-if="expanded" class="prompt-body">
      <div class="prompt-meta">
        <span class="role-pill" :class="`role-${prompt.role}`">{{ prompt.role }}</span>
        <span v-if="triggerLabel" class="meta-pill">{{ triggerLabel }}</span>
        <span v-if="positionLabel" class="meta-pill">{{ positionLabel }}</span>
      </div>

      <div v-if="prompt.content" class="prompt-content">{{ prompt.content }}</div>
      <div v-else class="prompt-empty">[无内容]</div>

      <div class="prompt-actions">
        <IconButton v-if="!isPlaceholder" name="pen-line" size="sm" title="编辑条目" @click.stop="$emit('edit')" />
        <IconButton v-if="canTransfer" name="copy" size="sm" :title="`复制到${transferTargetLabel}`" @click.stop="$emit('copyToOther')" />
        <IconButton v-if="canTransfer" name="arrow-right" size="sm" :title="`迁移到${transferTargetLabel}`" @click.stop="$emit('moveToOther')" />
        <IconButton v-if="canDetach" name="minus" size="sm" title="移出列表" @click.stop="$emit('detach')" />
        <IconButton v-if="canRestoreDefault" name="refresh-cw" size="sm" title="恢复默认" @click.stop="$emit('restoreDefault')" />
        <IconButton v-if="canDelete" name="trash-2" size="sm" danger title="删除条目" @click.stop="$emit('delete')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import IconButton from './IconButton.vue';

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
  border-radius: 8px;
  background: transparent;
  cursor: grab;
  transition: background 0.12s ease, opacity 0.12s ease;
}
.prompt-item:hover {
  background: var(--pm-row-hover);
}
.prompt-item.expanded {
  background: var(--pm-row-active);
}
.prompt-item.dragging {
  opacity: 0.5;
  cursor: grabbing;
}
.prompt-item.disabled {
  opacity: 0.55;
}
.prompt-item.is-placeholder {
  cursor: default;
  opacity: 0.6;
}
.prompt-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: var(--pm-prompt-row-min, 40px);
  padding: var(--pm-prompt-pad-y, 7px) calc(var(--pm-prompt-pad-x, 12px));
  cursor: pointer;
}
.prompt-role-dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--pm-text-faint);
  transition: background 0.12s ease;
}
.prompt-role-dot.role-system {
  background: color-mix(in srgb, var(--pm-text-muted) 60%, transparent);
}
.prompt-role-dot.role-user {
  background: var(--pm-success);
}
.prompt-role-dot.role-assistant {
  background: var(--pm-warning);
}
.prompt-name {
  min-width: 0;
  color: var(--pm-text);
  font-weight: 500;
  letter-spacing: -0.005em;
  line-height: 1.35;
  word-break: break-all;
}
.prompt-relation {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 7px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  color: var(--pm-text-subtle);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1;
}
.prompt-row-spacer {
  flex: 1;
  min-width: 0;
}
.prompt-chevron {
  flex-shrink: 0;
  color: var(--pm-text-subtle);
  transition: color 0.12s ease;
}
.prompt-row:hover .prompt-chevron {
  color: var(--pm-text);
}
.prompt-preview {
  display: -webkit-box;
  margin: calc(-1 * var(--pm-prompt-pad-y, 7px) + 1px) calc(var(--pm-prompt-pad-x, 12px) + 64px) var(--pm-prompt-pad-y, 7px) calc(var(--pm-prompt-pad-x, 12px) + 16px);
  color: var(--pm-text-subtle);
  font-size: 12.5px;
  line-height: 1.45;
  word-break: break-all;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--pm-prompt-preview-lines, 1);
}

/* Status toggle — small Codex-style pill switch */
.status-toggle {
  width: 28px;
  height: 16px;
  display: flex;
  align-items: center;
  padding: 1.5px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--pm-text-faint) 22%, transparent);
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease;
  flex-shrink: 0;
}
.status-toggle:hover:not(:disabled) {
  border-color: var(--pm-border-strong);
}
.status-toggle.on {
  background: color-mix(in srgb, var(--pm-success) 55%, transparent);
  border-color: color-mix(in srgb, var(--pm-success) 55%, transparent);
}
.status-toggle:disabled {
  cursor: not-allowed;
}
.status-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--pm-text-muted);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  transition: transform 0.16s ease, background 0.16s ease;
}
.status-toggle.on .status-dot {
  background: #ffffff;
  transform: translateX(11px);
}

/* Expanded body */
.prompt-body {
  padding: 0 var(--pm-prompt-pad-x, 12px) var(--pm-prompt-pad-y, 7px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.prompt-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}
.role-pill,
.meta-pill {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 8px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  color: var(--pm-text-subtle);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1;
  text-transform: uppercase;
}
.role-pill.role-user {
  border-color: color-mix(in srgb, var(--pm-success) 32%, transparent);
  background: color-mix(in srgb, var(--pm-success) 14%, transparent);
  color: var(--pm-success);
}
.role-pill.role-assistant {
  border-color: color-mix(in srgb, var(--pm-warning) 32%, transparent);
  background: color-mix(in srgb, var(--pm-warning) 14%, transparent);
  color: var(--pm-warning);
}
.role-pill.role-system {
  color: var(--pm-text-muted);
}
.prompt-content {
  max-height: clamp(220px, 34vh, 460px);
  padding: 10px 12px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-bg-elevated);
  color: var(--pm-text-muted);
  font-size: var(--pm-prompt-preview-font-size, 13px);
  line-height: 1.55;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
.prompt-empty {
  color: var(--pm-text-faint);
  font-size: 12px;
  font-style: italic;
}
.prompt-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding-top: 2px;
}
</style>
