'use client';

import { SelectHTMLAttributes, forwardRef } from 'react';
import styles from './UI.module.css';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: { value: string; label: string; disabled?: boolean }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, options, className = '', ...props }, ref) => {
        return (
            <div className={styles.inputWrapper}>
                {label && <label className={styles.inputLabel}>{label}</label>}
                <select
                    ref={ref}
                    className={`${styles.selectField} ${error ? styles.inputFieldError : ''} ${className}`}
                    {...props}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                {error && <span className={styles.inputError}>{error}</span>}
            </div>
        );
    }
);

Select.displayName = 'Select';
export default Select;
