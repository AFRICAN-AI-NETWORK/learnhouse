# Mobile App - Stable State Checkpoint

## Core Navigation & Routing

- **Layout Framework**: Expo Router is used for file-based routing.
- **Root Layout (`app/_layout.tsx`)**: Wraps the entire app in the `<AuthProvider>` and defines the core stack (`index`, `auth/login`, and `(tabs)`). It also conditionally imports `ReactotronConfig.js` for debugging.
- **Tabs Layout (`app/(tabs)/_layout.tsx`)**: Utilizes `Tabs` from Expo Router. Contains three main tabs:
  - `index`: Home (Student Dashboard)
  - `courses`: Course Catalog
  - `referral`: Earn $4 (Referral Program)
  - `profile`: User Profile
- **Session Guards**: `index.tsx`, `courses.tsx`, and `referral.tsx` use a session guard `if (!session || !session.accessToken)` at the top level of their data fetching hooks to prevent unauthenticated data requests and infinite loading traps.

## Current Working Features

- **Expo & NativeWind/React Native setup**: Root layout configured, Reactotron wired up.
- **Navigation Flow**: Authentication check -> Public Landing Page -> Auth flow / Authenticated Tabs (Role-based).
- **Authentication**: JWT auth with secure storage, login, unified student/marketer/partner registration via separate screens. Session persistence works. Logout from Profile works.
- **Appearance (Light/Dark Mode)**: Fully dynamic Light/Dark/System appearance mode implemented globally with a real `ThemeContext`, persisting preferences in `AsyncStorage`. All 15+ screens support instant theme switching.
- **Dashboard (Home)**: Fetching enrolled courses & recent activity securely. Custom API helper injected with token headers.
- **Profile & Settings**: Grouped Account, Preferences, and Support list. Routing to Personal Information, Security, About AINA, and Help & Support screens. All independent settings screens are fully implemented.
- **User Settings (`/user-account/settings/general`)**: Fully functional form that fetches from `/api/v1/users/me` and updates with `PUT` gracefully handling name, email (disabled), phone, and bio.
- **API Interceptor (`services/api.ts`)**: Automatically attaches `Authorization: Bearer <token>` to outbound requests dynamically if a session exists.

## Data Fetching (Courses & Progress)

- The Home (`index.tsx`) and Courses (`courses.tsx`) screens fetch courses from the backend using the `/api/v1/courses/org_slug/${orgSlug}/page/1/limit/50` endpoint.
- Course progress and user runs are correctly populated using the `/api/v1/trail/` endpoint.
- The logic maps the course runs and computes progress correctly using the `s.complete` property (rather than `s.status`) from backend `TrailStep` data.
- Courses fully completed by the user accurately report a 100% progress state by checking if `run.status === 'STATUS_COMPLETED'`.
- "Continue Learning" functionality opens course deep-links into the web platform via `Linking.openURL()`, bridging the mobile gap to the web-based course viewer.

## Debugging

- **Reactotron**: Configured via `ReactotronConfig.js` at the root of the mobile folder. It is conditionally executed only when `__DEV__` is true and `Platform.OS !== 'web'` to prevent breaking the Expo web bundler. Log statements inside data fetchers use `console.log()` for universal compatibility across Native and Web platforms.

## Image/Media Handling

- **Thumbnails**: The backend returns the string identifier for course thumbnails (e.g., `course_ee0078f4..._thumbnail_...png`).
- **Dynamic Fetching**: These images are not hardcoded. They are fetched dynamically from the production server's media directory (`/content/orgs/{orgUUID}/courses/{courseUUID}/thumbnails/{fileId}`).

## Frontend Optimizations & UX Enhancements

- **Typography & Aesthetics**: Downscaled heading sizes to 16 for a more premium, structured layout. Adjusted hero banner illustrations with negative margins for visual pop, and updated image wrappers to ensure proper rounded edges (`borderRadius: Theme.borderRadius.lg`).
- **Dynamic Pricing**: Fetched accurate product subscription amounts to convert `is_paid` booleans to true monetary representations (e.g. `$20`, `$60`, `Free`).
- **Fetch Concurrency Fix**: Moved metadata and product price API requests to the end of the try block, inside a detached `Promise.all` loop. This resolves the React Native concurrency limits (4-6 connection pool) which was previously blocking the trails requests from resolving.

## Referral / Earn Tab Revamp

- **Design System Alignment**: Aligned `referral.tsx` with the updated JSON design specs, migrating action buttons and balance highlights from absolute black (`#000000`) to the designated primary blue (`Theme.colors.primary`).
- **Global Typography Softening**: Reduced the visual weight of main titles across all tabs (Home, Courses, Earn) by dropping `fontWeight: '800'` to `'700'` and `'700'` to `'600'`. Absolute black text (`#111827`, `#000000`) was softened to a modern dark grey (`Theme.colors.text` / `#0f172a`) to ensure a refined, premium feel without compromising legibility or existing functionality.

## Profile Tab Revamp & State Management

- **Appearance State**: Created a `ThemeContext` backed by `AsyncStorage` and `useColorScheme` to manage the app's Light/Dark/System theme preferences. Integrated `<ThemeProvider>` at the root `_layout.tsx`.
- **Profile Layout Redesign**: Rebuilt `profile.tsx` into categorized groups (`ACCOUNT`, `PREFERENCES`, `SUPPORT & ABOUT`) as per design constraints, incorporating corresponding icons from `lucide-react-native` while removing the generic heavy shadows.
- **Data Integration**: Integrated the `/api/v1/auth/me` endpoint in `profile.tsx` to actively fetch the student's personal information (first/last name, email, organization) to dynamically populate the Profile Summary card, leaving the authentication flow intact.

## Avatar Uploads & Global Session State

- **Image Upload Integration**: Implemented native and web-safe profile picture uploading using `expo-image-picker`.
- **Aggressive Compression**: Integrated `expo-image-manipulator` to automatically resize and compress images before upload, ensuring strict compliance with the backend's 2MB file limit and preventing 413 HTTP errors.
- **Global Session Synchronization**: Added an `updateSession` function to the `AuthContext` to ensure newly uploaded avatars and updated personal info instantly reflect across all tabs without requiring a manual refresh.
- **UUID Resolution Mismatch Fixed**: Updated the Home tab to actively fetch `/api/v1/users/profile` and construct media URLs using `user_uuid` instead of integer IDs to prevent 404 errors for media directories.

## Role-Based Access Control (RBAC) & Security

- **Admin/Instructor App Block**: Mobile app login securely intercepts users holding `admin` or `instructor` roles across any organization and strictly redirects them to the web dashboard, blocking mobile session creation to prevent accidental heavy administration inside the app.
- **Strict Mobile Roles**: Actively fetches the user's `/api/v1/users/session` during login to populate organizational roles. Strictly permits only `user` (Student) and `partner` roles into the mobile experience.
- **Marketer Clean-Up**: Removed the unauthenticated public Marketer Application form (`register-marketer.tsx`) from the mobile welcome flow to secure the role strictly for internal staff via backend administration. The active Marketer dashboard tab functionality within the logged-in app remains intact for authorized accounts.

## Partner Program & Aesthetic Fixes

- **2-Step Partner Wizard**: Completely rewrote the mobile `register-partner.tsx` into a 2-step wizard matching web parity. Added the new `organization_name` field explicitly to both the Web App form and Mobile App form, submitting natively to the `/api/v1/auth/signup` backend endpoints.
- **Backend Sync**: Executed an Alembic database migration to permanently add `organization_name` to the core `user` table.
- **Doodle Backgrounds**: Stripped out manual opacity overrides across all authentication screens (`login`, `register`, `verify-email`, `reset-password`, `forgot-password`) to let the new doodle background image reflect at its full natural brightness without washing out.

## Backend Optimizations & Stability

- **Connection Pool Exhaustion Fix**: Handed off blocking synchronous DB operations inside FastAPI `async def` routes to thread pools via `asyncio.get_running_loop().run_in_executor()`. This optimization was applied to both the Role-Based Access Control (`rbac.py`) layer and the Enterprise Audit Middleware (`audit.py`), significantly eliminating event loop starvation and preventing the 30-second database timeout errors when Instructors access their dashboard.
