'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import styles from './UI.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, icon, className = '', ...props }, ref) => {
        return (
            <div className={styles.inputWrapper}>
                {label && <label className={styles.inputLabel}>{label}</label>}
                <div style={{ position: 'relative', width: '100%' }}>
                    {icon && (
                        <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`${styles.inputField} ${error ? styles.inputFieldError : ''} ${className}`}
                        style={{ paddingLeft: icon ? '2.5rem' : '0.75rem', ...props.style }}
                        {...props}
                    />
                </div>
                {error && <span className={styles.inputError}>{error}</span>}
            </div>
        );
    }
);

Input.displayName = 'Input';
export default Input;
