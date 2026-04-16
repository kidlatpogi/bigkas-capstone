# Bigkas Mobile-Responsive & Capacitor Migration Plan

This plan is optimized for execution using an AI IDE like Cursor. You can copy and paste individual phases as prompts to generate the exact code needed.

## Phase 1: CSS Framework & Breakpoint Setup
**Objective:** Establish a strict mobile-first foundation using standard breakpoints and an 8px spacing grid.
* **Step 1.1:** Update `src/styles/globals.css` (or `mobileViewport.css`) to define explicit media query variables.
    * `--bp-sm: 360px` (Small mobile / baseline)
    * `--bp-md: 768px` (Tablet / Desktop transition point)
    * `--bp-lg: 1024px` (Standard desktop)
    * `--bp-xl: 1440px` (Large display)
    * `--bp-2k: 2000px` (Ultra-wide)
* **Step 1.2:** Define global CSS utility classes for the 8px spacing system (e.g., `p-8`, `m-16`, `gap-8`) to ensure all touch targets and margins are consistent across devices.

## Phase 2: Mobile Top Navigation (`MobileTopBar.jsx`)
**Objective:** Create the fixed header for mobile views.
* **Step 2.1:** Create `src/components/common/MobileTopBar.jsx`.
* **Step 2.2:** Style the component with `position: fixed`, `top: 0`, `z-index: 50`, full width, and standard 16px (2x8px) padding.
* **Step 2.3:** Add the "Bigkas" text/logo aligned to the flex-start (left).
* **Step 2.4:** Add a Profile Icon aligned to the flex-end (right), wrapped in a touchable area (min 48x48px), linking directly to `ROUTES.PROFILE`.

## Phase 3: Mobile Bottom Navigation (`BottomNav.jsx`)
**Objective:** Replace the hamburger menu with standard bottom tabs.
* **Step 3.1:** Create `src/components/common/BottomNav.jsx`.
* **Step 3.2:** Style with `position: fixed`, `bottom: 0`, `z-index: 50`, full width. Include `padding-bottom: env(safe-area-inset-bottom)` to prevent overlap with iOS/Android gesture bars.
* **Step 3.3:** Implement a horizontal flex layout with even distribution (`justify-content: space-around`).
* **Step 3.4:** Map the following navigation items in this exact order:
    1.  Dashboard (`ROUTES.DASHBOARD`)
    2.  Progress (`ROUTES.PROGRESS`)
    3.  Home (`ROUTES.ACTIVITY`)
    4.  Learn (`ROUTES.FRAMEWORKS`)
    5.  Settings (`ROUTES.SETTINGS`)

## Phase 4: Layout & Routing Refactor
**Objective:** Dynamically switch between Desktop and Mobile navigation based on breakpoints.
* **Step 4.1:** In `src/routes/AppRouter.jsx` (or a dedicated Layout wrapper), import `MobileTopBar` and `BottomNav`.
* **Step 4.2:** Completely remove references to `MainMobileMenu.jsx`.
* **Step 4.3:** Implement CSS or a React hook (like `useMediaQuery` checking `max-width: 767px`) to conditionally render:
    * **If < 768px:** Render `MobileTopBar` and `BottomNav`. Add `padding-top` and `padding-bottom` to the `main-content` to prevent content from hiding behind the fixed bars.
    * **If >= 768px:** Render the existing `SideNav`.

## Phase 5: Capacitor Initialization
**Objective:** Wrap the Vite React app into a native mobile project.
* **Step 5.1:** Run dependency installations: `npm i @capacitor/core` and `npm i -D @capacitor/cli`.
* **Step 5.2:** Initialize Capacitor: `npx cap init Bigkas org.nationalu.bigkas`.
* **Step 5.3:** Update `capacitor.config.ts` to ensure `webDir` is set to `"dist"`.
* **Step 5.4:** Install and add platforms: `npm i @capacitor/android @capacitor/ios`, then `npx cap add android` and `npx cap add ios`.

## Phase 6: Hardware Permissions Configuration
**Objective:** Ensure the native shell has OS-level permission to use the camera and microphone.
* **Step 6.1 (Android):** Open `android/app/src/main/AndroidManifest.xml` and add `<uses-permission>` tags for:
    * `android.permission.CAMERA`
    * `android.permission.RECORD_AUDIO`
    * `android.permission.MODIFY_AUDIO_SETTINGS`
* **Step 6.2 (iOS):** Open `ios/App/App/Info.plist` and add string usage descriptions for:
    * `NSCameraUsageDescription` (e.g., "Bigkas requires camera access to analyze facial expressions and gestures.")
    * `NSMicrophoneUsageDescription` (e.g., "Bigkas requires microphone access to record and analyze your speech.")

## Phase 7: MediaPipe Native Optimization
**Objective:** Prevent Capacitor WebViews from failing due to external CDN blocks or offline issues.
* **Step 7.1:** Download the WASM files and `.task` models (Face Landmarker and Gesture Recognizer) from their respective CDNs.
* **Step 7.2:** Place these files in the Vite `public/models/` directory so they are bundled into the `dist` folder.
* **Step 7.3:** Refactor `src/hooks/useVisualAnalysis.ts`: Change the `VISION_WASM_CDN`, `FACE_MODEL_CDN`, and `GESTURE_MODEL_CDN` variables to point to your new local relative paths (e.g., `/models/face_landmarker.task`).

## Phase 8: UI Polish & Capacitor Testing
**Objective:** Final mobile-first adjustments before building the APK/AAB.
* **Step 8.1:** Check `UserAnalyzingPage` and `SessionDetailPage`. Ensure the `<video>` element for the camera feed uses `object-fit: cover` and scales properly down to the `360px` breakpoint without breaking the flex layout.
* **Step 8.2:** Audit the 1.0–5.0 diagnostic entry scale sliders/inputs to ensure they are touch-friendly (min 44px height).
* **Step 8.3:** Build the frontend (`npm run build`), sync Capacitor (`npx cap sync`), and test using Android Studio or Xcode.