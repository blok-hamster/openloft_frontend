'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    icon?: ReactNode;
    loading?: boolean;
}

const sizeMap = {
    sm: { padding: '0.45rem 1rem', fontSize: '0.625rem' },
    md: { padding: '0.65rem 1.5rem', fontSize: '0.6875rem' },
    lg: { padding: '0.8rem 2rem', fontSize: '0.75rem' },
};

export default function Button({
    variant = 'primary',
    size = 'md',
    icon,
    loading,
    children,
    disabled,
    style,
    ...props
}: ButtonProps) {
    const className = `btn-${variant}`;
    const sizeStyle = sizeMap[size];

    return (
        <button
            className={className}
            disabled={disabled || loading}
            style={{ ...sizeStyle, ...style }}
            {...props}
        >
            {loading ? '...' : icon}
            {children}
        </button>
    );
}
