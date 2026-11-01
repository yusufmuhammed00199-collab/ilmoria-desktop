/**
 * Draws the app's icons from the Ilmoria app icon (the open book and the sun):
 * the app icon for Windows, macOS and Linux, the tray icons, and the unread
 * badges Windows lays over the taskbar button. Needs Playwright (Chromium)
 * and Python with Pillow for the .ico and .icns files.
 *
 *   node scripts/make-icons.cjs
 */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, '..', 'build');
const TEAL = '#0E9F8E';
const SUN = '#F5A623';
const LEFT_PAGE = 'M0 78 C66 77 125 101 160 154 C127 178 109 210 109 246 L109 390 C78 365 42 357 0 364 Z';
const RIGHT_PAGE = 'M342 78 C276 77 217 101 182 154 C215 178 233 210 233 246 L233 390 C264 365 300 357 342 364 Z';
const BOOK = (fill) => `
  <path fill="${fill}" d="M0 78 C66 77 125 101 160 154 C127 178 109 210 109 246 L109 390 C78 365 42 357 0 364 Z"/>
  <path fill="${fill}" d="M342 78 C276 77 217 101 182 154 C215 178 233 210 233 246 L233 390 C264 365 300 357 342 364 Z"/>`;

/** The full tile (Windows, Linux); at small sizes the book is drawn bolder and larger so it stays clear */
const tile = (size) => {
  const small = size <= 32;
  const bold = size <= 16 ? 30 : small ? 20 : 0;
  const stroke = bold ? ` stroke="#FFFFFF" stroke-width="${bold}" stroke-linejoin="round"` : '';
  const g = small ? 'translate(204 168) scale(1.8)' : 'translate(238.4 200) scale(1.6)';
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="${small ? 200 : 226}" fill="${TEAL}"/>
  <g transform="${g}">
    <path fill="#FFFFFF"${stroke} d="${LEFT_PAGE}"/>
    <path fill="#FFFFFF"${stroke} d="${RIGHT_PAGE}"/>
    <circle fill="${SUN}" cx="171" cy="43" r="${43 + bold / 2}"/>
  </g>
</svg>`;
};

/** macOS: the tile inside Apple's grid (824 of 1024) with a soft shadow */
const macTile = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <defs>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#0F1B33" flood-opacity="0.28"/></filter>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#13B09E"/><stop offset="1" stop-color="#0B8F80"/></linearGradient>
  </defs>
  <rect x="100" y="90" width="824" height="824" rx="185" fill="url(#g)" filter="url(#s)"/>
  <g transform="translate(292 251) scale(1.29)">${BOOK('#FFFFFF')}<circle fill="${SUN}" cx="171" cy="43" r="43"/></g>
</svg>`;

/**
 * Tray (Windows, Linux): the mark on its own, like other apps' tray icons, a little bolder the
 * smaller it is so it stays clear; a red dot when there are unread messages
 */
const TRAY_TEAL = '#12B3A0';
const trayIcon = (size, dot) => {
  const bold = size <= 20 ? 34 : size <= 32 ? 24 : 14;
  const page = (d) => `<path d="${d}" fill="${TRAY_TEAL}" stroke="${TRAY_TEAL}" stroke-width="${bold}" stroke-linejoin="round"/>`;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-30 -18 402 426">
  ${page(LEFT_PAGE)}${page(RIGHT_PAGE)}
  <circle cx="171" cy="43" r="${43 + bold / 2}" fill="${SUN}"/>
  ${dot ? `<circle cx="318" cy="52" r="70" fill="#E5484D" stroke="#FFFFFF" stroke-width="22"/>` : ''}
</svg>`;
};

/** macOS menu bar: a black template image (macOS tints it) */
const trayTemplate = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 342 390">
  <g transform="translate(17 19.5) scale(0.9)">${BOOK('#000000')}<circle fill="#000000" cx="171" cy="43" r="43"/></g>
</svg>`;

/** Windows taskbar overlay: a red disc with the count */
const badge = (size, label) => `
<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
  <div style="width:${size}px;height:${size}px;border-radius:50%;background:#E5484D;box-sizing:border-box;border:${Math.max(1, Math.round(size / 16))}px solid #fff;
    color:#fff;font:800 ${label.length > 1 ? Math.round(size * 0.46) : Math.round(size * 0.62)}px/1 'DejaVu Sans','Segoe UI',Arial,sans-serif;display:flex;align-items:center;justify-content:center;letter-spacing:-0.04em;">${label}</div>
</div>`;

const TRAY_SIZES = [16, 20, 24, 32, 40, 48, 64];

/** A Store tile: the mark in white (with the amber sun), centred, taking `mark` of the height */
const storeTile = (w, h, mark) => {
  const mh = Math.round(h * mark);
  const mw = Math.round((mh * 342) / 390);
  return `
<div style="width:${w}px;height:${h}px;background:${TEAL};display:flex;align-items:center;justify-content:center">
  <svg width="${mw}" height="${mh}" viewBox="0 0 342 390">${BOOK('#FFFFFF')}<circle fill="${SUN}" cx="171" cy="43" r="43"/></svg>
</div>`;
};

/** The installer's welcome and finish pages: a night-blue panel with the emblem and the name */
const installerSidebar = () => `
<div style="position:relative;width:164px;height:314px;overflow:hidden;font-family:'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif;
  background:radial-gradient(90% 55% at 50% 108%, rgba(14,159,142,.65) 0%, rgba(14,159,142,0) 70%), radial-gradient(130% 90% at 50% 0%, #17305a 0%, #0f1b33 60%, #0a1224 100%);">
  <div style="position:absolute;left:50%;top:92px;width:150px;height:150px;margin:-75px 0 0 -75px;border-radius:50%;background:radial-gradient(circle, rgba(245,166,35,.34) 0%, rgba(245,166,35,0) 68%)"></div>
  <div style="position:absolute;left:14px;top:22px;width:22px;height:29px;border-radius:3px;background:linear-gradient(160deg,#fff,#dfe7ee);transform:rotate(-16deg);opacity:.85"></div>
  <div style="position:absolute;right:12px;top:104px;width:18px;height:24px;border-radius:3px;background:linear-gradient(160deg,#fff,#dfe7ee);transform:rotate(14deg);opacity:.55"></div>
  <div style="position:absolute;right:14px;top:30px;width:34px;height:34px;border-radius:50%;border:1.5px solid rgba(19,176,158,.8)"></div>
  <div style="position:absolute;left:22px;top:246px;width:12px;height:12px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#ffe6a8,#f5a623 50%,#9c5a00)"></div>
  <div style="position:absolute;left:128px;top:262px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#8ae8db,#0e9f8e 50%,#06433b)"></div>
  <svg style="position:absolute;left:47px;top:52px;filter:drop-shadow(0 8px 10px rgba(0,0,0,.45))" width="70" height="80" viewBox="0 0 342 390">
    ${BOOK('#FFFFFF')}<circle fill="${SUN}" cx="171" cy="43" r="43"/>
  </svg>
  <div style="position:absolute;left:0;right:0;top:150px;text-align:center;color:#fff;font-weight:800;font-size:25px;letter-spacing:-.02em">Ilmoria</div>
  <div style="position:absolute;left:0;right:0;top:184px;text-align:center;color:rgba(255,255,255,.72);font-size:10.5px;line-height:1.5">
    Your school, on your desk<br><span style="font-size:11px">مدرستك على مكتبك</span>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:16px;text-align:center;color:rgba(255,255,255,.45);font-size:9px;letter-spacing:.02em">Windows · app.ilmoria.com</div>
</div>`;

/** The installer's header strip, on the same night blue as the setup's page headers: the emblem and the name */
const installerHeader = () => `
<div style="position:relative;width:150px;height:57px;background:#0F1B33;font-family:'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding-right:14px;box-sizing:border-box;overflow:hidden">
  <div style="position:absolute;right:-10px;top:-30px;width:90px;height:90px;border-radius:50%;background:radial-gradient(circle, rgba(245,166,35,.22) 0%, rgba(245,166,35,0) 70%)"></div>
  <span style="position:relative;font-weight:800;font-size:17px;color:#ffffff;letter-spacing:-.02em">Ilmoria</span>
  <svg style="position:relative" width="28" height="32" viewBox="0 0 342 390">${BOOK('#FFFFFF')}<circle fill="${SUN}" cx="171" cy="43" r="43"/></svg>
</div>`;

async function main() {
  fs.mkdirSync(path.join(out, 'tray'), { recursive: true });
  fs.mkdirSync(path.join(out, 'badges'), { recursive: true });
  const browser = await chromium.launch();
  const pageFor = async (size) => {
    const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    return p;
  };
  const shootAt = async (html, w, h, scale, file) => {
    const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
    await p.setContent(`<html><body style="margin:0">${html}</body></html>`);
    await p.waitForTimeout(150);
    await p.screenshot({ path: file, clip: { x: 0, y: 0, width: w, height: h } });
    await p.close();
  };
  const shoot = async (html, size, file) => {
    const p = await pageFor(size);
    await p.setContent(`<html><body style="margin:0;background:transparent">${html}</body></html>`);
    await p.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    await p.close();
  };

  await shoot(tile(1024), 1024, path.join(out, 'icon.png'));
  await shoot(macTile(1024), 1024, path.join(out, 'icon-mac.png'));
  for (const s of [16, 24, 32, 48, 64, 128, 256]) await shoot(tile(s), s, path.join(out, `ico-${s}.png`));
  await shoot(trayIcon(16, false), 16, path.join(out, 'tray', 'tray.png'));
  await shoot(trayIcon(32, false), 32, path.join(out, 'tray', 'tray@2x.png'));
  await shoot(trayIcon(16, true), 16, path.join(out, 'tray', 'tray-unread.png'));
  await shoot(trayIcon(32, true), 32, path.join(out, 'tray', 'tray-unread@2x.png'));
  for (const sz of TRAY_SIZES) {
    await shoot(trayIcon(sz, false), sz, path.join(out, 'tray', `t-${sz}.png`));
    await shoot(trayIcon(sz, true), sz, path.join(out, 'tray', `td-${sz}.png`));
  }
  await shoot(trayTemplate(16), 16, path.join(out, 'tray', 'trayTemplate.png'));
  await shoot(trayTemplate(32), 32, path.join(out, 'tray', 'trayTemplate@2x.png'));
  for (const n of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '9plus']) {
    const label = n === '9plus' ? '9+' : n;
    await shoot(badge(16, label), 16, path.join(out, 'badges', `overlay-${n}.png`));
    await shoot(badge(32, label), 32, path.join(out, 'badges', `overlay-${n}@2x.png`));
  }
  // Microsoft Store (MSIX) tiles: the white mark on the brand teal (the package's background colour)
  fs.mkdirSync(path.join(out, 'appx'), { recursive: true });
  for (const [name, w, h, mark] of [
    ['StoreLogo.png', 50, 50, 0.7],
    ['Square44x44Logo.png', 44, 44, 0.74],
    ['SmallTile.png', 71, 71, 0.56],
    ['Square150x150Logo.png', 150, 150, 0.5],
    ['LargeTile.png', 310, 310, 0.46],
    ['Wide310x150Logo.png', 310, 150, 0.56],
  ]) {
    await shootAt(storeTile(w, h, mark), w, h, 1, path.join(out, 'appx', name));
  }

  // The installer's artwork (drawn at twice the size, then made smaller for clean edges)
  await shootAt(installerSidebar(), 164, 314, 2, path.join(out, 'sidebar-2x.png'));
  await shootAt(installerHeader(), 150, 57, 2, path.join(out, 'header-2x.png'));
  await browser.close();

  // .ico (Windows) from the drawn sizes, .icns (macOS) from the Apple-grid tile
  execFileSync('python3', [
    '-c',
    `
from PIL import Image
import os
d = ${JSON.stringify(out)}
sizes = [16, 24, 32, 48, 64, 128, 256]
imgs = [Image.open(os.path.join(d, f"ico-{s}.png")).convert("RGBA") for s in sizes]
imgs[-1].save(os.path.join(d, "icon.ico"), sizes=[(s, s) for s in sizes], append_images=imgs[:-1])
Image.open(os.path.join(d, "icon-mac.png")).convert("RGBA").save(os.path.join(d, "icon.icns"))
for s in sizes: os.remove(os.path.join(d, f"ico-{s}.png"))
t = os.path.join(d, "tray")
tray_sizes = ${JSON.stringify(TRAY_SIZES)}
for prefix, name in (("t", "tray.ico"), ("td", "tray-unread.ico")):
    imgs = [Image.open(os.path.join(t, f"{prefix}-{s}.png")).convert("RGBA") for s in tray_sizes]
    imgs[-1].save(os.path.join(t, name), sizes=[(s, s) for s in tray_sizes], append_images=imgs[:-1])
    for s in tray_sizes: os.remove(os.path.join(t, f"{prefix}-{s}.png"))
# Installer bitmaps: 24-bit BMP at the sizes the installer shows them
for src, dst, size in (("sidebar-2x.png", "installerSidebar.bmp", (164, 314)), ("header-2x.png", "installerHeader.bmp", (150, 57))):
    im = Image.open(os.path.join(d, src)).convert("RGB").resize(size, Image.LANCZOS)
    im.save(os.path.join(d, dst), "BMP")
    os.remove(os.path.join(d, src))
`,
  ]);
  console.log('icons written to', out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
