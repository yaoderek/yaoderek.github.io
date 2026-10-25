/**
 * Who the site is about, in one place, so the home page's Person schema,
 * every page's author/creator reference, and /llms.txt all describe the same
 * person the same way. Search engines and LLMs build an entity from repeated,
 * consistent facts; a stable `@id` lets every page point at one node instead
 * of redeclaring a new "Derek Yao".
 */
export const PERSON = {
  name: 'Derek Yao',
  alternateName: 'yaoderek',
  jobTitle: 'Software Engineer',
  summary:
    'Derek Yao is a University of Washington student in computer science and art, a software engineer at Contour, and a researcher building AI research agents with the UW Denolle and GAIA labs.',
  email: 'yaoderek06@gmail.com',
  sameAs: ['https://github.com/yaoderek', 'https://www.linkedin.com/in/yaoderek'],
  knowsAbout: [
    'Software engineering',
    'Machine learning',
    'Retrieval-augmented generation',
    'AI agents',
    'Edge inference',
    'Digital art',
  ],
};

/** Absolute URL for a site path, or undefined when `site` isn't configured. */
export function absolute(path: string, site: URL | undefined): string | undefined {
  return site ? new URL(path, site).href : undefined;
}

/** The `@id` of the Person node declared on the home page. */
export function personId(site: URL | undefined): string | undefined {
  return absolute(`${import.meta.env.BASE_URL}#person`, site);
}

/**
 * A reference to the Person for author/creator fields. Carries name and url as
 * well as the `@id`, so a page still reads correctly to a parser that doesn't
 * resolve ids across documents.
 */
export function personRef(site: URL | undefined) {
  return {
    '@type': 'Person',
    '@id': personId(site),
    name: PERSON.name,
    url: absolute(import.meta.env.BASE_URL, site),
  };
}
