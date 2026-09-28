/* Workflow Hub — messages between the hub pages and the tool iframes (same origin only).
   In a tool (child):
     embed.row                  this tool's row id (from ?row=)
     embed.post(type, data)     child → parent
     embed.on(type, fn)         listen for parent → child messages (e.g. 'settings-changed')
     embed.autoHeight()         keep posting {type:'height', data:{h}} as the content size changes
   In a hub page (parent):
     hubEmbed.broadcast(type, data)   parent → every tool iframe
     hubEmbed.listen(fn)              fn(msg, iframeEl) for every child → parent message */
(function () {
'use strict';

const SRC = 'workflow-hub';
const handlers = {};

const embed = {
  row: new URLSearchParams(location.search).get('row'),
  inFrame: window.parent !== window,
  post(type, data) {
    if (embed.inFrame) window.parent.postMessage({ src: SRC, dir: 'up', type, row: embed.row, data }, location.origin);
  },
  on(type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
  autoHeight() {
    let last = 0;
    const send = () => {
      /* body height, not documentElement.scrollHeight — that never shrinks below the iframe's own height */
      const h = Math.ceil(document.body.getBoundingClientRect().height);
      if (h && h !== last) { last = h; embed.post('height', { h }); }
    };
    new ResizeObserver(send).observe(document.body);
    window.addEventListener('load', send);
    send();
  }
};

const hubEmbed = {
  broadcast(type, data) {
    document.querySelectorAll('iframe').forEach(f => {
      if (f.contentWindow) f.contentWindow.postMessage({ src: SRC, dir: 'down', type, data }, location.origin);
    });
  },
  listen(fn) {
    window.addEventListener('message', e => {
      const m = e.data;
      if (e.origin !== location.origin || !m || m.src !== SRC || m.dir !== 'up') return;
      const frame = [...document.querySelectorAll('iframe')].find(f => f.contentWindow === e.source) || null;
      fn(m, frame);
    });
  }
};

window.addEventListener('message', e => {
  const m = e.data;
  if (e.origin !== location.origin || !m || m.src !== SRC || m.dir !== 'down') return;
  (handlers[m.type] || []).forEach(fn => fn(m.data));
});

window.embed = embed;
window.hubEmbed = hubEmbed;
})();
