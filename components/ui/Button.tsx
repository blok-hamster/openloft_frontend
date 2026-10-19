import { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './UI.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    icon?: ReactNode;
    loading?: boolean;
    fullWidth?: boolean;
}

const sizeClass = {
    sm: styles.btnSizeSm,
    md: styles.btnSizeMd,
    lg: styles.btnSizeLg,
};

export default function Button({
    variant = 'primary',
    size = 'md',
    icon,
    loading,
    fullWidth,
    children,
    disabled,
    style,
    className,
    ...props
}: ButtonProps) {
    const classes = [`btn-${variant}`, styles.btnBase, sizeClass[size]];
    if (fullWidth) classes.push(styles.btnFullWidth);
    if (className) classes.push(className);

    return (
        <button
            className={classes.join(' ')}
            disabled={disabled || loading}
            style={style}
            {...props}
        >
            {loading ? '...' : icon}
            {children}
        </button>
    );
}
