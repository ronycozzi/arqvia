# Arqvia Design Context

Arqvia is a premium architecture, construction and interiors website whose public experience converts high-value enquiries and whose private admin supports content and lead operations.

## Visual Thesis

- Editorial architecture, not a generic SaaS layout.
- Graphite proof surfaces alternate with quiet paper content bands.
- Real project imagery is the primary visual asset; bronze is a controlled action and metadata accent.
- Public typography pairs Newsreader for display with Manrope for readable body copy.
- Admin uses Manrope throughout for faster scanning.
- Corners remain square and elevation stays restrained.

## Core Tokens

- Background: `#eef0eb`
- Paper: `#fbfaf7`
- Ink: `#1c211d`
- Graphite: `#141815`
- Bronze: `#84572f`
- Bronze light: `#d3a26b`
- Olive: `#4e5d52`
- Error: `#b42318`
- Premium shadow: `0 24px 64px rgb(26 30 27 / 0.11)`
- Motion: 180ms / 420ms / 680ms with `cubic-bezier(0.16, 1, 0.3, 1)`

## Interaction Rules

- Motion should clarify entry, hierarchy or state. It must never move the hero with the pointer.
- Respect `prefers-reduced-motion` and preserve final-state visibility.
- Mobile controls need at least 44px targets and no horizontal page overflow.
- The floating conversion bar appears after opening content and disappears near the footer.
- Before/after media must show the same room from a comparable viewpoint.

## Must Keep

- Arqvia naming and Spanish/English support.
- Clean, unobstructed hero photography.
- Contextual quote and WhatsApp actions.
- Proof-led projects, services, process, testimonials and local SEO.
- Private, role-aware admin navigation and actions.

## Avoid

- Public wording such as template, demo, editable, placeholder or implementation notes.
- Background grids, architectural line overlays and technical callout lines over photography.
- Shine effects, pointer parallax and aggressive scroll animation.
- Rounded pill-heavy patterns, nested decorative cards and generic centered hero layouts.
- Decorative gradients or graphics without a clear information or brand role.

## Current Decisions

- Refine stable public sections instead of redesigning them without evidence.
- Prioritize mobile admin content with disclosures and tactile horizontal metric rows.
- Keep complete operational depth visible on desktop.
