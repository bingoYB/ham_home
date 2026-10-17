/**
 * `capabilities.<flag>` says whether the current build supports a feature; see `./flags.ts`.
 * Use it as `capabilities.ai && ...`, directly at the point of use, so it can be folded away.
 */
export * as capabilities from "./flags";
export { isViewAvailable } from "./capabilities";
export type { PlatformCapabilities } from "./capabilities";
