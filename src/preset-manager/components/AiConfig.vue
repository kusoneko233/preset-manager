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
        <i class="fas fa-trash-alt mr-1" /> 清空对话
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
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
  padding: 8px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.3);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.config-row {
  display: flex;
  align-items: center;
}
.config-label {
  font-size: 11px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.config-label input[type="checkbox"] {
  accent-color: #6366f1;
}
.config-input {
  width: 100%;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid rgba(51, 65, 85, 0.4);
  background: rgba(0, 0, 0, 0.2);
  color: #e2e8f0;
  font-size: 11px;
  outline: none;
}
.config-input:focus {
  border-color: rgba(99, 102, 241, 0.5);
}
.config-input option {
  background: #1e293b;
}
.clear-btn {
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid rgba(248, 113, 113, 0.3);
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.12s;
}
.clear-btn:hover {
  background: rgba(248, 113, 113, 0.2);
}
</style>
