<template>
  <div class="workbench-panel">
    <div class="sidebar-section-head">
      <span class="sidebar-section-kicker">草稿</span>
      <IconButton name="plus" size="sm" title="新建草稿" @click="store.addDraft()" />
    </div>

    <div class="draft-list">
      <div v-if="!drafts.length" class="empty-hint">
        <Icon name="file-text" :size="14" />
        <span>点击 + 新建草稿</span>
      </div>

      <div
        v-for="draft in drafts"
        :key="draft.id"
        class="draft-item"
        :draggable="true"
        @dragstart="onDragStart($event, draft)"
      >
        <div class="draft-row" @click="toggleDraft(draft)">
          <Icon :name="draft.collapsed ? 'chevron-right' : 'chevron-down'" :size="12" class="draft-chevron" />
          <span class="draft-name">{{ draft.name || 'Untitled' }}</span>
          <button class="draft-del" title="删除" @click.stop="store.removeDraft(draft.id)">
            <Icon name="x" :size="12" />
          </button>
        </div>

        <div v-if="!draft.collapsed" class="draft-body">
          <input
            class="draft-input"
            placeholder="条目名称"
            :value="draft.name"
            @input="store.updateDraft(draft.id, { name: ($event.target as HTMLInputElement).value })"
          />
          <select
            class="draft-select"
            :value="draft.role"
            @change="store.updateDraft(draft.id, { role: ($event.target as HTMLSelectElement).value as any })"
          >
            <option value="system">system</option>
            <option value="user">user</option>
            <option value="assistant">assistant</option>
          </select>
          <textarea
            class="draft-textarea"
            placeholder="提示词内容..."
            :value="draft.content"
            rows="4"
            @input="store.updateDraft(draft.id, { content: ($event.target as HTMLTextAreaElement).value })"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import IconButton from './IconButton.vue';
import { useManagerStore, type DraftPrompt } from '../stores/manager';

const store = useManagerStore();

const drafts = computed(() => store.drafts);

function toggleDraft(draft: DraftPrompt) {
  store.updateDraft(draft.id, { collapsed: !draft.collapsed });
}

function onDragStart(e: DragEvent, draft: DraftPrompt) {
  const prompt = store.draftToPrompt(draft);
  e.dataTransfer!.effectAllowed = 'copy';
  e.dataTransfer!.setData(
    'application/json',
    JSON.stringify({
      type: 'draft',
      source: 'workbench',
      prompt,
    }),
  );
}
</script>

<style scoped>
.workbench-panel {
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
  display: inline-flex;
  align-items: center;
  color: var(--pm-text-subtle);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}
.draft-list {
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
.draft-item {
  border-radius: 8px;
  background: transparent;
  cursor: grab;
  transition: background 0.12s ease;
}
.draft-item:hover {
  background: var(--pm-row-hover);
}
.draft-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 6px 8px;
  cursor: pointer;
}
.draft-chevron {
  flex-shrink: 0;
  color: var(--pm-text-subtle);
}
.draft-name {
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
.draft-del {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--pm-text-faint);
  opacity: 0;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, opacity 0.12s ease;
}
.draft-item:hover .draft-del {
  opacity: 1;
}
.draft-del:hover {
  background: color-mix(in srgb, var(--pm-danger) 14%, transparent);
  color: var(--pm-danger);
}
.draft-body {
  padding: 6px 8px 10px 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.draft-input,
.draft-select {
  width: 100%;
  height: 30px;
  padding: 0 9px;
  border: 1px solid var(--pm-border);
  border-radius: 7px;
  background: var(--pm-input-bg);
  color: var(--pm-text);
  font-size: 12px;
  outline: none;
  transition: border-color 0.12s ease;
}
.draft-input:focus,
.draft-select:focus {
  border-color: var(--pm-border-strong);
}
.draft-select option {
  background: var(--pm-bg-elevated);
  color: var(--pm-text);
}
.draft-textarea {
  width: 100%;
  min-height: 60px;
  padding: 7px 9px;
  border: 1px solid var(--pm-border);
  border-radius: 7px;
  background: var(--pm-input-bg);
  color: var(--pm-text);
  font-size: 12px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color 0.12s ease;
}
.draft-textarea:focus {
  border-color: var(--pm-border-strong);
}
</style>
