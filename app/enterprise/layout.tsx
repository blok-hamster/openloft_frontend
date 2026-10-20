/**
 * Route metadata. The page itself is a client component ('use client'
 * cannot export metadata), so this wrapper carries only the document
 * title/description and passes the tree straight through.
 */
export const metadata = {
    title: 'Enterprise',
    description:
        'Hosted OpenLoft for companies: dedicated deployment, tenant policy, audit trails, and support terms.',
};

export default function EnterpriseMetadataLayer({ children }: { children: React.ReactNode }) {
    return children;
}
