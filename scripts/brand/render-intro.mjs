// Renders the og:video intro by stepping intro.html frame by frame in headless
// Chromium and piping the frames to ffmpeg.
//
//   npm run intro             -> public/intro.mp4 (1280x720) + public/og.jpg (1200x630 last frame)
//   npm run preview [t,t,...] -> stills at those times in scripts/brand/out/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import { launch } from './browser.mjs';
import { signatureStrokes } from './signature.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.join(here, '..', '..');
const pub = path.join(root, 'public');
const out = path.join(here, 'out');

const routes = {
  '/intro.html': () => ['text/html', fs.readFileSync(path.join(here, 'intro.html'))],
  '/sig.json': () => ['application/json', JSON.stringify(signatureStrokes())],
  '/wall.jpg': () => ['image/jpeg', fs.readFileSync(path.join(root, 'src/assets/wallpaper.jpg'))],
};
const server = http.createServer((req, res) => {
  const route = routes[req.url.split('?')[0]];
  if (!route) { res.writeHead(404); res.end(); return; }
  const [type, body] = route();
  res.writeHead(200, { 'content-type': type });
  res.end(body);
}).listen(0);
const port = server.address().port;

const run = (args, input) => new Promise((resolve, reject) => {
  const p = spawn(ffmpeg, ['-v', 'error', '-y', ...args], { stdio: [input ? 'pipe' : 'ignore', 'inherit', 'inherit'] });
  p.on('close', (code) => (code ? reject(new Error(`ffmpeg exited ${code}`)) : resolve()));
  if (input) input(p.stdin);
});

const browser = await launch();
async function open(w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => console.error('[page]', e.message));
  await page.goto(`http://localhost:${port}/intro.html?w=${w}&h=${h}`);
  await page.evaluate(() => window.ready);
  const grab = async (t) => {
    const url = await page.evaluate((t) => {
      window.renderAt(t);
      return document.getElementById('gl').toDataURL('image/png');
    }, t);
    return Buffer.from(url.split(',')[1], 'base64');
  };
  return { grab, duration: await page.evaluate(() => window.DURATION) };
}

const [mode = 'video', arg] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });

if (mode === 'sheet') {
  const { grab } = await open(1280, 720);
  for (const t of (arg || '1.5,3.9,4.6,5.0,5.4,7.45').split(',').map(Number))
    fs.writeFileSync(path.join(out, `t${t.toFixed(2)}.png`), await grab(t));
  console.log(`stills -> ${path.relative(root, out)}/`);
} else {
  const fps = 30;
  const { grab, duration } = await open(1280, 720);
  const n = Math.round(duration * fps);
  await run(['-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-movflags', '+faststart', '-an', path.join(pub, 'intro.mp4')], async (stdin) => {
    for (let i = 0; i < n; i++) {
      if (!stdin.write(await grab(i / fps))) await new Promise((r) => stdin.once('drain', r));
    }
    stdin.end();
  });

  // thumbnail: the final frame, framed for the 1200x630 og:image slot
  const poster = await open(1200, 630);
  const png = path.join(out, 'poster.png');
  fs.writeFileSync(png, await poster.grab(poster.duration));
  await run(['-i', png, '-q:v', '3', path.join(pub, 'og.jpg')]);
  console.log('wrote public/intro.mp4 and public/og.jpg');
}

await browser.close();
server.close();
