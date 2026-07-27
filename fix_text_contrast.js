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
    } else if (filePath.endsWith(ext)) {
      results.push(filePath);
    }
  });
  return results;
};

const jsxFiles = getFiles(srcDir, '.jsx');

// Fix pattern: wherever bg-slate-900 and text-slate-900 appear together in the same className string,
// replace text-slate-900 with text-white.
// We do this with a regex that matches the combined pattern inside className strings.

jsxFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Match any className string segment containing bg-slate-900 AND text-slate-900
  // Replace text-slate-900 with text-white only within those segments
  // Strategy: use a line-by-line approach for safety
  const lines = content.split('\n');
  const fixed = lines.map(line => {
    // If a line has bg-slate-900 and text-slate-900 together, fix text-slate-900 -> text-white
    if (line.includes('bg-slate-900') && line.includes('text-slate-900') && !line.includes('bg-slate-900/')) {
      return line.replace(/text-slate-900/g, 'text-white');
    }
    // Handle the specific toggle/active-tab pattern: bg-slate-900 text-slate-900 shadow
    // (even spread across ternary strings in the same line)
    return line;
  });
  
  content = fixed.join('\n');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed: ' + path.relative(srcDir, filePath));
  }
});

console.log('Done.');
