'use client';

import styles from './UI.module.css';

interface SparklineProps {
    data: number[];
    width?: number;
    height?: number;
}

export default function Sparkline({ data, width = 80, height = 24 }: SparklineProps) {
    if (!data.length) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    /* A single sample divides by (length - 1) = 0, producing NaN
       coordinates and an invisible path. Draw it as a flat line instead. */
    if (data.length === 1) {
        const y = height / 2;
        return (
            <svg
                className={styles.sparkline}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                aria-hidden="true"
            >
                <path className={styles.sparklinePath} d={`M 0 ${y} L ${width} ${y}`} />
            </svg>
        );
    }

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
    });

    const pathD = `M ${points.join(' L ')}`;

    return (
        <svg
            className={styles.sparkline}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            aria-hidden="true"
        >
            <path className={styles.sparklinePath} d={pathD} />
        </svg>
    );
}
