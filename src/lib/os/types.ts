export type AppId =
  | 'finder'
  | 'notes'
  | 'doc'
  | 'photos'
  | 'about'
  | 'trash';

/**
 * A note in the Notes app: the README and everything under /writing.
 *
 * The body travels on the note's own filesystem node rather than on a folder,
 * so the serialized tree carries each piece of writing exactly once.
 */
export type NoteItem = {
  id: string;                            // slug, or 'readme'
  path: string;                          // filesystem path, so a window owns a URL
  title: string;
  created: string;                       // ISO date
  html: string;
  snippet: string;                       // first line, shown in the list
  pinned?: boolean;
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

export type FSNode = {
  name: string;
  path: string;
  kind: string;
  icon: string;
  created?: string;                      // ISO date
  meta?: [string, string][];             // ordered label/value pairs for preview column
  previewImage?: string;
  blurb?: string;
  open?: { app: AppId; props: Record<string, unknown> };
  children?: FSNode[];
};

export type TreeInput = {
  readme: { text: string; created: string };
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
  art: PhotoItem[];
  life: PhotoItem[];
};
