# AINA UI Principles

## 1. Product Character

AINA should feel like a credible, modern learning platform.

The design should communicate:

- Trust
- Learning progress
- Professionalism
- Simplicity
- Accessibility
- African technology and education identity

Avoid visual patterns that make the product look like a generic AI-generated dashboard.

## 2. Content Before Decoration

Course content is the primary visual content.

Course thumbnails, titles, progress, lessons, duration, and actions should be easy to scan.

Do not add decorative elements that compete with learning content.

## 3. Do Not Turn Everything Into a Card

Cards are for grouping meaningful interactive or informational units.

Do not place a card inside another card unless the nesting has a clear information-architecture purpose.

Use whitespace and section headings to separate content.

## 4. Course Cards

Course cards should feel visually important.

Where course imagery exists:

- Let the thumbnail carry visual weight.
- Keep course metadata concise.
- Truncate long titles and descriptions gracefully.
- Keep the primary action obvious.
- Preserve consistent treatment between Home and Courses.
- Use the same course-card component wherever possible.

The mobile course-card treatment should remain visually related to the existing AINA web course cards.

## 5. Color

`#2563EB` is AINA's primary action color.

Use it for:

- Primary buttons
- Active navigation
- Progress
- Important links
- Selected states

Do not use blue simply because an element exists.

Secondary information should remain neutral.

Green, orange, purple, and other accents should communicate meaning rather than decoration.

## 6. Typography

Typography creates hierarchy.

Use stronger weight for:

- Screen titles
- Section titles
- Important course titles
- Primary metrics

Use regular weight for supporting information.

Do not make every label bold.

## 7. Spacing

Use the shared spacing tokens.

Avoid arbitrary spacing values unless the existing implementation requires a specific adjustment.

Visual rhythm should be consistent across all screens.

## 8. Borders and Elevation

Prefer subtle borders and restrained elevation.

Avoid:

- heavy shadows
- excessive outlines
- glowing effects
- excessive floating surfaces

## 9. Empty States

Empty states should look intentional.

They should answer:

- What is empty?
- Why is it empty?
- What can the user do next?

Use restrained icons and concise messaging.

Do not make empty states look like errors.

## 10. Loading States

Prefer skeleton placeholders for content-heavy lists and cards.

Use spinners for short, localized actions.

Avoid leaving a large empty screen with a lone spinner when the structure of the expected content is known.

## 11. Navigation

Bottom navigation should remain stable across the main student experience.

Tabs:

- Home
- Courses
- Earn $4
- Profile

The active tab uses AINA blue.

Inactive tabs use neutral gray.

Navigation transitions should be quick and subtle.

## 12. Screen Transitions

Use a consistent transition model.

### Main tabs

Switching between Home, Courses, Earn $4, and Profile should feel immediate.

Prefer:

- instant content replacement, or
- a very short fade/opacity transition.

Do not use large horizontal slide animations between primary tabs.

### Detail screens

Course detail, settings, referral details, and similar screens may use a standard forward navigation transition.

Use the platform's native-feeling transition where possible.

### Modal/overlay content

Use a bottom sheet or modal transition only when the interaction is genuinely modal.

### Authentication

Login, registration, verification, marketer application, and partner application should use a coherent forward/back navigation pattern.

Do not animate every element independently.

## 13. Responsive Behavior

Never reproduce a reference image using fixed coordinates.

The reference image defines:

- hierarchy
- visual relationships
- component composition
- styling
- content priority

The implementation must determine actual dimensions from the device.

## 14. Accessibility

Maintain:

- readable contrast
- usable touch targets
- clear focus/pressed states
- support for dynamic text where the existing architecture allows it
- meaningful accessibility labels for icons and actions

## 15. AI Implementation Rule

An AI coding agent must inspect the existing implementation before creating new components.

It should prefer:

1. Reuse
2. Refactor
3. Extend
4. Create new components only when necessary

Never rewrite working functionality merely to reproduce a visual reference.
