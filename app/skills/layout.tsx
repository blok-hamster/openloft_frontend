/**
 * Route metadata. The page itself is a client component ('use client'
 * cannot export metadata), so this wrapper carries only the document
 * title/description and passes the tree straight through.
 */
export const metadata = {
    title: 'Skills library',
    description:
        'Community-built skills and plugins, browsable on the public ClawHub catalogue and installable into a hosted agent.',
};

export default function SkillsMetadataLayer({ children }: { children: React.ReactNode }) {
    return children;
}
