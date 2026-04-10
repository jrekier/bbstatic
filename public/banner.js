'use strict';

// banner.js
// Assembles horizontal scroll banners from Banner.png sprite pieces.
// Follows the same pattern as sprites.js: uses window.STATIC_BASE for the
// asset URL so it works regardless of which domain is serving the app.
//
// Piece coordinates measured with atlas.html:
//
//   topLeft       { x:   4, y:   0, w:  60, h: 64 }
//   topCenterLeft { x: 256, y:   0, w:  64, h: 64 }
//   topCenterRight{ x: 384, y:   0, w:  64, h: 64 }
//   topRight      { x: 640, y:   0, w:  44, h: 64 }
//   midLeft       { x:   4, y: 128, w:  60, h: 64 }
//   midFill       { x: 320, y: 128, w:  64, h: 64 }
//   midRight      { x: 640, y: 128, w:  44, h: 64 }
//   botLeft       { x:   4, y: 255, w: 188, h: 92 }  ← left scroll cap
//   botCenterLeft { x: 256, y: 256, w:  64, h: 64 }  ← fill tile A
//   botCenterRight{ x: 384, y: 256, w:  64, h: 64 }  ← fill tile B
//   botRight      { x: 512, y: 256, w: 172, h: 98 }  ← right scroll cap
//
// drawBanner uses the bottom row (the rolled-scroll banner):
//   caps are bottom-aligned to a canvas of height = max(botLeft.h, botRight.h) = 98
//   fill tiles alternate A/B and are bottom-aligned within the same canvas

const ATLAS = {
    topLeft:        { x:   4, y:   0, w:  60, h: 64 },
    topCenterLeft:  { x: 256, y:   0, w:  64, h: 64 },
    topCenterRight: { x: 384, y:   0, w:  64, h: 64 },
    topRight:       { x: 640, y:   0, w:  44, h: 64 },
    midLeft:        { x:   4, y: 128, w:  60, h: 64 },
    midFill:        { x: 320, y: 128, w:  64, h: 64 },
    midRight:       { x: 640, y: 128, w:  44, h: 64 },
    botLeft:        { x:   4, y: 255, w: 188, h: 92 },
    botCenterLeft:  { x: 256, y: 256, w:  64, h: 64 },
    botCenterRight: { x: 384, y: 256, w:  64, h: 64 },
    botRight:       { x: 512, y: 256, w: 172, h: 98 },
};

const TOP_H    = ATLAS.topLeft.h - 1;                         // 63 (overlap 1px to close seam)
const BANNER_H = TOP_H + Math.max(ATLAS.botLeft.h, ATLAS.botRight.h); // 161

// ── Sheet loader ──────────────────────────────────────────────────────
// Caches the loaded Image so it is only fetched once per page.

let _sheet   = null;
const _queue = [];

function _loadSheet(cb) {
    if (_sheet && _sheet.complete) { cb(_sheet); return; }
    _queue.push(cb);
    if (_sheet) return;                        // already loading — just enqueue
    const base = (typeof window !== 'undefined' && window.STATIC_BASE) || '';
    const img  = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        _sheet = img;
        _queue.splice(0).forEach(fn => fn(img));
    };
    img.src = `${base}/assets/banner/Banner.png`;
    _sheet  = img;                             // mark as loading
}

// ── drawBanner ────────────────────────────────────────────────────────
// Draws a scroll banner onto an existing <canvas> element.
//
// canvas  — the target HTMLCanvasElement; its pixel dimensions are set here
// options — {
//     width:    total banner width in px  (default: canvas.parentElement.clientWidth or 600)
//     title:    text centred on the banner (default: '')
//     fontSize: px (default: 64)
//     color:    CSS color string (default: '#2a1a0a')
// }

function drawBanner(canvas, options) {
    const opts     = options || {};
    const title    = opts.title    || '';
    const fontSize = opts.fontSize || 96;
    const color    = opts.color    || '#2a1a0a';

    canvas.style.display = 'block';
    const width = opts.width || Math.round(canvas.getBoundingClientRect().width) || 600;
    canvas.width  = width;
    canvas.height = BANNER_H;

    _loadSheet(function (img) {
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, width, BANNER_H);

        const { topLeft, topCenterLeft, topCenterRight, topRight,
                botLeft, botCenterLeft, botCenterRight, botRight } = ATLAS;

        // ── Top edge row (y = 0) ──────────────────────────────────
        const topTiles = [topCenterLeft, topCenterRight];
        ctx.drawImage(img, topLeft.x, topLeft.y, topLeft.w, topLeft.h,
                           0, 0, topLeft.w, topLeft.h);
        let ti = 0;
        for (let x = topLeft.w; x < width - topRight.w; ) {
            const tile  = topTiles[ti % 2];
            const drawW = Math.min(tile.w, width - topRight.w - x);
            ctx.drawImage(img, tile.x, tile.y, drawW, tile.h,
                               x, 0, drawW, tile.h);
            x += tile.w; ti++;
        }
        ctx.drawImage(img, topRight.x, topRight.y, topRight.w, topRight.h,
                           width - topRight.w, 0, topRight.w, topRight.h);

        // ── Bottom row with scroll caps (y = TOP_H) ───────────────
        const botTiles  = [botCenterLeft, botCenterRight];
        const fillStart = botLeft.w;
        const fillEnd   = width - botRight.w;

        ctx.drawImage(img, botLeft.x, botLeft.y, botLeft.w, botLeft.h,
                           0, TOP_H, botLeft.w, botLeft.h);
        let bi = 0;
        for (let x = fillStart; x < fillEnd; ) {
            const tile  = botTiles[bi % 2];
            const drawW = Math.min(tile.w, fillEnd - x);
            ctx.drawImage(img, tile.x, tile.y, drawW, tile.h,
                               x, TOP_H, drawW, tile.h);
            x += tile.w; bi++;
        }
        ctx.drawImage(img, botRight.x, botRight.y, botRight.w, botRight.h,
                           fillEnd, TOP_H, botRight.w, botRight.h);

        // ── Title text centred in the parchment body ──────────────
        if (title) {
            const fillW = fillEnd - fillStart;

            // Floor: 40% of banner height (readable on any screen)
            // Grows with fill width on wide screens, capped at fontSize
            const drawSize = Math.min(fontSize, Math.max(
                Math.round(BANNER_H * 0.40),   // floor ~64px
                Math.round(fillW   * 0.22),    // scales up on wide screens
            ));

            ctx.font         = `${drawSize}px 'Bebas Neue', sans-serif`;
            ctx.fillStyle    = color;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor  = 'rgba(0,0,0,0.18)';
            ctx.shadowBlur   = 3;
            ctx.fillText(title, width / 2, BANNER_H / 2);
            ctx.shadowBlur   = 0;
        }
    });
}

// ── createBanner ──────────────────────────────────────────────────────
// Convenience: creates a <canvas>, draws the banner, and returns the element.
//
//   const el = createBanner({ title: 'Blood Bowl', width: 800 });
//   document.querySelector('header').prepend(el);

// createBanner(options) → <canvas>
// Insert the returned element into the DOM first, then drawing happens
// automatically on the next animation frame once layout is known.
// Pass { width } explicitly to skip the layout read.
function createBanner(options) {
    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width   = '100%';
    // Wait for fonts + layout before drawing so text renders correctly
    document.fonts.ready.then(() => requestAnimationFrame(() => drawBanner(canvas, options)));
    return canvas;
}
