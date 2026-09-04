import { describe, it, expect } from 'vitest';
import {
  pathForWin,
  urlToOpenPath,
  legacyHashToPath,
  fsPathToUrl,
  withBase,
  stripBase,
} from './router';

describe('pathForWin', () => {
  it('returns "/" for null (no window)', () => {
    expect(pathForWin(null)).toBe('/');
  });

  it('returns "/" for the Finder window (folder selection does not change URL)', () => {
    expect(pathForWin({ app: 'finder', path: '/' })).toBe('/');
  });

  it('returns "/" for the Trash window (internal path)', () => {
    expect(pathForWin({ app: 'trash', path: '/__trash__' })).toBe('/');
  });

  it('returns "/" for the About window (internal path)', () => {
    expect(pathForWin({ app: 'about', path: '/__about__' })).toBe('/');
  });

  it('returns the node path for a project window', () => {
    expect(pathForWin({ app: 'notes', path: '/projects/speakeasy' })).toBe(
      '/projects/speakeasy'
    );
  });

  it('returns the node path for a doc (writing) window', () => {
    expect(pathForWin({ app: 'doc', path: '/writing/rue' })).toBe('/writing/rue');
  });

  it('returns "/" for the Photos window (one window, both albums)', () => {
    expect(pathForWin({ app: 'photos', path: '/__photos__' })).toBe('/');
  });

  it('returns "/" for a README doc window (root-level doc, no section)', () => {
    expect(pathForWin({ app: 'doc', path: '/README.txt' })).toBe('/');
  });

  it('returns "/" when a window has no path', () => {
    expect(pathForWin({ app: 'doc' })).toBe('/');
  });
});

describe('urlToOpenPath', () => {
  it('returns null for the root "/"', () => {
    expect(urlToOpenPath('/')).toBeNull();
  });

  it('maps /projects to the projects folder path', () => {
    expect(urlToOpenPath('/projects')).toBe('/projects');
  });

  it('maps /projects/<slug> to the project node path', () => {
    expect(urlToOpenPath('/projects/speakeasy')).toBe('/projects/speakeasy');
  });

  it('maps /writing to the writing folder path', () => {
    expect(urlToOpenPath('/writing')).toBe('/writing');
  });

  it('maps /writing/<slug> to the writing node path', () => {
    expect(urlToOpenPath('/writing/rue')).toBe('/writing/rue');
  });

  it('maps /art to the art folder path', () => {
    expect(urlToOpenPath('/art')).toBe('/art');
  });

  it('maps /art/<id> to the art node path', () => {
    expect(urlToOpenPath('/art/art-1')).toBe('/art/art-1');
  });

  it('maps /life to the life folder path', () => {
    expect(urlToOpenPath('/life')).toBe('/life');
  });

  it('maps /experience and /experience/<id> to their node paths', () => {
    expect(urlToOpenPath('/experience')).toBe('/experience');
    expect(urlToOpenPath('/experience/contour')).toBe('/experience/contour');
  });

  it('strips a trailing slash before matching', () => {
    expect(urlToOpenPath('/projects/speakeasy/')).toBe('/projects/speakeasy');
  });

  it('lowercases the pathname before matching', () => {
    expect(urlToOpenPath('/Projects/SpeakEasy')).toBe('/projects/speakeasy');
  });

  it('returns null for an unknown top-level path', () => {
    expect(urlToOpenPath('/nonsense')).toBeNull();
  });

  it('returns null for an unknown section', () => {
    expect(urlToOpenPath('/blog/hello')).toBeNull();
  });

  it('maps /life/<id> to the photo node path', () => {
    expect(urlToOpenPath('/life/lake-union')).toBe('/life/lake-union');
  });

  it('returns null for too-deep paths', () => {
    expect(urlToOpenPath('/projects/speakeasy/extra')).toBeNull();
  });
});

describe('fsPathToUrl', () => {
  it('maps "/" to "/"', () => {
    expect(fsPathToUrl('/')).toBe('/');
  });

  it('maps "/README.txt" to "/" (root-level file, not routable)', () => {
    expect(fsPathToUrl('/README.txt')).toBe('/');
  });

  it('maps "/__trash__" to "/" (internal path)', () => {
    expect(fsPathToUrl('/__trash__')).toBe('/');
  });

  it('maps "/__about__" to "/" (internal path)', () => {
    expect(fsPathToUrl('/__about__')).toBe('/');
  });

  it('maps "/projects" to "/projects" (section folder)', () => {
    expect(fsPathToUrl('/projects')).toBe('/projects');
  });

  it('maps "/projects/x" to "/projects/x" (section item)', () => {
    expect(fsPathToUrl('/projects/x')).toBe('/projects/x');
  });

  it('maps "/writing/rue" to "/writing/rue" (writing item)', () => {
    expect(fsPathToUrl('/writing/rue')).toBe('/writing/rue');
  });

  it('maps "/art/art-1" to "/art/art-1" (art item)', () => {
    expect(fsPathToUrl('/art/art-1')).toBe('/art/art-1');
  });

  it('maps "/life" to "/life" (section folder)', () => {
    expect(fsPathToUrl('/life')).toBe('/life');
  });

  it('maps "/experience/contour" through (experience item)', () => {
    expect(fsPathToUrl('/experience/contour')).toBe('/experience/contour');
  });
});

describe('legacyHashToPath', () => {
  it('maps #projects/speakeasy to /projects/speakeasy', () => {
    expect(legacyHashToPath('#projects/speakeasy')).toBe('/projects/speakeasy');
  });

  it('maps #writing/rue to /writing/rue', () => {
    expect(legacyHashToPath('#writing/rue')).toBe('/writing/rue');
  });

  it('maps #projects to /projects', () => {
    expect(legacyHashToPath('#projects')).toBe('/projects');
  });

  it('maps #writing to /writing', () => {
    expect(legacyHashToPath('#writing')).toBe('/writing');
  });

  it('maps #art to /art', () => {
    expect(legacyHashToPath('#art')).toBe('/art');
  });

  it('maps #life to /life', () => {
    expect(legacyHashToPath('#life')).toBe('/life');
  });

  it('maps #contact to /', () => {
    expect(legacyHashToPath('#contact')).toBe('/');
  });

  it('maps #home to /', () => {
    expect(legacyHashToPath('#home')).toBe('/');
  });

  it('lowercases the hash value', () => {
    expect(legacyHashToPath('#Projects/SpeakEasy')).toBe('/projects/speakeasy');
  });

  it('returns null for an unknown hash', () => {
    expect(legacyHashToPath('#gibberish')).toBeNull();
  });

  it('returns null for an empty hash', () => {
    expect(legacyHashToPath('')).toBeNull();
  });
});

describe('withBase', () => {
  it('passes URLs through when base is "/"', () => {
    expect(withBase('/projects/speakeasy', '/')).toBe('/projects/speakeasy');
    expect(withBase('/', '/')).toBe('/');
  });

  it('prefixes URLs with a project base (trailing slash on base)', () => {
    expect(withBase('/projects/speakeasy', '/personal/')).toBe(
      '/personal/projects/speakeasy'
    );
  });

  it('prefixes URLs with a project base (no trailing slash on base)', () => {
    expect(withBase('/projects', '/personal')).toBe('/personal/projects');
  });

  it('maps root to "<base>/"', () => {
    expect(withBase('/', '/personal/')).toBe('/personal/');
  });
});

describe('stripBase', () => {
  it('passes pathnames through when base is "/"', () => {
    expect(stripBase('/projects/speakeasy', '/')).toBe('/projects/speakeasy');
    expect(stripBase('/', '/')).toBe('/');
  });

  it('strips a project base', () => {
    expect(stripBase('/personal/projects/speakeasy', '/personal/')).toBe(
      '/projects/speakeasy'
    );
  });

  it('maps bare base (with or without trailing slash) to "/"', () => {
    expect(stripBase('/personal', '/personal/')).toBe('/');
    expect(stripBase('/personal/', '/personal/')).toBe('/');
  });

  it('leaves pathnames outside the base untouched', () => {
    expect(stripBase('/elsewhere/thing', '/personal/')).toBe('/elsewhere/thing');
  });

  it('round-trips with withBase', () => {
    expect(stripBase(withBase('/art/art-04', '/personal/'), '/personal/')).toBe(
      '/art/art-04'
    );
    expect(stripBase(withBase('/', '/personal/'), '/personal/')).toBe('/');
  });
});
