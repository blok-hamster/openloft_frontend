'use client';

import styles from './UI.module.css';

interface SkeletonLoaderProps {
    variant?: 'card' | 'text' | 'text-short' | 'avatar';
    count?: number;
    className?: string;
}

export default function SkeletonLoader({ variant = 'text', count = 1, className = '' }: SkeletonLoaderProps) {
    const variantClass = {
        card: styles.skeletonCard,
        text: styles.skeletonText,
        'text-short': styles.skeletonTextShort,
        avatar: styles.skeletonAvatar,
    }[variant];

    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className={`${variantClass} ${className}`} />
            ))}
        </>
    );
}
