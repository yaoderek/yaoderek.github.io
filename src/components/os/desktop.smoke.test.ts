// @vitest-environment jsdom
import { mount, unmount } from 'svelte';
import { test, expect, beforeAll } from 'vitest';
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
      ],
    },
  ],
};

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
