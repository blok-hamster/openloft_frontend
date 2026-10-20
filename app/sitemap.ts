import type { MetadataRoute } from 'next';

/* The crawlable surface: marketing and documentation. Product areas are
   session-gated (see robots.ts) and deliberately absent. A page here must
   also be reachable without a login — the list and robots stay in sync
   because both live in the frontend and neither lists gated routes. */

const PUBLIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '', priority: 1, changeFrequency: 'weekly' },
    { path: '/products', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/docs', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/skills', priority: 0.7, changeFrequency: 'daily' },
    { path: '/resources', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/enterprise', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/auth/login', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/auth/register', priority: 0.3, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    const now = new Date();
    return PUBLIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
        url: `${baseUrl}${path}`,
        lastModified: now,
        changeFrequency,
        priority,
    }));
}
