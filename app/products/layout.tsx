/**
 * Route metadata. The page itself is a client component ('use client'
 * cannot export metadata), so this wrapper carries only the document
 * title/description and passes the tree straight through.
 */
export const metadata = {
    title: 'Products',
    description:
        'What OpenLoft ships: hosted agent memory on bring-your-own cloud, graph tiles and triage, the agents console, and an OpenLoft deployment model.',
};

export default function ProductsMetadataLayer({ children }: { children: React.ReactNode }) {
    return children;
}
