import '@testing-library/jest-dom/vitest';

/**
 * Test environment shims.
 *
 * jsdom implements neither of these, and both are used by the dashboard:
 * `matchMedia` by anything reading a breakpoint, `IntersectionObserver` by the
 * lazy Spline scene in components/landing/Hero.tsx. Without them a render test
 * fails on the browser API rather than on the component.
 */
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }

  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = '';
      thresholds: number[] = [];
    } as unknown as typeof IntersectionObserver;
  }
}
