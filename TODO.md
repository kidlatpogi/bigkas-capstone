# Bigkas Follow-Up Tasks

## Account Roles And Onboarding

- [x] Add Students/Users as part of the role model, not only Teachers/Admins.
- [x] Update role-based access planning so the three account levels are clearly represented:
  - Super Admin / Program Chair
  - Teacher / Admin
  - Student / User
- [x] Replace downloaded password lists with a safer onboarding flow.
- [x] Prefer sending account invite / create-password links only, so students create their own passwords and admins never see them.
- [x] Use Supabase invite links for account creation instead of generated temporary passwords.
- [ ] Confirm Supabase redirect URL settings for production account invite links.

## Supabase Email Experience

- [x] Redesign the emails sent from Supabase so they match Bigkas branding and are easier for students to understand.
- [x] Include templates for account invite / create password, password reset, email confirmation, and OTP verification.
- [x] Make sure account invite emails clearly explain the login email, create-password link, and what the student should do next.
- [ ] Paste the templates from `supabase/email-templates` into the Supabase Dashboard.
