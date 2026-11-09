# Supabase authentication foundation

This branch adds an initial Supabase Auth gate to the existing single-page application.

## Configuration
- `supabase-config.js` contains the project URL and browser-safe publishable key.
- The publishable key is expected to be public. Never add a Supabase `service_role` key or any secret to browser code.

## Integration status
- Email/password sign-in: implemented in `auth.js`.
- Email signup: implemented; requires email confirmation if enabled in Supabase Auth.
- Password reset email: implemented.
- Session persistence and refresh: configured through Supabase JS.
- Sign-out: implemented.
- Existing client/project/time-entry CRUD: NOT yet migrated to Supabase. The legacy app still uses localStorage after login.
- Existing local data import: NOT yet implemented.
- Timer persistence: NOT yet migrated to database.
- This is a development branch. Do not merge to production until end-to-end tests pass.

## Supabase Auth dashboard
1. Authentication → URL Configuration.
2. Add the exact GitHub Pages URL to the allowed redirect URLs:
   `https://aheidingsfeld-rgb.github.io/freelanceflow3/`
3. Configure email confirmation and a production SMTP provider before public launch.
4. Test signup, confirmation, login, reset and logout with a test account.

## Current limitation
The legacy app's rendering functions and data writes still need a dedicated migration to Supabase tables. The auth gate prevents unauthenticated access to the UI, but it does not by itself turn localStorage records into cloud data. RLS remains the actual database security boundary.
