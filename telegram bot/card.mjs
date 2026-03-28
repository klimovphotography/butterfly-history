/**
 * card.mjs — генерирует PNG-карточку сценария (1080×1080).
 * Использует @resvg/resvg-js из node_modules родительского проекта.
 */

import { Resvg } from '@resvg/resvg-js';

// ─── Constants ───────────────────────────────────────────────────────────────

const W = 1080;
const H = 1080;
const PAD = 64;
const CONTENT_W = W - PAD * 2; // 952px

// Use single quotes inside SVG attribute values — double quotes break XML parsing
const FONTS = "Helvetica Neue, Liberation Sans, Arial, sans-serif";
const MONO_FONTS = "Courier New, Liberation Mono, monospace";

const MODE_STYLES = {
  realism:    { badge: 'rgba(124,225,217,0.15)', badgeText: '#7ce1d9', border: 'rgba(124,225,217,0.45)', glow: 'rgba(124,225,217,0.18)' },
  dark:       { badge: 'rgba(200,60,60,0.18)',   badgeText: '#f08080', border: 'rgba(200,60,60,0.45)',   glow: 'rgba(200,60,60,0.12)' },
  prosperity: { badge: 'rgba(70,190,110,0.18)',  badgeText: '#7de898', border: 'rgba(70,190,110,0.45)', glow: 'rgba(70,190,110,0.12)' },
  madness:    { badge: 'rgba(150,70,220,0.18)',  badgeText: '#c48ef0', border: 'rgba(150,70,220,0.45)', glow: 'rgba(150,70,220,0.12)' },
  humor:      { badge: 'rgba(230,190,40,0.18)',  badgeText: '#f0d840', border: 'rgba(230,190,40,0.45)', glow: 'rgba(230,190,40,0.12)' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Splits text into lines with maxCharsPerLine width and maxLines limit.
 * Adds "…" to last line if text was truncated.
 */
function wrapLines(text, maxChars, maxLines) {
  const words = String(text ?? '').replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let cur = '';

  for (const word of words) {
    if (lines.length >= maxLines) break;
    const attempt = cur ? `${cur} ${word}` : word;
    if (attempt.length <= maxChars) {
      cur = attempt;
    } else {
      if (cur) lines.push(cur);
      if (lines.length >= maxLines) break;
      cur = word.length > maxChars ? `${word.slice(0, maxChars - 1)}…` : word;
    }
  }

  if (cur && lines.length < maxLines) lines.push(cur);

  // If truncated, add ellipsis to last line
  const fullRendered = lines.join(' ');
  const fullOriginal = words.join(' ');
  if (fullRendered.length < fullOriginal.length && lines.length > 0) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = last.length > 3 ? `${last.slice(0, -1)}…` : last;
  }

  return lines;
}

/**
 * Renders an array of strings as SVG <text> elements, each on its own line.
 */
function renderTextLines(lines, x, baselineY, lineHeight, fontSize, fill, weight) {
  return lines
    .map((line, i) =>
      `<text x="${x}" y="${baselineY + i * lineHeight}" ` +
      `font-family="${FONTS}" font-size="${fontSize}" ` +
      `font-weight="${weight}" fill="${fill}">${esc(line)}</text>`
    )
    .join('\n  ');
}

// ─── SVG builder ─────────────────────────────────────────────────────────────

/**
 * Builds the card SVG string.
 *
 * @param {object} opts
 * @param {string} opts.title      — question text
 * @param {string} opts.subtitle   — hook line from shareCard
 * @param {string} opts.narrative  — full narrative text
 * @param {string} opts.modeId
 * @param {string} opts.modeLabel
 */
export function buildCardSvg({ title, subtitle, narrative, modeId = 'realism', modeLabel = 'Реализм' }) {
  const style = MODE_STYLES[modeId] || MODE_STYLES.realism;

  // ── Title ──────────────────────────────────────────────────────────────────
  // Russian Cyrillic is ~1.3× wider than Latin at same px; use ~22 chars/line for 48px
  const titleFontSize = title.length > 40 ? 40 : title.length > 28 ? 44 : 48;
  const titleMaxChars = titleFontSize === 48 ? 24 : titleFontSize === 44 ? 26 : 30;
  const titleLineH = Math.round(titleFontSize * 1.22);
  const titleLines = wrapLines(title, titleMaxChars, 3);
  const titleBlockH = titleLines.length * titleLineH;

  // ── Subtitle ───────────────────────────────────────────────────────────────
  const subtitleFontSize = 25;
  const subtitleLineH = 34;
  const subtitleLines = wrapLines(subtitle, 54, 2);
  const subtitleBlockH = subtitleLines.length * subtitleLineH;

  // ── Layout Y coordinates ───────────────────────────────────────────────────
  const eyebrowY   = 84;           // baseline of "АЛЬТЕРНАТИВНАЯ ИСТОРИЯ"
  const titleY     = 130;          // baseline of first title line
  const subtitleY  = titleY + titleBlockH + 22;
  const sepY       = subtitleY + subtitleBlockH + 26;
  const boxY       = sepY + 20;
  const boxH       = H - boxY - 76; // leave space for footer

  // ── Narrative ──────────────────────────────────────────────────────────────
  const narrativeFontSize = 23;
  const narrativeLineH    = 33;
  const boxInnerPad       = 22;
  const narrativeMaxLines = Math.floor((boxH - boxInnerPad * 2) / narrativeLineH);
  const narrativeMaxChars = 56; // chars per line at 23px

  const narrativeLines = wrapLines(
    String(narrative ?? '').slice(0, 1400), // cap input length
    narrativeMaxChars,
    narrativeMaxLines
  );

  // ── Mode badge (top-right) ─────────────────────────────────────────────────
  const badgeText   = modeLabel;
  const badgeCharW  = 13; // rough px per char at 18px font
  const badgeW      = badgeText.length * badgeCharW + 28;
  const badgeH      = 36;
  const badgeX      = W - PAD - badgeW;
  const badgeY      = 56;
  const badgeTextY  = badgeY + 24;

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footerCenterY = H - 30;
  const footerTagW    = 310;
  const footerTagH    = 46;
  const footerTagX    = (W - footerTagW) / 2;
  const footerTagY    = footerCenterY - footerTagH + 8;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#071111"/>
      <stop offset="52%"  stop-color="#0d1b1b"/>
      <stop offset="100%" stop-color="#131313"/>
    </linearGradient>
    <radialGradient id="glow1" cx="0.78" cy="0.14" r="0.72">
      <stop offset="0%"   stop-color="${style.glow}"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.18" cy="0.85" r="0.55">
      <stop offset="0%"   stop-color="${style.glow}"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.035)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Background layers -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow1)"/>
  <rect width="${W}" height="${H}" fill="url(#glow2)"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>

  <!-- Outer border -->
  <rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="28"
        fill="none" stroke="${style.border}" stroke-width="1.5"/>

  <!-- ── Eyebrow ── -->
  <text x="${PAD}" y="${eyebrowY}"
        font-family="${FONTS}" font-size="20" font-weight="700"
        fill="#7ce1d9" letter-spacing="3">АЛЬТЕРНАТИВНАЯ ИСТОРИЯ</text>

  <!-- ── Mode badge ── -->
  <rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="18"
        fill="${style.badge}" stroke="${style.border}" stroke-width="1.5"/>
  <text x="${badgeX + badgeW / 2}" y="${badgeTextY}" text-anchor="middle"
        font-family="${FONTS}" font-size="17" font-weight="700"
        fill="${style.badgeText}">${esc(modeLabel)}</text>

  <!-- ── Title ── -->
  ${renderTextLines(titleLines, PAD, titleY, titleLineH, titleFontSize, '#f7f7f7', '700')}

  <!-- ── Subtitle ── -->
  ${renderTextLines(subtitleLines, PAD, subtitleY, subtitleLineH, subtitleFontSize, 'rgba(255,255,255,0.68)', '400')}

  <!-- ── Separator ── -->
  <line x1="${PAD}" y1="${sepY}" x2="${W - PAD}" y2="${sepY}"
        stroke="rgba(124,225,217,0.22)" stroke-width="1.5"/>

  <!-- ── Story box ── -->
  <rect x="${PAD}" y="${boxY}" width="${CONTENT_W}" height="${boxH}" rx="18"
        fill="rgba(6,6,6,0.60)" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>

  <!-- ── Narrative text ── -->
  ${renderTextLines(narrativeLines, PAD + boxInnerPad, boxY + boxInnerPad + narrativeFontSize, narrativeLineH, narrativeFontSize, 'rgba(255,255,255,0.88)', '400')}

  <!-- ── Footer tag ── -->
  <rect x="${footerTagX}" y="${footerTagY}" width="${footerTagW}" height="${footerTagH}" rx="23"
        fill="#7ce1d9"/>
  <text x="${W / 2}" y="${footerTagY + 30}" text-anchor="middle"
        font-family="${FONTS}" font-size="21" font-weight="800"
        fill="#061413">butterfly-history.ru</text>
</svg>`;
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Generates a 1080×1080 PNG card and returns it as a Buffer.
 */
export async function generateCardPng(opts) {
  const svg = buildCardSvg(opts);

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
    font: { loadSystemFonts: true },
  });

  const rendered = resvg.render();
  return Buffer.from(rendered.asPng());
}
