import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(rootDir, 'src');

const imageRefPattern = /['"`]([^'"`]+\.(?:png|jpe?g|webp))['"`]/gi;
const codeExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.md']);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (codeExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

async function collectImageRefs() {
  const files = await walk(sourceRoot);
  const refs = new Set();

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf8');
    for (const match of content.matchAll(imageRefPattern)) {
      refs.add(match[1]);
    }
  }

  return [...refs].sort();
}

function runBuild() {
  const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
  const result = spawnSync(process.execPath, [viteBin, 'build'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    if (result.error) {
      console.error(result.error);
    }
    process.exit(result.status ?? 1);
  }
}

console.log('Stage 1/3: Auditing image references...');
const refs = await collectImageRefs();
const nonWebpRefs = refs.filter((ref) => /\.(png|jpe?g)$/i.test(ref));

if (nonWebpRefs.length) {
  console.log(`Found ${nonWebpRefs.length} non-WebP references still in source:`);
  for (const ref of nonWebpRefs) {
    console.log(` - ${ref}`);
  }
} else {
  console.log('All source image references are WebP.');
}

console.log('Stage 2/3: Building optimized frontend...');
runBuild();

console.log('Stage 3/3: Done. Use npm run optimize:frontend anytime for the full pass.');