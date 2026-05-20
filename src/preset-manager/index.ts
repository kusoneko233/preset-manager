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
    .html('<i class="fas fa-sliders-h"></i>')
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
  const parentDoc = window.parent.document;

  $btn.on('mousedown', (e: JQuery.Event) => {
    const evt = (e as any).originalEvent as MouseEvent;
    dragStartPos = { x: evt.clientX, y: evt.clientY };
    const rect = $btn[0].getBoundingClientRect();
    btnStartPos = { x: rect.left, y: rect.top };
    isDragging = false;

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragStartPos.x;
      const dy = ev.clientY - dragStartPos.y;
      if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        isDragging = true;
        $btn.css({ transition: 'none' });
      }
      if (isDragging) {
        $btn.css({ left: `${btnStartPos.x + dx}px`, top: `${btnStartPos.y + dy}px`, right: 'auto', bottom: 'auto' });
      }
    };

    const onMouseUp = () => {
      (parentDoc as any).removeEventListener('mousemove', onMouseMove);
      (parentDoc as any).removeEventListener('mouseup', onMouseUp);
      $btn.css({ transition: 'transform 0.15s ease, box-shadow 0.15s ease' });
      if (!isDragging) {
        togglePanel();
      }
      isDragging = false;
    };

    (parentDoc as any).addEventListener('mousemove', onMouseMove);
    (parentDoc as any).addEventListener('mouseup', onMouseUp);
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
      width: '1375px',
      height: '875px',
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
