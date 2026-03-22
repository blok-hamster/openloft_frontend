'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import styles from './UI.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className = '', ...props }, ref) => {
        return (
            <div className={styles.inputWrapper}>
                {label && <label className={styles.inputLabel}>{label}</label>}
                <input
                    ref={ref}
                    className={`${styles.inputField} ${error ? styles.inputFieldError : ''} ${className}`}
                    {...props}
                />
                {error && <span className={styles.inputError}>{error}</span>}
            </div>
        );
    }
);

Input.displayName = 'Input';
export default Input;
