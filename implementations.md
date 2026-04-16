# Bigkas UI/UX & Mobile Responsiveness Master Plan

This document outlines a comprehensive, phase-by-phase execution plan to resolve global styling issues, mobile history toggling, complex scroll boundaries, and UI overlap problems.

***

## Phase 1: Global - Bottom Navigation Theme Synchronization
**Objective:** Match the `BottomNav` mobile styling to the desktop `SideNav` (Railway Navigation) so the branding is consistent across devices.
* **Step 1.1:** Open `src/components/common/BottomNav.css`.
* **Step 1.2:** Update the `.bottom-nav` class. Replace the solid white background with the `SideNav` gradient: `background: linear-gradient(160deg, rgba(90, 120, 99, 0.96) 0%, rgba(74, 103, 84, 0.94) 100%);`, remove the `border-top`, and add `box-shadow: 0 -4px 20px rgba(1, 18, 33, 0.15);`.
* **Step 1.3:** Update `.bottom-nav__item`. Change the default color to match unselected SideNav items: `color: rgba(247, 251, 255, 0.7);`.
* **Step 1.4:** Update `.bottom-nav__item.active`. Change the active color to the brand orange: `color: #ff9f1c;`.
* **Step 1.5:** Remove or adjust the `[data-theme='dark']` overrides for the bottom nav so it retains the green gradient in both modes, ensuring brand consistency.

## Phase 2: Global - Top Bar Initials Avatar
**Objective:** Replace the generic profile icon in the mobile top bar with a dynamic avatar showing the user's initials (e.g., Zeus Bautista -> ZB).
* **Step 2.1:** Open `src/components/common/MobileTopBar.jsx`.
* **Step 2.2:** Import `useAuthContext` from your auth context path.
* **Step 2.3:** Add a helper function inside or above the component to extract initials. It should take the user's `user_metadata?.full_name` or `email`. Split by space, take the first letter of the first and last word, and capitalize them. Fallback to "U" if no name exists.
* **Step 2.4:** Replace the `<IoPersonCircleOutline />` icon with a `div` containing the extracted initials.
* **Step 2.5:** Open `src/components/common/MobileTopBar.css`. Style the new initials div (e.g., `.mobile-avatar`): `width: 36px; height: 36px; border-radius: 50%; background: #f18f01; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; letter-spacing: 1px;`.

## Phase 3: Progress Page - Mobile History Toggle
**Objective:** Hide the history list by default on mobile views to save space, and add a "History" button to toggle its visibility. Ensure styling matches the app.
* **Step 3.1:** Open `src/pages/main/ProgressPage.jsx`.
* **Step 3.2:** Add a new state: `const [showMobileHistory, setShowMobileHistory] = useState(false);`.
* **Step 3.3:** Just before the `<div className="progress-history-sidebar">`, render a mobile-only button container. The button should say "View History" (or "Hide History") and toggle the state. 
* **Step 3.4:** Conditionally render the contents of the history sidebar based on `showMobileHistory` OR add a dynamic CSS class like `.history-visible` to the wrapper.
* **Step 3.5:** Open `src/pages/main/ProgressPage.css`. Style the new toggle button to match the `activity-action-btn` or secondary buttons (e.g., `background: #2d5a27; color: white; border-radius: 12px; width: 100%; padding: 12px; font-weight: 700; margin-top: 16px; display: none;`).
* **Step 3.6:** In the mobile media query (`@media (max-width: 1024px)`), set the toggle button to `display: block;`. Inside the same media query, ensure the `.progress-history-sidebar` collapses (e.g., `display: none`) unless the `.history-visible` class is present.

## Phase 4: Home (Activity) Page - Map Scrolling Fixes
**Objective:** Fix the deeply broken scroll bounds on the Skyward Journey map so users can scroll normally without getting stuck at the top or scrolling into a bottomless void.
* **Step 4.1:** Open `src/components/journey/SkywardJourney.css`.
* **Step 4.2:** Target `.skyward-journey-map-viewport`. The hardcoded `height: 100vh` causes conflicting scroll bounds on mobile. Inside a `@media (max-width: 768px)` query, change this to `height: calc(100dvh - 160px);` (accounting for the TopBar and BottomNav).
* **Step 4.3:** Target `.skyward-journey-column`. Reduce `padding-bottom: 140px;` to `padding-bottom: 60px;` for mobile screens to prevent the "super deep scroll down" void.
* **Step 4.4:** Open `src/pages/main/ActivityPage.css`. Ensure `.activity-content-wrap--journey-scroll` does not force `height: 100vh` on mobile. Change it to `height: 100%; min-height: 100%;` in the mobile media query.

## Phase 5: Home (Activity) Page - Collapsible Map Header
**Objective:** Make the `MapHeaderCard` collapsible on mobile devices so it doesn't take up half the screen. Tap to hide everything except the "Phase" title, tap again to expand.
* **Step 5.1:** Open `src/components/journey/SkywardJourney.jsx`.
* **Step 5.2:** Add state: `const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(isMobile);`. (Ensure it updates if `isMobile` changes).
* **Step 5.3:** Update the `<MapHeaderCard>` element. Add an `onClick` handler: `onClick={() => isMobile && setIsHeaderCollapsed(!isHeaderCollapsed)}`. Add a `cursor: pointer` inline style or class if `isMobile` is true.
* **Step 5.4:** Conditionally wrap the descriptions, pagination buttons (`Prev/Next`), and skip notices. If `isMobile && isHeaderCollapsed`, render *only* the `<HeaderTitle>` (perhaps with a small Chevron down icon to indicate it can expand). 
* **Step 5.5:** If `!isHeaderCollapsed` (or if it's desktop), render the full content as it currently exists. Add a smooth CSS transition to the height/padding of the card in `SkywardJourney.css`.

## Phase 6: Learn (Frameworks) Page - Pagination Position
**Objective:** Stop the pagination controls from floating awkwardly and overlapping content/navigation on mobile.
* **Step 6.1:** Open `src/pages/main/FrameworksPage.css`.
* **Step 6.2:** Locate `.fh-pagination-wrap`. Currently, it is `position: fixed`. 
* **Step 6.3:** Add a media query for mobile: `@media (max-width: 768px)`.
* **Step 6.4:** Inside the query, target `.fh-pagination-wrap` and override the fixed positioning to restore it to the normal document flow. Use: `position: relative; left: auto; bottom: auto; transform: none; margin: 24px auto; width: 100%; display: flex; justify-content: center;`.
* **Step 6.5:** Ensure the parent container (`.fh-page`) has enough `padding-bottom` (e.g., `100px`) so the pagination isn't covered by the new `BottomNav`.