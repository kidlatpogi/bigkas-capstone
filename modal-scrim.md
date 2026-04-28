# Bigkas Modal Scrim Design System

## Overview
To maintain visual consistency across the Bigkas application, all modals, dialogs, bottom sheets, and overlays must use a unified backdrop scrim. This prevents varying levels of darkness and blur from creating a disjointed user experience.

## The Global CSS Class
The centralized scrim is handled by the `.bigkas-modal-scrim` class, located in our global stylesheet.

```css
.bigkas-modal-scrim {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5); /* Slate 900 @ 50% */
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: var(--scrim-z, 1000); /* Default z-index of 1000 */
}