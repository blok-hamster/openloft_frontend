'use client';

import styles from './UI.module.css';

type Status = 'active' | 'idle' | 'error' | 'provisioning' | 'starting' | 'running' | 'stopped' | 'failed';

interface StatusIndicatorProps {
    status: Status;
    showLabel?: boolean;
}

const statusConfig: Record<Status, { dotClass: string; label: string }> = {
    active: { dotClass: styles.statusDotActive, label: 'Active' },
    running: { dotClass: styles.statusDotActive, label: 'Running' },
    idle: { dotClass: styles.statusDotIdle, label: 'Idle' },
    stopped: { dotClass: styles.statusDotIdle, label: 'Stopped' },
    error: { dotClass: styles.statusDotError, label: 'Error' },
    failed: { dotClass: styles.statusDotError, label: 'Failed' },
    provisioning: { dotClass: styles.statusDotProvisioning, label: 'Provisioning' },
    starting: { dotClass: styles.statusDotProvisioning, label: 'Starting' },
};

export default function StatusIndicator({ status, showLabel = true }: StatusIndicatorProps) {
    const config = statusConfig[status] || statusConfig.idle;

    return (
        <div className={styles.statusIndicator}>
            <span className={`${styles.statusDot} ${config.dotClass}`} />
            {showLabel && <span className={styles.statusLabel}>{config.label}</span>}
        </div>
    );
}
