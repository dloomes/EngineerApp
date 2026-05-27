// Type-only re-export. `export type *` ensures nothing leaks into the runtime
// emitted JS, so the Azure Function bundle doesn't need to resolve @involve/shared
// at runtime — types are erased at compile time.
export type * from '@involve/shared';
