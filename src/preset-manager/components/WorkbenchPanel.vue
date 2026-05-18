<template>
  <div class="workbench-panel flex flex-col h-full">
    <div class="panel-title flex items-center justify-between px-3 py-2">
      <span class="text-xs font-medium text-slate-400 uppercase tracking-wider">
        <i class="fas fa-pen-nib mr-1" /> 新建条目
      </span>
      <button class="add-btn" title="新建草稿" @click="store.addDraft()">
        <i class="fas fa-plus text-xs" />
      </button>
    </div>

    <div class="draft-list flex-1 overflow-y-auto px-2 pb-2">
      <div v-if="!drafts.length" class="empty-hint text-slate-600 text-xs text-center py-4">
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
  border-bottom: 1px solid rgba(51, 65, 85, 0.3);
  padding-right: 40px;
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
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  border-color: rgba(99, 102, 241, 0.4);
}
.draft-item {
  border: 1px solid rgba(51, 65, 85, 0.3);
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.5);
  margin-bottom: 4px;
  cursor: grab;
}
.draft-item:hover {
  border-color: rgba(99, 102, 241, 0.3);
}
.draft-header {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
}
.draft-name {
  font-size: 12px;
  color: #cbd5e1;
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
  color: #64748b;
  cursor: pointer;
}
.del-btn:hover {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
}
.draft-body {
  padding: 6px 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-top: 1px solid rgba(51, 65, 85, 0.2);
}
.draft-input,
.draft-select {
  width: 100%;
  padding: 4px 8px;
  border-radius: 5px;
  border: 1px solid rgba(51, 65, 85, 0.4);
  background: rgba(0, 0, 0, 0.2);
  color: #e2e8f0;
  font-size: 12px;
  outline: none;
}
.draft-input:focus,
.draft-select:focus {
  border-color: rgba(99, 102, 241, 0.5);
}
.draft-select option {
  background: #1e293b;
}
.draft-textarea {
  width: 100%;
  padding: 6px 8px;
  border-radius: 5px;
  border: 1px solid rgba(51, 65, 85, 0.4);
  background: rgba(0, 0, 0, 0.2);
  color: #e2e8f0;
  font-size: 12px;
  resize: vertical;
  min-height: 60px;
  outline: none;
  font-family: inherit;
}
.draft-textarea:focus {
  border-color: rgba(99, 102, 241, 0.5);
}
</style>
