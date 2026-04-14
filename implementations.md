# Dashboard Refactor Plan
Execute these steps sequentially. Do not stop until the entire list is complete.

# Phase 1: Profile and Setings Refractor

OBJECTIVE:
Resolve UI duplication between the Profile and Settings pages. Strictly categorize features based on standard SaaS Information Architecture. Adhere strictly to `@design.md` for all styling.

1. EXPLICIT REMOVALS (DO THIS FIRST):
- In `SettingsPage.jsx`, completely REMOVE the "Appearance" (Hide Theme Button) section.
- In `SettingsPage.jsx`, completely REMOVE the "Log Out" button from the Danger Zone (it already exists in the sidebar).
- Remove the redundant "Account" navigation links (Change Password, Account Settings, App Settings) from the `ProfilePage.jsx` layout.
- Remove the "Legal" links from `ProfilePage.jsx`.

2. PROFILE PAGE REFACTOR (`@src/pages/main/ProfilePage.jsx`):
- SCOPE: Strictly User Identity. 
- CONTENT: 
  * Avatar Display / Upload.
  * Form fields: First Name, Last Name, Nickname, Email Address.
  * Actions: 'Cancel' and 'Save Changes' (using Forest Green primary button).
- LAYOUT: Center this as the primary focal point using the cinematic layout rules from `@design.md`. Do not clutter this page with side-cards.

3. SETTINGS PAGE REFACTOR (`@src/pages/main/SettingsPage.jsx`):
- SCOPE: App Configuration, Security, and Destructive Actions.
- CONTENT CATEGORIES (Group into clean `<section className="dashboard-card">` containers):
  * SECURITY: Move "Change Password" here as a dedicated form or modal trigger.
  * HARDWARE: Microphone selector, Mic Sensitivity, Camera selector, and Test Audio/Video link.
  * LEGAL: Terms & Conditions, Privacy Policy links.
  * DANGER ZONE: "Clear Recordings" (Keep the red warning styling to maintain destructive friction).
- LAYOUT: Use a clean grid or stacked card layout with proper typographic hierarchy as defined in `@design.md`.

4. DESIGN ENFORCEMENT:
- Maintain the Forest Green (#5A7863) primary accents.
- Ensure all typography adheres to the SF Pro/Nunito optical sizing and tracking specified in `@design.md`.
- No floating or disconnected widgets. Keep margins and padding consistent with `ActivityPage.jsx`.

5. EXECUTION:
- Apply these structural changes, verify that no duplicate links exist across the two pages, commit, and push.

# Phase 2: ChangePasswordPage Refactor
Refactor the Change Password Page strictly align with `@designs.md` while stripping out redundant navigation elements.
1. CHANGE PASSWORD PAGE REFACTOR (`ChangePasswordPage.jsx`):
- EXPLICIT REMOVAL: Delete the "Back" button completely.
- THEMING: Strictly apply the design rules from `@designs.md`.
- COLORS: Force the main background to pure white (`#FFFFFF`). Use the primary Forest Green color (`#5A7863`) for all interactive elements, buttons, and accents.

# Phase 3: AccountSettingsPage Refactor
Refactor the Account Settings Page strictly align with `@designs.md` while stripping out redundant navigation elements.

1. ACCOUNT SETTINGS PAGE REFACTOR (`AccountSettingsPage.jsx`):
- EXPLICIT REMOVAL: Delete the "Back" button completely.
- THEMING: Strictly apply the design rules from `@designs.md`.
- COLORS: Force the main background to pure white (`#FFFFFF`). Use the primary Forest Green color (`#5A7863`) for all interactive elements, buttons, and accents.

# Phase 4: Commit and Push
1. COMMIT AND PUSH:
- Apply these structural changes, verify that no duplicate links exist across the two pages, commit, and push.
- Push the changes to the remote repository.
