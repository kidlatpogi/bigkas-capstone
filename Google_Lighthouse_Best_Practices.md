# Google Lighthouse: Comprehensive Coding Best Practices & Standards

Google Lighthouse is an open-source, automated tool for improving the quality of web pages. It audits pages across four primary pillars: **Performance**, **Accessibility**, **Best Practices**, and **SEO**. Adhering to these standards ensures your web applications are fast, inclusive, secure, and discoverable.

This document outlines the coding standards, architectural strategies, and specific techniques required to achieve 100/100 scores across all Lighthouse categories.

---

## 1. Performance 🚀
Performance focuses on how quickly a page loads, becomes interactive, and maintains visual stability. It heavily weighs **Core Web Vitals**: Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), and Total Blocking Time (TBT).

### 1.1 Optimize Images and Media
Images are often the largest payload on a web page.
* **Next-Gen Formats:** Always serve images in modern formats like WebP or AVIF instead of JPEG or PNG.
* **Responsive Images:** Use the `<picture>` element and `srcset` attribute to serve appropriately sized images based on the user's device.
    ```html
    <picture>
      <source srcset="hero-large.webp" media="(min-width: 800px)" type="image/webp">
      <source srcset="hero-small.webp" type="image/webp">
      <img src="hero-large.jpg" alt="Hero background" width="1200" height="800">
    </picture>
    ```
* **Lazy Loading:** Add `loading="lazy"` to all images and iframes below the fold to defer loading until they enter the viewport.
* **Explicit Dimensions:** Always provide `width` and `height` attributes for images and videos to prevent layout shifts (improving CLS).

### 1.2 Eliminate Render-Blocking Resources
Browsers must parse HTML and execute CSS/JS before painting the page. Minimizing blocking resources is critical for a fast First Contentful Paint (FCP).
* **Defer JavaScript:** Use `defer` or `async` on non-critical script tags. `defer` is generally preferred as it executes scripts in order after DOM parsing.
    ```html
    <script src="app.js" defer></script>
    ```
* **Inline Critical CSS:** Extract and inline the CSS required for the above-the-fold content directly into the `<head>`, and load the rest asynchronously.
* **Preconnect & DNS-Prefetch:** Establish early connections to important third-party origins (e.g., CDNs, Google Fonts).
    ```html
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="dns-prefetch" href="https://fonts.googleapis.com">
    ```

### 1.3 Code Minification & Compression
* **Minify Assets:** Strip whitespace, comments, and unused code from CSS, JS, and HTML using bundlers like Webpack, Vite, or Rollup.
* **Text Compression:** Ensure your server is configured to serve text-based assets with Gzip or Brotli compression. Brotli is highly recommended for superior compression ratios.

### 1.4 Optimize Web Fonts
Web fonts can cause "Flash of Unstyled Text" (FOUT) or "Flash of Invisible Text" (FOIT).
* **Font Display:** Use `font-display: swap;` in your `@font-face` declarations to instruct the browser to use a fallback system font until the custom font is ready.
    ```css
    @font-face {
      font-family: 'Open Sans';
      src: url('opensans.woff2') format('woff2');
      font-display: swap;
    }
    ```

---

## 2. Accessibility (a11y) ♿
Accessibility ensures your web application is usable by everyone, including people with disabilities relying on assistive technologies like screen readers.

### 2.1 Semantic HTML
Use native HTML elements according to their intended purpose.
* **Landmarks:** Structure your layout using `<header>`, `<nav>`, `<main>`, `<article>`, `<aside>`, and `<footer>`.
* **Buttons vs. Links:** Use `<button>` for actions (e.g., submitting a form, opening a modal) and `<a>` for navigation (changing URLs). Never use a `<div>` or `<span>` with an `onclick` handler as a button without adding proper roles and keyboard event listeners.
* **Heading Hierarchy:** Maintain a strictly logical heading order (`<h1>` through `<h6>`). Do not skip levels (e.g., jumping from `<h2>` to `<h4>`).

### 2.2 ARIA Attributes (Accessible Rich Internet Applications)
Use ARIA attributes only when native HTML falls short.
* **aria-label & aria-labelledby:** Provide descriptive labels for interactive elements that lack visible text (e.g., an icon-only button).
    ```html
    <button aria-label="Close menu">
      <svg>...</svg> <!-- Close icon -->
    </button>
    ```
* **aria-expanded & aria-hidden:** Use state attributes to inform screen readers about the dynamic state of UI components like accordions or modals.

### 2.3 Color Contrast & Visuals
* **Contrast Ratio:** Ensure text and interactive elements have a contrast ratio of at least 4.5:1 against their background (3:1 for large text) to meet WCAG AA standards.
* **Alt Text:** Every `<img>` tag must have an `alt` attribute. Use descriptive text for informative images, and an empty string (`alt=""`) for purely decorative images so screen readers ignore them.

### 2.4 Keyboard Navigation
* **Focus Management:** Ensure every interactive element is reachable via the `Tab` key. Outline styles (`:focus` or `:focus-visible`) must be clearly visible; **never** use `outline: none;` without providing a custom visual focus state.
* **Skip Links:** Provide a "Skip to content" link at the top of the page for keyboard users to bypass repetitive navigation links.

---

## 3. Best Practices 🛠️
This category ensures your code is modern, secure, and avoids deprecated APIs that could harm user experience.

### 3.1 Security First
* **HTTPS:** Serve all traffic over HTTPS. Ensure any external assets (images, scripts, stylesheets) are also loaded via HTTPS to avoid mixed-content errors.
* **Cross-Origin Links:** When using `target="_blank"` on external links, always include `rel="noopener noreferrer"` to prevent the newly opened page from accessing the `window.opener` object, which is a security and performance risk.
    ```html
    <a href="https://external-site.com" target="_blank" rel="noopener noreferrer">External Link</a>
    ```

### 3.2 Code Hygiene & Deprecations
* **Doctype:** Always start HTML documents with `<!DOCTYPE html>` to trigger standard rendering mode.
* **Avoid document.write():** Never use `document.write()`. It can block page rendering significantly, especially for users on slow connections.
* **Keep Libraries Updated:** Regularly audit your dependencies (e.g., using `npm audit`) to ensure you are not using libraries with known security vulnerabilities.
* **Passive Event Listeners:** Use `passive: true` for `wheel` and `touchstart` event listeners to improve scrolling performance.
    ```javascript
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    ```

---

## 4. SEO (Search Engine Optimization) 🔍
SEO standards ensure your page is easily discoverable, crawlable, and understandable by search engine bots.

### 4.1 Meta Tags & Document Structure
* **Viewport Meta Tag:** Always include a viewport tag to ensure mobile-friendliness.
    ```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ```
* **Title & Description:** Every page must have a unique `<title>` and a concise `<meta name="description">`.
* **Canonical Links:** Use canonical tags to indicate the preferred URL for a page and avoid duplicate content penalties.
    ```html
    <link rel="canonical" href="https://yourdomain.com/page-url">
    ```

### 4.2 Crawlability
* **Robots.txt:** Ensure your `robots.txt` file does not accidentally block search engines from crawling important pages.
* **Valid HTTP Status Codes:** Ensure successful pages return a `200 OK` status, and missing pages return a `404 Not Found`.

### 4.3 Content Discoverability
* **Descriptive Anchor Text:** Link text must be descriptive. Avoid generic phrases like "click here" or "read more".
    * *Bad:* `<a href="/guide">Click here</a> to read our performance guide.`
    * *Good:* `Read our <a href="/guide">performance optimization guide</a>.`
* **Structured Data:** Implement JSON-LD structured data to help search engines understand the context of your content (e.g., Articles, Products, Recipes, Reviews).
* **Image SEO:** Use descriptive filenames (e.g., `red-running-shoes.jpg` instead of `IMG123.jpg`) alongside descriptive `alt` text.

---

## Conclusion
Achieving a perfect 100/100 Lighthouse score requires an ongoing commitment to best practices. Incorporate Lighthouse auditing into your CI/CD pipeline using tools like **Lighthouse CI** to catch regressions automatically before they hit production.
