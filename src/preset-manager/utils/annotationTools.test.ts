declare const require: any;

import type { AnnotationItem } from './annotationTools';

const {
  formatAnnotationExport,
  getNextAnnotationLabel,
  normalizeAnnotationRect,
} = require('./annotationTools');

function expectEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function expectDeepEqual<T>(actual: T, expected: T) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

expectEqual(getNextAnnotationLabel([]), '1');
expectEqual(getNextAnnotationLabel([{ id: 'a', label: '1', kind: 'pin', points: [] }]), '2');
expectEqual(getNextAnnotationLabel([{ id: 'a', label: 'A', kind: 'pin', points: [] }]), '1');

expectDeepEqual(
  normalizeAnnotationRect([
    { x: 40, y: 80 },
    { x: 10, y: 20 },
  ]),
  { left: 10, top: 20, width: 30, height: 60 },
);

const items: AnnotationItem[] = [
  { id: 'a', label: '1', kind: 'pin', points: [{ x: 12.4, y: 18.8 }], colorLabel: '红色', note: '按钮位置别扭' },
  { id: 'b', label: '2', kind: 'rect', points: [{ x: 20, y: 30 }, { x: 80, y: 90 }], colorLabel: '绿色' },
  { id: 'c', label: '3', kind: 'text', points: [{ x: 100, y: 50 }], colorLabel: '蓝色', note: '这里需要更醒目' },
];

expectEqual(
  formatAnnotationExport(items, { width: 320, height: 240 }),
  [
    '预设管理器 UI 批注',
    '画布尺寸：320 x 240',
    '1. [pin] x=12, y=19 color=红色：按钮位置别扭',
    '2. [rect] left=20, top=30, width=60, height=60 color=绿色',
    '3. [text] x=100, y=50 color=蓝色：这里需要更醒目',
  ].join('\n'),
);

expectEqual(formatAnnotationExport([], { width: 320, height: 240 }), '当前没有批注。');

console.info('annotationTools tests passed');
