'use client';

import styles from './UI.module.css';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    /** Accessible name for the switch when no visible label is rendered.
     *  Required in practice — a switch with neither is unlabelled. */
    ariaLabel?: string;
    disabled?: boolean;
}

export default function Toggle({ checked, onChange, label, ariaLabel, disabled }: ToggleProps) {
    return (
        <div
            className={`${styles.toggle} ${disabled ? styles.toggleDisabled : ''}`}
            onClick={() => !disabled && onChange(!checked)}
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            aria-disabled={disabled || undefined}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!disabled) onChange(!checked);
                }
            }}
        >
            <span className={styles.toggleTrack} aria-hidden="true">
                <span className={`${styles.toggleThumb} ${checked ? styles.toggleThumbActive : ''}`} />
            </span>
            {label && <span className={styles.toggleLabel}>{label}</span>}
        </div>
    );
}
