'use client';

import styles from './UI.module.css';

/* 'paused' is returned by the agents API and already branched on in
   AgentCard, but was missing here — so paused agents rendered as a grey
   dot labelled "Idle". */
type Status = 'active' | 'idle' | 'error' | 'provisioning' | 'starting' | 'running' | 'stopped' | 'paused' | 'failed';

interface StatusIndicatorProps {
    status: Status;
    showLabel?: boolean;
}

const statusConfig: Record<Status, { dotClass: string; label: string }> = {
    active: { dotClass: styles.statusDotActive, label: 'Active' },
    running: { dotClass: styles.statusDotActive, label: 'Running' },
    idle: { dotClass: styles.statusDotIdle, label: 'Idle' },
    stopped: { dotClass: styles.statusDotIdle, label: 'Stopped' },
    paused: { dotClass: styles.statusDotPaused, label: 'Paused' },
    error: { dotClass: styles.statusDotError, label: 'Error' },
    failed: { dotClass: styles.statusDotError, label: 'Failed' },
    provisioning: { dotClass: styles.statusDotProvisioning, label: 'Provisioning' },
    starting: { dotClass: styles.statusDotProvisioning, label: 'Starting' },
};

export default function StatusIndicator({ status, showLabel = true }: StatusIndicatorProps) {
    const config = statusConfig[status] || statusConfig.idle;

    return (
        <div className={styles.statusIndicator}>
            <span
                className={`${styles.statusDot} ${config.dotClass}`}
                /* The dot is decorative; the label carries the meaning.
                   When the label is hidden the dot still needs a name. */
                aria-hidden={showLabel ? 'true' : undefined}
                role={showLabel ? undefined : 'img'}
                aria-label={showLabel ? undefined : config.label}
            />
            {showLabel && <span className={styles.statusLabel}>{config.label}</span>}
        </div>
    );
}
