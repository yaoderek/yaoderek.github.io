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

// Two albums: art and life. The folders and the pictures inside them all open
// the Photos app. The last life photo stands in for the greeting photo, which
// the desktop falls back to when 'pier-at-night' is missing.
const artItems = [
  {
    id: 'poseidon',
    title: 'Poseidon',
    imageUrl: '/images/poseidon.webp',
    created: '2025-01-01',
    medium: 'graphite on paper',
    width: 1200,
    height: 1600,
  },
];

const photoItems = [
  {
    id: 'lake-union',
    title: 'Lake Union pilings',
    imageUrl: '/images/lake-union.webp',
    created: '2025-07-19',
    medium: 'photo',
    width: 1200,
    height: 1600,
  },
  {
    id: 'taipei-metro',
    title: 'Taipei metro',
    imageUrl: '/images/taipei-metro.webp',
    created: '2025-08-09',
    medium: 'photo',
    width: 1600,
    height: 1200,
  },
];

function albumFolder(album: string, items: typeof photoItems): FSNode {
  return {
    name: album,
    path: `/${album}`,
    kind: 'Folder',
    icon: 'folder',
    open: { app: 'photos', props: { album, items } },
    children: items.map((photo, index) => ({
      name: `${photo.id}.png`,
      path: `/${album}/${photo.id}`,
      kind: 'PNG image',
      icon: 'image',
      created: photo.created,
      previewImage: photo.imageUrl,
      open: { app: 'photos', props: { album, index } },
    })),
  };
}

const lifeTree: FSNode = {
  ...fixtureTree,
  children: [
    ...fixtureTree.children!,
    albumFolder('art', artItems),
    albumFolder('life', photoItems),
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

  // Minimize the finder window via the yellow traffic light. The minimize
  // commits after a ~330ms flight animation, so poll for the dock button.
  const minimizeBtn = target.querySelector<HTMLButtonElement>('button.light.min');
  expect(minimizeBtn).not.toBeNull();
  minimizeBtn!.click();
  let restoreBtn: HTMLButtonElement | null = null;
  for (let i = 0; i < 30 && !restoreBtn; i++) {
    await new Promise((r) => setTimeout(r, 25));
    restoreBtn = target.querySelector<HTMLButtonElement>('[data-restore-id]');
  }

  // A restore button should now appear in the dock (minimized section)
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

  // Docs read inline: no README window opens — the Finder dialog shows the
  // README content in its preview pane instead.
  const dialogs = target.querySelectorAll('[role="dialog"]');
  expect(dialogs.length).toBe(1);

  const finderDialog = target.querySelector('[role="dialog"][aria-label="derek\'s mac"]');
  expect(finderDialog).not.toBeNull();
  expect(finderDialog!.textContent).toContain('README.txt');

  // Dispatch Escape — closes the top (Finder) window.
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));

  const finderAfter = target.querySelector('[role="dialog"][aria-label="derek\'s mac"]');
  expect(finderAfter).toBeNull();

  unmount(app);
  target.remove();
});

test('startup opens Photos on the greeting photo, with a running dot in the dock', async () => {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const app = mount(Desktop, {
    target,
    props: { tree: lifeTree, initialPath: null, showResume: false },
  });
  await new Promise((r) => setTimeout(r, 50));

  const photos = target.querySelector('[role="dialog"][aria-label="Photos"]');
  expect(photos).not.toBeNull();
  // One photo from the life album is showing, not a grid: the greeting photo,
  // which falls back to the last one in this fixture.
  expect(photos!.textContent).toContain('2 of 2');
  expect(photos!.textContent).toContain('Taipei metro');
  // The Finder is still open beside it.
  expect(target.querySelector('[role="dialog"][aria-label="derek\'s mac"]')).not.toBeNull();
  // Dock marks open apps the way macOS does.
  expect(target.querySelector('.running-dot')).not.toBeNull();

  unmount(app);
  target.remove();
});

test('a Photos window opened on a photo is sized to it, not to the app default', async () => {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const app = mount(Desktop, {
    target,
    props: { tree: lifeTree, initialPath: null, showResume: false },
  });
  await new Promise((r) => setTimeout(r, 50));

  const photos = target.querySelector<HTMLElement>('[role="dialog"][aria-label="Photos"]');
  expect(photos).not.toBeNull();
  // The greeting photo is 1600×1200, so the window is wider than it is tall —
  // the app's default size (780×680) would be the other way round.
  const width = parseFloat(photos!.style.width);
  const height = parseFloat(photos!.style.height);
  expect(width).toBeGreaterThan(height);
  expect(width).toBeLessThan(window.innerWidth);

  unmount(app);
  target.remove();
});

test('a deep-linked drawing opens in Photos, in the art album', async () => {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const app = mount(Desktop, {
    target,
    props: { tree: lifeTree, initialPath: '/art/poseidon', showResume: false },
  });
  await new Promise((r) => setTimeout(r, 50));

  const photos = target.querySelector('[role="dialog"][aria-label="Photos"]');
  expect(photos).not.toBeNull();
  expect(photos!.textContent).toContain('Poseidon');
  // Back goes to the album it came from, and the art album has one piece.
  expect(photos!.textContent).toContain('Art');
  expect(photos!.textContent).toContain('1 of 1');

  unmount(app);
  target.remove();
});

test('Photos dock icon opens the Photos window on its albums', async () => {
  const target = document.createElement('div');
  document.body.appendChild(target);
  // A deep link suppresses the startup Photos window, so the dock click is the
  // only thing that can open it here.
  const app = mount(Desktop, {
    target,
    props: { tree: lifeTree, initialPath: '/README.txt', showResume: false },
  });
  await new Promise((r) => setTimeout(r, 50));
  expect(target.querySelector('[role="dialog"][aria-label="Photos"]')).toBeNull();

  const dockPhotos = target.querySelector<HTMLButtonElement>('button[aria-label="Photos"]');
  expect(dockPhotos).not.toBeNull();
  dockPhotos!.click();
  await new Promise((r) => setTimeout(r, 20));

  const photos = target.querySelector('[role="dialog"][aria-label="Photos"]');
  expect(photos).not.toBeNull();
  // Opens on the album list — one album per picture folder — and the Finder
  // stayed on the README it was showing.
  expect(photos!.textContent).toContain('Albums');
  expect(photos!.textContent).toContain('Art');
  expect(photos!.textContent).toContain('Life');

  unmount(app);
  target.remove();
});

test('mobile: Photos dock icon drills into the life folder on a photo', async () => {
  const target = document.createElement('div');
  document.body.appendChild(target);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).matchMedia = (query: string) => ({
    matches: query.includes('max-width'),
    addEventListener() {},
    removeEventListener() {},
  });

  const app = mount(Desktop, {
    target,
    props: { tree: lifeTree, initialPath: null, showResume: false },
  });
  await new Promise((r) => setTimeout(r, 50));

  const dockPhotos = target.querySelector<HTMLButtonElement>('button[aria-label="Photos"]');
  expect(dockPhotos).not.toBeNull();
  dockPhotos!.click();
  await new Promise((r) => setTimeout(r, 30));

  // No windows on mobile: the files view is showing one of the photos.
  expect(target.querySelector('[role="dialog"]')).toBeNull();
  const text = target.textContent ?? '';
  expect(photoItems.some((photo) => text.includes(photo.title))).toBe(true);

  unmount(app);
  target.remove();

  // Restore the matchMedia stub to the non-mobile default for later tests.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
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
