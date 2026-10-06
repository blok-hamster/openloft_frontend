'use client';

import { ReactNode } from 'react';
import styles from './UI.module.css';

interface CardProps {
    children: ReactNode;
    hoverable?: boolean;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
}

export default function Card({ children, hoverable = false, className = '', style, onClick }: CardProps) {
    /* onClick makes this a control, so it has to be reachable by keyboard.
       AgentTypeSelector and the wizard's billing step both rely on it. */
    const interactive = typeof onClick === 'function';

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
        }
    };

    return (
        <div
            className={`${styles.card} ${hoverable ? styles.cardHoverable : ''} ${interactive ? styles.cardInteractive : ''} ${className}`}
            style={style}
            onClick={onClick}
            onKeyDown={interactive ? handleKeyDown : undefined}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
        >
            {children}
        </div>
    );
}
