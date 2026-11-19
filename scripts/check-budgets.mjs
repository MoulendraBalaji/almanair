/** Fails the build when any route's first-load JavaScript exceeds the budget. */
import { readdir, readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const buildDirectory = join(root, '.next');
const config = JSON.parse(await readFile(join(root, 'src', 'config', 'app.json'), 'utf8'));
const budgetBytes = config.budgets.firstLoadJsGzipKb * 1024;

const chunkPaths = new Map();
const walk = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name.endsWith('.js')) chunkPaths.set(relative(root, path).split(sep).join('/'), path);
  }
};
await walk(join(buildDirectory, 'static', 'chunks'));

const bytesFor = async (relativePath) => {
  const absolute = chunkPaths.get(relativePath.split(sep).join('/'));
  if (!absolute || (await stat(absolute)).size === 0) return 0;
  return gzipSync(await readFile(absolute)).length;
};

/** Turbopack emits route chunk groups; older webpack builds emit a page map. */
const routeChunks = async () => {
  const manifest = JSON.parse(await readFile(join(buildDirectory, 'build-manifest.json'), 'utf8'));
  const bootstrap = manifest.pagesChunkGroupBootstrapParams;
  if (bootstrap) {
    const routes = JSON.parse(await readFile(join(buildDirectory, 'app-path-routes-manifest.json'), 'utf8'));
    return Object.fromEntries(
      Object.entries(bootstrap).map(([key, value]) => [routes[key] ?? key, value.otherChunks.filter((chunk) => chunk.endsWith('.js'))]),
    );
  }
  return Object.fromEntries(
    Object.entries(manifest.pages)
      .filter(([, chunks]) => chunks.length > 0)
      .map(([route, chunks]) => [route, chunks.filter((chunk) => chunk.endsWith('.js'))]),
  );
};

const failures = [];
for (const [route, chunks] of Object.entries(await routeChunks())) {
  const total = (await Promise.all(chunks.map(bytesFor))).reduce((sum, bytes) => sum + bytes, 0);
  if (total > budgetBytes) failures.push(`${route}: ${(total / 1024).toFixed(1)} kB gzip`);
}

console.log(`First-load JS budget: ${config.budgets.firstLoadJsGzipKb} kB gzip per route.`);
if (failures.length > 0) {
  console.error(`Budget exceeded:\n${failures.join('\n')}`);
  process.exitCode = 1;
}
