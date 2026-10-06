'use client';

import { InputHTMLAttributes, forwardRef, useId } from 'react';
import styles from './UI.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, icon, className = '', id, ...props }, ref) => {
        const generatedId = useId();
        /* Respect a caller-supplied id so a <label htmlFor> elsewhere
           (e.g. the billing coupon field) still resolves. */
        const inputId = id ?? generatedId;
        const errorId = `${inputId}-error`;

        return (
            <div className={styles.inputWrapper}>
                {label && (
                    <label className={styles.inputLabel} htmlFor={inputId}>
                        {label}
                    </label>
                )}
                <div className={styles.inputControl}>
                    {icon && <span className={styles.inputIconLeft} aria-hidden="true">{icon}</span>}
                    <input
                        ref={ref}
                        id={inputId}
                        className={`${styles.inputField} ${error ? styles.inputFieldError : ''} ${icon ? styles.inputFieldWithIcon : ''} ${className}`}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? errorId : undefined}
                        {...props}
                    />
                </div>
                {error && (
                    <span className={styles.inputError} id={errorId} role="alert">
                        {error}
                    </span>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
export default Input;
