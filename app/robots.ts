import type { MetadataRoute } from 'next';

/* Gated product surfaces stay out of crawlers: the agent console, the
   memory service UI, the admin plane and onboarding either require a
   session or would leak product internals in snippets. Marketing and
   documentation remain crawlable. */

const DISALLOW_GATED = [
    '/dashboard',
    '/memory',
    '/admin',
    '/onboarding',
    '/enterprise/onboarding',
];

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: DISALLOW_GATED,
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
