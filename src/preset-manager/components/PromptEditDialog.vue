<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="visible" class="dialog-backdrop" @click.self="$emit('close')">
        <form class="dialog-card" @submit.prevent="save">
          <div class="dialog-header">
            <div>
              <div class="dialog-title">编辑条目</div>
              <div class="dialog-subtitle">{{ prompt.name }}</div>
            </div>
            <button type="button" class="icon-btn" title="关闭" @click="$emit('close')">
              <i class="fas fa-times text-xs" />
            </button>
          </div>

          <div class="dialog-body">
            <label class="field">
              <span>名称</span>
              <input ref="nameInput" v-model="draft.name" class="text-input" type="text" />
            </label>

            <div class="field-grid">
              <label class="field">
                <span>角色</span>
                <select v-model="draft.role" class="text-input">
                  <option value="system">system</option>
                  <option value="user">user</option>
                  <option value="assistant">assistant</option>
                </select>
              </label>

              <label class="field">
                <span>状态</span>
                <button
                  type="button"
                  class="state-toggle"
                  :class="{ enabled: draft.enabled }"
                  @click="draft.enabled = !draft.enabled"
                >
                  <i :class="['fas text-xs', draft.enabled ? 'fa-toggle-on' : 'fa-toggle-off']" />
                  <span>{{ draft.enabled ? '启用' : '禁用' }}</span>
                </button>
              </label>
            </div>

            <label class="field content-field">
              <span>内容</span>
              <textarea v-model="draft.content" class="content-input" />
            </label>
          </div>

          <div class="dialog-footer">
            <button type="button" class="footer-btn ghost" @click="$emit('close')">取消</button>
            <button type="submit" class="footer-btn primary">保存</button>
          </div>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
type PromptRole = 'system' | 'user' | 'assistant';
type PromptEditDraft = {
  name: string;
  role: PromptRole;
  enabled: boolean;
  content: string;
};

const props = defineProps<{
  visible: boolean;
  prompt: PresetPrompt;
}>();

const emit = defineEmits<{
  close: [];
  save: [updates: Partial<PresetPrompt>];
}>();

const nameInput = ref<HTMLInputElement>();
const draft = reactive<PromptEditDraft>({
  name: '',
  role: 'system',
  enabled: true,
  content: '',
});

function normalizeRole(role: PresetPrompt['role']): PromptRole {
  return role === 'user' || role === 'assistant' ? role : 'system';
}

function resetDraft() {
  draft.name = props.prompt.name ?? '';
  draft.role = normalizeRole(props.prompt.role);
  draft.enabled = props.prompt.enabled ?? true;
  draft.content = props.prompt.content ?? '';
  nextTick(() => nameInput.value?.focus());
}

function save() {
  emit('save', {
    name: draft.name.trim() || 'Untitled',
    role: draft.role,
    enabled: draft.enabled,
    content: draft.content,
  });
}

watch(
  () => [props.visible, props.prompt?.id],
  () => {
    if (props.visible) resetDraft();
  },
  { immediate: true },
);
</script>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: color-mix(in srgb, var(--pm-bg) 72%, rgba(0, 0, 0, 0.45));
  backdrop-filter: blur(10px);
}
.dialog-card {
  width: min(760px, 94vw);
  max-height: min(760px, 88vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--pm-border-strong);
  border-radius: 14px;
  background: var(--pm-bg-panel);
  color: var(--pm-text);
  box-shadow: var(--pm-shadow);
}
.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--pm-border);
}
.dialog-title {
  font-size: 15px;
  font-weight: 680;
}
.dialog-subtitle {
  max-width: 620px;
  margin-top: 4px;
  overflow: hidden;
  color: var(--pm-text-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.icon-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
}
.icon-btn:hover {
  border-color: var(--pm-border);
  background: var(--pm-bg-hover);
  color: var(--pm-text);
}
.dialog-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  gap: 12px;
  padding: 16px;
}
.field,
.content-field {
  display: grid;
  gap: 7px;
  color: var(--pm-text-muted);
  font-size: 12px;
}
.field-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px;
  gap: 12px;
}
.text-input,
.content-input {
  width: 100%;
  border: 1px solid var(--pm-border);
  border-radius: 9px;
  background: var(--pm-input-bg);
  color: var(--pm-text);
  outline: none;
}
.text-input {
  height: 34px;
  padding: 0 10px;
}
.text-input:focus,
.content-input:focus {
  border-color: var(--pm-border-strong);
}
.content-input {
  min-height: 320px;
  resize: vertical;
  padding: 10px;
  line-height: 1.55;
  font-family: inherit;
}
.state-toggle {
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--pm-border);
  border-radius: 9px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
}
.state-toggle.enabled {
  color: var(--pm-success);
}
.state-toggle:hover {
  border-color: var(--pm-border-strong);
  background: var(--pm-bg-hover);
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--pm-border);
}
.footer-btn {
  min-width: 76px;
  height: 32px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  cursor: pointer;
}
.footer-btn.ghost {
  background: transparent;
  color: var(--pm-text-muted);
}
.footer-btn.primary {
  border-color: var(--pm-accent);
  background: var(--pm-accent);
  color: var(--pm-accent-text);
}
.footer-btn:hover {
  filter: brightness(1.05);
}
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.14s ease;
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
  .content-input {
    min-height: 240px;
  }
}
</style>
