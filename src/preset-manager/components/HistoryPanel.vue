<template>
  <Teleport to="body">
    <Transition name="slide">
      <div v-if="visible" class="history-overlay" @click.self="$emit('close')">
        <div class="history-panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">
                <Icon name="history" :size="15" />
                <span>历史与备份</span>
              </div>
              <div class="panel-subtitle">回到操作记录，或管理预设快照</div>
            </div>
            <button class="close-btn" title="关闭" @click="$emit('close')">
              <Icon name="x" :size="14" />
            </button>
          </div>

          <div class="panel-body">
            <section class="section">
              <div class="section-title">
                <span>操作记录</span>
                <span class="section-count">{{ history.undoStack.length }} / 50</span>
              </div>

              <div v-if="!operationItems.length" class="empty-state">无操作记录</div>

              <div v-else class="record-list">
                <div v-for="item in operationItems" :key="`${item.record.timestamp}:${item.index}`" class="record-item">
                  <div class="record-main">
                    <span class="record-desc">{{ item.record.description }}</span>
                    <span class="record-meta">{{ recordPresetLabel(item.record) }} · {{ formatDateTime(item.record.timestamp) }}</span>
                  </div>
                  <button class="icon-btn" title="回到此处" @click="restoreOperation(item.index, item.record.description)">
                    <Icon name="corner-up-left" :size="13" />
                  </button>
                </div>
              </div>
            </section>

            <section class="section">
              <div class="section-title">
                <span>快照备份</span>
                <button class="snapshot-btn" @click="createManualSnapshot">
                  <Icon name="camera" :size="13" />
                  <span>创建快照</span>
                </button>
              </div>

              <div v-if="!history.snapshots.length" class="empty-state">无备份快照</div>

              <div v-else class="snapshot-list">
                <div v-for="snap in history.snapshots" :key="snap.id" class="snapshot-item">
                  <div class="snap-info">
                    <div class="snap-title-row">
                      <span class="snap-name">{{ snap.name }}</span>
                      <span v-if="snap.auto" class="auto-badge">自动</span>
                    </div>
                    <span class="snap-meta">{{ snap.presetName }} · {{ formatDateTime(snap.timestamp) }}</span>
                  </div>
                  <div class="snap-actions">
                    <button class="icon-btn" title="重命名" @click="renameSnapshot(snap)">
                      <Icon name="pen-line" :size="13" />
                    </button>
                    <button class="icon-btn" title="恢复快照" @click="restoreSnapshot(snap.id, snap.name)">
                      <Icon name="corner-up-left" :size="13" />
                    </button>
                    <button class="icon-btn danger" title="删除快照" @click="deleteSnapshot(snap.id, snap.name)">
                      <Icon name="trash-2" :size="13" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import type { Snapshot } from '../stores/history';
import type { OperationRecord } from '../stores/history';
import { useHistoryStore } from '../stores/history';
import { useManagerStore } from '../stores/manager';

defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();

const history = useHistoryStore();
const manager = useManagerStore();

const operationItems = computed(() => history.undoStack.map((record, index) => ({ record, index })).reverse());

function formatDateTime(ts: number) {
  const d = new Date(ts);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

function recordPresetLabel(record: OperationRecord) {
  const changes = record.changes ?? [record];
  if (changes.length <= 1) return record.presetName;
  return `${changes.length} 个预设`;
}

function refreshPresets() {
  manager.refreshMainPreset();
  manager.refreshSecondPreset();
}

function getDefaultSnapshotName(presetName: string) {
  return `手动备份 - ${presetName} - ${formatDateTime(Date.now())}`;
}

function createManualSnapshot() {
  const presetName = manager.presetName;
  if (!presetName) {
    toastr.warning('请先选择主预设', '', { timeOut: 2000 });
    return;
  }

  const input = prompt('快照名称', getDefaultSnapshotName(presetName));
  if (input === null) return;

  const snapshotName = input.trim();
  if (!snapshotName) {
    toastr.warning('快照名称不能为空', '', { timeOut: 1600 });
    return;
  }

  const snap = history.createSnapshot(presetName, snapshotName);
  if (snap) toastr.success('快照已创建', '', { timeOut: 1500 });
}

async function restoreOperation(index: number, description: string) {
  if (!confirm(`确定回到这条历史记录之后的状态吗？\n\n${description}\n\n当前状态会先写入撤销历史。`)) return;

  const record = await history.restoreOperation(index);
  if (record) {
    refreshPresets();
    toastr.success('已回到指定历史记录', '', { timeOut: 1500 });
  } else {
    toastr.error('历史恢复失败', '', { timeOut: 2000 });
  }
}

function renameSnapshot(snapshot: Snapshot) {
  const input = prompt('快照名称', snapshot.name);
  if (input === null) return;

  const ok = history.renameSnapshot(snapshot.id, input);
  if (ok) {
    toastr.success('快照已重命名', '', { timeOut: 1400 });
  } else {
    toastr.warning('快照名称不能为空', '', { timeOut: 1600 });
  }
}

async function restoreSnapshot(id: string, name: string) {
  if (!confirm(`确定恢复快照吗？\n\n${name}\n\n当前更改会先写入撤销历史。`)) return;

  const ok = await history.restoreSnapshot(id);
  if (ok) {
    refreshPresets();
    toastr.success('快照已恢复', '', { timeOut: 1500 });
  } else {
    toastr.error('快照恢复失败', '', { timeOut: 2000 });
  }
}

function deleteSnapshot(id: string, name: string) {
  if (!confirm(`确定删除这个快照吗？\n\n${name}`)) return;

  const ok = history.deleteSnapshot(id);
  if (ok) {
    toastr.info('快照已删除', '', { timeOut: 1400 });
  } else {
    toastr.error('快照删除失败', '', { timeOut: 1800 });
  }
}
</script>

<style scoped>
.history-overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: flex;
  justify-content: flex-end;
  background: color-mix(in srgb, var(--pm-bg) 64%, rgba(0, 0, 0, 0.34));
  backdrop-filter: blur(8px);
}

.history-panel {
  width: 420px;
  max-width: min(92%, 420px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid var(--pm-border-strong);
  background: var(--pm-bg-panel);
  box-shadow: var(--pm-shadow);
}

.panel-header {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--pm-border);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--pm-text);
  font-size: 14px;
  font-weight: 680;
}

.panel-title i {
  color: var(--pm-text-muted);
  font-size: 13px;
}

.panel-subtitle {
  margin-top: 4px;
  color: var(--pm-text-subtle);
  font-size: 11px;
}

.close-btn,
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}

.close-btn {
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
}

.icon-btn {
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  font-size: 11px;
}

.close-btn:hover,
.icon-btn:hover {
  border-color: var(--pm-border);
  background: var(--pm-bg-hover);
  color: var(--pm-text);
}

.icon-btn.danger:hover {
  color: var(--pm-danger);
}

.panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
}

.section {
  margin-bottom: 18px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-title {
  min-height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  color: var(--pm-text-muted);
  font-size: 12px;
  font-weight: 680;
}

.section-count {
  color: var(--pm-text-subtle);
  font-size: 11px;
  font-weight: 520;
}

.empty-state {
  padding: 12px 4px;
  color: var(--pm-text-subtle);
  font-size: 12px;
}

.record-list,
.snapshot-list {
  display: grid;
  gap: 6px;
}

.record-item,
.snapshot-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--pm-bg-elevated) 58%, transparent);
}

.record-item {
  padding: 8px 8px 8px 10px;
}

.snapshot-item {
  padding: 9px 8px 9px 10px;
}

.record-item:hover,
.snapshot-item:hover {
  border-color: var(--pm-border-strong);
  background: var(--pm-bg-hover);
}

.record-main,
.snap-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.record-desc,
.snap-name {
  overflow: hidden;
  color: var(--pm-text);
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-meta,
.snap-meta {
  margin-top: 3px;
  overflow: hidden;
  color: var(--pm-text-subtle);
  font-size: 10px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snap-title-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.auto-badge {
  flex: 0 0 auto;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--pm-bg-elevated);
  color: var(--pm-text-muted);
  font-size: 10px;
}

.snap-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 2px;
}

.snapshot-btn {
  height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  background: transparent;
  color: var(--pm-text);
  font-size: 11px;
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;
}

.snapshot-btn:hover {
  border-color: var(--pm-border-strong);
  background: var(--pm-bg-hover);
}

.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}

.slide-enter-active .history-panel,
.slide-leave-active .history-panel {
  transition: transform 0.2s ease;
}

.slide-enter-from .history-panel,
.slide-leave-to .history-panel {
  transform: translateX(100%);
}
</style>
