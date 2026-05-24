import { createApp } from 'vue';
import { createScriptIdIframe, teleportStyle } from '@util/script';
import App from './App.vue';
import { CODEX_REFERENCE_METRICS } from './designMetrics';
import { startParentDrag } from './utils/drag';
import { getInstanceStorageKey, resolvePresetManagerInstance, type PresetManagerInstanceConfig } from './utils/instanceConfig';

let $iframe: JQuery<HTMLIFrameElement> | null = null;
let $floatingBtn: JQuery<HTMLDivElement> | null = null;
let app: ReturnType<typeof createApp> | null = null;
let styleCleanup: (() => void) | null = null;
const instance = resolvePresetManagerInstance(readScriptName());
const FLOATING_BUTTON_SIZE = 48;
const FLOATING_BUTTON_MARGIN = 8;

type FloatingButtonPosition = { left: number; top: number };

function readScriptName() {
  try {
    return getScriptName();
  } catch {
    return '';
  }
}

function getViewport(parentDoc: Document) {
  return {
    width: parentDoc.documentElement.clientWidth || parentDoc.defaultView?.innerWidth || 0,
    height: parentDoc.documentElement.clientHeight || parentDoc.defaultView?.innerHeight || 0,
  };
}

function clampFloatingButtonPosition(parentDoc: Document, position: FloatingButtonPosition): FloatingButtonPosition {
  const viewport = getViewport(parentDoc);
  const maxLeft = Math.max(FLOATING_BUTTON_MARGIN, viewport.width - FLOATING_BUTTON_SIZE - FLOATING_BUTTON_MARGIN);
  const maxTop = Math.max(FLOATING_BUTTON_MARGIN, viewport.height - FLOATING_BUTTON_SIZE - FLOATING_BUTTON_MARGIN);

  return {
    left: Math.max(FLOATING_BUTTON_MARGIN, Math.min(position.left, maxLeft)),
    top: Math.max(FLOATING_BUTTON_MARGIN, Math.min(position.top, maxTop)),
  };
}

function getDefaultFloatingButtonPosition(parentDoc: Document, config: PresetManagerInstanceConfig) {
  const viewport = getViewport(parentDoc);
  return clampFloatingButtonPosition(parentDoc, {
    left: viewport.width - FLOATING_BUTTON_SIZE - config.defaultPosition.right,
    top: viewport.height - FLOATING_BUTTON_SIZE - config.defaultPosition.bottom,
  });
}

function readFloatingButtonPosition(parentDoc: Document, config: PresetManagerInstanceConfig) {
  try {
    const raw = localStorage.getItem(getInstanceStorageKey(config.key, 'FloatingButton'));
    if (!raw) return getDefaultFloatingButtonPosition(parentDoc, config);
    const saved = JSON.parse(raw) as FloatingButtonPosition;
    if (!Number.isFinite(saved.left) || !Number.isFinite(saved.top)) return getDefaultFloatingButtonPosition(parentDoc, config);
    return clampFloatingButtonPosition(parentDoc, saved);
  } catch {
    return getDefaultFloatingButtonPosition(parentDoc, config);
  }
}

function saveFloatingButtonPosition(config: PresetManagerInstanceConfig, position: FloatingButtonPosition) {
  localStorage.setItem(getInstanceStorageKey(config.key, 'FloatingButton'), JSON.stringify(position));
}

function createFloatingButton(config: PresetManagerInstanceConfig) {
  const parentDoc = window.parent.document;
  const initialPosition = readFloatingButtonPosition(parentDoc, config);
  const $btn = $<HTMLDivElement>('<div>')
    .attr('script_id', getScriptId())
    .attr('data-preset-manager-instance', config.key)
    .attr('title', config.label)
    .css({
      position: 'fixed',
      top: `${initialPosition.top}px`,
      left: `${initialPosition.left}px`,
      width: `${FLOATING_BUTTON_SIZE}px`,
      height: `${FLOATING_BUTTON_SIZE}px`,
      borderRadius: '50%',
      background: '#0a0a0a',
      color: '#f7f7f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      zIndex: 9998,
      border: '1px solid rgba(255,255,255,0.16)',
      boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
      fontSize: '18px',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
      userSelect: 'none',
    })
    .html(`<i class="fas ${config.iconClass}"></i>`)
    .on('mouseenter', function () {
      $(this).css({ transform: 'scale(1.06)', boxShadow: '0 18px 46px rgba(0,0,0,0.42)', background: '#161616' });
    })
    .on('mouseleave', function () {
      $(this).css({ transform: 'scale(1)', boxShadow: '0 14px 40px rgba(0,0,0,0.35)', background: '#0a0a0a' });
    })
    .appendTo(window.parent.document.body);

  let isDragging = false;
  let dragStartPos = { x: 0, y: 0 };
  let btnStartPos = { x: 0, y: 0 };

  $btn.on('mousedown', (e: JQuery.Event) => {
    const evt = (e as any).originalEvent as MouseEvent;
    evt.preventDefault();
    dragStartPos = { x: evt.clientX, y: evt.clientY };
    const rect = $btn[0].getBoundingClientRect();
    btnStartPos = { x: rect.left, y: rect.top };
    isDragging = false;

    startParentDrag(parentDoc, {
      startEvent: evt,
      cursor: 'move',
      onMove: ev => {
        const dx = ev.clientX - dragStartPos.x;
        const dy = ev.clientY - dragStartPos.y;
        if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          isDragging = true;
          $btn.css({ transition: 'none' });
        }
        if (!isDragging) return;

        const nextPosition = clampFloatingButtonPosition(parentDoc, {
          left: btnStartPos.x + dx,
          top: btnStartPos.y + dy,
        });
        $btn.css({ left: `${nextPosition.left}px`, top: `${nextPosition.top}px`, right: 'auto', bottom: 'auto' });
      },
      onEnd: () => {
        $btn.css({ transition: 'transform 0.15s ease, box-shadow 0.15s ease' });
        if (!isDragging) {
          togglePanel();
        } else {
          const nextRect = $btn[0].getBoundingClientRect();
          saveFloatingButtonPosition(config, clampFloatingButtonPosition(parentDoc, { left: nextRect.left, top: nextRect.top }));
        }
        isDragging = false;
      },
    });
  });

  return $btn;
}

function togglePanel() {
  if ($iframe) {
    if ($iframe.is(':visible')) {
      $iframe.hide();
    } else {
      $iframe.show();
    }
    return;
  }

  $iframe = createScriptIdIframe()
    .css({
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${CODEX_REFERENCE_METRICS.window.width}px`,
      height: `${CODEX_REFERENCE_METRICS.window.height}px`,
      maxWidth: 'none',
      maxHeight: 'none',
      border: 'none',
      borderRadius: '12px',
      boxShadow: 'none',
      zIndex: 9999,
      background: 'transparent',
    })
    .appendTo(window.parent.document.body);

  $iframe.on('load', function () {
    const iframeDoc = this.contentDocument!;
    const { destroy } = teleportStyle(iframeDoc.head);
    styleCleanup = destroy;

    const mountEl = iframeDoc.createElement('div');
    mountEl.id = 'app';
    iframeDoc.body.appendChild(mountEl);

    app = createApp(App);
    app.provide('parentDocument', window.parent.document);
    app.provide('iframeElement', $iframe![0]);
    app.provide('presetManagerInstanceKey', instance.key);
    app.provide('presetManagerInstanceLabel', instance.label);
    app.mount(mountEl);
  });
}

$(() => {
  updateScriptButtonsWith(buttons => {
    const nextButtons = instance.key === 'default' ? buttons : buttons.filter(button => button.name !== '预设管理器');
    if (nextButtons.some(button => button.name === instance.buttonName)) return nextButtons;
    return [...nextButtons, { name: instance.buttonName, visible: true }];
  });
  eventOn(getButtonEvent(instance.buttonName), () => togglePanel());

  $floatingBtn = createFloatingButton(instance);

  $(window).on('pagehide', () => {
    styleCleanup?.();
    app?.unmount();
    $iframe?.remove();
    $floatingBtn?.remove();
  });
});
