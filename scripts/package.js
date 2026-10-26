import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

execFileSync(process.execPath, ['scripts/build.js'], { stdio: 'inherit' });
await mkdir('release', { recursive: true });
const { version } = JSON.parse(await readFile('package.json', 'utf8'));

async function zipContents(folder, archive) {
  const source = path.resolve(folder);
  const destination = path.resolve(archive);
  if (process.platform === 'win32') {
    const entries = await readdir(source);
    execFileSync('tar.exe', ['-a', '-c', '-f', destination, '-C', source, ...entries], { stdio: 'inherit' });
  } else {
    await rm(destination, { force: true });
    execFileSync('zip', ['-qr', destination, '.'], { cwd: source, stdio: 'inherit' });
  }
}

for (const [name, folder] of [['firefox', 'dist'], ['chromium', 'dist-chromium']]) {
  const extension = name === 'firefox' ? 'xpi' : 'zip';
  const archive = `VidTune-v${version}-${name}.${extension}`;
  await zipContents(folder, `release/${archive}`);
  console.log(`Packaged release/${archive}`);
}

const sourceFolder = await mkdtemp(path.join(tmpdir(), 'vidtune-source-'));
const excluded = new Set(['.git', 'node_modules', 'dist', 'dist-chromium', 'coverage', 'release', 'work']);
try {
  await cp('.', sourceFolder, {
    recursive: true,
    filter(source) {
      const relative = path.relative(process.cwd(), source).replaceAll('\\', '/');
      return !relative || !excluded.has(relative.split('/')[0]);
    }
  });
  const archive = `VidTune-v${version}-source.zip`;
  await zipContents(sourceFolder, `release/${archive}`);
  console.log(`Packaged release/${archive}`);
} finally {
  await rm(sourceFolder, { recursive: true, force: true });
}
