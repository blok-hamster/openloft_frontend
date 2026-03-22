'use client';

import styles from './UI.module.css';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
}

export default function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
    return (
        <div
            className={styles.toggle}
            onClick={() => !disabled && onChange(!checked)}
            role="switch"
            aria-checked={checked}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!disabled) onChange(!checked);
                }
            }}
            style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
            <div className={`${styles.toggleTrack} ${checked ? styles.toggleTrackActive : ''}`}>
                <div className={`${styles.toggleThumb} ${checked ? styles.toggleThumbActive : ''}`} />
            </div>
            {label && <span className={styles.toggleLabel}>{label}</span>}
        </div>
    );
}
