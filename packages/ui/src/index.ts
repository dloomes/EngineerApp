export { Layout } from './components/Layout';
export type { LayoutProps } from './components/Layout';

export { LookupPanel } from './components/LookupPanel';
export type { LookupPanelProps } from './components/LookupPanel';

export { SegmentedControl } from './components/SegmentedControl';
export type { SegmentedControlProps } from './components/SegmentedControl';

// Scanner is intentionally NOT re-exported from the barrel — it pulls in
// @zxing/browser (~400KB) and should only be loaded by screens that need it.
// Import directly: `import('@involve/ui/scanner')` or via React.lazy.
export type { ScannerProps } from './components/Scanner';

export { WarningBanner } from './components/WarningBanner';
export type { WarningBannerProps } from './components/WarningBanner';

export * from './lib/tokens';
export * from './lib/breakpoints';
