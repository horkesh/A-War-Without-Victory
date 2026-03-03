/// <reference types="vite/client" />

/** Injected at build time by vite.config.ts define; used for desktop map bundle version badge. */
declare const __MAP_BUILD_TIME__: string;

declare module '*.json' {
  const value: unknown;
  export default value;
}
