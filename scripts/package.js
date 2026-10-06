import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';

execFileSync(process.execPath, ['scripts/build.js'], { stdio: 'inherit' });
await mkdir('release', { recursive: true });
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
for (const [name, folder] of [['firefox', 'dist'], ['chromium', 'dist-chromium']]) {
  const archive = `VidTune-v${version}-${name}.zip`;
  if (process.platform === 'win32') {
    execFileSync('tar.exe', ['-a', '-c', '-f', `release/${archive}`, '-C', folder, '.'], { stdio: 'inherit' });
  } else {
    execFileSync('zip', ['-qr', `../release/${archive}`, '.'], { cwd: folder, stdio: 'inherit' });
  }
  console.log(`Packaged release/${archive}`);
}
