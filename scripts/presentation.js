// Produce icon sizes and presentation images from the installed extension UI.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { Builder } from 'selenium-webdriver';
import edge from 'selenium-webdriver/edge.js';

process.env.SE_CACHE_PATH = resolve('work/selenium-cache');
process.env.SE_AVOID_STATS = 'true';
const output = 'presentation';
await mkdir(`${output}/screenshots`, { recursive: true });
const svg = await readFile('icons/icon.svg', 'utf8');
const wav = Buffer.alloc(44 + 480000, 128);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(8000, 28);
wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34); wav.write('data', 36); wav.writeUInt32LE(480000, 40);
const server = createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/html' });
  response.end('<!doctype html><body tabindex="0"><video id="video" controls width="640" height="360"></video>');
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const local = `http://127.0.0.1:${server.address().port}/`;
let driver;
async function launch(extension = false) {
  const options = new edge.Options().addArguments('--headless=new', '--no-first-run', '--force-device-scale-factor=2');
  if (extension) options.addArguments(`--load-extension=${resolve('dist-chromium')}`);
  driver = await new Builder().forBrowser('MicrosoftEdge').setEdgeOptions(options).build();
  await driver.manage().window().setRect({ width: 1400, height: 1000 });
  await driver.manage().setTimeouts({ script: 30000 });
  await driver.get(local);
}
try {
  await launch();
  for (const size of [16, 32, 48, 64, 96, 128, 256]) {
    const png = await driver.executeAsyncScript(`
      const [svg,size,done]=arguments;const img=new Image();
      img.onload=()=>{const c=document.createElement('canvas');c.width=c.height=size;
        c.getContext('2d').drawImage(img,0,0,size,size);done(c.toDataURL().split(',')[1]);};
      img.onerror=()=>done(null);img.src='data:image/svg+xml;base64,'+btoa(svg);`, svg, size);
    if (!png) throw new Error('Icon rendering failed');
    await writeFile(`icons/icon-${size}.png`, Buffer.from(png, 'base64'));
  }
  await driver.quit(); driver = null;
  execFileSync(process.execPath, ['scripts/build.js'], { stdio: 'inherit' });
  await launch(true);
  await driver.executeScript('const v=document.querySelector("video");v.src=arguments[0];v.loop=true;',
    `data:audio/wav;base64,${wav.toString('base64')}`);
  await driver.wait(async () => await driver.executeScript('return document.querySelector("video").readyState>=2'), 5000);
  await driver.findElement({ id: 'video' }).click();
  await driver.executeScript('return document.querySelector("video").play()');
  const targets = await driver.sendAndGetDevToolsCommand('Target.getTargets', {});
  const worker = targets.targetInfos.find(t => t.type === 'service_worker' && t.url.endsWith('/src/background.js'));
  if (!worker) throw new Error('Extension did not load');
  const extension = `${new URL(worker.url).protocol}//${new URL(worker.url).host}`;
  await driver.switchTo().newWindow('tab');
  await driver.get(`${extension}/popup.html`);
  await driver.executeAsyncScript(`const done=arguments[arguments.length-1];
    import('./src/settings.js').then(async m=>{await chrome.storage.local.set({settings:{...m.DEFAULT_SETTINGS,
      smartOrganize:true,moduleCount:5}});done();}).catch(e=>done(String(e)));`);
  await driver.navigate().refresh();
  await driver.wait(async () => await driver.executeScript('return !!document.querySelector(".smart-five")'), 5000);
  const captures = {};
  async function capture(name) {
    await driver.executeScript('document.activeElement?.blur()');
    const layout = await driver.executeScript('return {w:document.body.scrollWidth,h:document.querySelector(".shell").getBoundingClientRect().height}');
    if (layout.w !== 360 || layout.h > 600) throw new Error(`Invalid popup size: ${JSON.stringify(layout)}`);
    const clipped = await driver.executeScript(`return [...document.querySelectorAll('.shell button,.shell input,.popup-footer')].filter(e=>e.getClientRects().length).filter(e=>{const r=e.getBoundingClientRect();return r.bottom>580||r.right>360||r.left<0}).map(e=>e.id||e.className)`);
    if (clipped.length) throw new Error(`Clipped controls: ${clipped.join(', ')}`);
    captures[name] = await driver.findElement({ css: '.shell' }).takeScreenshot();
    await writeFile(`${output}/screenshots/${name}.png`, Buffer.from(captures[name], 'base64'));
  }
  await driver.findElement({ css: '.speed-presets [data-speed="1.5"]' }).click();
  await driver.wait(async () => (await driver.findElement({ id: 'speed-value' }).getText()) === '1.5×', 5000);
  await capture('playback-speed');
  await driver.findElement({ css: '.volume-presets [data-volume="2"]' }).click();
  await driver.wait(async () => (await driver.findElement({ id: 'volume-value' }).getText()) === '200%', 5000);
  await driver.findElement({ id: 'tab-volume-only' }).click();
  await driver.wait(async () => await driver.findElement({ id: 'tab-volume-only' }).isSelected(), 5000);
  await capture('volume-boost');
  for (const count of [2, 10]) {
    await driver.executeScript('const e=document.querySelector("#tool-count");e.value=arguments[0];e.dispatchEvent(new Event("change",{bubbles:true}));', String(count));
    await driver.wait(async () => await driver.executeScript('return document.querySelectorAll(".module-row").length===arguments[0]', count), 5000);
    await capture(`layout-${count}`);
  }
  await driver.get(`${extension}/options.html`);
  await driver.wait(async () => (await driver.findElement({ id: 'key-decrease' }).getAttribute('value')) === 'KeyA', 5000);
  captures.settings = await driver.findElement({ css: 'main' }).takeScreenshot();
  await writeFile(`${output}/screenshots/settings.png`, Buffer.from(captures.settings, 'base64'));
  await driver.get(local);
  const slides = [
    { name: '01-playback-speed', title: ['Your video.', 'Your pace.'], body: ['Quick presets. Precise adjustments.', 'A slower. D faster. Q reset.'], key: 'playback-speed', label: 'PLAYBACK SPEED' },
    { name: '02-volume-boost', title: ['Turn it up.', 'Your way.'], body: ['Boost quiet videos up to 300%.', 'Choose a different volume for each tab.'], key: 'volume-boost', label: 'VOLUME BOOST', note: 'Boost availability depends on the video source.' },
    { name: '03-smart-organize', title: ['Less clutter.', 'More control.'], body: ['Choose 2, 5 or 10 tools.', 'Let Smart Organize bring them together.'], key: 'layout-10', label: 'SMART ORGANIZE' }
  ];
  for (let index = 0; index < slides.length; index++) {
    const png = await driver.executeAsyncScript(`
      const [slide,shot,icon,index,done]=arguments;
      Promise.all([shot,icon].map(src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src;}))).then(([ui,logo])=>{
        const c=document.createElement('canvas');c.width=1280;c.height=800;const g=c.getContext('2d');
        g.fillStyle='#0C1220';g.fillRect(0,0,1280,800);
        const glow=g.createRadialGradient(1030,330,20,1030,330,700);glow.addColorStop(0,'#192D58');glow.addColorStop(1,'#0C1220');g.fillStyle=glow;g.fillRect(0,0,1280,800);
        g.strokeStyle='#ffffff06';g.lineWidth=1;for(let x=0;x<1280;x+=40){g.beginPath();g.moveTo(x,0);g.lineTo(x,800);g.stroke();}
        g.drawImage(logo,64,52,48,48);g.fillStyle='#F2F6FF';g.font='700 26px Segoe UI';g.fillText('VidTune',124,86);
        g.fillStyle='#85B6FF';g.font='700 14px Segoe UI';g.fillText(slide.label,68,216);
        g.font='700 70px Segoe UI';slide.title.forEach((line,i)=>{g.fillStyle=i===1?'#85B6FF':'#F2F6FF';g.fillText(line,62,310+i*82);});
        g.font='22px Segoe UI';g.fillStyle='#B5C5DE';slide.body.forEach((line,i)=>g.fillText(line,68,467+i*35));
        const w=414,h=ui.height*w/ui.width,x=784,y=(800-h)/2;
        g.shadowColor='#00000070';g.shadowBlur=36;g.shadowOffsetY=14;g.fillStyle='#0C1220';g.beginPath();g.roundRect(x-1,y-1,w+2,h+2,18);g.fill();g.shadowBlur=0;g.shadowOffsetY=0;
        g.save();g.beginPath();g.roundRect(x,y,w,h,17);g.clip();g.drawImage(ui,x,y,w,h);g.restore();
        g.strokeStyle='#385785';g.lineWidth=1;g.beginPath();g.roundRect(x,y,w,h,17);g.stroke();
        g.fillStyle='#8298BD';g.font='13px Segoe UI';g.fillText(slide.note||'Actual VidTune interface · Smart Organize',68,728);
        g.fillStyle='#85B6FF';g.fillRect(68,754,60,3);g.fillStyle='#7D91B0';g.font='13px Segoe UI';g.fillText('0'+(index+1)+' / 03',1140,754);
        done(c.toDataURL().split(',')[1]);
      }).catch(e=>done({error:String(e)}));`, slides[index], `data:image/png;base64,${captures[slides[index].key]}`,
    `data:image/png;base64,${(await readFile('icons/icon-256.png')).toString('base64')}`, index);
    if (typeof png !== 'string') throw new Error(JSON.stringify(png));
    await writeFile(`${output}/${slides[index].name}.png`, Buffer.from(png, 'base64'));
  }
  console.log('Created icons, five original UI screenshots and three 1280x800 presentation images.');
} finally {
  if (driver) await driver.quit();
  await new Promise(done => server.close(done));
}
