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
    return (
        <div
            className={`${styles.card} ${hoverable ? styles.cardHoverable : ''} ${className}`}
            style={style}
            onClick={onClick}
        >
            {children}
        </div>
    );
}
