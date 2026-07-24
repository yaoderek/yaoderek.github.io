export type AppId =
  | 'finder'
  | 'project'
  | 'doc'
  | 'photos'
  | 'about'
  | 'trash';

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
