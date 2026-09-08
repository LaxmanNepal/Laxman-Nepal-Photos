const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve('Images');
const MAX_WIDTH = Number(process.env.MAX_WIDTH || 2400);
const QUALITY = Number(process.env.WEBP_QUALITY || 84);
const THUMB_WIDTH = Number(process.env.THUMB_WIDTH || 480);
const THUMB_QUALITY = Number(process.env.THUMB_QUALITY || 76);
const MEDIUM_WIDTH = Number(process.env.MEDIUM_WIDTH || 1200);
const MEDIUM_QUALITY = Number(process.env.MEDIUM_QUALITY || 82);
const MIN_SAVINGS = Number(process.env.MIN_SAVINGS || 0.03);

const raster = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff']);
const webp = new Set(['.webp']);
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

function isDerivative(file) {
  return /(?:-thumb|-medium)\.webp$/i.test(file);
}

async function convertToWebP(file) {
  const ext = path.extname(file).toLowerCase();
  if (!raster.has(ext)) return null;

  const output = file.slice(0, -ext.length) + '.webp';
  const temp = output + '.tmp';
  const before = fs.statSync(file).size;
  const image = sharp(file, { failOn: 'none' });
  const meta = await image.metadata();

  await image.rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 5 }).toFile(temp);

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

async function makeDerivatives(file) {
  if (!webp.has(path.extname(file).toLowerCase()) || isDerivative(file)) return null;
  const base = file.slice(0, -5);
  const thumb = `${base}-thumb.webp`;
  const medium = `${base}-medium.webp`;
  const source = sharp(file, { failOn: 'none' }).rotate();

  await source.clone().resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY, effort: 5 }).toFile(`${thumb}.tmp`);
  await source.clone().resize({ width: MEDIUM_WIDTH, withoutEnlargement: true })
    .webp({ quality: MEDIUM_QUALITY, effort: 5 }).toFile(`${medium}.tmp`);

  fs.renameSync(`${thumb}.tmp`, thumb);
  fs.renameSync(`${medium}.tmp`, medium);
  return { source: file, thumb, medium };
}

(async () => {
  if (!fs.existsSync(ROOT)) throw new Error('Images directory not found');

  const initialFiles = walk(ROOT);
  const candidates = initialFiles.filter(f => raster.has(path.extname(f).toLowerCase()));
  const results = [];

  for (const file of candidates) {
    try {
      const result = await convertToWebP(file);
      if (result) results.push(result);
      console.log(result?.skipped ? `SKIP  ${path.relative(process.cwd(), file)}` : `WEBP  ${path.relative(process.cwd(), file)}`);
    } catch (error) {
      console.error(`ERROR ${path.relative(process.cwd(), file)}: ${error.message}`);
      process.exitCode = 1;
    }
  }

  const currentWebP = walk(ROOT).filter(f => webp.has(path.extname(f).toLowerCase()) && !isDerivative(f));
  let derivatives = 0;
  for (const file of currentWebP) {
    try {
      await makeDerivatives(file);
      derivatives++;
      console.log(`SIZES  ${path.relative(process.cwd(), file)}`);
    } catch (error) {
      console.error(`ERROR sizes ${path.relative(process.cwd(), file)}: ${error.message}`);
      process.exitCode = 1;
    }
  }

  const converted = results.filter(r => r && !r.skipped);
  const before = converted.reduce((n, r) => n + r.before, 0);
  const after = converted.reduce((n, r) => n + r.after, 0);

  const report = {
    version: 2,
    generated: new Date().toISOString(),
    source: 'Images',
    format: 'WebP',
    settings: { maxWidth: MAX_WIDTH, quality: QUALITY, thumbWidth: THUMB_WIDTH, thumbQuality: THUMB_QUALITY, mediumWidth: MEDIUM_WIDTH, mediumQuality: MEDIUM_QUALITY, minSavings: MIN_SAVINGS },
    scanned: candidates.length,
    converted: converted.length,
    skipped: results.filter(r => r?.skipped).length,
    responsiveSets: derivatives,
    bytesBefore: before,
    bytesAfter: after,
    savingsPercent: before ? Number(((1 - after / before) * 100).toFixed(2)) : 0
  };

  fs.writeFileSync('image-optimization-report.json', JSON.stringify(report, null, 2) + '\n');
  console.log(`Converted: ${report.converted}; responsive sets: ${report.responsiveSets}; saved: ${report.savingsPercent}%`);
})();
