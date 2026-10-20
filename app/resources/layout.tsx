/**
 * Route metadata. The page itself is a client component ('use client'
 * cannot export metadata), so this wrapper carries only the document
 * title/description and passes the tree straight through.
 */
export const metadata = {
    title: 'Resources',
    description:
        'Guides and references for running agents on OpenLoft memory: the record model, the gateway, and decay.',
};

export default function ResourcesMetadataLayer({ children }: { children: React.ReactNode }) {
    return children;
}
