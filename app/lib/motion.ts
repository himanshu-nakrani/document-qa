/**
 * Motion presets aligned with the CSS --motion-* tokens.
 * Durations stay in the 150–300ms band; always respect reduced-motion
 * (enforced globally via [data-motion="reduced"] and prefers-reduced-motion).
 */

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Quick state change: hovers, chips, small reveals. */
export const transitionFast = { duration: 0.15, ease: EASE_OUT } as const;

/** Default UI transition: panels, modals, list rows. */
export const transitionNormal = { duration: 0.25, ease: EASE_OUT } as const;

/** Larger entrances: page sections, hero cards. */
export const transitionSlow = { duration: 0.4, ease: EASE_OUT } as const;

/** Framer variants for staggered container/item entrances. */
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
} as const;

export const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: transitionNormal },
} as const;
