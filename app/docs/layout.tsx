/**
 * Route metadata. The page itself is a client component ('use client'
 * cannot export metadata), so this wrapper carries only the document
 * title/description and passes the tree straight through.
 */
export const metadata = {
    title: 'Docs',
    description:
        'OpenLoft documentation: deploying the memory service, wiring agents into it, and the record model — dated, source-attributed facts with expiry.',
};

export default function DocsMetadataLayer({ children }: { children: React.ReactNode }) {
    return children;
}
