<template>
  <div class="ai-config">
    <div class="config-row">
      <label class="config-label">
        <input type="checkbox" v-model="ai.config.useProxyPreset" @change="ai.saveConfig()" />
        使用代理预设
      </label>
    </div>

    <template v-if="ai.config.useProxyPreset">
      <div class="config-row">
        <select v-model="ai.config.proxyPreset" class="config-input" @change="ai.saveConfig()">
          <option value="">选择代理预设...</option>
          <option v-for="name in proxyPresets" :key="name" :value="name">{{ name }}</option>
        </select>
      </div>
    </template>

    <template v-else>
      <div class="config-row">
        <input v-model="ai.config.apiUrl" class="config-input" placeholder="API 地址" @change="ai.saveConfig()" />
      </div>
      <div class="config-row">
        <input v-model="ai.config.key" class="config-input" placeholder="API Key" type="password" @change="ai.saveConfig()" />
      </div>
      <div class="config-row">
        <input v-model="ai.config.source" class="config-input" placeholder="API Source (默认 openai)" @change="ai.saveConfig()" />
      </div>
    </template>

    <div class="config-row">
      <input v-model="ai.config.model" class="config-input" placeholder="模型名称" @change="ai.saveConfig()" />
    </div>

    <div class="config-row">
      <button class="clear-btn" @click="ai.clearMessages()">
        <Icon name="trash-2" :size="12" /> 清空对话
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import { useAiStore } from '../stores/ai';

const ai = useAiStore();

const proxyPresets = computed(() => {
  try {
    return getProxyPresetNames();
  } catch {
    return [];
  }
});
</script>

<style scoped>
.ai-config {
  padding: 10px;
  border-bottom: 1px solid var(--pm-border);
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--pm-bg-soft);
}
.config-row {
  display: flex;
  align-items: center;
}
.config-label {
  font-size: 11px;
  color: var(--pm-text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.config-label input[type="checkbox"] {
  accent-color: var(--pm-accent);
}
.config-input {
  width: 100%;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--pm-border);
  background: var(--pm-input-bg);
  color: var(--pm-text);
  font-size: 11px;
  outline: none;
}
.config-input:focus {
  border-color: var(--pm-border-strong);
}
.config-input option {
  background: var(--pm-bg-elevated);
}
.clear-btn {
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--pm-danger) 32%, transparent);
  background: color-mix(in srgb, var(--pm-danger) 8%, transparent);
  color: var(--pm-danger);
  font-size: 10px;
  cursor: pointer;
  transition: all 0.12s;
}
.clear-btn:hover {
  background: color-mix(in srgb, var(--pm-danger) 16%, transparent);
}
</style>
