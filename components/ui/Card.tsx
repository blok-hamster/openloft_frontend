'use client';

import { ReactNode } from 'react';
import styles from './UI.module.css';

interface CardProps {
    children: ReactNode;
    hoverable?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

export default function Card({ children, hoverable = false, className = '', style }: CardProps) {
    return (
        <div
            className={`${styles.card} ${hoverable ? styles.cardHoverable : ''} ${className}`}
            style={style}
        >
            {children}
        </div>
    );
}
