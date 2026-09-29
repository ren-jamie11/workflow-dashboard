/* Workflow Hub — square image positions, shared by the hub (row thumbs, image viewer) and Step 2 (货号 / 色号 images).
   A crop is the square frame as a window onto the full image: {x, y} its top-left as fractions of the image's
   width / height, s its side as a fraction of the short edge. s < 1 zooms in; s up to long / short edge zooms out
   until the whole image fits (white padding), so nothing is ever lost — the full image is never changed. */
(function () {
'use strict';

const CROP_MIN = 0.1;                                   // 10× zoom

/* the largest centred square */
function centerCrop(w, h){
  const m = Math.min(w, h);
  return { x: (w - m) / 2 / w, y: (h - m) / 2 / h, s: 1 };
}
function clampCrop(c, W, H){
  const d = centerCrop(W, H);
  ['x', 'y', 's'].forEach(k => { if (!Number.isFinite(c[k])) c[k] = d[k]; });   // repair a missing / broken value
  const m = Math.min(W, H);
  c.s = Math.min(Math.max(W, H) / m, Math.max(CROP_MIN, c.s));
  const side = c.s * m;
  /* frame inside the image when the image is bigger; image inside the frame when it's smaller */
  const fit = (v, len) => Math.min(Math.max(0, len - side), Math.max(Math.min(0, len - side), v));
  c.x = fit(c.x * W, W) / W;
  c.y = fit(c.y * H, H) / H;
  return c;
}
/* a copy of c (or the centred square when there is none), clamped to a W×H image */
const cropOf = (c, W, H) => clampCrop(Object.assign({}, c || centerCrop(W, H)), W, H);
/* drag by (dx, dy) frame widths: the image follows the pointer */
function panCrop(c, W, H, dx, dy){
  const side = c.s * Math.min(W, H);
  c.x -= dx * side / W;
  c.y -= dy * side / H;
  return clampCrop(c, W, H);
}
/* zoom by k (> 1 = in) keeping the image point under (fx, fy) — frame fractions — still */
function zoomCrop(c, W, H, k, fx, fy){
  const m = Math.min(W, H), side = c.s * m;
  const px = c.x * W + fx * side, py = c.y * H + fy * side;
  c.s /= k;
  clampCrop(c, W, H);
  c.x = (px - fx * c.s * m) / W;
  c.y = (py - fy * c.s * m) / H;
  return clampCrop(c, W, H);
}
const wheelFactor = e => Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.013 : 0.0004));   // ≈ 4% per wheel notch
/* place the full image (f = {main:{url}, W, H}) inside a square frame of `size` px */
function layoutFrame(im, size, f, c){
  if (im.getAttribute('src') !== f.main.url) im.src = f.main.url;
  const k = size / (c.s * Math.min(f.W, f.H)), s = im.style;
  s.position = 'absolute'; s.maxWidth = 'none'; s.objectFit = 'fill';
  s.width = f.W * k + 'px'; s.height = f.H * k + 'px';
  s.left = -c.x * f.W * k + 'px'; s.top = -c.y * f.H * k + 'px';
}
/* the square c of a decoded image as a size×size JPEG data URL; white where the image doesn't reach */
function renderSquare(img, c, size, quality){
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
  const k = size / (c.s * Math.min(W, H));             // frame → canvas
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#fff'; cx.fillRect(0, 0, size, size);
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(img, -c.x * W * k, -c.y * H * k, W * k, H * k);
  return cv.toDataURL('image/jpeg', quality || 0.8);
}

window.CROP = { centerCrop, clampCrop, cropOf, panCrop, zoomCrop, wheelFactor, layoutFrame, renderSquare };
})();
