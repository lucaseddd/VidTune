import { readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

async function javascriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await javascriptFiles(path));
    else if (entry.name.endsWith('.js')) files.push(path);
  }
  return files;
}

const files = [...await javascriptFiles('src'), ...await javascriptFiles('scripts'), ...await javascriptFiles('test')];
for (const file of files) {
  execFileSync(process.execPath, ['--check', file]);
  const source = await readFile(file, 'utf8');
  if (/\t| +$/m.test(source)) throw new Error(`Whitespace issue: ${file}`);
  if (/setInterval\s*\(/.test(source)) throw new Error(`Polling is prohibited: ${file}`);
}
const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const expected = ['activeTab', 'scripting', 'storage', 'webNavigation'];
if (JSON.stringify(manifest.permissions) !== JSON.stringify(expected) || manifest.host_permissions) {
  throw new Error('Unexpected extension permissions');
}
if (manifest.content_scripts?.length !== 1 ||
    JSON.stringify(manifest.content_scripts[0].matches) !== JSON.stringify(['<all_urls>']) ||
    JSON.stringify(manifest.content_scripts[0].js) !== JSON.stringify(['src/content.js', 'src/shortcuts.js']) ||
    manifest.content_scripts[0].all_frames !== true) {
  throw new Error('Unexpected content-script access');
}
console.log(`Lint passed (${files.length} JavaScript files, manifest permissions checked).`);
