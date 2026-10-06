import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
const project = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
if (manifest.manifest_version !== 3 || manifest.version !== project.version) {
  throw new Error('Unexpected manifest version');
}
for (const [name, browser] of [['dist', 'firefox'], ['dist-chromium', 'chromium']]) {
  const output = new URL(`../${name}/`, import.meta.url);
  const outputPath = fileURLToPath(output);
  const relativeOutput = relative(projectRoot, outputPath);
  if (relativeOutput.startsWith('..') || isAbsolute(relativeOutput)) throw new Error('Unsafe build output path');
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const path of ['popup.html', 'src', 'styles']) {
    await cp(new URL(`../${path}`, import.meta.url), join(outputPath, path), { recursive: true });
  }
  const specific = structuredClone(manifest);
  if (browser === 'firefox') delete specific.background.service_worker;
  else {
    delete specific.background.scripts;
    delete specific.browser_specific_settings;
  }
  await writeFile(join(outputPath, 'manifest.json'), `${JSON.stringify(specific, null, 2)}\n`);
}
console.log('Built dist/ (Firefox) and dist-chromium/ (Chromium)');
