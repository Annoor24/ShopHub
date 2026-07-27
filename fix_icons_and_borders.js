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

// Specific replacements for the issues raised
const specificFixes = {
  // Fix the mail icon in StaffManagement.jsx
  'StaffManagement.jsx': (content) => {
    return content.replace(
      /<MailPlus size=\{40\} className="text-slate-900" \/>/g,
      '<MailPlus size={40} className="text-white" />'
    );
  },
  // Fix the StatCard icon boxes in DashboardStats.jsx
  'DashboardStats.jsx': (content) => {
    return content.replace(
      /<div className="p-3 bg-white rounded-xl">/g,
      '<div className="p-3 bg-slate-100 border border-slate-200 shadow-sm rounded-xl">'
    );
  }
};

let totalChanges = 0;

jsxFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Apply file-specific fixes
  const fileName = path.basename(filePath);
  if (specificFixes[fileName]) {
    content = specificFixes[fileName](content);
  }

  // 1. Fix all date inputs so their calendar picker icons are forced into light mode
  // This ensures the browser draws a black/dark-grey calendar icon instead of a white one
  if (content.includes('type="date"')) {
    content = content.replace(
      /type="date"\s*([\s\S]*?)className="([^"]+)"/g,
      (match, p1, p2) => {
        if (!p2.includes('[color-scheme:light]')) {
          return `type="date" ${p1}className="${p2} [color-scheme:light]"`;
        }
        return match;
      }
    );
  }

  // 2. Increase the visibility of ALL borders across the entire app
  // Convert border-slate-200 -> border-slate-300
  // Convert border-slate-100 -> border-slate-300
  content = content.replace(/border-slate-200/g, 'border-slate-300');
  content = content.replace(/border-slate-100/g, 'border-slate-300');
  
  // Also darken shadows slightly to match the stronger borders
  content = content.replace(/shadow-sm/g, 'shadow');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed: ' + path.relative(srcDir, filePath));
    totalChanges++;
  }
});

console.log(`\nDone. ${totalChanges} files updated.`);
