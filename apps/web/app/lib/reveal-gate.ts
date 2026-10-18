/**
 * Progressive-enhancement gate for scroll-reveal blocks (see `Reveal` and `globals.css`).
 *
 * Reveal blocks are hidden only while <html> carries REVEAL_GATE_CLASS. An inline script in
 * <head> adds it before the body paints, so revealed content never flashes. Once the client has
 * hydrated, `Reveal` adds REVEAL_READY_CLASS and takes over. If that has not happened within
 * REVEAL_FALLBACK_MS (slow or blocked bundles, a hydration error), the script drops the gate and
 * every block shows. Without JavaScript the gate is never set, so the static HTML is fully visible.
 */
export const REVEAL_GATE_CLASS = 'reveal-gate';
export const REVEAL_READY_CLASS = 'reveal-ready';
export const REVEAL_FALLBACK_MS = 3000;

// ES5 on purpose: it runs before any bundle and must not depend on transpilation.
export const REVEAL_GATE_SCRIPT = `(function(r){r.classList.add('${REVEAL_GATE_CLASS}');setTimeout(function(){if(!r.classList.contains('${REVEAL_READY_CLASS}'))r.classList.remove('${REVEAL_GATE_CLASS}')},${REVEAL_FALLBACK_MS})})(document.documentElement)`;
