<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div v-if="visible" class="overlay-backdrop" @click.self="$emit('close')">
        <div class="overlay-card">
          <div class="overlay-header">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <span class="role-badge" :class="prompt.role">{{ prompt.role }}</span>
              <span class="overlay-title">{{ prompt.name }}</span>
            </div>
            <div class="flex items-center gap-1">
              <button class="overlay-btn" title="复制内容" @click="copyContent">
                <i class="fas fa-copy text-xs" />
                <Transition name="fade">
                  <span v-if="copied" class="copy-toast">已复制</span>
                </Transition>
              </button>
              <button class="overlay-btn hover:!text-red-400" title="关闭" @click="$emit('close')">
                <i class="fas fa-times text-xs" />
              </button>
            </div>
          </div>

          <div class="overlay-body">
            <pre class="overlay-content">{{ prompt.content ?? '[无内容]' }}</pre>
          </div>

          <div v-if="showActions" class="overlay-footer">
            <button class="footer-btn" @click="$emit('edit')">
              <i class="fas fa-edit text-xs" /> 编辑
            </button>
            <button class="footer-btn" @click="$emit('toggleFavorite')">
              <i :class="['text-xs', isFavorited ? 'fas fa-star text-amber-400' : 'far fa-star']" />
              {{ isFavorited ? '取消收藏' : '收藏' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  visible: boolean;
  prompt: PresetPrompt;
  isFavorited?: boolean;
  showActions?: boolean;
}>();

defineEmits<{
  close: [];
  edit: [];
  toggleFavorite: [];
}>();

const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout>;

async function copyContent() {
  const text = props.prompt?.content ?? '';
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
  copied.value = true;
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copied.value = false), 1500);
}
</script>

<style scoped>
.overlay-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}
.overlay-card {
  width: 90%;
  max-width: 700px;
  max-height: 80%;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(51, 65, 85, 0.6);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.overlay-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.4);
  gap: 8px;
}
.overlay-title {
  font-size: 15px;
  font-weight: 600;
  color: #e2e8f0;
  word-break: break-all;
}
.role-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
  text-transform: uppercase;
  flex-shrink: 0;
}
.role-badge.system { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
.role-badge.user { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.role-badge.assistant { background: rgba(251, 146, 60, 0.15); color: #fb923c; }
.overlay-btn {
  position: relative;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.12s;
}
.overlay-btn:hover { background: rgba(51, 65, 85, 0.6); color: #e2e8f0; }
.copy-toast {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 2px 8px;
  background: #4ade80;
  color: #0f172a;
  font-size: 10px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
}
.overlay-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
.overlay-content {
  font-size: 13px;
  line-height: 1.6;
  color: #cbd5e1;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  font-family: inherit;
}
.overlay-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid rgba(51, 65, 85, 0.4);
}
.footer-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(51, 65, 85, 0.4);
  background: rgba(30, 41, 59, 0.6);
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.12s;
}
.footer-btn:hover { background: rgba(51, 65, 85, 0.6); color: #e2e8f0; border-color: rgba(99, 102, 241, 0.4); }
.overlay-enter-active, .overlay-leave-active { transition: opacity 0.15s; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
