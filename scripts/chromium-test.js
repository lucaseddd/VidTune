import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { Builder } from 'selenium-webdriver';
import edge from 'selenium-webdriver/edge.js';

process.env.SE_CACHE_PATH = resolve('work/selenium-cache');
process.env.SE_AVOID_STATS = 'true';
const wav = Buffer.alloc(44 + 48000, 128);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(8000, 28);
wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34); wav.write('data', 36); wav.writeUInt32LE(48000, 40);
const media = `data:audio/wav;base64,${wav.toString('base64')}`;
const server = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html' });
  response.end('<!doctype html><body tabindex="0"><video id="video" controls width="640" height="360"></video>');
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
let driver;
try {
  const options = new edge.Options().addArguments('--headless=new', '--no-first-run',
    '--autoplay-policy=no-user-gesture-required', `--load-extension=${resolve('dist-chromium')}`);
  driver = await new Builder().forBrowser('MicrosoftEdge').setEdgeOptions(options).build();
  await driver.get(`http://127.0.0.1:${server.address().port}/`);
  const page = await driver.getWindowHandle();
  await driver.executeScript('const v=document.querySelector("video");v.src=arguments[0];v.loop=true;return v.play()', media);
  const targets = await driver.sendAndGetDevToolsCommand('Target.getTargets', {});
  const worker = targets.targetInfos.find(target => target.type === 'service_worker' && target.url.endsWith('/src/background.js'));
  if (!worker) throw new Error('Chromium extension service worker did not start');
  // URL.origin is null for extension schemes in Node; retain the explicit scheme and host.
  const extensionUrl = `${new URL(worker.url).protocol}//${new URL(worker.url).host}`;
  await driver.switchTo().newWindow('tab');
  const popup = await driver.getWindowHandle();
  await driver.get(`${extensionUrl}/popup.html`);
  await driver.wait(async () => (await driver.findElement({ id: 'video-summary' }).getText()) === '1 video found', 5000);
  async function control(message) {
    const result = await driver.executeAsyncScript(`const done=arguments[arguments.length-1], message=arguments[0];
      (async()=>{const {sendToVideo,activeTab}=await import(chrome.runtime.getURL('src/browser.js'));
      const tab=await activeTab();return sendToVideo(tab.id,message);})()
      .then(done,error=>done({error:String(error)}));`, message);
    if (result.error) throw new Error(result.error);
    return result;
  }
  if ((await control({ type: 'SET_SPEED', speed: 1.5 })).speed !== 1.5) throw new Error('Chromium speed failed');
  if ((await control({ type: 'SET_VOLUME', volume: 0.25 })).volume !== 0.25) throw new Error('Chromium native volume failed');
  const boost = await control({ type: 'SET_VOLUME', volume: 3 });
  if (boost.volume !== 3 || boost.boostUnavailable) throw new Error('Chromium boost failed');
  await driver.findElement({ id: 'refresh' }).click();
  await driver.wait(async () => (await driver.findElement({ id: 'volume-value' }).getText()) === '300%', 5000);
  await driver.findElement({ id: 'tab-volume-only' }).click();
  await driver.wait(async () => {
    const scoped = await driver.executeAsyncScript(`const done=arguments[arguments.length-1];
      chrome.storage.session.get('volumeScopes').then(done);`);
    return Object.values(scoped.volumeScopes ?? {})[0] === 3;
  }, 5000, 'Chromium tab-only toggle failed');
  await driver.switchTo().window(page);
  await driver.executeScript(`const video=document.querySelector('video');const host=document.createElement('div');
    document.body.append(host);host.attachShadow({mode:'open'}).append(video);window.testVideo=video;`);
  await driver.findElement({ css: 'body' }).sendKeys('d');
  await driver.wait(async () => await driver.executeScript('return window.testVideo.playbackRate === 1.6'), 5000);
  await driver.switchTo().window(popup);
  const nested = await control({ type: 'GET_STATE' });
  if (nested.count !== 1 || nested.speed !== 1.6 || nested.volume !== 3) throw new Error('Chromium shadow player failed');
  console.log('Chromium (Edge) passed: popup, speed, native volume, boost, per-tab scope, shadow player and shortcut.');
} catch (error) {
  if (driver) console.error('Current test page:', await driver.executeScript('return document.body.innerText').catch(() => 'unavailable'));
  throw error;
} finally {
  if (driver) await driver.quit();
  await new Promise(done => server.close(done));
}
