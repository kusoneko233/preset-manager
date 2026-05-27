<template>
  <section class="ai-config-shell" :class="[`variant-${variant}`]">
    <div v-if="variant === 'page'" class="api-page-header">
      <button class="api-page-back" title="返回预设列表" @click="emit('close')">
        <Icon name="chevron-left" :size="15" />
        <span>返回</span>
      </button>
      <div class="api-page-heading">
        <span>API 设置</span>
        <small>管理模型接口、Key 和模型选择</small>
      </div>
    </div>

    <div class="api-config-layout">
      <aside class="api-profile-sidebar">
        <div class="api-sidebar-title">API 预设</div>
        <div class="api-profile-list">
          <button
            v-for="profile in ai.config.apiProfiles"
            :key="profile.id"
            class="api-profile-item"
            :class="{ active: profile.id === ai.config.activeProfileId }"
            @click="ai.selectApiProfile(profile.id)"
          >
            <span class="api-profile-avatar">{{ getProfileInitial(profile.name) }}</span>
            <span class="api-profile-name">{{ profile.name }}</span>
            <span class="api-profile-status" />
          </button>
        </div>
        <button class="api-profile-add" @click="ai.createApiProfile()">
          <Icon name="plus" :size="14" />
          <span>添加</span>
        </button>
      </aside>

      <div class="api-config-detail">
        <div class="api-detail-header">
          <div class="api-detail-title">
            <label class="api-title-name-editor" :class="{ disabled: !activeProfile }">
              <input
                :value="activeProfile?.name || ''"
                class="api-title-name-input"
                placeholder="API 预设"
                :disabled="!activeProfile"
                @change="updateActiveProfile({ name: ($event.target as HTMLInputElement).value })"
              />
              <Icon name="pen-line" :size="15" class="api-title-edit-icon" />
            </label>
          </div>
          <button class="icon-square" title="删除当前 API 预设" :disabled="!activeProfile" @click="deleteActiveProfile">
            <Icon name="trash-2" :size="15" />
          </button>
        </div>

        <div class="chatbox-config-card">
          <template v-if="activeProfile">
            <div class="chatbox-setting-row">
              <div class="chatbox-setting-label">
                <span>API 模式</span>
              </div>
              <div class="chatbox-setting-control">
                <select
                  :value="activeProfile.source"
                  class="config-input source-select"
                  @change="updateActiveProfile({ source: ($event.target as HTMLSelectElement).value })"
                >
                  <option v-for="source in sourceOptions" :key="source.value" :value="source.value">
                    {{ source.label }}
                  </option>
                </select>
              </div>
            </div>

            <div class="chatbox-setting-row">
              <div class="chatbox-setting-label">
                <span>API 地址</span>
              </div>
              <div class="chatbox-setting-control">
                <input
                  :value="activeProfile.apiUrl"
                  class="config-input manual-api-url"
                  placeholder="API 地址"
                  @change="updateActiveProfile({ apiUrl: ($event.target as HTMLInputElement).value })"
                />
              </div>
            </div>

            <div class="chatbox-setting-row">
              <div class="chatbox-setting-label">
                <span>API Key</span>
              </div>
              <div class="chatbox-setting-control">
                <input
                  :value="activeProfile.key"
                  class="config-input manual-api-key"
                  placeholder="API Key"
                  type="password"
                  @change="updateActiveProfile({ key: ($event.target as HTMLInputElement).value })"
                />
              </div>
            </div>

            <div class="chatbox-setting-row">
              <div class="chatbox-setting-label">
                <span>模型</span>
              </div>
              <div class="chatbox-setting-control">
                <select
                  :value="selectedModelKey"
                  class="config-input model-select"
                  @change="selectModelKey(($event.target as HTMLSelectElement).value)"
                >
                  <option value="">选择模型</option>
                  <option
                    v-for="option in ai.modelOptions"
                    :key="modelOptionKey(option)"
                    :value="modelOptionKey(option)"
                  >
                    {{ option.name }} · {{ option.group }}
                  </option>
                </select>
              </div>
            </div>

            <div class="chatbox-setting-row action-row">
              <div class="chatbox-setting-label" />
              <div class="chatbox-setting-control">
                <button
                  class="api-fetch-button"
                  :disabled="!activeProfile.apiUrl || loadingModels"
                  @click="fetchModels"
                >
                  {{ loadingModels ? '获取中...' : '从接口获取模型' }}
                </button>
              </div>
            </div>
          </template>
        </div>

        <button class="danger-clear-button" @click="ai.clearMessages()">
          <Icon name="trash-2" :size="13" />
          <span>清空对话</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import { useAiStore } from '../stores/ai';
import type { AiApiProfile, AiModelFlatOption } from '../utils/aiApiConfig';

const props = withDefaults(
  defineProps<{
    variant?: 'panel' | 'page';
  }>(),
  {
    variant: 'panel',
  },
);
const emit = defineEmits<{ close: [] }>();
const ai = useAiStore();
const loadingModels = ref(false);
const activeProfile = computed(() => ai.activeApiProfile);
const variant = computed(() => props.variant);
const selectedModelKey = computed(() => {
  const option =
    ai.modelOptions.find(item => item.name === ai.config.model && item.profileId === ai.config.activeProfileId) ??
    ai.modelOptions.find(item => item.name === ai.config.model);
  return option ? modelOptionKey(option) : '';
});
const sourceOptions = [
  { value: 'openai', label: 'OpenAI / 兼容接口' },
  { value: 'claude', label: 'Claude' },
  { value: 'google', label: 'Google Gemini' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'openrouter', label: 'OpenRouter' },
] as const;

function updateActiveProfile(patch: Partial<Omit<AiApiProfile, 'id' | 'models'>>) {
  ai.setActiveApiProfilePatch(patch);
}

function deleteActiveProfile() {
  if (!activeProfile.value) return;
  ai.deleteApiProfile(activeProfile.value.id);
}

function modelOptionKey(option: AiModelFlatOption) {
  return `${option.profileId}:${option.name}:${option.group}`;
}

function getProfileInitial(name: string) {
  return Array.from(name.trim() || 'A')[0]?.toUpperCase() ?? 'A';
}

function selectModelKey(key: string) {
  const option = ai.modelOptions.find(item => modelOptionKey(item) === key);
  if (!option) {
    ai.config.model = '';
    ai.saveConfig();
    return;
  }
  selectModel(option.name, option.profileId);
}

function selectModel(model: string, profileId: string) {
  ai.config.model = model;
  ai.selectApiProfile(profileId);
  ai.saveConfig();
}

async function fetchModels() {
  if (!activeProfile.value?.apiUrl || loadingModels.value) return;
  loadingModels.value = true;
  try {
    const models = await getModelList({
      apiurl: activeProfile.value.apiUrl,
      key: activeProfile.value.key || undefined,
    });
    models.forEach(model => ai.addModelToActiveProfile(model, activeProfile.value?.group || '默认'));
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '获取模型列表失败');
  } finally {
    loadingModels.value = false;
  }
}
</script>

<style scoped>
.ai-config-shell {
  width: min(760px, calc(100vw - 32px));
  min-height: 520px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 18px;
  background: rgba(7, 7, 8, 0.96);
  color: var(--pm-text);
  box-shadow: 0 24px 72px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(30px) saturate(125%);
  -webkit-backdrop-filter: blur(30px) saturate(125%);
}

.ai-config-shell.variant-page {
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.api-page-header {
  min-height: 74px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 28px;
  border-bottom: 1px solid var(--pm-border);
  background: color-mix(in srgb, var(--pm-bg-workspace) 92%, transparent);
}

.api-page-back {
  min-width: 82px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--pm-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--pm-bg-elevated) 42%, transparent);
  color: var(--pm-text-muted);
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition:
    background 0.14s ease,
    border-color 0.14s ease,
    color 0.14s ease;
}

.api-page-back:hover {
  border-color: var(--pm-border-strong);
  background: var(--pm-bg-hover);
  color: var(--pm-text);
}

.api-page-heading {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.api-page-heading span {
  color: var(--pm-text);
  font-size: 20px;
  font-weight: 720;
}

.api-page-heading small {
  color: var(--pm-text-subtle);
  font-size: 12px;
  font-weight: 520;
}

.api-config-layout {
  min-height: 520px;
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
}

.variant-page .api-config-layout {
  min-height: 0;
  flex: 1 1 auto;
  grid-template-columns: 240px minmax(0, 760px) minmax(24px, 1fr);
  overflow: hidden;
}

.api-profile-sidebar {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 10px;
  border-right: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.025);
}

.variant-page .api-profile-sidebar {
  padding: 18px 12px;
  background: color-mix(in srgb, var(--pm-bg-sidebar) 82%, transparent);
}

.api-sidebar-title {
  padding: 0 10px 2px;
  color: rgba(255, 255, 255, 0.46);
  font-size: 12px;
  font-weight: 650;
}

.api-profile-list {
  min-height: 0;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 6px;
  overflow: auto;
}

.api-profile-item {
  width: 100%;
  min-height: 48px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 6px;
  gap: 10px;
  align-items: center;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: rgba(255, 255, 255, 0.66);
  cursor: pointer;
  text-align: left;
  transition:
    background 0.14s ease,
    border-color 0.14s ease,
    color 0.14s ease;
}

.api-profile-item:hover,
.api-profile-item.active {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.9);
}

.api-profile-item.active {
  border-color: rgba(255, 255, 255, 0.1);
}

.api-profile-avatar {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.13);
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 720;
}

.api-profile-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 580;
}

.api-profile-status {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(95, 193, 128, 0.9);
}

.api-profile-add {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid rgba(255, 255, 255, 0.105);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.76);
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition:
    background 0.14s ease,
    border-color 0.14s ease,
    color 0.14s ease;
}

.api-profile-add:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.075);
  color: rgba(255, 255, 255, 0.92);
}

.api-config-detail {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
}

.variant-page .api-config-detail {
  padding: 40px 28px 32px;
  overflow: auto;
}

.api-detail-header {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.api-detail-title {
  min-width: 0;
  flex: 1 1 auto;
}

.api-title-name-editor {
  width: min(420px, 100%);
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 11px 0 0;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition:
    background 0.14s ease,
    border-color 0.14s ease;
}

.api-title-name-editor:hover,
.api-title-name-editor:focus-within {
  border-color: rgba(255, 255, 255, 0.11);
  background: rgba(255, 255, 255, 0.035);
}

.api-title-name-input {
  min-width: 0;
  flex: 1 1 auto;
  height: 44px;
  padding: 0 10px;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.92);
  font-size: 20px;
  font-weight: 720;
  line-height: 44px;
  outline: none;
}

.api-title-name-input::placeholder {
  color: rgba(255, 255, 255, 0.38);
}

.api-title-name-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.api-title-edit-icon {
  color: rgba(255, 255, 255, 0.36);
  opacity: 0.82;
  transition:
    color 0.14s ease,
    opacity 0.14s ease;
}

.api-title-name-editor:hover .api-title-edit-icon,
.api-title-name-editor:focus-within .api-title-edit-icon {
  color: rgba(255, 255, 255, 0.72);
  opacity: 1;
}

.api-title-name-editor.disabled {
  cursor: not-allowed;
}

.api-title-name-editor.disabled:hover {
  border-color: transparent;
  background: transparent;
}

.api-title-name-editor.disabled .api-title-edit-icon {
  opacity: 0.32;
}

.api-profile-toolbar,
.config-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chatbox-config-card {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
}

.chatbox-setting-row {
  min-height: 72px;
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.065);
}

.chatbox-setting-row:last-child {
  border-bottom: 0;
}

.chatbox-setting-label {
  color: rgba(255, 255, 255, 0.56);
  font-size: 13px;
  font-weight: 560;
}

.chatbox-setting-control {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.chatbox-setting-control > .config-input {
  flex: 1 1 auto;
}

.action-row {
  min-height: 72px;
}

.config-input {
  width: 100%;
  height: 46px;
  min-width: 0;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.105);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.055);
  color: rgba(255, 255, 255, 0.88);
  font-size: 13px;
  font-weight: 560;
  line-height: 46px;
  outline: none;
  transition:
    border-color 0.14s ease,
    background 0.14s ease,
    box-shadow 0.14s ease;
}

.config-input::placeholder {
  color: rgba(255, 255, 255, 0.44);
  font-weight: 500;
}

.config-input:focus {
  border-color: rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.075);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.04);
}

.config-input option {
  background: #101013;
  color: var(--pm-text);
}

.icon-square {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.105);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.055);
  color: rgba(255, 255, 255, 0.66);
  cursor: pointer;
  transition:
    border-color 0.14s ease,
    background 0.14s ease,
    color 0.14s ease;
}

.icon-square:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.09);
  color: rgba(255, 255, 255, 0.9);
}

.icon-square:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.api-fetch-button {
  width: 100%;
  height: 46px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.035);
  color: rgba(255, 255, 255, 0.48);
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition:
    border-color 0.14s ease,
    background 0.14s ease,
    color 0.14s ease;
}

.api-fetch-button:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.84);
}

.api-fetch-button:disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.danger-clear-button {
  width: fit-content;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: auto;
  padding: 0 14px;
  border: 1px solid rgba(255, 93, 93, 0.45);
  border-radius: 999px;
  background: rgba(255, 83, 83, 0.08);
  color: rgba(255, 104, 104, 0.95);
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  transition:
    background 0.14s ease,
    border-color 0.14s ease;
}

.danger-clear-button:hover {
  border-color: rgba(255, 111, 111, 0.62);
  background: rgba(255, 83, 83, 0.13);
}
</style>
