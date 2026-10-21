/**
 * Full-bleed brand glows behind the hero.
 *
 * It is rendered outside the page container, so no ancestor clips a glow into a visible
 * rectangle. Each glow is a radial gradient that is already transparent at its own box edge,
 * and the layer fades out at the top and bottom (see .hero-backdrop in globals.css).
 */
export function HeroBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="hero-backdrop pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="hero-glow-a absolute -left-[10%] -top-40 aspect-square w-[min(48rem,130vw)]" />
      <div className="hero-glow-b absolute -bottom-24 -right-[14%] aspect-square w-[min(50rem,120vw)]" />
    </div>
  );
}
