import { createApp } from 'vue';
import { createScriptIdIframe, teleportStyle } from '@util/script';
import App from './App.vue';

let $iframe: JQuery<HTMLIFrameElement> | null = null;
let $floatingBtn: JQuery<HTMLDivElement> | null = null;
let app: ReturnType<typeof createApp> | null = null;
let styleCleanup: (() => void) | null = null;

function createFloatingButton() {
  const $btn = $<HTMLDivElement>('<div>')
    .attr('script_id', getScriptId())
    .css({
      position: 'fixed',
      bottom: '80px',
      right: '20px',
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      zIndex: 9998,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      fontSize: '20px',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      userSelect: 'none',
    })
    .html('<i class="fas fa-sliders-h"></i>')
    .on('mouseenter', function () {
      $(this).css({ transform: 'scale(1.1)', boxShadow: '0 6px 16px rgba(0,0,0,0.4)' });
    })
    .on('mouseleave', function () {
      $(this).css({ transform: 'scale(1)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' });
    })
    .appendTo(window.parent.document.body);

  ($btn as any).draggable({
    containment: 'window',
    scroll: false,
    start() {
      $btn.data('dragged', false);
    },
    drag() {
      $btn.data('dragged', true);
    },
    stop() {
      if (!$btn.data('dragged')) {
        togglePanel();
      }
    },
  });

  $btn.on('click', () => {
    if (!$btn.data('dragged')) {
      togglePanel();
    }
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
      width: '900px',
      height: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      border: 'none',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      zIndex: 9999,
      background: '#1a1a2e',
    })
    .appendTo(window.parent.document.body);

  $iframe.on('load', function () {
    const iframeDoc = this.contentDocument!;
    const { destroy } = teleportStyle(iframeDoc.head);
    styleCleanup = destroy;

    const mountEl = iframeDoc.createElement('div');
    mountEl.id = 'app';
    iframeDoc.body.appendChild(mountEl);

    app = createApp(App).use(createPinia());
    app.provide('parentDocument', window.parent.document);
    app.provide('iframeElement', $iframe![0]);
    app.mount(mountEl);
  });
}

$(() => {
  appendInexistentScriptButtons([{ name: '预设管理器', visible: true }]);
  eventOn(getButtonEvent('预设管理器'), () => togglePanel());

  $floatingBtn = createFloatingButton();

  $(window).on('pagehide', () => {
    styleCleanup?.();
    app?.unmount();
    $iframe?.remove();
    $floatingBtn?.remove();
  });
});
