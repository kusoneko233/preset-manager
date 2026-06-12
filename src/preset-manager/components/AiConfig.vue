<template>
  <section class="ai-config-shell" :class="[`variant-${variant}`]">
    <div class="api-config-layout">
      <aside class="api-profile-sidebar">
        <div class="api-sidebar-title">API 预设</div>
        <div class="api-profile-list">
          <button
            v-for="profile in ai.config.apiProfiles"
            :key="profile.id"
            class="api-profile-item"
            :class="{ active: profile.id === ai.config.activeProfileId }"
            @click="selectApiProfile(profile.id)"
            @contextmenu.prevent.stop="openApiProfileMenu($event, profile)"
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
        <Transition name="api-context-pop">
          <div
            v-if="apiProfileContextMenuOpen"
            ref="apiProfileContextMenuRef"
            class="api-profile-context-menu"
            :style="{ left: `${apiProfileContextMenu.x}px`, top: `${apiProfileContextMenu.y}px` }"
            @pointerdown.stop
            @mousedown.stop
          >
            <button type="button" class="api-profile-context-item" @click="renameApiProfile">
              <Icon name="pen-line" :size="13" />
              <span>重命名</span>
            </button>
            <button type="button" class="api-profile-context-item danger" @click="deleteApiProfileFromMenu">
              <Icon name="trash-2" :size="13" />
              <span>删除</span>
            </button>
          </div>
        </Transition>
      </aside>

      <div class="api-config-detail">
        <div class="api-detail-scroll">
          <div class="api-detail-header">
            <div class="api-detail-title-row">
              <button v-if="variant === 'page'" class="api-page-back" title="返回预设列表" @click="emit('close')">
                <Icon name="chevron-left" :size="15" />
                <span>返回</span>
              </button>
              <label class="api-title-name-editor" :class="{ disabled: !activeProfile }">
                <input
                  ref="titleNameInputRef"
                  :value="activeProfile?.name || ''"
                  class="api-title-name-input"
                  placeholder="API 预设"
                  :disabled="!activeProfile"
                  :style="{ width: titleInputWidthCh }"
                  @change="updateActiveProfile({ name: ($event.target as HTMLInputElement).value })"
                />
              </label>
            </div>
          </div>

          <template v-if="activeProfile">
            <section class="api-field-section api-mode-section">
              <label class="api-field api-mode-field">
                <span class="api-field-label">API 模式</span>
                <span class="api-select-control api-mode-select-control">
                  <select
                    :value="activeProfile.source"
                    class="config-input api-mode-select"
                    @change="updateActiveProfile({ source: ($event.target as HTMLSelectElement).value })"
                  >
                    <option v-for="source in sourceOptions" :key="source.value" :value="source.value">
                      {{ source.label }}
                    </option>
                  </select>
                  <Icon name="chevron-down" :size="13" class="api-select-chevron" />
                </span>
              </label>
            </section>

            <section class="api-field-section">
              <div class="api-section-heading">
                <span>身份验证</span>
                <small>当前预设的访问凭据</small>
              </div>
              <div class="api-field-grid">
                <label class="api-field api-field-secret">
                  <span class="api-field-label">API Key</span>
                  <span class="api-key-control">
                    <input
                      :value="activeProfile.key"
                      class="config-input manual-api-key"
                      placeholder="sk-..."
                      :type="showApiKey ? 'text' : 'password'"
                      @change="updateActiveProfile({ key: ($event.target as HTMLInputElement).value })"
                    />
                    <button
                      type="button"
                      class="api-key-visibility-button"
                      :title="showApiKey ? '隐藏 Key' : '显示 Key'"
                      @click="showApiKey = !showApiKey"
                    >
                      <Icon :name="showApiKey ? 'eye-off' : 'eye'" :size="15" />
                    </button>
                  </span>
                </label>
              </div>
            </section>

            <section class="api-field-section">
              <div class="api-section-heading">
                <span>接口与模型</span>
                <small>配置兼容接口地址并选择模型</small>
              </div>
              <div class="api-field-grid">
                <label class="api-field api-field-wide api-field-url">
                  <span class="api-field-label">API 地址</span>
                  <input
                    :value="activeProfile.apiUrl"
                    class="config-input manual-api-url"
                    placeholder="https://api.example.com/v1"
                    @change="updateActiveProfile({ apiUrl: ($event.target as HTMLInputElement).value })"
                  />
                </label>

                <label class="api-field api-field-wide api-field-model">
                  <span class="api-field-label">模型</span>
                  <span class="api-select-control model-select-control">
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
                        {{ option.name }}
                      </option>
                    </select>
                    <Icon name="chevron-down" :size="13" class="api-select-chevron" />
                  </span>
                </label>

                <div class="api-model-list" aria-label="当前 API 预设的模型列表">
                  <div
                    v-for="model in activeProfile.models"
                    :key="model.id"
                    class="api-model-item"
                    :class="{ active: model.name === ai.config.model && activeProfile.id === ai.config.activeProfileId }"
                  >
                    <button class="api-model-select" type="button" @click="selectModel(model.name, activeProfile.id)">
                      <span class="api-model-name">{{ model.name }}</span>
                      <small class="api-model-profile">{{ activeProfile.name }}</small>
                    </button>
                    <button
                      class="api-model-remove"
                      type="button"
                      title="移除模型"
                      @click.stop="ai.removeModelFromActiveProfile(model.id)"
                    >
                      <Icon name="x" :size="12" />
                    </button>
                  </div>
                  <div v-if="!activeProfile.models.length" class="api-model-empty">
                    点击「从接口获取模型」后会显示多个可选模型
                  </div>
                </div>
              </div>

              <div class="api-action-row">
                <button
                  class="api-secondary-action"
                  :disabled="!activeProfile.apiUrl || loadingModels"
                  @click="fetchModels"
                >
                  检查连接
                </button>
                <button
                  class="api-fetch-button"
                  :disabled="!activeProfile.apiUrl || loadingModels"
                  @click="fetchModels"
                >
                  {{ loadingModels ? '获取中...' : '从接口获取模型' }}
                </button>
              </div>
            </section>
          </template>
          <div v-else class="api-empty-detail">选择或添加 API 预设后继续配置</div>

          <button class="danger-clear-button api-clear-bottom" @click="ai.clearMessages()">
            <Icon name="trash-2" :size="13" />
            <span>清空对话</span>
          </button>
        </div>
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
const showApiKey = ref(false);
const titleNameInputRef = ref<HTMLInputElement | null>(null);
const apiProfileContextMenuRef = ref<HTMLElement | null>(null);
const apiProfileContextMenuOpen = ref(false);
const apiProfileContextMenu = reactive({
  profileId: '',
  x: 0,
  y: 0,
});
const activeProfile = computed(() => ai.activeApiProfile);
const variant = computed(() => props.variant);
const titleInputWidthCh = computed(() => {
  const name = activeProfile.value?.name || 'API 预设';
  return `${Math.min(38, Math.max(14, Array.from(name).length + 4))}ch`;
});
const selectedModelKey = computed(() => {
  const option =
    ai.modelOptions.find(item => item.name === ai.config.model && item.profileId === ai.config.activeProfileId) ??
    ai.modelOptions.find(item => item.name === ai.config.model);
  return option ? modelOptionKey(option) : '';
});
const sourceOptions = [
  { value: 'openai', label: 'OpenAI / 兼容接口' },
  { value: 'custom', label: '自定义兼容接口' },
  { value: 'claude', label: 'Claude' },
  { value: 'google', label: 'Google Gemini' },
] as const;

function selectApiProfile(id: string) {
  closeApiProfileContextMenu();
  ai.selectApiProfile(id);
}

function updateActiveProfile(patch: Partial<Omit<AiApiProfile, 'id' | 'models'>>) {
  ai.setActiveApiProfilePatch(patch);
}

function openApiProfileMenu(event: MouseEvent, profile: AiApiProfile) {
  ai.selectApiProfile(profile.id);
  const sidebarRect = (event.currentTarget as HTMLElement)
    .closest('.api-profile-sidebar')
    ?.getBoundingClientRect();
  apiProfileContextMenu.profileId = profile.id;
  apiProfileContextMenu.x = sidebarRect ? event.clientX - sidebarRect.left : event.clientX;
  apiProfileContextMenu.y = sidebarRect ? event.clientY - sidebarRect.top : event.clientY;
  apiProfileContextMenuOpen.value = true;
}

function closeApiProfileContextMenu(event?: MouseEvent) {
  if (event && apiProfileContextMenuRef.value?.contains(event.target as Node)) return;
  apiProfileContextMenuOpen.value = false;
}

async function renameApiProfile() {
  const id = apiProfileContextMenu.profileId;
  closeApiProfileContextMenu();
  if (id) ai.selectApiProfile(id);
  await nextTick();
  titleNameInputRef.value?.focus();
  titleNameInputRef.value?.select();
}

function deleteApiProfileFromMenu() {
  const id = apiProfileContextMenu.profileId;
  closeApiProfileContextMenu();
  if (id) ai.deleteApiProfile(id);
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
    ai.addModelsToActiveProfile(models, activeProfile.value?.group || '默认');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '获取模型列表失败');
  } finally {
    loadingModels.value = false;
  }
}

onMounted(() => {
  document.addEventListener('mousedown', closeApiProfileContextMenu);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', closeApiProfileContextMenu);
});
</script>

<style scoped>
.ai-config-shell {
  width: min(860px, calc(100vw - 32px));
  min-height: 520px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--pm-border);
  border-radius: 18px;
  background: color-mix(in srgb, var(--pm-bg-workspace) 96%, #000);
  color: var(--pm-text);
  box-shadow: 0 24px 72px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(22px) saturate(112%);
  -webkit-backdrop-filter: blur(22px) saturate(112%);
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

.api-page-back {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 76px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 999px;
  background: var(--pm-pill-bg-hover);
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
  background: var(--pm-pill-bg-active);
  color: var(--pm-text);
}

.api-config-layout {
  min-height: 520px;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
}

.variant-page .api-config-layout {
  min-height: 0;
  flex: 1 1 auto;
  grid-template-columns: 248px minmax(0, 1fr);
  overflow: hidden;
}

.api-profile-sidebar {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 10px;
  border-right: 1px solid var(--pm-sidebar-edge);
  background: color-mix(in srgb, var(--pm-bg-sidebar) 88%, transparent);
}

.variant-page .api-profile-sidebar {
  padding: 18px 16px;
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
  padding: 0 2px;
  overflow: auto;
}

.api-profile-item {
  width: 100%;
  min-height: 48px;
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) 6px;
  gap: 10px;
  align-items: center;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  text-align: left;
  transition:
    background 0.14s ease,
    border-color 0.14s ease,
    color 0.14s ease;
}

.api-profile-item:hover,
.api-profile-item.active {
  background: var(--pm-row-active);
  color: var(--pm-text);
}

.api-profile-avatar {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--pm-control-highlight);
  color: var(--pm-text);
  font-size: 12px;
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
  background: var(--pm-success);
}

.api-profile-add {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 999px;
  background: var(--pm-pill-primary-bg);
  color: var(--pm-pill-primary-fg);
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition:
    background 0.14s ease,
    border-color 0.14s ease,
    color 0.14s ease;
}

.api-profile-add:hover {
  background: var(--pm-pill-primary-bg-hover);
}

.api-profile-context-menu {
  position: absolute;
  z-index: 60;
  min-width: 132px;
  display: grid;
  gap: 3px;
  padding: 6px;
  border: 0;
  border-radius: 8px;
  background: color-mix(in srgb, var(--pm-bg-workspace) 94%, #000);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.34);
}

.api-profile-context-item {
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-text-muted);
  font-size: 13px;
  font-weight: 620;
  cursor: pointer;
  text-align: left;
}

.api-profile-context-item:hover {
  background: var(--pm-row-hover);
  color: var(--pm-text);
}

.api-profile-context-item.danger {
  color: rgba(255, 118, 118, 0.9);
}

.api-context-pop-enter-active,
.api-context-pop-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.api-context-pop-enter-from,
.api-context-pop-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}

.api-config-detail {
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.variant-page .api-config-detail {
  padding: 0;
}

.api-detail-scroll {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 28px;
  overflow: auto;
  padding: 34px 42px 36px;
}

.api-detail-header {
  position: relative;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}

.api-detail-title-row {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.api-title-name-editor {
  width: min(520px, 100%);
  max-width: min(520px, 100%);
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 11px 0 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition:
    background 0.14s ease,
    border-color 0.14s ease;
}

.api-title-name-editor:hover,
.api-title-name-editor:focus-within {
  background: var(--pm-row-hover);
}

.api-title-name-input {
  min-width: 0;
  max-width: min(460px, 100%);
  flex: 0 1 auto;
  height: 44px;
  padding: 0 10px;
  border: 0;
  background: transparent;
  color: var(--pm-text);
  font-size: 20px;
  font-weight: 720;
  line-height: 44px;
  outline: none;
}

.api-title-name-input::placeholder {
  color: var(--pm-text-faint);
}

.api-title-name-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.api-title-name-editor.disabled {
  cursor: not-allowed;
}

.api-title-name-editor.disabled:hover {
  border-color: transparent;
  background: transparent;
}

.api-field-section {
  display: grid;
  gap: 18px;
}

.api-section-heading {
  display: grid;
  gap: 4px;
}

.api-section-heading span {
  color: var(--pm-text);
  font-size: 14px;
  font-weight: 680;
}

.api-section-heading small {
  color: var(--pm-text-subtle);
  font-size: 12px;
  font-weight: 500;
}

.api-mode-section {
  gap: 0;
}

.api-mode-field {
  width: min(232px, 100%);
}

.api-mode-select {
  cursor: pointer;
}

.api-select-control {
  position: relative;
  display: block;
  min-width: 0;
}

.api-select-control .config-input {
  padding-right: 38px;
  appearance: none;
  -webkit-appearance: none;
}

.api-select-chevron {
  position: absolute;
  top: 50%;
  right: 13px;
  color: var(--pm-text-subtle);
  pointer-events: none;
  transform: translateY(-50%);
}

.api-field-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
}

.api-field {
  min-width: 0;
  display: grid;
  gap: 7px;
}

.api-field-wide {
  grid-column: 1 / -1;
}

.api-field-secret {
  width: min(560px, 100%);
}

.api-field-url {
  width: min(640px, 100%);
}

.api-field-model {
  width: min(520px, 100%);
}

.api-model-list {
  width: min(520px, 100%);
  display: grid;
  gap: 6px;
}

.api-model-item {
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 7px 0 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--pm-text-muted);
  text-align: left;
  transition:
    background 0.14s ease,
    color 0.14s ease;
}

.api-model-item:hover,
.api-model-item.active {
  background: var(--pm-row-hover);
  color: var(--pm-text);
}

.api-model-select {
  min-width: 0;
  min-height: 38px;
  flex: 1 1 auto;
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 0 4px 0 12px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.api-model-name {
  min-width: 0;
  overflow: hidden;
  color: var(--pm-text);
  font-size: 13px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-model-profile {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  color: var(--pm-text-subtle);
  font-size: 11px;
  font-weight: 520;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-model-remove {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
}

.api-model-remove:hover {
  background: var(--pm-row-hover);
  color: var(--pm-text);
}

.api-model-empty {
  padding: 6px 2px;
  color: var(--pm-text-subtle);
  font-size: 12px;
  line-height: 1.45;
}

.api-field-label {
  color: var(--pm-text-subtle);
  font-size: 12px;
  font-weight: 600;
}

.api-key-control {
  position: relative;
  display: block;
  min-width: 0;
}

.api-key-control .config-input {
  padding-right: 48px;
}

.api-key-visibility-button {
  position: absolute;
  top: 50%;
  right: 7px;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
  transform: translateY(-50%);
  transition:
    background 0.14s ease,
    color 0.14s ease;
}

.api-key-visibility-button:hover {
  background: var(--pm-row-hover);
  color: var(--pm-text);
}

.api-empty-detail {
  display: grid;
  place-items: center;
  min-height: 180px;
  border-radius: 8px;
  background: var(--pm-control-highlight);
  color: var(--pm-text-subtle);
  font-size: 13px;
}

.config-input {
  width: 100%;
  height: 46px;
  min-width: 0;
  padding: 0 14px;
  border: 0;
  border-radius: 8px;
  background: var(--pm-input-bg);
  color: var(--pm-text);
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
  color: var(--pm-text-faint);
  font-weight: 500;
}

.config-input:focus {
  background: color-mix(in srgb, var(--pm-input-bg) 78%, var(--pm-text) 8%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pm-text) 14%, transparent);
}

.config-input option {
  background: #101013;
  color: var(--pm-text);
}

.api-action-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.api-fetch-button,
.api-secondary-action {
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition:
    background 0.14s ease,
    color 0.14s ease;
}

.api-fetch-button {
  background: var(--pm-pill-primary-bg);
  color: var(--pm-pill-primary-fg);
}

.api-fetch-button:hover:not(:disabled) {
  background: var(--pm-pill-primary-bg-hover);
}

.api-secondary-action {
  background: var(--pm-control-highlight);
  color: var(--pm-text-muted);
}

.api-secondary-action:hover:not(:disabled) {
  background: var(--pm-control-highlight-hover);
  color: var(--pm-text);
}

.api-fetch-button:disabled,
.api-secondary-action:disabled {
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
  padding: 0 14px;
  border: 0;
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
  background: rgba(255, 83, 83, 0.13);
}

.api-clear-bottom {
  margin-top: auto;
  align-self: flex-start;
}

@media (max-width: 720px) {
  .api-config-layout,
  .variant-page .api-config-layout {
    grid-template-columns: 1fr;
  }

  .api-profile-sidebar {
    max-height: 180px;
    border-right: 0;
    border-bottom: 1px solid var(--pm-sidebar-edge);
  }

  .api-detail-scroll {
    padding: 24px;
  }
}
</style>
