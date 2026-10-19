/**
 * Feature flags.
 *
 * The open-source NMAFC framework is ready. The two hosted products built
 * on top of it are still under construction:
 *
 *   - Hosted Harness  — running and operating agents for customers
 *   - Hosted Memory   — running and operating the memory layer for customers
 *
 * Until those are live, the account area (sign up, sign in, and everything
 * behind it) has nothing to serve, so it is gated behind a single check.
 * The public marketing and documentation surfaces stay fully available,
 * because the framework itself is the product right now.
 *
 * ---------------------------------------------------------------------------
 * These are build-time flags, not runtime and not viewport-conditional.
 *
 * They are prefixed NEXT_PUBLIC_ because Header.tsx and Hero.tsx are client
 * components and must agree with the server routes about whether sign-in
 * exists. Next.js inlines a NEXT_PUBLIC_ value into the client bundle, but it
 * does so by substituting the exact source text `process.env.NEXT_PUBLIC_X` —
 * it never evaluates anything. So every flag below is read through that
 * literal member expression, and `readFlag` is handed the value rather than
 * the name it came from. A lookup built from a variable (`process.env[name]`)
 * is invisible to the substitution: the browser's `process` shim ships an
 * empty `env`, so the flag would resolve to its fallback on the client no
 * matter what you set, while the server — which does have the variable at
 * runtime — resolved it the other way. That split is a hydration mismatch on
 * the very routes FeatureGate guards. Keep the reads literal.
 *
 * Inlining is build time, not runtime, so flipping one needs a rebuild —
 * which is the intent, since the hosted tier is not something to toggle
 * while it is being watched.
 *
 * Deliberately NOT implemented with a media query: gating by viewport would
 * make `/dashboard` behave differently on a phone and a desktop, which is
 * exactly the failure mode this is meant to avoid. The flag applies
 * identically at every screen size.
 * ---------------------------------------------------------------------------
 */

/**
 * Accepts the usual truthy/falsy spellings so the env var is forgiving.
 *
 * `name` is for the warning message only — it is deliberately NOT used to
 * look the value up, because a computed `process.env` read cannot be inlined
 * into the client bundle (see the note above). Callers pass the value itself.
 */
function readFlag(raw: string | undefined, name: string, fallback: boolean): boolean {
    if (raw === undefined || raw === '') return fallback;
    const v = raw.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(v)) return true;
    if (['false', '0', 'no', 'off'].includes(v)) return false;
    // An unrecognised value must not silently enable a feature.
    console.warn(`[features] Unrecognised value for ${name}: ${JSON.stringify(raw)}. Using ${fallback}.`);
    return fallback;
}

export const FEATURES = {
    /** Hosted agent harness — the dashboard's entire reason to exist. */
    hostedHarness: readFlag(process.env.NEXT_PUBLIC_FEATURE_HOSTED_HARNESS, 'NEXT_PUBLIC_FEATURE_HOSTED_HARNESS', false),
    /** Hosted memory tier. */
    hostedMemory: readFlag(process.env.NEXT_PUBLIC_FEATURE_HOSTED_MEMORY, 'NEXT_PUBLIC_FEATURE_HOSTED_MEMORY', false),
} as const;

/**
 * The account area is served by the hosted platform, so it opens as soon as
 * either hosted product is live — there is no need to wait for both.
 */
export function isAccountAreaEnabled(): boolean {
    return FEATURES.hostedHarness || FEATURES.hostedMemory;
}

/** True when the framework is public but nothing hosted is live yet. */
export function isPreLaunch(): boolean {
    return !isAccountAreaEnabled();
}

export const FRAMEWORK_REPO = 'https://github.com/blok-hamster/nmafc';
