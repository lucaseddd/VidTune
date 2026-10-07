import firefox from 'selenium-webdriver/firefox.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { installTestAddons } from './firefox-addons.js';

process.env.SE_CACHE_PATH = resolve('work/selenium-cache');
process.env.SE_AVOID_STATS = 'true';
await mkdir(process.env.SE_CACHE_PATH, { recursive: true });
const options = new firefox.Options().setPageLoadStrategy('eager');
if (process.platform === 'win32') options.setBinary('C:\\Program Files\\Mozilla Firefox\\firefox.exe');
const service = new firefox.ServiceBuilder().addArguments('--allow-system-access').build();
const driver = firefox.Driver.createSession(options, service);
try {
  await installTestAddons(driver);
  const session = await driver.getSession();
  await writeFile('work/manual-session.json', JSON.stringify({
    server: await service.address(), sessionId: session.getId()
  }));
  await driver.manage().setTimeouts({ pageLoad: 25000 });
  await driver.get(process.argv[2] ?? 'https://example.com').catch((error) => {
    if (error.name !== 'TimeoutError') throw error;
  });
  console.log('Firefox is ready with uBlock Origin and VidTune. Leave this process running while testing.');
} catch (error) {
  await driver.quit();
  throw error;
}
process.once('SIGINT', async () => { await driver.quit(); process.exit(0); });
process.stdin.resume();
