# UI/UX Refinement Prompt

You have full access to this React Native/Expo codebase. I want you to act as a senior Product Designer and Senior Mobile Frontend Engineer, not just a UI generator.

Your goal is to redesign and refine the existing UI to achieve the level of polish found in apps like **Coursera**, **Notion**, **Linear**, and **Stripe**, while maintaining the AINA brand identity and existing functionality.

## Important Rules

Do **not** redesign the app from scratch.

Do **not** introduce unnecessary animations or trendy UI elements.

Do **not** guess values such as spacing, padding, margins, font sizes, border radius, elevations, icon sizes, or component dimensions.

Instead:

- Inspect the entire codebase.
- Audit the design system currently being used.
- Identify inconsistencies.
- Adjust values only where necessary.
- Reuse existing design tokens whenever possible.
- If design tokens do not exist, create a consistent design system and migrate components to use it.

The final result should feel intentionally designed by a professional product designer rather than AI-generated.

---

# Overall Design Goal

The application should feel:

- Premium
- Professional
- Modern
- Minimal
- Educational
- Trustworthy

The experience should resemble Coursera's design philosophy rather than a generic mobile template.

Use whitespace, typography, hierarchy and composition instead of excessive decoration.

---

# Perform a Complete UI Audit

Inspect every screen and identify areas where visual quality can be improved.

Pay attention to:

- Typography
- Visual hierarchy
- Layout consistency
- Spacing consistency
- Component consistency
- Border radius usage
- Elevation and shadows
- Icon consistency
- Color usage
- Alignment
- Information architecture
- Empty states
- Loading states

Fix inconsistencies throughout the application.

---

# Reduce the "AI Generated" Look

Currently the UI feels like it was produced by an AI app generator.

Identify everything contributing to that impression and improve it.

Examples include (but are not limited to):

- excessive rounded rectangles
- cards nested inside cards
- every section enclosed inside containers
- inconsistent spacing
- lack of visual hierarchy
- uniform component styling
- overly decorative layouts
- too much use of borders
- overuse of the primary brand color
- insufficient whitespace

Where appropriate, simplify layouts rather than adding more visual elements.

---

# Improve Layout Hierarchy

Review every screen individually.

Determine whether each section actually needs a card.

Many modern educational apps rely on whitespace instead of surrounding every piece of information with containers.

Reduce unnecessary visual noise.

Only elevate elements that deserve emphasis.

---

# Typography

Inspect the typography system.

Improve:

- font hierarchy
- font weights
- line height
- spacing between headings and body text
- readability
- scanability

Ensure every page has a clear hierarchy between:

- page titles
- section titles
- card titles
- body text
- captions
- metadata

Avoid making everything bold.

---

# Spacing System

Inspect all spacing values.

Create a consistent spacing system if one does not already exist.

Avoid arbitrary values.

Ensure spacing is visually consistent across:

- cards
- buttons
- lists
- sections
- headers
- navigation
- forms

---

# Component Consistency

Audit every reusable component.

Examples include:

- cards
- buttons
- chips
- inputs
- navigation
- badges
- avatars
- progress indicators
- settings rows
- statistics components

Ensure they all follow the same design language.

---

# Color Usage

Preserve the AINA brand colors.

However:

Do not use the primary blue everywhere.

Primary colors should communicate emphasis.

Use neutral surfaces and typography for most of the interface.

Reserve blue for:

- primary actions
- active navigation
- links
- progress
- selected states

Review the balance between:

- white
- neutral gray
- primary blue
- accent colors

Reduce unnecessary visual competition.

---

# Shadows and Elevation

Inspect every card and surface.

Where appropriate, replace heavy borders with subtle elevation.

Use shadows sparingly and consistently.

Avoid flat-looking interfaces while also avoiding excessive depth.

---

# Icons

Audit all icons.

Ensure:

- consistent icon family
- consistent stroke weight
- consistent sizing
- consistent alignment

Review icon color usage across the application.

---

# Dashboard

Review the home/dashboard screen.

Determine whether the current hero section is the best presentation.

If necessary:

- simplify it
- improve hierarchy
- improve information density
- reduce unnecessary containers

The dashboard should prioritize:

- continuing learning
- featured courses
- recommendations
- learning progress

instead of decorative UI.

---

# Course Catalog

Review the course listing experience.

Improve discoverability.

Review:

- search
- categories
- filtering
- empty states
- loading states
- course cards

Course cards should become the visual focus of the application.

---

# Referral Screen

Simplify the referral page.

Reduce nested containers.

Improve hierarchy.

Ensure the referral code is immediately noticeable.

Present statistics in a cleaner and more readable manner.

---

# Profile Screen

Review the profile screen.

Reduce unnecessary visual weight.

Group settings logically.

Improve readability.

Make the settings experience resemble premium productivity apps rather than a generated settings page.

---

# Navigation

Audit the bottom navigation.

Review:

- spacing
- icon alignment
- typography
- active state
- inactive state
- touch targets

Ensure navigation feels polished.

---

# Loading States

Replace generic loading indicators wherever appropriate.

Use skeleton loaders for lists and cards.

Loading should feel integrated into the interface rather than appearing as an isolated spinner.

---

# Background Usage

The subtle doodle background should not be applied indiscriminately.

Evaluate where decorative backgrounds improve the experience and where they distract from content.

If necessary, limit decorative backgrounds to authentication, onboarding, or other appropriate screens while allowing content-heavy screens to rely on clean neutral surfaces.

---

# Accessibility

Review:

- contrast ratios
- touch target sizes
- readability
- dynamic text compatibility
- screen spacing

Improve accessibility without sacrificing aesthetics.

---

# Refactoring

Where beneficial:

- extract repeated UI into reusable components
- consolidate duplicate styles
- create reusable design tokens
- simplify styling logic
- improve maintainability

Avoid unnecessary rewrites.

---

# Final Objective

By the end of this refinement:

- The app should immediately feel handcrafted rather than AI-generated.
- Every screen should feel cohesive.
- The design language should be consistent across the entire application.
- The UI should feel comparable to a professionally designed learning platform like Coursera while remaining distinctly AINA through its branding, color palette, and educational identity.
- Preserve all existing functionality unless a UI-related change is clearly beneficial to the user experience.
