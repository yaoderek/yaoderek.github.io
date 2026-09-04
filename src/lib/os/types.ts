export type AppId =
  | 'finder'
  | 'notes'
  | 'doc'
  | 'photos'
  | 'calendar'
  | 'about'
  | 'trash';

/**
 * A note in the Notes app: the introduction and everything under /writing.
 *
 * The body travels on the note's own filesystem node rather than on a folder,
 * so the serialized tree carries each piece of writing exactly once.
 */
export type NoteItem = {
  id: string;                            // slug, or 'intro'
  path: string;                          // filesystem path, so a window owns a URL
  title: string;
  created: string;                       // ISO date
  html: string;
  snippet: string;                       // first line, shown in the list
  pinned?: boolean;
};

/**
 * A role in the Calendar app: a job or a lab, drawn as an event running from
 * `start` to `end`. No end date means it's still running, so its bar reaches
 * today.
 */
export type ExperienceItem = {
  id: string;
  org: string;
  role: string;
  note?: string;
  calendar: 'work' | 'research' | 'athletics';
  start: string;                         // ISO date
  end?: string;                          // ISO date
  highlights: string[];
};

/** A picture in the Photos app: a drawing from /art or a photo from /life. */
export type PhotoItem = {
  id: string;
  title: string;
  created: string;                       // ISO date
  medium: string;
  imageUrl: string;
  width: number;
  height: number;
};

/** The glyphs Icon.svelte draws for a filesystem node. */
export type IconKind = 'folder' | 'doc' | 'app' | 'image' | 'calendar';

export type FSNode = {
  name: string;
  path: string;
  kind: string;
  icon: string;
  created?: string;                      // ISO date
  meta?: [string, string][];             // ordered label/value pairs for preview column
  previewImage?: string;
  blurb?: string;
  // Kept out of the Finder's listings. The introduction lives in the tree so
  // the Notes app can read it off there, but it isn't a file anyone browses.
  hidden?: boolean;
  open?: { app: AppId; props: Record<string, unknown> };
  children?: FSNode[];
};

export type TreeInput = {
  intro: { text: string; created: string };
  projects: {
    slug: string;
    title: string;
    oneLiner: string;
    kind: string;
    status: string;
    created: string;
    stack: string[];
    thumbUrl: string;
    imageUrls: string[];
    bodyHtml: string;
    repo?: string;
    demo?: string;
  }[];
  writing: {
    slug: string;
    title: string;
    created: string;
    bodyHtml: string;
    bodyText: string;
  }[];
  experience: ExperienceItem[];
  art: PhotoItem[];
  life: PhotoItem[];
};
