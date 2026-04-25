# Responsive Design Guidelines (responsive.md)

** index.html addition
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">

1. **Prefer CSS `@container` queries** for component-level styling; use `ResizeObserver` only for complex JS-driven logic.
2. **Use Grid `auto-fit` with `minmax()`** for fluid, column-based layouts.
3. **Use Flexbox with `flex-wrap: wrap`** for fluid, row-based stacking.
4. **Set `width: 100%` and limit expansion with `max-width`** on main containers and wrappers.
5. **Use `clamp()` for fluid typography and spacing** (fonts, padding, margins, gaps). Reference `@design.md` for baseline values.
6. **Enforce `max-width: 100%; height: auto;`** on all images, videos, and SVGs to prevent overflow. Use `object-fit: cover` where necessary to maintain aspect ratios.
7. **Ensure minimum `44px` height/width** for all interactive touch targets (buttons, links, inputs) to guarantee mobile accessibility.
8. **Use standard viewport breakpoints (e.g., `max-width: 768px`) sparingly**, reserving them only for major architectural layout shifts (like toggling a mobile menu).
9. **Do not stop coding until all the tasks are complete.**
10. **Mobile Hardware Safe Areas:** Never hardcode pixel heights for the OS Status Bar or System Navigation. Use standard UI heights for app components and CSS `env()` variables to avoid hardware notches and navigation bars.
    * **Top App Bar:** `height: 56px; padding-top: env(safe-area-inset-top);`
    * **Bottom Nav Bar:** `height: 56px; padding-bottom: env(safe-area-inset-bottom);`
    * **Main Content Area:** Ensure the main scrolling container has `padding-bottom: env(safe-area-inset-bottom)` if there is no bottom nav.
11. **The 100vh Bug & Dynamic Viewports:** Never use `100vh` for full-screen mobile layouts, as it ignores mobile browser UI (URL bars) and causes bottom-overflow. 
    * Always use `100dvh` (Dynamic Viewport Height) or `100svh` (Small Viewport Height) for main wrappers to ensure they perfectly fit the visible screen area regardless of the browser's UI state.
    * Example: `.main-stage { min-height: 100dvh; }`