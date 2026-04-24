# Design System: Bigkas (Modern Organic Edition)
---

## Color Palette & Roles

### Brand Colors (The Green Gradient)
* **Emerald Primary (#059669):** The primary brand signature. Used for main CTAs and active navigation states.
* **Mint Accent (#34D399):** Used for highlighting progress, success states, and soft background accents.
* **Deep Forest (#064E3B):** Used for high-contrast branding, heavy-duty buttons, or logos on light backgrounds.

### Backgrounds (Canvas)
* **Paper White (#FDFDF9):** The main application background. A warm, off-white that reduces eye strain during practice.
* **Soft Sage (#E8EFEA):** The secondary "Section" color. Used to group related content or provide a visual break.

### Text & Neutrals
* **Slate Navy (#1E293B):** The "Modern Black." Used for all primary body text and headings for a softer, premium contrast.
* **Pure White (#FFFFFF):** Used for text on top of Emerald/Forest buttons and card surfaces.

---

## Typography Rules (Mobile Industry Standards)
*Note: Letter-spacing is set to 'normal' or slightly positive for Fredoka to emphasize its rounded, friendly nature.*

| Role | Font Family | Size | Weight | Line Height |
| :--- | :--- | :--- | :--- | :--- |
| **App Bar / Logo** | Fredoka | 22px | 600 (Semi-Bold) | 1.2 |
| **Section Heading** | Fredoka | 28px | 600 (Semi-Bold) | 1.3 |
| **Sub-Heading** | Fredoka | 20px | 500 (Medium) | 1.4 |
| **Body (Primary)** | Nunito | 16px | 400 (Regular) | 1.6 |
| **Body (Small/UI)** | Nunito | 14px | 400 (Regular) | 1.5 |
| **Button Text** | Fredoka | 16px | 500 (Medium) | 1.0 |

---

## Component Stylings

### Buttons (Pill Design)
* **Primary CTA:** Background `#059669` | Text `#FFFFFF`. Full rounded corners (height/2 or 999px).
* **Secondary Action:** Background `#E8EFEA` | Text `#064E3B`. Pill shape.
* **High-Priority (Record):** Background `#064E3B` | Text `#FFFFFF`. Large centered pill for the main interaction.

### Navigation (The Mobile Bar)
* **Surface:** `#FFFFFF` with a subtle top-border `1px solid #E8EFEA` or a soft elevation.
* **Height:** 56px (Standard Android/iOS reachability).
* **Icons:** 24px centered with `#1E293B` (Inactive) to `#059669` (Active).

### Cards & Feedback Containers
* **Surface:** `#FFFFFF`.
* **Border:** None.
* **Shadow:** `rgba(30, 41, 59, 0.05) 0px 4px 12px` (Ultra-subtle Slate shadow).
* **Radius:** 24px (Consistent with the rounded Fredoka aesthetic).

---

## Layout Principles
* **The 16pt Grid:** All margins and paddings follow a base-8 or base-16 system (16px side margins for mobile).
* **Organic Grouping:** Use the **Soft Sage (#E8EFEA)** background to wrap sections like "Today's Lessons" or "Your Progress Stats."
* **Vertical Momentum:** Content flows vertically with a minimum of 32px spacing between distinct logical blocks.

---

## Do’s and Don'ts

### Do
* Use **Fredoka** for anything that needs to "speak" to the user (Headings, Buttons, Labels).
* Ensure the **Paper White (#FDFDF9)** remains the dominant background color to keep the app feeling light.
* Maintain the **Pill shape** for all interactive elements—avoid sharp or slightly rounded (8px) corners.

### Don't
* Don't use **Nunito** for headings; it is strictly for high-readability body text.
* Don't use pure black (#000000); always use **Slate Navy (#1E293B)** for text.
* Don't clutter the screen; if in doubt, add 8px more padding.