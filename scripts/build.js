import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const output = new URL('../dist/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
if (manifest.manifest_version !== 3 || manifest.version !== '0.1.0') {
  throw new Error('Unexpected manifest version');
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of ['manifest.json', 'popup.html', 'src', 'styles']) {
  await cp(new URL(`../${path}`, import.meta.url), join(fileURLToPath(output), path), { recursive: true });
}
console.log('Built dist/');
