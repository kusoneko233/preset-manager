<template>
  <Teleport :to="parentFloatingRoot ?? 'body'" :disabled="!parentFloatingRoot">
    <Transition name="text-prompt-pop">
      <div
        v-if="textPrompt.visible"
        class="text-prompt-layer"
        data-preset-manager-floating-panel="text-prompt"
        @keydown.esc.stop.prevent="textPrompt.cancel"
      >
        <div class="text-prompt-backdrop" @click.self="textPrompt.cancel">
          <form
            class="text-prompt-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preset-manager-text-prompt-title"
            @submit.prevent="submit"
          >
            <header class="text-prompt-head">
              <div>
                <h3 id="preset-manager-text-prompt-title">{{ textPrompt.options?.title }}</h3>
                <p v-if="textPrompt.options?.message">{{ textPrompt.options.message }}</p>
              </div>
              <button type="button" class="text-prompt-icon-btn" title="关闭" @click="textPrompt.cancel">
                <Icon name="x" :size="13" />
              </button>
            </header>

            <label class="text-prompt-field">
              <span>{{ textPrompt.options?.label }}</span>
              <textarea
                v-if="textPrompt.options?.multiline"
                ref="textareaRef"
                v-model="value"
                autofocus
                :rows="textPrompt.options?.rows"
                :placeholder="textPrompt.options?.placeholder"
              ></textarea>
              <input
                v-else
                ref="inputRef"
                v-model="value"
                autofocus
                type="text"
                :placeholder="textPrompt.options?.placeholder"
              />
            </label>

            <footer class="text-prompt-actions">
              <button type="button" class="text-prompt-btn secondary" @click="textPrompt.cancel">
                {{ textPrompt.options?.cancelLabel ?? '取消' }}
              </button>
              <button type="submit" class="text-prompt-btn primary">
                {{ textPrompt.options?.confirmLabel ?? '确认' }}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import { useTextPromptStore } from '../stores/textPrompt';

const textPrompt = useTextPromptStore();
const parentFloatingRoot = inject<HTMLElement | null>('presetManagerParentFloatingRoot', null);
const value = ref('');
const inputRef = ref<HTMLInputElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

watch(
  () => textPrompt.requestId,
  () => {
    value.value = textPrompt.options?.defaultValue ?? '';
    nextTick(() => {
      const field = textareaRef.value ?? inputRef.value;
      field?.focus();
      field?.select();
    });
  },
);

function submit() {
  textPrompt.submit(value.value);
}
</script>

<style scoped>
.text-prompt-layer {
  position: fixed;
  inset: 0;
  z-index: 1210;
  display: flex;
}
.text-prompt-backdrop {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: color-mix(in srgb, var(--pm-bg) 54%, rgba(0, 0, 0, 0.34));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.text-prompt-card {
  width: min(420px, 100%);
  border: 1px solid var(--pm-border-strong);
  border-radius: 14px;
  background: color-mix(in srgb, var(--pm-bg-panel) 94%, transparent);
  color: var(--pm-text);
  box-shadow: var(--pm-shadow);
  overflow: hidden;
}
.text-prompt-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  gap: 12px;
  padding: 16px 16px 10px;
}
.text-prompt-head h3 {
  margin: 0;
  color: var(--pm-text);
  font-size: 14px;
  font-weight: 650;
  line-height: 1.25;
}
.text-prompt-head p {
  margin: 8px 0 0;
  color: var(--pm-text-muted);
  font-size: 12.5px;
  line-height: 1.55;
  white-space: pre-wrap;
}
.text-prompt-icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--pm-btn-radius, 8px);
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
}
.text-prompt-icon-btn:hover {
  background: var(--pm-bg-hover);
  color: var(--pm-text);
}
.text-prompt-field {
  display: grid;
  gap: 7px;
  padding: 0 16px 2px;
  color: var(--pm-text-muted);
  font-size: 12px;
  font-weight: 560;
}
.text-prompt-field input,
.text-prompt-field textarea {
  width: 100%;
  border: 1px solid var(--pm-border);
  border-radius: 10px;
  outline: none;
  background: var(--pm-input-bg);
  color: var(--pm-text);
  font: inherit;
}
.text-prompt-field input {
  height: 34px;
  padding: 0 11px;
}
.text-prompt-field textarea {
  min-height: 112px;
  padding: 9px 11px;
  line-height: 1.5;
  resize: vertical;
}
.text-prompt-field input:focus,
.text-prompt-field textarea:focus {
  border-color: var(--pm-border-strong);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--pm-accent) 18%, transparent);
}
.text-prompt-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 16px 16px;
}
.text-prompt-btn {
  min-width: 72px;
  height: 30px;
  padding: 0 13px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 620;
  cursor: pointer;
}
.text-prompt-btn.secondary {
  border: 1px solid var(--pm-border);
  background: transparent;
  color: var(--pm-text-muted);
}
.text-prompt-btn.secondary:hover {
  border-color: var(--pm-border-strong);
  background: var(--pm-bg-hover);
  color: var(--pm-text);
}
.text-prompt-btn.primary {
  border: 1px solid var(--pm-accent);
  background: var(--pm-accent);
  color: var(--pm-accent-text);
}
.text-prompt-pop-enter-active,
.text-prompt-pop-leave-active {
  transition: opacity 0.14s ease;
}
.text-prompt-pop-enter-from,
.text-prompt-pop-leave-to {
  opacity: 0;
}
.text-prompt-pop-enter-active .text-prompt-card,
.text-prompt-pop-leave-active .text-prompt-card {
  transition: transform 0.14s ease;
}
.text-prompt-pop-enter-from .text-prompt-card,
.text-prompt-pop-leave-to .text-prompt-card {
  transform: translateY(6px) scale(0.985);
}
</style>
