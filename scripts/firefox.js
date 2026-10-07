import firefox from 'selenium-webdriver/firefox.js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Session, WebDriver } from 'selenium-webdriver';
import { Executor, HttpClient } from 'selenium-webdriver/http/index.js';
import { resolve } from 'node:path';
import { installTestAddons } from './firefox-addons.js';

process.env.SE_CACHE_PATH = resolve('work/selenium-cache');
process.env.SE_AVOID_STATS = 'true';
await mkdir(process.env.SE_CACHE_PATH, { recursive: true });
let existing;
try {
  const saved = JSON.parse(await readFile('work/manual-session.json', 'utf8'));
  const address = new URL(saved.server);
  if (address.hostname !== '127.0.0.1' || address.protocol !== 'http:') throw new Error('Invalid local session');
  const candidate = new WebDriver(new Session(saved.sessionId, {}), new Executor(new HttpClient(saved.server)));
  const handles = await candidate.getAllWindowHandles();
  if (handles.length) existing = { driver: candidate, handles };
} catch { /* The previous session may have been closed. */ }
if (existing) {
  let matching;
  if (process.argv[2]) {
    for (const handle of existing.handles) {
      await existing.driver.switchTo().window(handle);
      if (await existing.driver.getCurrentUrl() === process.argv[2]) { matching = handle; break; }
    }
  }
  await existing.driver.switchTo().window(matching ?? existing.handles[0]);
  console.log('Reusing the existing VidTune Firefox window. Playback and installed extensions were preserved.');
  process.exit(0);
}
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
