# Bigkas Mobile UI Polish & Layout Fixes Plan

This document outlines the systematic, phase-by-phase execution plan to resolve global scrollbar visibility, animation hardware acceleration, complex overlapping elements on the Progress page, scroll bounds on the Home map, horizontally scrolling tabs, and centered layouts for settings pages.

***

## Phase 1: Global - Invisible Scrollbars
**Objective:** Hide all scrollbars across the application on mobile views, while retaining full native scrolling functionality.
* **Step 1.1:** Open `src/styles/globals.css` (or `src/styles/mobileViewport.css`).
* **Step 1.2:** Add a global CSS block targeting all scrollable elements inside a mobile media query (`@media (max-width: 768px)`):
  ```css
  /* Firefox */
  * {
    scrollbar-width: none;
  }
  /* IE/Edge */
  * {
    -ms-overflow-style: none;
  }
  /* Chrome/Safari/Webkit */
  *::-webkit-scrollbar {
    display: none;
  }

  ## Phase 2: Global - Capacitor Animation Hardware Acceleration
Objective: Ensure CSS animations fire smoothly within the Capacitor WebView. WebViews sometimes drop animations to save memory unless hardware acceleration is explicitly triggered.

Step 2.1: Open src/styles/globals.css.

Step 2.2: Target the global classes used for animations (e.g., .fade-in, .slide-up, or specific animated wrappers like .dashboard-card).

Step 2.3: Add transform: translateZ(0); and will-change: transform, opacity; to these animated classes. This forces the mobile GPU to render the layers, preventing the WebView from culling the animations.

## Phase 3: Progress Page - Header & Pillar Stacking Fix
Objective: Resolve the overlapping issue where .progress-pillars-header sits on top of cards, and pillars overlap the action buttons.

Step 3.1: Open src/pages/main/ProgressPage.css.

Step 3.2: Target .progress-pillars-header. Change its positioning to position: relative; z-index: 10;.

Step 3.3: Add a distinct margin-bottom: 24px; to .progress-pillars-header to forcefully push the subsequent cards downward.

Step 3.4: Target the container holding the action buttons (e.g., the toggles for History/Pillars). Ensure it has position: relative; z-index: 20; so it strictly sits above the pillar graphic elements.

Step 3.5: If .progress-pillars-header is using absolute positioning, completely remove position: absolute inside the mobile media query and restore it to display: flex; flex-direction: column; within the normal document flow.

## Markdown
# Bigkas Mobile UI Polish & Layout Fixes Plan

This document outlines the systematic, phase-by-phase execution plan to resolve global scrollbar visibility, animation hardware acceleration, complex overlapping elements on the Progress page, scroll bounds on the Home map, horizontally scrolling tabs, and centered layouts for settings pages.

***

## Phase 1: Global - Invisible Scrollbars
**Objective:** Hide all scrollbars across the application on mobile views, while retaining full native scrolling functionality.
* **Step 1.1:** Open `src/styles/globals.css` (or `src/styles/mobileViewport.css`).
* **Step 1.2:** Add a global CSS block targeting all scrollable elements inside a mobile media query (`@media (max-width: 768px)`):
  ```css
  /* Firefox */
  * {
    scrollbar-width: none;
  }
  /* IE/Edge */
  * {
    -ms-overflow-style: none;
  }
  /* Chrome/Safari/Webkit */
  *::-webkit-scrollbar {
    display: none;
  }
Phase 2: Global - Capacitor Animation Hardware Acceleration
Objective: Ensure CSS animations fire smoothly within the Capacitor WebView. WebViews sometimes drop animations to save memory unless hardware acceleration is explicitly triggered.

Step 2.1: Open src/styles/globals.css.

Step 2.2: Target the global classes used for animations (e.g., .fade-in, .slide-up, or specific animated wrappers like .dashboard-card).

Step 2.3: Add transform: translateZ(0); and will-change: transform, opacity; to these animated classes. This forces the mobile GPU to render the layers, preventing the WebView from culling the animations.

Phase 3: Progress Page - Header & Pillar Stacking Fix
Objective: Resolve the overlapping issue where .progress-pillars-header sits on top of cards, and pillars overlap the action buttons.

Step 3.1: Open src/pages/main/ProgressPage.css.

Step 3.2: Target .progress-pillars-header. Change its positioning to position: relative; z-index: 10;.

Step 3.3: Add a distinct margin-bottom: 24px; to .progress-pillars-header to forcefully push the subsequent cards downward.

Step 3.4: Target the container holding the action buttons (e.g., the toggles for History/Pillars). Ensure it has position: relative; z-index: 20; so it strictly sits above the pillar graphic elements.

Step 3.5: If .progress-pillars-header is using absolute positioning, completely remove position: absolute inside the mobile media query and restore it to display: flex; flex-direction: column; within the normal document flow.

Phase 4: Home (Activity) Page - Map Header Margin Reduction
Objective: Tighten the layout by pulling the .skyward-journey-anim-header up on mobile devices.

Step 4.1: Open src/components/journey/SkywardJourney.css.

Step 4.2: Locate or add a mobile media query: @media (max-width: 768px).

Step 4.3: Target .skyward-journey-anim-header (or the equivalent header wrapper).

Step 4.4: Apply margin-top: 16px; (or a significantly smaller value than what is used on desktop, which might be around 40px+). Check that it doesn't collide with the MobileTopBar.

## Markdown
# Bigkas Mobile UI Polish & Layout Fixes Plan

This document outlines the systematic, phase-by-phase execution plan to resolve global scrollbar visibility, animation hardware acceleration, complex overlapping elements on the Progress page, scroll bounds on the Home map, horizontally scrolling tabs, and centered layouts for settings pages.

***

## Phase 1: Global - Invisible Scrollbars
**Objective:** Hide all scrollbars across the application on mobile views, while retaining full native scrolling functionality.
* **Step 1.1:** Open `src/styles/globals.css` (or `src/styles/mobileViewport.css`).
* **Step 1.2:** Add a global CSS block targeting all scrollable elements inside a mobile media query (`@media (max-width: 768px)`):
  ```css
  /* Firefox */
  * {
    scrollbar-width: none;
  }
  /* IE/Edge */
  * {
    -ms-overflow-style: none;
  }
  /* Chrome/Safari/Webkit */
  *::-webkit-scrollbar {
    display: none;
  }
Phase 2: Global - Capacitor Animation Hardware Acceleration
Objective: Ensure CSS animations fire smoothly within the Capacitor WebView. WebViews sometimes drop animations to save memory unless hardware acceleration is explicitly triggered.

Step 2.1: Open src/styles/globals.css.

Step 2.2: Target the global classes used for animations (e.g., .fade-in, .slide-up, or specific animated wrappers like .dashboard-card).

Step 2.3: Add transform: translateZ(0); and will-change: transform, opacity; to these animated classes. This forces the mobile GPU to render the layers, preventing the WebView from culling the animations.

Phase 3: Progress Page - Header & Pillar Stacking Fix
Objective: Resolve the overlapping issue where .progress-pillars-header sits on top of cards, and pillars overlap the action buttons.

Step 3.1: Open src/pages/main/ProgressPage.css.

Step 3.2: Target .progress-pillars-header. Change its positioning to position: relative; z-index: 10;.

Step 3.3: Add a distinct margin-bottom: 24px; to .progress-pillars-header to forcefully push the subsequent cards downward.

Step 3.4: Target the container holding the action buttons (e.g., the toggles for History/Pillars). Ensure it has position: relative; z-index: 20; so it strictly sits above the pillar graphic elements.

Step 3.5: If .progress-pillars-header is using absolute positioning, completely remove position: absolute inside the mobile media query and restore it to display: flex; flex-direction: column; within the normal document flow.

Phase 4: Home (Activity) Page - Map Header Margin Reduction
Objective: Tighten the layout by pulling the .skyward-journey-anim-header up on mobile devices.

Step 4.1: Open src/components/journey/SkywardJourney.css.

Step 4.2: Locate or add a mobile media query: @media (max-width: 768px).

Step 4.3: Target .skyward-journey-anim-header (or the equivalent header wrapper).

Step 4.4: Apply margin-top: 16px; (or a significantly smaller value than what is used on desktop, which might be around 40px+). Check that it doesn't collide with the MobileTopBar.

Phase 5: Home (Activity) Page - Bottom Scroll Boundary
Objective: Stop the user from scrolling into a massive empty void below the first node on the Skyward Journey map.

Step 5.1: Open src/components/journey/SkywardJourney.css.

Step 5.2: Target the .skyward-journey-column (the specific container holding the SVG path and nodes).

Step 5.3: Inside the mobile media query, drastically reduce the padding at the bottom. Use padding-bottom: 80px; (just enough to clear the BottomNav and safely show the first node).

Step 5.4: Verify .skyward-journey-map-viewport has overflow-y: auto and overscroll-behavior-y: contain to strictly respect the new bottom boundary.

## Markdown
# Bigkas Mobile UI Polish & Layout Fixes Plan

This document outlines the systematic, phase-by-phase execution plan to resolve global scrollbar visibility, animation hardware acceleration, complex overlapping elements on the Progress page, scroll bounds on the Home map, horizontally scrolling tabs, and centered layouts for settings pages.

***

## Phase 1: Global - Invisible Scrollbars
**Objective:** Hide all scrollbars across the application on mobile views, while retaining full native scrolling functionality.
* **Step 1.1:** Open `src/styles/globals.css` (or `src/styles/mobileViewport.css`).
* **Step 1.2:** Add a global CSS block targeting all scrollable elements inside a mobile media query (`@media (max-width: 768px)`):
  ```css
  /* Firefox */
  * {
    scrollbar-width: none;
  }
  /* IE/Edge */
  * {
    -ms-overflow-style: none;
  }
  /* Chrome/Safari/Webkit */
  *::-webkit-scrollbar {
    display: none;
  }
Phase 2: Global - Capacitor Animation Hardware Acceleration
Objective: Ensure CSS animations fire smoothly within the Capacitor WebView. WebViews sometimes drop animations to save memory unless hardware acceleration is explicitly triggered.

Step 2.1: Open src/styles/globals.css.

Step 2.2: Target the global classes used for animations (e.g., .fade-in, .slide-up, or specific animated wrappers like .dashboard-card).

Step 2.3: Add transform: translateZ(0); and will-change: transform, opacity; to these animated classes. This forces the mobile GPU to render the layers, preventing the WebView from culling the animations.

Phase 3: Progress Page - Header & Pillar Stacking Fix
Objective: Resolve the overlapping issue where .progress-pillars-header sits on top of cards, and pillars overlap the action buttons.

Step 3.1: Open src/pages/main/ProgressPage.css.

Step 3.2: Target .progress-pillars-header. Change its positioning to position: relative; z-index: 10;.

Step 3.3: Add a distinct margin-bottom: 24px; to .progress-pillars-header to forcefully push the subsequent cards downward.

Step 3.4: Target the container holding the action buttons (e.g., the toggles for History/Pillars). Ensure it has position: relative; z-index: 20; so it strictly sits above the pillar graphic elements.

Step 3.5: If .progress-pillars-header is using absolute positioning, completely remove position: absolute inside the mobile media query and restore it to display: flex; flex-direction: column; within the normal document flow.

Phase 4: Home (Activity) Page - Map Header Margin Reduction
Objective: Tighten the layout by pulling the .skyward-journey-anim-header up on mobile devices.

Step 4.1: Open src/components/journey/SkywardJourney.css.

Step 4.2: Locate or add a mobile media query: @media (max-width: 768px).

Step 4.3: Target .skyward-journey-anim-header (or the equivalent header wrapper).

Step 4.4: Apply margin-top: 16px; (or a significantly smaller value than what is used on desktop, which might be around 40px+). Check that it doesn't collide with the MobileTopBar.

Phase 5: Home (Activity) Page - Bottom Scroll Boundary
Objective: Stop the user from scrolling into a massive empty void below the first node on the Skyward Journey map.

Step 5.1: Open src/components/journey/SkywardJourney.css.

Step 5.2: Target the .skyward-journey-column (the specific container holding the SVG path and nodes).

Step 5.3: Inside the mobile media query, drastically reduce the padding at the bottom. Use padding-bottom: 80px; (just enough to clear the BottomNav and safely show the first node).

Step 5.4: Verify .skyward-journey-map-viewport has overflow-y: auto and overscroll-behavior-y: contain to strictly respect the new bottom boundary.

Phase 6: Learn (Frameworks) Page - Tab Scrolling
Objective: Make the category tabs (.fh-tabs or equivalent) horizontally scrollable so they don't wrap awkwardly or get cut off on narrow screens.

Step 6.1: Open src/pages/main/FrameworksPage.css (or src/components/common/FilterTabs.css where the tabs are styled).

Step 6.2: Target the .fh-tabs container inside a mobile media query.

Step 6.3: Apply the following CSS properties:

display: flex;
overflow-x: auto;
white-space: nowrap;
flex-wrap: nowrap;
padding-bottom: 8px; /* Room for touch interaction */
scroll-behavior: smooth;
-webkit-overflow-scrolling: touch; /* Momentum scrolling on iOS */

## Markdown
# Bigkas Mobile UI Polish & Layout Fixes Plan

This document outlines the systematic, phase-by-phase execution plan to resolve global scrollbar visibility, animation hardware acceleration, complex overlapping elements on the Progress page, scroll bounds on the Home map, horizontally scrolling tabs, and centered layouts for settings pages.

***

## Phase 1: Global - Invisible Scrollbars
**Objective:** Hide all scrollbars across the application on mobile views, while retaining full native scrolling functionality.
* **Step 1.1:** Open `src/styles/globals.css` (or `src/styles/mobileViewport.css`).
* **Step 1.2:** Add a global CSS block targeting all scrollable elements inside a mobile media query (`@media (max-width: 768px)`):
  ```css
  /* Firefox */
  * {
    scrollbar-width: none;
  }
  /* IE/Edge */
  * {
    -ms-overflow-style: none;
  }
  /* Chrome/Safari/Webkit */
  *::-webkit-scrollbar {
    display: none;
  }
Phase 2: Global - Capacitor Animation Hardware Acceleration
Objective: Ensure CSS animations fire smoothly within the Capacitor WebView. WebViews sometimes drop animations to save memory unless hardware acceleration is explicitly triggered.

Step 2.1: Open src/styles/globals.css.

Step 2.2: Target the global classes used for animations (e.g., .fade-in, .slide-up, or specific animated wrappers like .dashboard-card).

Step 2.3: Add transform: translateZ(0); and will-change: transform, opacity; to these animated classes. This forces the mobile GPU to render the layers, preventing the WebView from culling the animations.

Phase 3: Progress Page - Header & Pillar Stacking Fix
Objective: Resolve the overlapping issue where .progress-pillars-header sits on top of cards, and pillars overlap the action buttons.

Step 3.1: Open src/pages/main/ProgressPage.css.

Step 3.2: Target .progress-pillars-header. Change its positioning to position: relative; z-index: 10;.

Step 3.3: Add a distinct margin-bottom: 24px; to .progress-pillars-header to forcefully push the subsequent cards downward.

Step 3.4: Target the container holding the action buttons (e.g., the toggles for History/Pillars). Ensure it has position: relative; z-index: 20; so it strictly sits above the pillar graphic elements.

Step 3.5: If .progress-pillars-header is using absolute positioning, completely remove position: absolute inside the mobile media query and restore it to display: flex; flex-direction: column; within the normal document flow.

Phase 4: Home (Activity) Page - Map Header Margin Reduction
Objective: Tighten the layout by pulling the .skyward-journey-anim-header up on mobile devices.

Step 4.1: Open src/components/journey/SkywardJourney.css.

Step 4.2: Locate or add a mobile media query: @media (max-width: 768px).

Step 4.3: Target .skyward-journey-anim-header (or the equivalent header wrapper).

Step 4.4: Apply margin-top: 16px; (or a significantly smaller value than what is used on desktop, which might be around 40px+). Check that it doesn't collide with the MobileTopBar.

Phase 5: Home (Activity) Page - Bottom Scroll Boundary
Objective: Stop the user from scrolling into a massive empty void below the first node on the Skyward Journey map.

Step 5.1: Open src/components/journey/SkywardJourney.css.

Step 5.2: Target the .skyward-journey-column (the specific container holding the SVG path and nodes).

Step 5.3: Inside the mobile media query, drastically reduce the padding at the bottom. Use padding-bottom: 80px; (just enough to clear the BottomNav and safely show the first node).

Step 5.4: Verify .skyward-journey-map-viewport has overflow-y: auto and overscroll-behavior-y: contain to strictly respect the new bottom boundary.

Phase 6: Learn (Frameworks) Page - Tab Scrolling
Objective: Make the category tabs (.fh-tabs or equivalent) horizontally scrollable so they don't wrap awkwardly or get cut off on narrow screens.

Step 6.1: Open src/pages/main/FrameworksPage.css (or src/components/common/FilterTabs.css where the tabs are styled).

Step 6.2: Target the .fh-tabs container inside a mobile media query.

Step 6.3: Apply the following CSS properties:

CSS
display: flex;
overflow-x: auto;
white-space: nowrap;
flex-wrap: nowrap;
padding-bottom: 8px; /* Room for touch interaction */
scroll-behavior: smooth;
-webkit-overflow-scrolling: touch; /* Momentum scrolling on iOS */
Phase 7: Settings Pages - Fit and Center
Objective: Ensure the ChangePasswordPage and AccountSettingsPage are perfectly centered vertically without unnecessary scrolling if the content fits the screen.

Step 7.1: Open src/pages/main/ChangePasswordPage.css and src/pages/main/AccountSettingsPage.css (or the shared InnerPages.css).

Step 7.2: Target the main wrapper for these pages (e.g., .settings-container or .inner-page-wrapper).

Step 7.3: Inside the mobile media query, apply the following layout logic:

min-height: calc(100dvh - 160px); /* 100dvh minus TopBar and BottomNav */
display: flex;
flex-direction: column;
justify-content: center; /* Centers content vertically */
align-items: center;     /* Centers content horizontally */
overflow-y: auto;        /* ONLY scrolls if content exceeds the min-height */
padding: var(--mobile-px);

Step 7.4: Ensure the internal form containers (e.g., .settings-form-card) have width: 100%; and max-width: 400px; so they don't stretch unnaturally but respond nicely to the centering.
