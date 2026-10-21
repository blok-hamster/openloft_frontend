import styles from './UI.module.css';

interface SparklineProps {
    data: number[];
    width?: number;
    height?: number;
    /**
     * Fixed value range for the y axis. Defaults to the data's own min/max.
     * A decay curve passes [0, 1] so a flat series still sits at its real
     * weight instead of being stretched to the frame.
     */
    domain?: [number, number];
    /**
     * Horizontal threshold line, in the same value space as `data`.
     * The memory decay chart draws its prune threshold through here.
     */
    threshold?: number;
    /**
     * A name turns the drawing into an image for assistive tech. Without
     * one it is decoration (`aria-hidden`), which is right for a trend
     * beside a number that already says the value.
     */
    label?: string;
    /** Size the SVG from CSS instead of the width/height attributes. */
    fluid?: boolean;
    preserveAspectRatio?: string;
    /** Palette overrides: the kit owns geometry, the caller owns colour. */
    className?: string;
    lineClassName?: string;
    thresholdClassName?: string;
}

/**
 * The one sparkline. The kit version draws generic series; the memory layer
 * used to carry a second implementation for decay curves — same geometry,
 * plus a threshold line and a label. Folding both here means the curve law,
 * the auto-scaling edge cases and the single-sample guard exist once.
 */
export default function Sparkline({
    data,
    width = 80,
    height = 24,
    domain,
    threshold,
    label,
    fluid = false,
    preserveAspectRatio,
    className,
    lineClassName,
    thresholdClassName,
}: SparklineProps) {
    if (!data.length) return null;

    const [lo, hi] = domain ?? [Math.min(...data), Math.max(...data)];
    const range = hi - lo || 1;

    const svgClass = className ? `${styles.sparkline} ${className}` : styles.sparkline;
    const pathClass = lineClassName ? `${styles.sparklinePath} ${lineClassName}` : styles.sparklinePath;
    const a11y = label
        ? { role: 'img' as const, 'aria-label': label }
        : { 'aria-hidden': true as const };
    const sizing = fluid ? {} : { width, height };

    const yOf = (value: number) => height - ((value - lo) / range) * (height - 4) - 2;

    /* A single sample divides by (length - 1) = 0, producing NaN
       coordinates and an invisible path. Draw it as a flat line instead. */
    const linePath = (() => {
        if (data.length === 1) {
            const y = height / 2;
            return `M 0 ${y} L ${width} ${y}`;
        }
        const points = data.map((val, i) => {
            const x = (i / (data.length - 1)) * width;
            return `${x},${yOf(val)}`;
        });
        return `M ${points.join(' L ')}`;
    })();

    /* Threshold line spans the full viewBox in the same value mapping as the
       series. `vector-effect` keeps it a hairline when CSS stretches the SVG. */
    const thresholdLine = threshold !== undefined
        ? (() => {
              const y = height - ((threshold - lo) / range) * (height - 4) - 2;
              return { y, x1: 0, x2: width };
          })()
        : null;

    return (
        <svg
            className={svgClass}
            viewBox={`0 0 ${width} ${height}`}
            {...sizing}
            {...(preserveAspectRatio ? { preserveAspectRatio } : {})}
            {...a11y}
        >
            {thresholdLine && (
                <line
                    className={thresholdClassName ?? styles.sparklineThreshold}
                    x1={thresholdLine.x1}
                    x2={thresholdLine.x2}
                    y1={thresholdLine.y}
                    y2={thresholdLine.y}
                    vectorEffect="non-scaling-stroke"
                />
            )}
            <path className={pathClass} d={linePath} vectorEffect="non-scaling-stroke" />
        </svg>
    );
}
