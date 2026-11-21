const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../frontend');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

let updated = 0;
for (const file of files) {
  const filePath = path.join(dir, file);
  let html = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  if (!html.includes('agri-theme-lang.css')) {
    if (html.includes('</head>')) {
      html = html.replace('</head>', '    <link rel="stylesheet" href="assets/agri-theme-lang.css">\n</head>');
      changed = true;
    }
  }

  if (!html.includes('agri-theme-lang.js')) {
    if (html.includes('</body>')) {
      html = html.replace('</body>', '    <script src="assets/agri-theme-lang.js"></script>\n</body>');
      changed = true;
    } else if (html.includes('</html>')) {
      html = html.replace('</html>', '    <script src="assets/agri-theme-lang.js"></script>\n</html>');
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, html, 'utf8');
    updated++;
  }
}

console.log(`Processed ${files.length} HTML files. Updated ${updated} files with agri-theme-lang.`);
