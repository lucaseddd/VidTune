import { createServer } from 'node:http';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Builder } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';

process.env.SE_CACHE_PATH = resolve('work/selenium-cache');
process.env.SE_AVOID_STATS = 'true';
await mkdir(process.env.SE_CACHE_PATH, { recursive: true });

const html = '<!doctype html><title>VidTune Firefox test</title><body tabindex="0"><input id="typing"><video id="main" width="640" height="360" controls></video>';
const wav = Buffer.alloc(44 + 48000, 128);
wav.write('RIFF', 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(8000, 24);
wav.writeUInt32LE(8000, 28);
wav.writeUInt16LE(1, 32);
wav.writeUInt16LE(8, 34);
wav.write('data', 36);
wav.writeUInt32LE(48000, 40);
const wavUrl = `data:audio/wav;base64,${wav.toString('base64')}`;
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
  if (await driver.findElement({ id: 'volume-slider' }).getAttribute('value') !== '100') {
    throw new Error('100% volume did not start at the slider midpoint');
  }
  const spinnerStep = await driver.executeScript("const input = document.getElementById('manual-value'); input.stepUp(); return input.value;");
  if (spinnerStep !== '1.1') throw new Error(`Manual spinner used the wrong step: ${spinnerStep}`);

  async function setPopupVolume(position, expected) {
    await driver.executeScript(`
      const slider = document.getElementById('volume-slider');
      slider.value = arguments[0];
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    `, position);
    await driver.wait(async () => (await driver.findElement({ id: 'volume-value' }).getText()) === expected,
      5000, `Popup volume did not show ${expected}`);
  }

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

  async function waitForVolume(id, volume) {
    await driver.wait(async () =>
      Math.abs(await driver.executeScript(`return document.getElementById('${id}')?.volume ?? -1`) - volume) < 0.00005,
    10000, `${id} did not reach ${volume} volume`);
  }

  await driver.switchTo().window(pageHandle);
  await driver.executeScript("const video = document.getElementById('main'); video.src = arguments[0]; video.loop = true", wavUrl);
  await driver.wait(async () => await driver.executeScript("return document.getElementById('main').readyState >= 1"),
    5000, 'Local media did not load for boost testing');
  await driver.findElement({ id: 'main' }).click();
  await driver.executeScript("const video = document.getElementById('main'); video.muted = true; return video.play()");
  await driver.wait(async () => await driver.executeScript("return !document.getElementById('main').paused"),
    5000, 'Local media did not start for boost testing');
  await driver.executeScript("document.getElementById('main').muted = false");
  await driver.switchTo().window(extensionHandle);

  await setPopupVolume(1, '0.01%');
  await driver.switchTo().window(pageHandle);
  await waitForVolume('main', 0.0001);
  await driver.switchTo().window(extensionHandle);
  await setPopupVolume(50, '25%');
  await driver.switchTo().window(pageHandle);
  await waitForVolume('main', 0.25);
  await driver.switchTo().window(extensionHandle);
  await setPopupVolume(150, '200%');
  await driver.wait(async () => (await control({ type: 'GET_STATE' })).volume === 2,
    5000, 'Firefox did not activate 200% audio boost');
  await setPopupVolume(200, '300%');
  await driver.wait(async () => (await control({ type: 'GET_STATE' })).volume === 3,
    5000, 'Firefox did not activate 300% audio boost');
  await setPopupVolume(100, '100%');
  await driver.switchTo().window(pageHandle);
  await waitForVolume('main', 1);
  await driver.switchTo().window(extensionHandle);
  await setPopupVolume(50, '25%');

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
  await waitForVolume('replacement', 0.25);
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

  await driver.switchTo().window(extensionHandle);
  await driver.findElement({ id: 'open-settings' }).click();
  await driver.wait(async () => (await driver.getAllWindowHandles()).length === 3, 5000, 'Settings tab did not open');
  const optionsHandle = (await driver.getAllWindowHandles()).find((handle) => ![pageHandle, extensionHandle].includes(handle));
  await driver.switchTo().window(optionsHandle);
  await driver.wait(async () => (await driver.findElement({ id: 'site-name' }).getText()) === '127.0.0.1',
    5000, 'Settings page did not identify the video site');
  await driver.executeScript("document.getElementById('key-increase').value = 'KeyA'");
  await driver.findElement({ css: '#settings-form button[type="submit"]' }).click();
  await driver.wait(async () => (await driver.findElement({ id: 'feedback' }).getText()).includes('different letter'),
    5000, 'Duplicate shortcut was not rejected');
  await driver.executeScript(`
    document.getElementById('speed-step').value = '0.2';
    document.getElementById('presets').value = '0.5, 1, 1.25';
    document.getElementById('seek-enabled').checked = true;
    document.getElementById('seek-seconds').value = '2';
    document.getElementById('key-decrease').value = 'KeyC';
    document.getElementById('key-increase').value = 'KeyV';
    document.getElementById('key-seek-backward').value = 'KeyZ';
    document.getElementById('key-seek-forward').value = 'KeyX';
    document.getElementById('site-enabled').checked = true;
    document.getElementById('site-speed').value = '1.5';
  `);
  await driver.findElement({ css: '#settings-form button[type="submit"]' }).click();
  await driver.wait(async () => (await driver.findElement({ id: 'feedback' }).getText()) === 'Settings saved.',
    5000, 'Advanced settings were not saved');
  await driver.switchTo().window(pageHandle);
  await waitForRate('replacement', 1.5);
  await driver.executeScript(`
    const video = document.getElementById('replacement');
    video.src = arguments[0];
    document.body.focus();
  `, wavUrl);
  await driver.wait(async () => await driver.executeScript("const v = document.getElementById('replacement'); return v.readyState >= 1 && v.seekable.length > 0"),
    5000, 'Local media fixture was not seekable');
  await driver.executeScript("document.getElementById('replacement').currentTime = 1");
  await driver.findElement({ css: 'body' }).sendKeys('x');
  await driver.wait(async () => Math.abs((await driver.executeScript("return document.getElementById('replacement').currentTime")) - 3) < 0.05,
    5000, 'Configured forward skip did not work');
  await driver.findElement({ css: 'body' }).sendKeys('z');
  await driver.wait(async () => Math.abs((await driver.executeScript("return document.getElementById('replacement').currentTime")) - 1) < 0.05,
    5000, 'Configured backward skip did not work');
  await driver.findElement({ css: 'body' }).sendKeys('v');
  await waitForRate('replacement', 1.7);
  await driver.navigate().refresh();
  await waitForRate('main', 1.7);
  await waitForVolume('main', 0.25);
  await driver.switchTo().window(extensionHandle);
  await setPopupVolume(200, '300%');
  await driver.switchTo().window(pageHandle);
  await driver.executeScript(`
    document.getElementById('main').remove();
    const video = document.createElement('video');
    video.id = 'boost-replacement';
    video.width = 640;
    video.height = 360;
    video.controls = true;
    video.loop = true;
    video.src = arguments[0];
    document.body.append(video);
  `, wavUrl);
  await driver.findElement({ id: 'boost-replacement' }).click();
  await driver.executeScript("const video = document.getElementById('boost-replacement'); video.muted = true; return video.play()");
  await driver.executeScript("document.getElementById('boost-replacement').muted = false");
  await driver.switchTo().window(extensionHandle);
  await driver.wait(async () => (await control({ type: 'GET_STATE' })).volume === 3,
    5000, 'Boost did not follow a dynamically replaced video');
  await driver.switchTo().window(pageHandle);
  await driver.navigate().refresh();
  await driver.executeScript("const video = document.getElementById('main'); video.src = arguments[0]; video.loop = true", wavUrl);
  await driver.findElement({ id: 'main' }).click();
  await driver.executeScript("const video = document.getElementById('main'); video.muted = true; return video.play()");
  await driver.executeScript("document.getElementById('main').muted = false");
  await driver.switchTo().window(extensionHandle);
  await driver.wait(async () => (await control({ type: 'GET_STATE' })).volume === 3,
    5000, 'Saved boost did not apply after reload');
  console.log('Firefox passed: centered slider, 0.01% to 300% boost, replacement, reload, native reset, settings and shortcuts.');
} finally {
  if (driver) await driver.quit();
  await new Promise((done) => server.close(done));
}
