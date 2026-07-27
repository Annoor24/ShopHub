const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

const getFiles = (dir, ext) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath, ext));
    } else {
      if (filePath.endsWith(ext)) {
        results.push(filePath);
      }
    }
  });
  return results;
};

const jsxFiles = getFiles(srcDir, '.jsx');
const cssFiles = getFiles(srcDir, '.css');

const files = [...jsxFiles, ...cssFiles];

const replacements = [
  // Backgrounds
  { regex: /bg-slate-950/g, replacement: 'bg-slate-50' },
  { regex: /bg-slate-900/g, replacement: 'bg-white' },
  { regex: /bg-slate-800/g, replacement: 'bg-white' },
  { regex: /hover:bg-slate-800/g, replacement: 'hover:bg-slate-50' },
  { regex: /hover:bg-slate-700/g, replacement: 'hover:bg-slate-100' },
  // Text Colors
  { regex: /text-white/g, replacement: 'text-slate-900' },
  { regex: /text-slate-200/g, replacement: 'text-slate-800' },
  { regex: /text-slate-300/g, replacement: 'text-slate-700' },
  { regex: /text-slate-400/g, replacement: 'text-slate-500' },
  { regex: /text-slate-500/g, replacement: 'text-slate-400' },
  // Borders
  { regex: /border-slate-800/g, replacement: 'border-slate-200' },
  { regex: /border-slate-700/g, replacement: 'border-slate-200' },
  // Input specific tweaks
  { regex: /placeholder:text-slate-600/g, replacement: 'placeholder:text-slate-400' },
  // Shadows
  { regex: /shadow-\[0_0_10px_#fff\]/g, replacement: 'shadow-[0_0_10px_#000]' },
  
  // Primary Buttons & Accents (Changing Blue to Deep Black)
  { regex: /bg-blue-600/g, replacement: 'bg-slate-900' },
  { regex: /hover:bg-blue-500/g, replacement: 'hover:bg-slate-800' },
  { regex: /text-blue-400/g, replacement: 'text-slate-900' },
  { regex: /text-blue-500/g, replacement: 'text-slate-900' },
  { regex: /text-blue-600/g, replacement: 'text-slate-900' },
  { regex: /border-blue-500/g, replacement: 'border-slate-800' },
  { regex: /border-blue-600/g, replacement: 'border-slate-900' },
  { regex: /focus:border-blue-600/g, replacement: 'focus:border-slate-900' },
  { regex: /focus:ring-blue-600\/50/g, replacement: 'focus:ring-slate-900/20' },
  { regex: /focus:ring-blue-600/g, replacement: 'focus:ring-slate-900' },
  { regex: /shadow-blue-900\/20/g, replacement: 'shadow-slate-900/20' },
  { regex: /shadow-blue-900\/30/g, replacement: 'shadow-slate-900/10' },

  // index.css specific replacements for background
  { regex: /background-color: #020617;/g, replacement: 'background-color: #f8fafc;' },
  { regex: /rgba\(2, 6, 23, 0\.3\)/g, replacement: 'rgba(248, 250, 252, 0.8)' },
  { regex: /color: #ffffff;/g, replacement: 'color: #0f172a;' },
];

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  replacements.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement);
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${path.relative(srcDir, filePath)}`);
  }
});
