const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

const getFiles = (dir, ext) => {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      results = results.concat(getFiles(filePath, ext));
    } else if (filePath.endsWith(ext)) {
      results.push(filePath);
    }
  });
  return results;
};

const jsxFiles = getFiles(srcDir, '.jsx');

// Each replacement: { from (string or regex), to }
// Order matters — more specific first
const replacements = [
  // ── 1. TRANSPARENT CARD BACKGROUNDS ──────────────────────────────────────
  // These are invisible on white background. Convert to solid white.
  { from: /bg-white\/90/g,        to: 'bg-white' },
  { from: /bg-white\/80/g,        to: 'bg-white' },
  { from: /bg-white\/70/g,        to: 'bg-white' },
  { from: /bg-white\/60/g,        to: 'bg-white' },
  { from: /bg-white\/50/g,        to: 'bg-slate-50' },
  { from: /bg-white\/40/g,        to: 'bg-white' },
  { from: /bg-white\/30/g,        to: 'bg-white' },
  { from: /bg-white\/20/g,        to: 'bg-white' },
  { from: /bg-white\/10/g,        to: 'bg-slate-50' },
  { from: /bg-slate-50\/60/g,     to: 'bg-slate-50' },
  { from: /bg-slate-50\/40/g,     to: 'bg-slate-50' },
  { from: /bg-slate-50\/20/g,     to: 'bg-slate-50' },

  // ── 2. FADED BORDERS ─────────────────────────────────────────────────────
  // Semi-transparent borders are invisible on white backgrounds.
  { from: /border-slate-200\/50/g, to: 'border-slate-200' },
  { from: /border-slate-200\/30/g, to: 'border-slate-200' },
  { from: /border-slate-300\/50/g, to: 'border-slate-200' },
  { from: /border-white\/10/g,    to: 'border-slate-200' },
  { from: /border-white\/20/g,    to: 'border-slate-200' },

  // ── 3. INVISIBLE TEXT COLORS ─────────────────────────────────────────────
  // text-slate-100 and text-blue-100 are near-white — invisible on white bg.
  { from: /text-slate-100/g,      to: 'text-slate-500' },
  { from: /text-blue-100/g,       to: 'text-slate-700' },
  
  // ── 4. HOVER:TEXT-WHITE ON LIGHT BACKGROUNDS ─────────────────────────────
  // In tab switchers and nav, hovering turns text white — invisible on white bg.
  { from: /hover:text-white/g,    to: 'hover:text-slate-900' },
  { from: /hover:bg-white\/40/g,  to: 'hover:bg-slate-100' },

  // ── 5. DARK-MODE SCROLLBAR THUMB ─────────────────────────────────────────
  { from: /scrollbar-thumb-slate-700/g, to: 'scrollbar-thumb-slate-300' },

  // ── 6. CORRECT HOVER TEXT on "View All" and similar links ─────────────────
  { from: /hover:text-blue-300/g, to: 'hover:text-blue-600' },
];

let totalChanges = 0;

jsxFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  replacements.forEach(({ from, to }) => {
    content = content.replace(from, to);
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    const rel = path.relative(srcDir, filePath);
    console.log('Fixed: ' + rel);
    totalChanges++;
  }
});

console.log(`\nDone. ${totalChanges} files updated.`);
