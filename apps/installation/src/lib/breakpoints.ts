// Re-export shared breakpoints. Keep import sites pointed at @/lib/breakpoints
// so the indirection can absorb app-specific overrides later if ever needed.
export { breakpoints } from '@involve/ui/breakpoints';
export type { BreakpointName } from '@involve/ui/breakpoints';
