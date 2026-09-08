const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve('Images');
const MAX_WIDTH = Number(process.env.MAX_WIDTH || 2400);
const QUALITY = Number(process.env.WEBP_QUALITY || 84);
const MIN_SAVINGS = Number(process.env.MIN_SAVINGS || 0.03);

const raster = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff']);
const skipDirs = new Set(['node_modules', '.git']);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) result.push(...walk(path.join(dir, entry.name)));
    } else result.push(path.join(dir, entry.name));
  }
  return result;
}

async function optimize(file) {
  const ext = path.extname(file).toLowerCase();
  if (!raster.has(ext)) return null;

  const output = file.slice(0, -ext.length) + '.webp';
  const temp = output + '.tmp';
  const before = fs.statSync(file).size;

  const image = sharp(file, { failOn: 'none' });
  const meta = await image.metadata();

  await image
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 5 })
    .toFile(temp);

  const after = fs.statSync(temp).size;
  const savings = 1 - after / before;

  if (after >= before * (1 - MIN_SAVINGS)) {
    fs.unlinkSync(temp);
    return { file, skipped: true, before, after: before, width: meta.width || 0, height: meta.height || 0 };
  }

  fs.renameSync(temp, output);
  fs.unlinkSync(file);

  return { file, output, skipped: false, before, after, width: meta.width || 0, height: meta.height || 0, savings };
}

(async () => {
  if (!fs.existsSync(ROOT)) throw new Error('Images directory not found');

  const files = walk(ROOT);
  const candidates = files.filter(f => raster.has(path.extname(f).toLowerCase()));
  const results = [];

  for (const file of candidates) {
    try {
      const result = await optimize(file);
      if (result) results.push(result);
      const rel = path.relative(process.cwd(), file);
      console.log(result?.skipped ? `SKIP  ${rel}` : `WEBP  ${rel}`);
    } catch (error) {
      console.error(`ERROR ${path.relative(process.cwd(), file)}: ${error.message}`);
      process.exitCode = 1;
    }
  }

  const converted = results.filter(r => r && !r.skipped);
  const before = converted.reduce((n, r) => n + r.before, 0);
  const after = converted.reduce((n, r) => n + r.after, 0);

  const report = {
    version: 1,
    generated: new Date().toISOString(),
    source: 'Images',
    format: 'WebP',
    settings: { maxWidth: MAX_WIDTH, quality: QUALITY, minSavings: MIN_SAVINGS },
    scanned: candidates.length,
    converted: converted.length,
    skipped: results.filter(r => r?.skipped).length,
    bytesBefore: before,
    bytesAfter: after,
    savingsPercent: before ? Number(((1 - after / before) * 100).toFixed(2)) : 0
  };

  fs.writeFileSync('image-optimization-report.json', JSON.stringify(report, null, 2) + '\n');
  console.log(`Converted: ${report.converted}; saved: ${report.savingsPercent}%`);
})();
