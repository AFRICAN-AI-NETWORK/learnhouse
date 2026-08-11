# AINA Mobile App Design System

This directory defines the visual and interaction rules for the AINA React Native / Expo mobile application.

## Purpose

Use these files as the source of truth when refining or implementing AINA mobile screens:

- `home.json` — Home screen structure and implementation requirements.
- `design-tokens.json` — Shared visual tokens.
- `ui-principles.md` — Design rules and quality standards.
- `navigation.json` — Tab navigation, screen transitions, and interaction behavior.
- `references/` — Approved visual reference images.

## Implementation Rules

1. Inspect the existing codebase before changing UI.
2. Reuse existing components, data, navigation, assets, and logic where possible.
3. Follow the design tokens instead of creating arbitrary visual values.
4. Treat the reference images as visual direction, not fixed pixel coordinates.
5. Build responsive layouts using React Native layout primitives.
6. Do not use absolute positioning for normal page layout.
7. Preserve existing functionality unless a UI change explicitly requires otherwise.
8. Do not introduce unnecessary dependencies.
9. Keep the mobile experience visually consistent with the AINA web application while adapting the layout appropriately for mobile.
10. Do not make every section a card. Use hierarchy, whitespace, dividers, and grouping where appropriate.

## Screen Design Priority

The mobile experience should prioritize:

1. Current learning action
2. Course discovery
3. Progress and achievement
4. Clear navigation
5. Referral/reward actions
6. Secondary information

## Visual Direction

AINA uses a clean, professional learning-platform aesthetic built around:

- White surfaces
- AINA blue `#2563EB`
- Dark navy text
- Restrained accent colors
- Strong course imagery
- Clear typography
- Generous but controlled spacing
- Subtle borders/elevation
- Minimal decoration

The UI should feel intentionally designed rather than generated from a generic mobile template.

## Validation

After implementing a screen:

- Compare it with its reference image.
- Check small-screen readability.
- Check horizontal overflow.
- Check safe-area behavior.
- Check that the bottom navigation does not cover content.
- Check loading, empty, error, and populated states.
- Check that all navigation transitions remain functional.
