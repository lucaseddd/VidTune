import { access, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export async function installTestAddons(driver) {
  let blocker = process.env.UBLOCK_XPI;
  if (!blocker && process.env.APPDATA) {
    const profiles = join(process.env.APPDATA, 'Mozilla', 'Firefox', 'Profiles');
    for (const name of await readdir(profiles)) {
      const candidate = join(profiles, name, 'extensions', 'uBlock0@raymondhill.net.xpi');
      try { await access(candidate); blocker = candidate; break; } catch {}
    }
  }
  if (!blocker) throw new Error('Set UBLOCK_XPI to the installed uBlock Origin package before launching Firefox.');
  const blockerId = await driver.installAddon(blocker, true);
  if (blockerId !== 'uBlock0@raymondhill.net') throw new Error('Unexpected uBlock Origin add-on ID');
  const id = await driver.installAddon(resolve('dist'), true);
  if (id !== 'vidtune@vidtune.local') throw new Error('Unexpected VidTune add-on ID');
}
