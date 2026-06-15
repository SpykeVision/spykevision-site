import { defineCollection, z } from 'astro:content';

// Reviews collection — each .md file is one full review with its own page.
const reviews = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    eyebrow: z.string().optional(),          // e.g. "In-Depth Review · Part 2"
    category: z.string().optional(),         // e.g. "4K Laser • Flagship"
    summary: z.string(),                     // card blurb + meta description
    cover: z.string(),                       // /uploads/... or /images/...
    coverCard: z.string().optional(),        // homepage card thumbnail (overrides cover)
    date: z.coerce.date(),
    readTime: z.string().optional(),         // e.g. "18 min read"
    extra: z.string().optional(),            // e.g. "Firmware 1.0.99"
    score: z.number().optional(),            // overall score for card badge
    badge: z.string().optional(),            // e.g. "NEW" — shown on card instead of score
    draft: z.boolean().default(false),
    // Structured verdict (rendered by the layout)
    pros: z.array(z.string()).default([]),
    cons: z.array(z.string()).default([]),
    ratings: z.array(z.object({ label: z.string(), score: z.number() })).default([]),
    verdictTitle: z.string().optional(),
    verdictText: z.string().optional(),
    buyLink: z.string().url().optional(),
    tocGroups: z.array(z.object({
      label: z.string(),
      sections: z.array(z.string()),
    })).optional(),
    wide: z.boolean().optional(),
  }),
});

export const collections = { reviews };
