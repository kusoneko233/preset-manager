<template>
  <Teleport to="body">
    <Transition name="slide">
      <div v-if="visible" class="history-overlay" @click.self="$emit('close')">
        <div class="history-panel">
          <div class="panel-header flex items-center justify-between px-4 py-3">
            <span class="text-sm font-medium text-slate-200">
              <i class="fas fa-history mr-2 text-indigo-400" />备份管理
            </span>
            <button class="close-btn" @click="$emit('close')">
              <i class="fas fa-times" />
            </button>
          </div>

          <div class="panel-body">
            <div class="section">
              <div class="section-title flex items-center justify-between">
                <span>操作记录</span>
                <span class="text-xs text-slate-500">{{ history.undoStack.length }} / 50</span>
              </div>
              <div v-if="!history.undoStack.length" class="text-xs text-slate-600 py-2">无操作记录</div>
              <div v-for="(record, i) in [...history.undoStack].reverse().slice(0, 10)" :key="i" class="record-item">
                <span class="record-desc">{{ record.description }}</span>
                <span class="record-time">{{ formatTime(record.timestamp) }}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title flex items-center justify-between">
                <span>快照备份</span>
                <button class="snapshot-btn" @click="createManualSnapshot">
                  <i class="fas fa-camera mr-1" /> 创建快照
                </button>
              </div>
              <div v-if="!history.snapshots.length" class="text-xs text-slate-600 py-2">无备份快照</div>
              <div v-for="snap in history.snapshots" :key="snap.id" class="snapshot-item">
                <div class="snap-info">
                  <span class="snap-name">{{ snap.name }}</span>
                  <span class="snap-meta">
                    {{ snap.presetName }} · {{ formatTime(snap.timestamp) }}
                    <span v-if="snap.auto" class="auto-badge">自动</span>
                  </span>
                </div>
                <div class="snap-actions">
                  <button class="snap-btn" title="回档" @click="restore(snap.id)">
                    <i class="fas fa-undo text-xs" />
                  </button>
                  <button class="snap-btn" title="删除" @click="history.deleteSnapshot(snap.id)">
                    <i class="fas fa-trash text-xs" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useHistoryStore } from '../stores/history';
import { useManagerStore } from '../stores/manager';

defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();

const history = useHistoryStore();
const manager = useManagerStore();

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function createManualSnapshot() {
  const name = manager.presetName;
  if (!name) {
    toastr.warning('请先选择预设', '', { timeOut: 2000 });
    return;
  }
  const snap = history.createSnapshot(name, `手动备份 - ${name}`);
  if (snap) toastr.success('快照已创建', '', { timeOut: 1500 });
}

async function restore(id: string) {
  if (!confirm('确定回档到此快照？当前更改将被覆盖（可通过撤回恢复）。')) return;
  const ok = await history.restoreSnapshot(id);
  if (ok) {
    manager.refreshMainPreset();
    manager.refreshSecondPreset();
    toastr.success('回档成功', '', { timeOut: 1500 });
  } else {
    toastr.error('回档失败', '', { timeOut: 2000 });
  }
}
</script>

<style scoped>
.history-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 900;
  display: flex;
  justify-content: flex-end;
}
.history-panel {
  width: 360px;
  max-width: 90%;
  background: #0f172a;
  border-left: 1px solid rgba(51, 65, 85, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-header {
  border-bottom: 1px solid rgba(51, 65, 85, 0.4);
}
.close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
}
.close-btn:hover {
  background: rgba(51, 65, 85, 0.5);
  color: #e2e8f0;
}
.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}
.section {
  margin-bottom: 16px;
}
.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 2px;
}
.record-item:hover {
  background: rgba(51, 65, 85, 0.2);
}
.record-desc {
  font-size: 11px;
  color: #cbd5e1;
}
.record-time {
  font-size: 10px;
  color: #64748b;
}
.snapshot-btn {
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  background: rgba(99, 102, 241, 0.1);
  color: #818cf8;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.12s;
}
.snapshot-btn:hover {
  background: rgba(99, 102, 241, 0.2);
}
.snapshot-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border: 1px solid rgba(51, 65, 85, 0.3);
  border-radius: 6px;
  margin-bottom: 4px;
}
.snapshot-item:hover {
  border-color: rgba(51, 65, 85, 0.5);
}
.snap-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.snap-name {
  font-size: 12px;
  color: #e2e8f0;
  word-break: break-all;
}
.snap-meta {
  font-size: 10px;
  color: #64748b;
  margin-top: 2px;
}
.auto-badge {
  padding: 0 4px;
  border-radius: 3px;
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  font-size: 9px;
  margin-left: 4px;
}
.snap-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.snap-btn {
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
}
.snap-btn:hover {
  color: #94a3b8;
  background: rgba(51, 65, 85, 0.4);
}
.slide-enter-active, .slide-leave-active {
  transition: all 0.2s ease;
}
.slide-enter-from, .slide-leave-to {
  opacity: 0;
}
.slide-enter-from .history-panel, .slide-leave-to .history-panel {
  transform: translateX(100%);
}
</style>
