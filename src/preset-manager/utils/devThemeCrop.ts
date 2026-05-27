import { CODEX_REFERENCE_METRICS, getCodexMainWidth } from '../designMetrics';
import type { DevThemeTarget } from './devThemeCss';

export type DevThemeCropTargets = Record<DevThemeTarget, boolean>;

export type DevThemeCropRect = {
  width: number;
  height: number;
};

export type DevThemeCropAspect = {
  label: string;
  width: number;
  height: number;
  ratio: number;
};

const DEV_THEME_CROP_ASPECTS = {
  sidebar: { label: '侧栏', width: CODEX_REFERENCE_METRICS.sidebar.width, height: CODEX_REFERENCE_METRICS.window.height },
  workspace: { label: '工作区' },
  panel: { label: '弹窗', width: CODEX_REFERENCE_METRICS.window.width, height: CODEX_REFERENCE_METRICS.window.height },
  selected: { label: '选中元素' },
  fallbackVertical: { label: '竖图', width: 512, height: 768 },
} as const;

function createAspect(label: string, width: number, height: number): DevThemeCropAspect {
  return { label, width, height, ratio: width / height };
}

function isUsableRect(rect: DevThemeCropRect | null | undefined) {
  return Boolean(rect && Number.isFinite(rect.width) && Number.isFinite(rect.height) && rect.width > 0 && rect.height > 0);
}

function getActiveTargets(targets: DevThemeCropTargets) {
  return (Object.entries(targets) as [DevThemeTarget, boolean][])
    .filter(([, enabled]) => enabled)
    .map(([target]) => target);
}

export function getDevThemeCropAspect(options: {
  targets: DevThemeCropTargets;
  selectedRect?: DevThemeCropRect | null;
}): DevThemeCropAspect {
  const activeTargets = getActiveTargets(options.targets);

  if (activeTargets.length === 1) {
    const target = activeTargets[0];
    if (target === 'sidebar') {
      return createAspect(DEV_THEME_CROP_ASPECTS.sidebar.label, DEV_THEME_CROP_ASPECTS.sidebar.width, DEV_THEME_CROP_ASPECTS.sidebar.height);
    }
    if (target === 'workspace') {
      return createAspect(DEV_THEME_CROP_ASPECTS.workspace.label, getCodexMainWidth(), CODEX_REFERENCE_METRICS.window.height);
    }
    if (target === 'selected') {
      if (isUsableRect(options.selectedRect)) {
        return createAspect(DEV_THEME_CROP_ASPECTS.selected.label, Math.round(options.selectedRect!.width), Math.round(options.selectedRect!.height));
      }
      return createAspect(DEV_THEME_CROP_ASPECTS.fallbackVertical.label, DEV_THEME_CROP_ASPECTS.fallbackVertical.width, DEV_THEME_CROP_ASPECTS.fallbackVertical.height);
    }
  }

  return createAspect(DEV_THEME_CROP_ASPECTS.panel.label, DEV_THEME_CROP_ASPECTS.panel.width, DEV_THEME_CROP_ASPECTS.panel.height);
}

export function getDevThemeCropCanvasSize(aspect: DevThemeCropAspect) {
  if (aspect.ratio >= 1) {
    return {
      width: Math.round(800 * aspect.ratio),
      height: 800,
    };
  }
  return {
    width: 512,
    height: Math.round(512 / aspect.ratio),
  };
}

export function getDevThemeCropPreviewSize(aspect: DevThemeCropAspect, maxWidth = 240, maxHeight = 260) {
  if (aspect.ratio >= maxWidth / maxHeight) {
    return {
      width: maxWidth,
      height: Math.round(maxWidth / aspect.ratio),
    };
  }
  return {
    width: Math.round(maxHeight * aspect.ratio),
    height: maxHeight,
  };
}
