import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

execFileSync(process.execPath, ['scripts/build.js'], { stdio: 'inherit' });
await mkdir('release', { recursive: true });
const archive = 'VidTune-v0.1.0.zip';
if (process.platform === 'win32') {
  execFileSync('tar.exe', ['-a', '-c', '-f', `release/${archive}`, '-C', 'dist', '.'], { stdio: 'inherit' });
} else {
  execFileSync('zip', ['-qr', `../release/${archive}`, '.'], { cwd: 'dist', stdio: 'inherit' });
}
console.log(`Packaged release/${archive}`);
