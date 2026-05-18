interface OperationRecord {
  presetName: string;
  before: Preset;
  after: Preset;
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
    this.undoStack.push({
      presetName,
      before: klona(before),
      after: klona(after),
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
    await replacePreset(record.presetName, klona(record.before));
    return record;
  },

  async redo() {
    const record = this.redoStack.pop();
    if (!record) return null;
    this.undoStack.push(record);
    await replacePreset(record.presetName, klona(record.after));
    return record;
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
      this.recordOperation(snapshot.presetName, currentPreset, snapshot.preset, `回档: ${snapshot.name}`);
      await replacePreset(snapshot.presetName, klona(snapshot.preset));
      return true;
    } catch {
      return false;
    }
  },

  deleteSnapshot(snapshotId: string) {
    this.snapshots = this.snapshots.filter(s => s.id !== snapshotId);
    saveSnapshots(this.snapshots);
  },

  renameSnapshot(snapshotId: string, name: string) {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (snapshot) snapshot.name = name;
    saveSnapshots(this.snapshots);
  },
});

export function useHistoryStore() {
  return historyStore;
}
