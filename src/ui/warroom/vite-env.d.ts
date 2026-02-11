/**
 * Vite asset URL imports (?url suffix) — used by warroom.ts for image paths.
 * Root tsconfig includes src/, so this declaration is picked up when typechecking.
 */
declare module '*?url' {
    const url: string;
    export default url;
}
