import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

// Launch Playwright's headless Chromium. If the build this playwright-core
// expects isn't installed, fall back to whichever headless shell is in the
// shared cache (other tools on the machine bump it).
export async function launch(opts = {}) {
  try {
    return await chromium.launch(opts);
  } catch (err) {
    const root = path.join(os.homedir(), 'Library/Caches/ms-playwright');
    const dir = fs.existsSync(root) &&
      fs.readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell-')).sort().at(-1);
    if (!dir) throw err;
    const exe = fs.readdirSync(path.join(root, dir))
      .map((d) => path.join(root, dir, d, 'chrome-headless-shell'))
      .find((p) => fs.existsSync(p));
    if (!exe) throw err;
    return chromium.launch({ ...opts, executablePath: exe });
  }
}
