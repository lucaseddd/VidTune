import { createServer } from 'node:http';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Builder } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';

process.env.SE_CACHE_PATH = resolve('work/selenium-cache');
process.env.SE_AVOID_STATS = 'true';
await mkdir(process.env.SE_CACHE_PATH, { recursive: true });

const html = '<!doctype html><title>VidTune Firefox test</title><body tabindex="0"><input id="typing"><video id="main" width="640" height="360" controls></video>';
const server = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));

let driver;
try {
  const options = new firefox.Options().setBinary('C:\\Program Files\\Mozilla Firefox\\firefox.exe');
  const service = new firefox.ServiceBuilder().addArguments('--allow-system-access');
  driver = await new Builder().forBrowser('firefox').setFirefoxOptions(options).setFirefoxService(service).build();
  const addOnId = await driver.installAddon(resolve('dist'), true);
  if (addOnId !== 'vidtune@vidtune.local') throw new Error(`Unexpected add-on ID: ${addOnId}`);
  await driver.setContext(firefox.Context.CHROME);
  const uuid = await driver.executeScript("return JSON.parse(Services.prefs.getStringPref('extensions.webextensions.uuids'))['vidtune@vidtune.local'];");
  await driver.setContext(firefox.Context.CONTENT);
  await driver.get(`http://127.0.0.1:${server.address().port}/`);
  const pageHandle = await driver.getWindowHandle();
  await driver.switchTo().newWindow('tab');
  const extensionHandle = await driver.getWindowHandle();
  await driver.get(`moz-extension://${uuid}/popup.html`);
  if (!(await driver.findElement({ id: 'speed-value' }).isDisplayed())) throw new Error('Popup speed control did not render');
  await driver.wait(async () => (await driver.findElement({ id: 'video-summary' }).getText()) === '1 video found',
    5000, 'Extension tab did not locate the video tab');
  const spinnerStep = await driver.executeScript("const input = document.getElementById('manual-value'); input.stepUp(); return input.value;");
  if (spinnerStep !== '1.1') throw new Error(`Manual spinner used the wrong step: ${spinnerStep}`);

  async function control(message) {
    const result = await driver.executeAsyncScript(`
      const message = arguments[0];
      const done = arguments[arguments.length - 1];
      browser.tabs.query({}).then((tabs) => {
        const tab = tabs.find((candidate) => candidate.url?.startsWith('http://127.0.0.1:'));
        if (!tab) throw new Error('Video test tab was not found');
        return browser.scripting.executeScript({ target: { tabId: tab.id }, files: ['src/content.js'] })
          .then(() => browser.tabs.sendMessage(tab.id, message));
      }).then(done, (error) => done({ error: String(error) }));
    `, message);
    if (result?.error) throw new Error(result.error);
    return result;
  }

  async function waitForRate(id, speed) {
    await driver.wait(async () =>
      Math.abs(await driver.executeScript(`return document.getElementById('${id}')?.playbackRate ?? 0`) - speed) < 0.001,
    10000, `${id} did not reach ${speed}×`);
  }

  const changed = await control({ type: 'SET_SPEED', speed: 1.5 });
  if (changed.speed !== 1.5 || changed.count !== 1) throw new Error('Firefox did not apply speed to the main video');
  await driver.switchTo().window(pageHandle);
  await waitForRate('main', 1.5);
  await driver.switchTo().window(extensionHandle);
  await control({ type: 'SET_SPEED', speed: 0.1 });
  await driver.switchTo().window(pageHandle);
  await waitForRate('main', 0.1);
  await driver.switchTo().window(extensionHandle);
  await control({ type: 'SET_SPEED', speed: 16 });
  await driver.switchTo().window(pageHandle);
  await waitForRate('main', 16);
  await driver.switchTo().window(extensionHandle);
  await control({ type: 'SET_SPEED', speed: 1.5 });
  await driver.switchTo().window(pageHandle);
  await driver.executeScript("document.getElementById('main').remove(); const video = document.createElement('video'); video.id = 'replacement'; video.width = 640; video.height = 360; document.body.append(video);");
  await waitForRate('replacement', 1.5);
  await driver.switchTo().window(extensionHandle);
  const reset = await control({ type: 'RESET' });
  if (reset.speed !== 1) throw new Error('Firefox did not reset speed');
  const stored = await driver.executeAsyncScript("browser.storage.local.get('settings').then(arguments[arguments.length - 1]);");
  if (stored.settings.speed !== 1) throw new Error('Firefox did not persist the reset speed');
  await driver.switchTo().window(pageHandle);
  await waitForRate('replacement', 1);
  await driver.findElement({ id: 'typing' }).sendKeys('d');
  if (await driver.executeScript("return document.getElementById('replacement').playbackRate") !== 1) {
    throw new Error('Speed shortcut interfered with text entry');
  }
  await driver.executeScript('document.body.focus()');
  await driver.findElement({ css: 'body' }).sendKeys('d');
  await waitForRate('replacement', 1.1);
  await driver.findElement({ css: 'body' }).sendKeys('ddd');
  await waitForRate('replacement', 1.4);
  await driver.findElement({ css: 'body' }).sendKeys('a');
  await waitForRate('replacement', 1.3);
  await driver.findElement({ css: 'body' }).sendKeys('q');
  await waitForRate('replacement', 1);
  await driver.switchTo().window(extensionHandle);
  await driver.findElement({ css: 'body' }).sendKeys('d');
  await driver.wait(async () => (await driver.findElement({ id: 'speed-value' }).getText()) === '1.1×',
    5000, 'Popup keyboard shortcut did not update its speed display');
  await driver.switchTo().window(pageHandle);
  await waitForRate('replacement', 1.1);
  const indicator = await driver.findElement({ id: 'vidtune-speed-indicator' });
  if (await indicator.getText() !== '1.10×') throw new Error('Video speed indicator showed the wrong value');
  if (await indicator.getCssValue('pointer-events') !== 'none') throw new Error('Video speed indicator blocked player input');
  await driver.wait(async () => (await driver.executeScript("return getComputedStyle(document.getElementById('vidtune-speed-indicator')).opacity")) === '0',
    5000, 'Video speed indicator did not fade after the speed change');
  await driver.actions().move({ origin: await driver.findElement({ id: 'replacement' }) }).perform();
  await driver.wait(async () => (await indicator.getCssValue('opacity')) === '1',
    5000, 'Video speed indicator did not follow player pointer activity');
  await driver.wait(async () => (await indicator.getCssValue('opacity')) === '0',
    5000, 'Video speed indicator did not hide when player activity stopped');
  console.log('Firefox passed: popup and page shortcuts, 0.1× repeated steps, spinner, video indicator, dynamic replacement, persistence and reset.');
} finally {
  if (driver) await driver.quit();
  await new Promise((done) => server.close(done));
}
