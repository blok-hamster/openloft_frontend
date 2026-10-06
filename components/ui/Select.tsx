'use client';

import { SelectHTMLAttributes, forwardRef, useId } from 'react';
import styles from './UI.module.css';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: { value: string; label: string; disabled?: boolean }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, options, className = '', id, ...props }, ref) => {
        const generatedId = useId();
        const selectId = id ?? generatedId;
        const errorId = `${selectId}-error`;

        return (
            <div className={styles.inputWrapper}>
                {label && (
                    <label className={styles.inputLabel} htmlFor={selectId}>
                        {label}
                    </label>
                )}
                <select
                    ref={ref}
                    id={selectId}
                    className={`${styles.selectField} ${error ? styles.inputFieldError : ''} ${className}`}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    {...props}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                {error && (
                    <span className={styles.inputError} id={errorId} role="alert">
                        {error}
                    </span>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';
export default Select;
