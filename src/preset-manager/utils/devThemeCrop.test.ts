declare const require: any;

const {
  getDevThemeCropAspect,
  getDevThemeCropCanvasSize,
  getDevThemeCropPreviewSize,
} = require('./devThemeCrop');

function expectEqual<T>(actual: T, expected: T) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function expectClose(actual: number, expected: number) {
  if (Math.abs(actual - expected) > 0.0001) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
}

const emptyTargets = { sidebar: false, workspace: false, panel: false, selected: false };

const sidebarAspect = getDevThemeCropAspect({
  targets: { ...emptyTargets, sidebar: true },
});
expectEqual(sidebarAspect.label, '侧栏');
expectEqual(sidebarAspect.width, 255);
expectEqual(sidebarAspect.height, 700);
expectClose(sidebarAspect.ratio, 255 / 700);
expectEqual(getDevThemeCropCanvasSize(sidebarAspect), { width: 512, height: 1405 });
expectEqual(getDevThemeCropPreviewSize(sidebarAspect), { width: 95, height: 260 });

const workspaceAspect = getDevThemeCropAspect({
  targets: { ...emptyTargets, workspace: true },
});
expectEqual(workspaceAspect.label, '工作区');
expectEqual(workspaceAspect.width, 845);
expectEqual(workspaceAspect.height, 700);
expectClose(workspaceAspect.ratio, 845 / 700);
expectEqual(getDevThemeCropCanvasSize(workspaceAspect), { width: 966, height: 800 });
expectEqual(getDevThemeCropPreviewSize(workspaceAspect), { width: 240, height: 199 });

const panelAspect = getDevThemeCropAspect({
  targets: { ...emptyTargets, panel: true },
});
expectEqual(panelAspect.label, '弹窗');
expectEqual(panelAspect.width, 1100);
expectEqual(panelAspect.height, 700);
expectClose(panelAspect.ratio, 1100 / 700);
expectEqual(getDevThemeCropCanvasSize(panelAspect), { width: 1257, height: 800 });
expectEqual(getDevThemeCropPreviewSize(panelAspect), { width: 240, height: 153 });

const selectedAspect = getDevThemeCropAspect({
  targets: { ...emptyTargets, selected: true },
  selectedRect: { width: 320, height: 160 },
});
expectEqual(selectedAspect.label, '选中元素');
expectEqual(selectedAspect.width, 320);
expectEqual(selectedAspect.height, 160);
expectClose(selectedAspect.ratio, 2);
expectEqual(getDevThemeCropCanvasSize(selectedAspect), { width: 1600, height: 800 });

const fallbackSelectedAspect = getDevThemeCropAspect({
  targets: { ...emptyTargets, selected: true },
});
expectEqual(fallbackSelectedAspect.label, '竖图');
expectEqual(fallbackSelectedAspect.width, 512);
expectEqual(fallbackSelectedAspect.height, 768);

const multiAspect = getDevThemeCropAspect({
  targets: { ...emptyTargets, sidebar: true, workspace: true },
});
expectEqual(multiAspect.label, '弹窗');
expectEqual(multiAspect.width, 1100);
expectEqual(multiAspect.height, 700);

console.info('devThemeCrop tests passed');
