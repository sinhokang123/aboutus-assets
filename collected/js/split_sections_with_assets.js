/*
 Node.js script to split static HTML files by <section> into separate folders,
 and copy each section's referenced assets (CSS, JS, images) into its folder.

 Dependencies:
   npm install cheerio fs-extra globby

 Usage:
   node split_sections_with_assets.js /path/to/site/root
*/

import fs from 'fs-extra';
import path from 'path';
import globby from 'globby';
import cheerio from 'cheerio';

async function splitSectionsWithAssets(rootDir) {
  const htmlFiles = await globby([`\${rootDir}/**/*.html`]);
  for (const file of htmlFiles) {
    const html = await fs.readFile(file, 'utf8');
    const \$ = cheerio.load(html);
    \$('section').each(async (i, sec) => {
      const section = \$(sec);
      const secId = section.attr('id') || \`section-\${i+1}\`;
      const relPath = path.relative(rootDir, file).replace(/\\.html$/i, '');
      const outDir = path.join(rootDir, relPath, secId);
      await fs.ensureDir(outDir);
      await fs.writeFile(path.join(outDir, \`\${secId}.html\`),
                        \`<html><head></head><body>\${section.html()}</body></html>\`,
                        'utf8');
      const assetUrls = new Set();
      section.find('[src], link[rel="stylesheet"]').each((_, el) => {
        const attr = el.tagName === 'link' ? 'href' : 'src';
        const url = \$(el).attr(attr);
        if (url && !url.startsWith('http')) assetUrls.add(url);
      });
      for (const assetUrl of assetUrls) {
        const assetPath = path.join(path.dirname(file), assetUrl);
        const destPath  = path.join(outDir, assetUrl);
        await fs.ensureDir(path.dirname(destPath));
        try { await fs.copy(assetPath, destPath); }
        catch { console.warn('Not found:', assetPath); }
      }
    });
  }
  console.log('Done!');
}
const root = process.argv[2];
if (!root) { console.error('Usage: node split_sections_with_assets.js /path/to/site'); process.exit(1); }
splitSectionsWithAssets(root).catch(console.error);
