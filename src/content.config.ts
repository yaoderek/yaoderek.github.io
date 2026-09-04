import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      oneLiner: z.string(),
      kind: z.string(),
      status: z.string(),
      created: z.coerce.date(),
      stack: z.array(z.string()),
      thumb: image(),
      images: z.array(image()),
      repo: z.string().url().optional(),
      demo: z.string().url().optional(),
    }),
});

const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({ title: z.string(), created: z.coerce.date() }),
});

// Roles the Calendar app draws on its timeline. No `end` means still running.
const experience = defineCollection({
  loader: file('./src/content/experience.yaml'),
  schema: z.object({
    id: z.string(),
    org: z.string(),
    role: z.string(),
    note: z.string().optional(),
    calendar: z.enum(['work', 'research', 'athletics']),
    start: z.coerce.date(),
    end: z.coerce.date().optional(),
    highlights: z.array(z.string()),
  }),
});

const pieces = (name: string) =>
  defineCollection({
    loader: file(`./src/content/${name}.yaml`),
    schema: ({ image }) =>
      z.object({
        id: z.string(),
        title: z.string(),
        created: z.coerce.date(),
        medium: z.string(),
        image: image(),
      }),
  });

export const collections = {
  projects,
  writing,
  experience,
  art: pieces('art'),
  life: pieces('life'),
};
