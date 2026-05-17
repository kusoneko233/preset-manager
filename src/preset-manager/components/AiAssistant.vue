<template>
  <div v-if="ai.visible" class="ai-assistant" :class="[ai.mode, { snapped: !!ai.snappedEdge, [`snap-${ai.snappedEdge}`]: !!ai.snappedEdge }]">
    <!-- Drawer mode -->
    <template v-if="ai.mode === 'drawer'">
      <div class="drawer-container" :style="{ height: `${ai.drawerHeight}px` }">
        <div class="drawer-handle" @mousedown.prevent="onDrawerResize">
          <div class="handle-bar" />
        </div>
        <div class="ai-header">
          <span class="text-xs font-medium text-slate-300">
            <i class="fas fa-robot mr-1 text-indigo-400" /> AI 助手
          </span>
          <div class="flex items-center gap-1">
            <button class="ai-btn" title="脱出为独立窗口" @click="detach">
              <i class="fas fa-external-link-alt text-xs" />
            </button>
            <button class="ai-btn" title="设置" @click="ai.showConfig = !ai.showConfig">
              <i class="fas fa-cog text-xs" />
            </button>
            <button class="ai-btn" title="关闭" @click="ai.toggleVisible()">
              <i class="fas fa-times text-xs" />
            </button>
          </div>
        </div>

        <AiConfig v-if="ai.showConfig" />

        <div class="messages-area" ref="messagesRef">
          <div v-if="!ai.messages.length" class="empty-ai text-slate-600 text-xs text-center py-4">
            描述你的需求，AI 将帮你分析和优化预设
          </div>
          <div v-for="msg in ai.messages" :key="msg.id" class="ai-message" :class="msg.role">
            <div class="msg-content">{{ msg.content }}</div>
          </div>
          <div v-if="ai.isGenerating" class="ai-message assistant">
            <div class="msg-content typing">
              <span class="dot" /><span class="dot" /><span class="dot" />
            </div>
          </div>
        </div>

        <div class="input-bar">
          <input
            v-model="inputText"
            class="ai-input"
            placeholder="输入消息..."
            @keydown.enter="send"
          />
          <button class="send-btn" :disabled="!inputText.trim() || ai.isGenerating" @click="send">
            <i class="fas fa-paper-plane text-xs" />
          </button>
        </div>
      </div>
    </template>

    <!-- Detached mode -->
    <template v-if="ai.mode === 'detached'">
      <div
        ref="detachedRef"
        class="detached-window"
        :class="{ 'snap-collapsed': !!ai.snappedEdge && !isHovering }"
        :style="detachedStyle"
        @mouseenter="isHovering = true"
        @mouseleave="isHovering = false"
      >
        <div class="ai-header" @mousedown.prevent="onDetachedDrag">
          <span class="text-xs font-medium text-slate-300">
            <i class="fas fa-robot mr-1 text-indigo-400" /> AI
          </span>
          <div class="flex items-center gap-1">
            <button class="ai-btn" title="收回到底部" @click="dock">
              <i class="fas fa-compress-arrows-alt text-xs" />
            </button>
            <button class="ai-btn" title="关闭" @click="ai.toggleVisible()">
              <i class="fas fa-times text-xs" />
            </button>
          </div>
        </div>

        <AiConfig v-if="ai.showConfig" />

        <div class="messages-area" ref="detachedMsgRef">
          <div v-if="!ai.messages.length" class="empty-ai text-slate-600 text-xs text-center py-3">
            输入消息开始对话
          </div>
          <div v-for="msg in ai.messages" :key="msg.id" class="ai-message" :class="msg.role">
            <div class="msg-content">{{ msg.content }}</div>
          </div>
          <div v-if="ai.isGenerating" class="ai-message assistant">
            <div class="msg-content typing">
              <span class="dot" /><span class="dot" /><span class="dot" />
            </div>
          </div>
        </div>

        <div class="input-bar">
          <input
            v-model="inputText"
            class="ai-input"
            placeholder="输入消息..."
            @keydown.enter="send"
          />
          <button class="send-btn" :disabled="!inputText.trim() || ai.isGenerating" @click="send">
            <i class="fas fa-paper-plane text-xs" />
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useAiStore } from '../stores/ai';
import { useManagerStore } from '../stores/manager';
import AiConfig from './AiConfig.vue';

const ai = useAiStore();
const manager = useManagerStore();

const inputText = ref('');
const messagesRef = ref<HTMLElement>();
const detachedMsgRef = ref<HTMLElement>();
const detachedRef = ref<HTMLElement>();
const isHovering = ref(false);

const detachedStyle = computed(() => {
  if (ai.snappedEdge && !isHovering.value) {
    const styles: Record<string, string> = { position: 'fixed' };
    switch (ai.snappedEdge) {
      case 'right': Object.assign(styles, { right: '0', top: '50%', transform: 'translateY(-50%)', width: '32px', height: '120px' }); break;
      case 'left': Object.assign(styles, { left: '0', top: '50%', transform: 'translateY(-50%)', width: '32px', height: '120px' }); break;
      case 'bottom': Object.assign(styles, { bottom: '0', left: '50%', transform: 'translateX(-50%)', width: '120px', height: '32px' }); break;
      case 'top': Object.assign(styles, { top: '0', left: '50%', transform: 'translateX(-50%)', width: '120px', height: '32px' }); break;
    }
    return styles;
  }
  if (ai.snappedEdge && isHovering.value) {
    const styles: Record<string, string> = { position: 'fixed' };
    switch (ai.snappedEdge) {
      case 'right': Object.assign(styles, { right: '0', top: '10%', width: '320px', height: '80%' }); break;
      case 'left': Object.assign(styles, { left: '0', top: '10%', width: '320px', height: '80%' }); break;
      case 'bottom': Object.assign(styles, { bottom: '0', left: '10%', width: '80%', height: '300px' }); break;
      case 'top': Object.assign(styles, { top: '0', left: '10%', width: '80%', height: '300px' }); break;
    }
    return styles;
  }
  return {
    position: 'fixed',
    left: `${ai.detachedPosition.x}px`,
    top: `${ai.detachedPosition.y}px`,
    width: '320px',
    height: '400px',
  } as Record<string, string>;
});

function send() {
  if (!inputText.value.trim()) return;
  let context = '';
  if (manager.preset) {
    context = `预设名: ${manager.presetName}\n条目数: ${manager.preset.prompts.length}\n条目列表:\n`;
    manager.preset.prompts.forEach((p, i) => {
      context += `${i + 1}. [${p.role}] ${p.name} (${p.enabled ? '启用' : '禁用'})\n`;
    });
  }
  ai.sendMessage(inputText.value, context);
  inputText.value = '';
  nextTick(() => {
    messagesRef.value?.scrollTo(0, messagesRef.value.scrollHeight);
    detachedMsgRef.value?.scrollTo(0, detachedMsgRef.value.scrollHeight);
  });
}

function detach() {
  ai.setMode('detached');
  ai.snapToEdge(null);
}

function dock() {
  ai.setMode('drawer');
  ai.snapToEdge(null);
}

let dragStartX = 0;
let dragStartY = 0;
let dragStartPosX = 0;
let dragStartPosY = 0;
let dragStartTime = 0;
let velocityX = 0;
let velocityY = 0;
let lastMoveX = 0;
let lastMoveY = 0;
let lastMoveTime = 0;

function onDetachedDrag(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('button')) return;
  ai.snapToEdge(null);

  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragStartPosX = ai.detachedPosition.x;
  dragStartPosY = ai.detachedPosition.y;
  dragStartTime = Date.now();
  lastMoveX = e.clientX;
  lastMoveY = e.clientY;
  lastMoveTime = Date.now();

  const onMove = (ev: MouseEvent) => {
    const now = Date.now();
    const dt = Math.max(now - lastMoveTime, 1);
    velocityX = (ev.clientX - lastMoveX) / dt;
    velocityY = (ev.clientY - lastMoveY) / dt;
    lastMoveX = ev.clientX;
    lastMoveY = ev.clientY;
    lastMoveTime = now;

    ai.detachedPosition.x = dragStartPosX + (ev.clientX - dragStartX);
    ai.detachedPosition.y = dragStartPosY + (ev.clientY - dragStartY);
  };

  const onUp = (ev: MouseEvent) => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);

    const speed = Math.sqrt(velocityX ** 2 + velocityY ** 2);
    if (speed > 0.5) {
      const el = document.documentElement;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const finalX = ai.detachedPosition.x + velocityX * 200;
      const finalY = ai.detachedPosition.y + velocityY * 200;

      if (finalX < 0) ai.snapToEdge('left');
      else if (finalX > w - 320) ai.snapToEdge('right');
      else if (finalY < 0) ai.snapToEdge('top');
      else if (finalY > h - 200) ai.snapToEdge('bottom');
    }

    const x = ai.detachedPosition.x;
    const y = ai.detachedPosition.y;
    const el = document.documentElement;
    if (x < 10) ai.snapToEdge('left');
    else if (x > el.clientWidth - 340) ai.snapToEdge('right');
    if (y < 10) ai.snapToEdge('top');
    else if (y > el.clientHeight - 210) ai.snapToEdge('bottom');
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

let drawerStartY = 0;
let drawerStartH = 0;

function onDrawerResize(e: MouseEvent) {
  drawerStartY = e.clientY;
  drawerStartH = ai.drawerHeight;

  const onMove = (ev: MouseEvent) => {
    ai.drawerHeight = Math.max(100, Math.min(drawerStartH - (ev.clientY - drawerStartY), 500));
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}
</script>

<script lang="ts">
const AiConfigComponent = {
  name: 'AiConfig',
  template: '',
};
</script>

<style scoped>
.ai-assistant.drawer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
}
.drawer-container {
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.95);
  border-top: 1px solid rgba(51, 65, 85, 0.5);
  backdrop-filter: blur(8px);
}
.drawer-handle {
  height: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: row-resize;
}
.drawer-handle:hover .handle-bar {
  background: rgba(99, 102, 241, 0.5);
}
.handle-bar {
  width: 40px;
  height: 3px;
  border-radius: 2px;
  background: rgba(51, 65, 85, 0.6);
  transition: background 0.12s;
}
.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.3);
}
.ai-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.12s;
}
.ai-btn:hover { color: #94a3b8; background: rgba(51, 65, 85, 0.4); }
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ai-message {
  max-width: 85%;
}
.ai-message.user {
  align-self: flex-end;
}
.ai-message.assistant {
  align-self: flex-start;
}
.msg-content {
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}
.ai-message.user .msg-content {
  background: rgba(99, 102, 241, 0.2);
  color: #c7d2fe;
}
.ai-message.assistant .msg-content {
  background: rgba(30, 41, 59, 0.8);
  color: #cbd5e1;
}
.typing {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #64748b;
  animation: bounce 1.2s infinite;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}
.input-bar {
  display: flex;
  gap: 6px;
  padding: 8px;
  border-top: 1px solid rgba(51, 65, 85, 0.3);
}
.ai-input {
  flex: 1;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(51, 65, 85, 0.5);
  background: rgba(0, 0, 0, 0.2);
  color: #e2e8f0;
  font-size: 12px;
  outline: none;
}
.ai-input:focus { border-color: rgba(99, 102, 241, 0.5); }
.send-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
  cursor: pointer;
  transition: all 0.12s;
}
.send-btn:hover:not(:disabled) { background: rgba(99, 102, 241, 0.3); }
.send-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.detached-window {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(51, 65, 85, 0.5);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 200;
}
.detached-window .ai-header { cursor: move; }
.snap-collapsed {
  border-radius: 8px;
  overflow: hidden;
  opacity: 0.7;
  cursor: pointer;
}
.snap-collapsed:hover {
  opacity: 1;
}
.snap-collapsed .messages-area,
.snap-collapsed .input-bar,
.snap-collapsed .ai-header span {
  display: none;
}
.snap-collapsed .ai-header {
  justify-content: center;
  padding: 4px;
}
.empty-ai {
  padding: 16px;
}
</style>
