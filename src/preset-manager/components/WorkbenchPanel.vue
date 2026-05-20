<template>
  <div class="workbench-panel flex flex-col h-full">
    <div class="panel-title flex items-center justify-between px-3 py-2">
      <span class="panel-label">
        <i class="fas fa-pen-nib" /> 新建条目
      </span>
      <button class="add-btn" title="新建草稿" @click="store.addDraft()">
        <i class="fas fa-plus text-xs" />
      </button>
    </div>

    <div class="draft-list flex-1 overflow-y-auto">
      <div v-if="!drafts.length" class="empty-hint">
        点击 + 新建草稿条目
      </div>

      <div
        v-for="draft in drafts"
        :key="draft.id"
        class="draft-item"
        :draggable="true"
        @dragstart="onDragStart($event, draft)"
      >
        <div class="draft-header" @click="toggleDraft(draft)">
          <i :class="['fas text-xs text-slate-500 mr-2', draft.collapsed ? 'fa-chevron-right' : 'fa-chevron-down']" />
          <span class="draft-name flex-1 truncate">{{ draft.name || 'Untitled' }}</span>
          <button class="del-btn" title="删除" @click.stop="store.removeDraft(draft.id)">
            <i class="fas fa-times text-xs" />
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
.panel-title {
  min-height: 36px;
  padding: 2px 4px 8px !important;
  border-bottom: 0;
}
.panel-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--pm-text-subtle);
  font-size: 11px;
  font-weight: 640;
  line-height: 1;
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
.draft-list {
  padding: 0 2px 8px;
}
.empty-hint {
  padding: 14px 8px;
  color: var(--pm-text-subtle);
  font-size: 12px;
  text-align: center;
}
.draft-item {
  border: 1px solid transparent;
  border-bottom-color: color-mix(in srgb, var(--pm-row-border) 82%, transparent);
  border-radius: 0;
  background: transparent;
  cursor: grab;
  transition: background 0.12s, border-color 0.12s;
}
.draft-item:hover {
  border-color: transparent;
  border-bottom-color: color-mix(in srgb, var(--pm-row-border) 82%, transparent);
  background: var(--pm-bg-hover);
}
.draft-header {
  display: flex;
  align-items: center;
  min-height: 38px;
  padding: 7px 8px;
  cursor: pointer;
}
.draft-name {
  font-size: 12px;
  color: var(--pm-text);
  font-weight: 520;
}
.del-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
}
.del-btn:hover {
  color: var(--pm-danger);
  background: color-mix(in srgb, var(--pm-danger) 13%, transparent);
}
.draft-body {
  padding: 7px 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid var(--pm-divider);
  background: color-mix(in srgb, var(--pm-bg-hover) 42%, transparent);
}
.draft-input,
.draft-select {
  width: 100%;
  padding: 6px 9px;
  border-radius: 8px;
  border: 1px solid var(--pm-border);
  background: var(--pm-input-bg);
  color: var(--pm-text);
  font-size: 12px;
  outline: none;
}
.draft-input:focus,
.draft-select:focus {
  border-color: var(--pm-border-strong);
}
.draft-select option {
  background: var(--pm-bg-elevated);
}
.draft-textarea {
  width: 100%;
  padding: 8px 9px;
  border-radius: 8px;
  border: 1px solid var(--pm-border);
  background: var(--pm-input-bg);
  color: var(--pm-text);
  font-size: 12px;
  resize: vertical;
  min-height: 60px;
  outline: none;
  font-family: inherit;
}
.draft-textarea:focus {
  border-color: var(--pm-border-strong);
}
</style>
