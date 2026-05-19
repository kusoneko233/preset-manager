export interface OperationChange {
  presetName: string;
  before: Preset;
  after: Preset;
}

export interface OperationRecord extends OperationChange {
  changes: OperationChange[];
  description: string;
  timestamp: number;
}

export interface Snapshot {
  id: string;
  name: string;
  presetName: string;
  preset: Preset;
  timestamp: number;
  auto: boolean;
}

const MAX_UNDO = 50;
const MAX_AUTO_SNAPSHOTS_PER_PRESET = 8;
const STORAGE_KEY = 'preset_manager';

function loadSnapshots(): Snapshot[] {
  try {
    const vars = getVariables({ type: 'script' });
    return vars?.[STORAGE_KEY]?.snapshots ?? [];
  } catch {
    return [];
  }
}

function saveSnapshots(snapshots: Snapshot[]) {
  try {
    updateVariablesWith(
      vars => {
        _.set(vars, `${STORAGE_KEY}.snapshots`, klona(snapshots));
        return vars;
      },
      { type: 'script' },
    );
  } catch (e) {
    console.error('[PresetManager] Failed to save snapshots:', e);
  }
}

const historyStore = reactive({
  undoStack: [] as OperationRecord[],
  redoStack: [] as OperationRecord[],
  snapshots: loadSnapshots() as Snapshot[],

  get canUndo() {
    return this.undoStack.length > 0;
  },

  get canRedo() {
    return this.redoStack.length > 0;
  },

  recordOperation(presetName: string, before: Preset, after: Preset, description: string) {
    const change = {
      presetName,
      before: klona(before),
      after: klona(after),
    };

    this.undoStack.push({
      ...change,
      changes: [change],
      description,
      timestamp: Date.now(),
    });

    if (this.undoStack.length > MAX_UNDO) {
      this.undoStack.shift();
    }

    this.redoStack = [];
  },

  recordMultiOperation(description: string, changes: OperationChange[]) {
    const normalized = changes.map(change => ({
      presetName: change.presetName,
      before: klona(change.before),
      after: klona(change.after),
    }));
    const first = normalized[0];
    if (!first) return;

    this.undoStack.push({
      ...first,
      changes: normalized,
      description,
      timestamp: Date.now(),
    });

    if (this.undoStack.length > MAX_UNDO) {
      this.undoStack.shift();
    }

    this.redoStack = [];
  },

  async undo() {
    const record = this.undoStack.pop();
    if (!record) return null;

    this.redoStack.push(record);
    for (const change of record.changes ?? [record]) {
      await replacePreset(change.presetName, klona(change.before));
    }
    return record;
  },

  async redo() {
    const record = this.redoStack.pop();
    if (!record) return null;

    this.undoStack.push(record);
    if (this.undoStack.length > MAX_UNDO) {
      this.undoStack.shift();
    }

    for (const change of record.changes ?? [record]) {
      await replacePreset(change.presetName, klona(change.after));
    }
    return record;
  },

  async restoreOperation(index: number) {
    const record = this.undoStack[index];
    if (!record) return null;

    try {
      const changes = record.changes ?? [record];
      const currentChanges = changes.map(change => ({
        presetName: change.presetName,
        before: klona(getPreset(change.presetName)),
        after: klona(change.after),
      }));

      for (const change of changes) {
        await replacePreset(change.presetName, klona(change.after));
      }

      this.recordMultiOperation(`回到历史: ${record.description}`, currentChanges);
      return record;
    } catch (e) {
      console.error('[PresetManager] restoreOperation failed:', record.presetName, e);
      return null;
    }
  },

  createSnapshot(presetName: string, name?: string, auto = false) {
    try {
      const preset = getPreset(presetName);
      console.log('[PresetManager] createSnapshot:', presetName, 'prompts:', preset?.prompts?.length);

      const snapshot: Snapshot = {
        id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: name ?? `${auto ? '自动备份' : '手动备份'} - ${presetName}`,
        presetName,
        preset: klona(preset),
        timestamp: Date.now(),
        auto,
      };

      this.snapshots.unshift(snapshot);

      if (auto) {
        const autoSnapshots = this.snapshots.filter(s => s.auto && s.presetName === presetName);
        const expiredIds = new Set(autoSnapshots.slice(MAX_AUTO_SNAPSHOTS_PER_PRESET).map(s => s.id));
        if (expiredIds.size) {
          this.snapshots = this.snapshots.filter(s => !expiredIds.has(s.id));
        }
      }

      saveSnapshots(this.snapshots);
      return snapshot;
    } catch (e) {
      console.error('[PresetManager] createSnapshot failed:', presetName, e);
      return null;
    }
  },

  async restoreSnapshot(snapshotId: string) {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) return false;

    try {
      const currentPreset = getPreset(snapshot.presetName);
      await replacePreset(snapshot.presetName, klona(snapshot.preset));
      this.recordOperation(snapshot.presetName, currentPreset, snapshot.preset, `恢复快照: ${snapshot.name}`);
      return true;
    } catch (e) {
      console.error('[PresetManager] restoreSnapshot failed:', snapshot.presetName, e);
      return false;
    }
  },

  deleteSnapshot(snapshotId: string) {
    const beforeCount = this.snapshots.length;
    this.snapshots = this.snapshots.filter(s => s.id !== snapshotId);
    const deleted = this.snapshots.length !== beforeCount;
    if (deleted) saveSnapshots(this.snapshots);
    return deleted;
  },

  renameSnapshot(snapshotId: string, name: string) {
    const nextName = name.trim();
    if (!nextName) return false;

    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) return false;

    snapshot.name = nextName;
    saveSnapshots(this.snapshots);
    return true;
  },
});

export function useHistoryStore() {
  return historyStore;
}
