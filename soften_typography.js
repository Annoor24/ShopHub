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

let totalChanges = 0;

jsxFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Step 1: Reduce font-bold to font-medium (so it's legible but not overly thick)
  // We do this first so we don't accidentally catch the new font-bolds we are about to create
  content = content.replace(/font-bold/g, 'font-medium');
  
  // Step 2: Reduce font-black to font-bold (keeps headers punchy but much cleaner)
  content = content.replace(/font-black/g, 'font-bold');

  // Step 3: Some extremely small text (like uppercase tracking tags) might be better as semibold
  // so let's adjust specific combinations if necessary.
  content = content.replace(/text-\[10px\] font-medium uppercase/g, 'text-[10px] font-semibold uppercase');
  content = content.replace(/text-xs font-medium uppercase/g, 'text-xs font-semibold uppercase');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Softened typography in: ' + path.relative(srcDir, filePath));
    totalChanges++;
  }
});

console.log(`\nDone. Typography softened across ${totalChanges} files.`);
