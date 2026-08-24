// @vitest-environment jsdom
import { mount, unmount } from 'svelte';
import { test, expect, beforeAll, vi } from 'vitest';
import Desktop from './Desktop.svelte';
import Finder from './Finder.svelte';
import type { FSNode } from '../../lib/os/types';

// Minimal stubs for browser APIs missing in jsdom.
beforeAll(() => {
  if (!window.matchMedia) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).matchMedia = () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    });
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
});

// Fixture with a README carrying meta + blurb so the preview has known text.
const tree: FSNode = {
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
      meta: [['Kind', 'Plain Text']],
      blurb: 'Hi, I am Derek.',
      open: {
        app: 'notes',
        props: {
          note: {
            id: 'readme',
            path: '/README.txt',
            title: 'README.txt',
            created: '2025-01-01',
            html: '<p>Hi, I am Derek.</p>',
            snippet: 'Hi, I am Derek.',
            pinned: true,
          },
        },
      },
    },
    {
      name: 'projects',
      path: '/projects',
      kind: 'Folder',
      icon: 'folder',
      children: [
        {
          name: 'speakeasy.app',
          path: '/projects/speakeasy',
          kind: 'Web app',
          icon: 'app',
          created: '2024-06-01',
          meta: [['Status', 'shipped']],
          open: {
            app: 'notes',
            props: {
              note: {
                id: 'speakeasy',
                path: '/projects/speakeasy',
                title: 'SpeakEasy',
                created: '2024-06-01',
                html:
                  '<p>talks better</p>' +
                  '<dl class="contact"><div><dt>kind</dt><dd>Web app</dd></div>' +
                  '<div><dt>stack</dt><dd>TypeScript</dd></div>' +
                  '<div><dt>status</dt><dd>shipped</dd></div></dl>' +
                  '<p>case study body</p>',
                snippet: 'talks better',
              },
            },
          },
        },
      ],
    },
  ],
};

test('mounting Desktop pre-selects README.txt and shows its preview', async () => {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const app = mount(Desktop, {
    target,
    props: { tree, initialPath: null, showResume: false },
  });
  await new Promise((r) => setTimeout(r, 50)); // onMount + microtasks

  const text = target.textContent ?? '';
  // README is a row AND the preview column name; its blurb only appears in preview.
  expect(text).toContain('README.txt');
  expect(text).toContain('Hi, I am Derek.');
  // Path bar shows root.
  expect(text).toContain("derek's mac");

  unmount(app);
  target.remove();
});

test('Finder renders folder columns and a preview pane for a selected file', async () => {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const app = mount(Finder, {
    target,
    props: {
      tree,
      initialSelection: '/projects/speakeasy',
      view: 'columns' as const,
      active: false,
      onopen: () => {},
    },
  });
  await new Promise((r) => setTimeout(r, 20));

  // Preview column should be present for the selected file.
  expect(target.querySelector('.preview-col')).not.toBeNull();
  // Two folder columns: root + projects.
  expect(target.querySelectorAll('.column').length).toBe(2);
  const text = target.textContent ?? '';
  expect(text).toContain('speakeasy.app');
  // Projects read inline in the preview pane: status, one-liner, and the
  // case-study body are all visible without opening a window.
  expect(text).toContain('shipped');
  expect(text).toContain('talks better');
  expect(text).toContain('case study body');

  unmount(app);
  target.remove();
});

test('onnavigated is called even when navigateTo equals the current selection', async () => {
  // Regression: previously the signal would stay stuck non-null when navigateTo
  // matched selectedPath, blocking subsequent same-path navigations.
  const target = document.createElement('div');
  document.body.appendChild(target);

  const onnavigated = vi.fn();
  const app = mount(Finder, {
    target,
    props: {
      tree,
      initialSelection: '/projects',
      view: 'columns' as const,
      active: false,
      navigateTo: '/projects', // equals current selection
      onopen: () => {},
      onnavigated,
    },
  });
  await new Promise((r) => setTimeout(r, 20));

  // Signal must be cleared even though path didn't change.
  expect(onnavigated).toHaveBeenCalledTimes(1);

  unmount(app);
  target.remove();
});
