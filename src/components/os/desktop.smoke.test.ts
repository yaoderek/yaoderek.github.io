// @vitest-environment jsdom
import { mount, unmount } from 'svelte';
import { test, expect, beforeAll, afterEach } from 'vitest';
import Desktop from './Desktop.svelte';
import type { FSNode } from '../../lib/os/types';

// Minimal stubs for browser APIs missing in jsdom
beforeAll(() => {
  if (!window.matchMedia) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).matchMedia = () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    });
  }
  if (!window.ResizeObserver) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
});

// Minimal fixture tree
const fixtureTree: FSNode = {
  name: "derek's mac",
  path: '/',
  kind: 'Folder',
  icon: 'folder',
  children: [
    {
      name: 'README.txt',
      path: '/README.txt',
      kind: 'Plain Text',
      icon: 'doc',
      open: { app: 'doc', props: { title: 'README.txt', html: '<p>hi</p>' } },
    },
    {
      name: 'projects',
      path: '/projects',
      kind: 'Folder',
      icon: 'folder',
      children: [
        {
          name: 'my-project.app',
          path: '/projects/my-project',
          kind: 'Application',
          icon: 'app',
          open: {
            app: 'project',
            props: {
              title: 'My Project',
              oneLiner: 'A cool project',
              stack: ['TypeScript'],
              status: 'active',
              created: '2024-01-01',
              imageUrls: [],
              bodyHtml: '<p>details</p>',
            },
          },
        },
        {
          name: 'speakeasy.app',
          path: '/projects/speakeasy',
          kind: 'Application',
          icon: 'app',
          open: {
            app: 'project',
            props: {
              title: 'SpeakEasy',
              oneLiner: 'Speech feedback app',
              stack: ['TypeScript'],
              status: 'shipped',
              created: '2024-06-01',
              imageUrls: [],
              bodyHtml: '<p>details</p>',
            },
          },
        },
      ],
    },
  ],
};

// Clean up location.hash after each test so tests don't bleed into each other.
afterEach(() => {
  if (location.hash) history.replaceState({}, '', location.pathname);
  // Remove any leftover keydown listeners added by tests
  document.body.innerHTML = '';
});

test('desktop mounts, opens Finder at root without effect loops', async () => {
  const target = document.body;
  const app = mount(Desktop, {
    target,
    props: { tree: fixtureTree, initialPath: null, showResume: false },
  });
  await new Promise((r) => setTimeout(r, 50)); // let onMount + microtasks settle
  expect(document.body.textContent).toContain("derek's mac");
  unmount(app);
});

test('desktop with initialPath opens named window', async () => {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const app = mount(Desktop, {
    target,
    props: { tree: fixtureTree, initialPath: '/README.txt', showResume: false },
  });
  await new Promise((r) => setTimeout(r, 50));
  expect(target.textContent).toContain('README.txt');
  unmount(app);
  target.remove();
});

test('desktop opens a project window rendering its metadata', async () => {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const app = mount(Desktop, {
    target,
    props: {
      tree: fixtureTree,
      initialPath: '/projects/my-project',
      showResume: false,
    },
  });
  await new Promise((r) => setTimeout(r, 50));
  // ProjectWindow renders the one-liner and the stack metadata value.
  expect(target.textContent).toContain('A cool project');
  expect(target.textContent).toContain('TypeScript');
  unmount(app);
  target.remove();
});

test('dock renders Finder label and restores minimized window via dock click', async () => {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const app = mount(Desktop, {
    target,
    props: { tree: fixtureTree, initialPath: null, showResume: false },
  });
  await new Promise((r) => setTimeout(r, 50));

  // Dock should render the Finder label
  expect(target.textContent).toContain('Finder');

  // Minimize the finder window via the yellow traffic light
  const minimizeBtn = target.querySelector<HTMLButtonElement>('button.light.min');
  expect(minimizeBtn).not.toBeNull();
  minimizeBtn!.click();
  await new Promise((r) => setTimeout(r, 20));

  // A restore button should now appear in the dock (minimized section)
  const restoreBtn = target.querySelector<HTMLButtonElement>('[data-restore-id]');
  expect(restoreBtn).not.toBeNull();

  // Clicking it should restore: the restore button should disappear
  restoreBtn!.click();
  await new Promise((r) => setTimeout(r, 20));
  const restoreBtnAfter = target.querySelector<HTMLButtonElement>('[data-restore-id]');
  expect(restoreBtnAfter).toBeNull();

  unmount(app);
  target.remove();
});

// a11y: windows render as dialogs with correct aria-label; Esc closes the top window.
test('a11y: dialog role + aria-label present; Esc closes top window', async () => {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const app = mount(Desktop, {
    target,
    props: {
      tree: fixtureTree,
      initialPath: '/README.txt',
      showResume: false,
    },
  });
  await new Promise((r) => setTimeout(r, 50));

  // The README.txt doc window + the Finder window should both be present.
  // Check that at least one element has role="dialog" and aria-label="README.txt"
  const dialogs = target.querySelectorAll('[role="dialog"]');
  expect(dialogs.length).toBeGreaterThan(0);

  const readmeDialog = target.querySelector('[role="dialog"][aria-label="README.txt"]');
  expect(readmeDialog).not.toBeNull();

  // The finder dialog should also be present
  const finderDialog = target.querySelector('[role="dialog"][aria-label="derek\'s mac"]');
  expect(finderDialog).not.toBeNull();

  // Dispatch Escape — should close the top window (README.txt, which was opened last)
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));

  // After Esc, README.txt dialog should be gone
  const readmeAfter = target.querySelector('[role="dialog"][aria-label="README.txt"]');
  expect(readmeAfter).toBeNull();

  // Finder should still be present
  const finderAfter = target.querySelector('[role="dialog"][aria-label="derek\'s mac"]');
  expect(finderAfter).not.toBeNull();

  unmount(app);
  target.remove();
});

// Regression: legacy hash deep-links (#projects/speakeasy) must work on mobile.
// The hash is mapped eagerly at component-init (not just in onMount) so
// MobileFiles receives the correct initialPath on its first render.
test('mobile: legacy hash deep-link #projects/speakeasy shows speakeasy content', async () => {
  // Set the legacy hash URL before mounting (simulates an old link being opened).
  history.replaceState({}, '', '/#projects/speakeasy');

  const target = document.createElement('div');
  document.body.appendChild(target);

  // Force isMobile by returning matches:true from matchMedia for max-width queries.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).matchMedia = (query: string) => ({
    matches: query.includes('max-width'),
    addEventListener() {},
    removeEventListener() {},
  });

  const app = mount(Desktop, {
    target,
    props: { tree: fixtureTree, initialPath: null, showResume: false },
  });
  await new Promise((r) => setTimeout(r, 50));

  const text = target.textContent ?? '';
  // MobileFiles should have deep-navigated into /projects/speakeasy and rendered
  // the SpeakEasy project content rather than just the root listing.
  expect(text).toContain('SpeakEasy');

  unmount(app);
  target.remove();

  // Restore the matchMedia stub to the non-mobile default for subsequent tests.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
});
