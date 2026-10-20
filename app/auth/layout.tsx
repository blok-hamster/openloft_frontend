/**
 * Route metadata shared by both auth pages. The pages are client
 * components ('use client' cannot export metadata), so the wrapper carries
 * only the document title and passes children through unchanged.
 */
export const metadata = {
    title: 'Sign in',
    description: 'Sign in to OpenLoft, or create the account that hosts your agents and their memory.',
};

export default function AuthMetadataLayer({ children }: { children: React.ReactNode }) {
    return children;
}
