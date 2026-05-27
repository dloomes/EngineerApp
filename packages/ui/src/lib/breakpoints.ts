export const breakpoints = {
  mobile: 0,
  desktop: 768,
} as const;

export type BreakpointName = keyof typeof breakpoints;
