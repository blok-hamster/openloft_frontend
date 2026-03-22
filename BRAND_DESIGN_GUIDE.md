# Brand Design & Colour Palette Guidelines

> Extracted from Figma Config 2024 landing page. Use this as a reference for visual identity, colour system, typography, and design principles.

---

## 1. Colour Palette

### Primary Colours

| Role | Hex | RGB | Description |
|------|-----|-----|-------------|
| **Background / Canvas** | `#C8CCC8` | `200, 204, 200` | Muted grey-green, cool neutral. Used as the main page background. |
| **Primary Dark** | `#1A1A1A` | `26, 26, 26` | Near-black. Used for typography, logo glyphs, and primary UI elements (buttons, nav). |

### Accent Colours

| Role | Hex | RGB | Description |
|------|-----|-----|-------------|
| **Pink / Lavender** | `#F5A0F0` | `245, 160, 240` | Vibrant pastel pink-magenta. Used for large geometric shapes and backgrounds. |
| **Coral / Orange** | `#F47A4A` | `244, 122, 74` | Warm saturated coral-orange. Used as a secondary accent in illustrations. |
| **Forest Green** | `#0A5C3A` | `10, 92, 58` | Deep, rich green. Used for large sweeping arcs/dome shapes. |
| **Electric Blue** | `#1A2EE6` | `26, 46, 230` | High-saturation cobalt blue. Used sparingly as a pop accent in geometric details. |
| **Vivid Green** | `#2EA82E` | `46, 168, 46` | Bright mid-green. Used as a small accent triangle, complementing the forest green. |

### Neutral / UI Colours

| Role | Hex | Usage |
|------|-----|-------|
| **White** | `#FFFFFF` | Button text on dark fills, small UI highlights |
| **Off-Black** | `#1A1A1A` | Text, icons, borders, pill buttons |
| **Mid Grey** | `#8A8E8A` | Subtle dividers, secondary text |

---

## 2. Colour Usage Rules

- **Background**: Always the muted grey-green (`#C8CCC8`). Never pure white or pure black.
- **Text**: Always near-black (`#1A1A1A`) on the light background. High contrast, no mid-greys for body text.
- **Accents**: Use the 5 accent colours **boldly and at large scale** — they appear in oversized geometric shapes, not as small UI dots or badges.
- **Hierarchy**: Dark elements dominate the top/typography zone; vivid colours dominate the illustration/visual zone below.
- **Restraint**: Each accent colour is used in **one or two large areas** only. Avoid scattering accents across many small elements.

---

## 3. Typography

### Font Family
- **Typeface**: Custom monospaced / geometric sans-serif (similar to **GT America Mono**, **Space Mono**, or **IBM Plex Mono**)
- **Fallback stack**: `'Space Mono', 'IBM Plex Mono', 'Courier New', monospace`

### Type Characteristics
- **All caps** for navigation, labels, dates, and meta text
- **Tracking**: Wide letter-spacing (`0.05em–0.12em`) throughout
- **Weight**: Medium to Bold for headings; Regular for body/meta text
- **Size scale**:
  - Meta/nav text: `11–13px`
  - Subheadings: `14–16px`
  - Hero logotype: Extremely oversized, fills the full viewport width

### Type Colour
- All text is `#1A1A1A` (near-black) on the grey background
- Button text is `#FFFFFF` on dark pill buttons

---

## 4. Logo / Wordmark

- **Style**: Custom display typeface with extreme geometric abstraction — each letter is a distinct modular shape (circles, stars, rounded rectangles, arcs).
- **Colour**: Solid `#1A1A1A` on the grey canvas. Strictly monochrome.
- **Scale**: Massive — the wordmark spans the full width of the viewport, acting as both branding and visual centrepiece.
- **Negative space**: The logo uses cutouts and holes within shapes (e.g., the "O" has a circular void, forms have diamond-shaped negative space).

---

## 5. Geometric / Illustration Style

### Shape Language
- **Primitive shapes only**: Circles, semicircles, triangles, rounded rectangles, arcs, domes
- **No outlines/strokes** — all shapes are solid filled blocks of colour
- **Overlapping layers**: Shapes stack and overlap to create depth (e.g., dome over dome, triangle in front of arc)
- **Scale**: Illustrations are oversized, bleeding off the edges of the viewport

### Composition Rules
- **Bilateral symmetry**: The main illustration is centred and symmetrical
- **Layered depth**: Background shape (green dome) → mid-ground (pink triangle) → foreground (orange arch) → detail (blue/green triangles)
- **Flat design**: No shadows, no gradients, no 3D effects. Pure flat colour.

---

## 6. Layout & Spacing

- **Grid**: Wide margins, generous whitespace
- **Alignment**: Left-aligned meta text (dates, location), right-aligned nav/CTAs
- **Vertical rhythm**: Clear separation between the info bar (top), logotype (middle), and illustration (bottom)
- **Full-bleed graphics**: The illustration section extends edge-to-edge, no padding

---

## 7. UI Components

### Buttons
- **Style**: Pill-shaped (fully rounded corners)
- **Fill**: `#1A1A1A` (dark)
- **Text**: `#FFFFFF`, uppercase, monospaced, small (`11–13px`), tracked out
- **Hover**: Consider subtle scale or opacity shift (no colour change)

### Navigation
- **Style**: Inline text links, uppercase monospaced
- **Decoration**: Dotted underline on interactive links
- **Colour**: `#1A1A1A`, no colour variation for links

### Dividers
- **Style**: Thin `1px` lines in `#1A1A1A` or mid-grey, used sparingly to separate sections

---

## 8. Design Principles Summary

| Principle | Description |
|-----------|-------------|
| **Bold & Geometric** | Use oversized, abstract geometric shapes as the primary visual language |
| **Flat & Solid** | No gradients, shadows, or 3D — pure flat colour blocks |
| **Monospaced Typography** | All text in a monospaced or geometric sans-serif, always uppercase for UI |
| **Restrained Palette** | 5 accent colours used boldly but sparingly, against a neutral grey ground |
| **High Contrast** | Near-black on grey-green for text; vivid colours reserved for illustration |
| **Playful Precision** | Organic, playful shapes composed with tight grid alignment and mathematical symmetry |
| **Generous Whitespace** | Let elements breathe; avoid clutter |

---

## 9. LLM Prompt Usage

When feeding this to an LLM for design generation, use this context:

```
Design style: Figma Config 2024 inspired. Flat geometric, bold oversized shapes, 
no gradients or shadows. Muted grey-green background (#C8CCC8), near-black text 
(#1A1A1A), with accent colours: pink (#F5A0F0), coral (#F47A4A), forest green 
(#0A5C3A), electric blue (#1A2EE6), vivid green (#2EA82E). Typography is 
monospaced, all-caps, widely tracked. UI uses pill buttons with dark fills. 
Illustrations use overlapping primitive shapes at large scale with bilateral 
symmetry.
```
