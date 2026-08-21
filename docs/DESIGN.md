---
name: Cinematic Editorial
colors:
  surface: '#181305'
  surface-dim: '#181305'
  surface-bright: '#3f3927'
  surface-container-lowest: '#120e03'
  surface-container-low: '#201b0c'
  surface-container: '#251f10'
  surface-container-high: '#2f2919'
  surface-container-highest: '#3b3423'
  on-surface: '#ede1c9'
  on-surface-variant: '#e6bdb9'
  inverse-surface: '#ede1c9'
  inverse-on-surface: '#36301f'
  outline: '#ad8885'
  outline-variant: '#5d3f3d'
  surface-tint: '#ffb3ad'
  primary: '#ffb3ad'
  on-primary: '#68000a'
  primary-container: '#ff5451'
  on-primary-container: '#5c0008'
  inverse-primary: '#c0001c'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#c6c6c7'
  on-tertiary: '#2f3131'
  tertiary-container: '#909191'
  on-tertiary-container: '#282a2a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad7'
  primary-fixed-dim: '#ffb3ad'
  on-primary-fixed: '#410004'
  on-primary-fixed-variant: '#930013'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#181305'
  on-background: '#ede1c9'
  surface-variant: '#3b3423'
typography:
  display-hero:
    fontFamily: Playfair Display
    fontSize: 120px
    fontWeight: '700'
    lineHeight: 110px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Playfair Display
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 60px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 64px
    fontWeight: '800'
    lineHeight: 72px
    letterSpacing: 0.05em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 32px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 28px
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.2em
spacing:
  container-max: 1440px
  gutter: 24px
  margin-desktop: 80px
  margin-mobile: 24px
  stack-xl: 120px
  stack-md: 48px
---

## Brand & Style
This design system is built on a foundation of high-contrast editorial storytelling. It blends the sophistication of luxury publishing with the immersive quality of nature photography. The personality is authoritative yet evocative, aiming to elicit a sense of wonder and deep focus. 

The aesthetic style is a hybrid of **Minimalism** and **High-Contrast Editorial**. It relies on aggressive whitespace, oversized typography, and a "dark mode by default" philosophy that allows vibrant photography and a singular accent color to command attention. Every interface element is designed to feel like a frame in a cinematic sequence.

## Colors
The palette is rooted in deep, atmospheric neutrals and parchment-inspired tones to provide a sophisticated canvas for high-resolution imagery. 

- **Primary:** A vibrant, high-energy Coral Red (#ff3b3f) used sparingly for critical calls to action and active indicators.
- **Surface & Neutral:** The foundation uses deep blacks and rich, desaturated sand tones (#d8cdb5). This warm neutral shift provides a more organic, paper-like quality to the dark mode, reducing harshness while maintaining high contrast.
- **Functional:** Secondary elements utilize deep charcoals (#1a1a1a) and pure whites (#ffffff) to manage hierarchy and legibility against the warm neutral accents.

## Typography
Typography is the primary structural element of the design system. It uses a high-contrast pairing of a sophisticated serif for narrative headlines and a clean, technical sans-serif for functional data and body copy.

- **Display Text:** Large-scale serif type should be used for evocative titles. It can be mixed with sans-serif "pre-headers" or "sub-headers" to create a complex, layered hierarchy.
- **Rhythm:** Use generous line heights for body text to maintain the "breathable" feel of a premium magazine.
- **Labels:** Small caps with wide letter spacing are used for navigation, categories, and UI metadata to provide a sense of precision.

## Layout & Spacing
The layout follows a **Fluid Grid** model with significant vertical "breathing room." 

- **Vertical Rhythm:** Sections are separated by large "stack" intervals (120px+) to ensure each piece of content is consumed in isolation.
- **Alignment:** Content is often center-aligned for hero moments but utilizes a 12-column grid for complex layouts, often leaving several columns empty to create intentional asymmetry.
- **Mobile Reflow:** On mobile, margins reduce significantly, and large display type scales down while maintaining its characteristic weight. Stacked elements transition to a single-column vertical flow.

## Elevation & Depth
This design system avoids traditional shadows in favor of **Tonal Layers** and **Luminance Contrast**.

- **Depth:** Depth is achieved through the layering of text over high-contrast imagery. Use subtle dark overlays on images to ensure text legibility.
- **Interactive States:** Instead of raising an element with a shadow, interactive states should be signaled through color shifts (e.g., button fill changing from transparent to primary red) or slight scaling.
- **Overlays:** Use high-blur backdrops for any modal or navigation overlay to maintain the sense of the environment behind the UI.

## Shapes
The shape language is strictly **Sharp**. 

Rectilinear forms emphasize the architectural and editorial nature of the design. Buttons, input fields, and image containers should maintain 90-degree corners. The only exception to this rule is circular iconography or play buttons, which serve as organic focal points within the rigid grid.

## Components
Consistent component styling reinforces the premium editorial feel:

- **Buttons (Primary):** Solid `#FF3B3F` fill, white uppercase sans-serif text, sharp corners. No border.
- **Buttons (Secondary):** Semi-transparent background (e.g., `rgba(255,255,255,0.1)`) with a white border or simply a ghost-style button.
- **Navigation:** Top-aligned, minimal. Active states are indicated by a small primary-colored dash above or below the text.
- **Inputs:** Underline-only or very thin bordered boxes, using the same sharp-edged language.
- **Pagination Indicators:** Vertical lines or dots on the screen edge to indicate scroll progress, using low-opacity white with a primary-colored active state.
- **Social Links:** Vertical orientation on the left margin, utilizing thin icons to minimize visual weight.

## Motion & Animation

Motion is the heartbeat of the Cinematic Editorial experience. Every transition should feel intentional — like a camera cut or a title card dissolving into the next scene. Gratuitous animation is noise; purposeful animation is storytelling.

### Design Principles
- **Intentional, not decorative.** Every animation must communicate something — a state change, a spatial relationship, a moment of focus.
- **Cinematic pacing.** Use slower, ease-out curves for reveals (the "camera settling") and snappier ease-in-out for interactive feedback (the "reaction").
- **Stagger for depth.** When multiple elements enter together, stagger them 60–100ms apart to create a sense of choreography rather than a wall of content appearing at once.
- **Respect `prefers-reduced-motion`.** All animations must degrade to instant `opacity: 1` / `transform: none` when the user has reduced-motion enabled.

### Timing & Easing Tokens
| Token | Value | Use Case |
|---|---|---|
| `--ease-reveal` | `cubic-bezier(0.16, 1, 0.3, 1)` | Scroll-triggered reveals, page entries |
| `--ease-interactive` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Hovers, toggles, button presses |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful bounces — rating badges, toast notifications |
| `--duration-fast` | `150ms` | Micro-interactions (hover color, focus ring) |
| `--duration-normal` | `300ms` | Standard transitions (modals, dropdowns) |
| `--duration-slow` | `600ms` | Scroll-triggered reveals, page transitions |
| `--duration-cinematic` | `1000ms` | Hero reveals, first-load sequences |
| `--stagger-step` | `80ms` | Delay increment for staggered child animations |

### Scroll-Triggered Reveals (Intersection Observer)
Elements should animate in as they enter the viewport, creating a "cinematic scroll" effect:

- **Fade-Rise:** Element fades from `opacity: 0` + `translateY(40px)` to resting position. Default for text blocks, cards, stat tiles.
- **Fade-Slide:** Element fades from `opacity: 0` + `translateX(±60px)`. Used for side-by-side comparisons, head-to-head panels.
- **Scale-Reveal:** Element scales from `0.9` to `1.0` with opacity. Reserved for hero images, leaderboard spotlight cards.
- **Clip-Reveal:** A `clip-path: inset()` wipe that reveals content like a curtain. Reserved for section dividers and hero headlines.
- **Staggered Cascade:** Children within a container reveal sequentially with `--stagger-step` delay. Used for leaderboard rows, stat grids, tournament bracket rounds.

**Trigger threshold:** `0.15` (element 15% visible before animation fires).  
**Trigger once:** `true` by default — elements animate in and stay. No re-triggering on scroll-back unless explicitly designed (e.g., parallax layers).

### Page Transitions
Route changes should feel like scene cuts, not page reloads:

- **Enter:** New page content fades in with a subtle rise (`translateY(16px)` → `0`) over `--duration-slow` with `--ease-reveal`.
- **Exit:** Outgoing content fades to `opacity: 0` over `200ms`. No spatial movement on exit — keep it clean.
- **Skeleton shimmer:** While data loads, show pulsing skeleton blocks using a horizontal gradient sweep (`background-position` animation). The shimmer gradient should use `surface-container` → `surface-container-high` → `surface-container`, repeating over `1.5s`.

### Number & Rating Counters
Live data should feel alive:

- **Count-Up Animation:** When a rating, stat, or leaderboard number first enters the viewport, it counts up from `0` (or from the previous known value) to its current value over `800ms` with `--ease-reveal`. Numbers should tick at a visually pleasing rate (not one digit at a time — interpolate the full value smoothly).
- **Rating Delta Flash:** When a rating changes (e.g., after match approval), the delta briefly flashes in green (`+Δ`) or red (`-Δ`) with a scale-up → settle animation (`1.0` → `1.3` → `1.0` over `500ms` with `--ease-spring`).
- **Category Badge Morph:** When a player crosses a category threshold, the badge text cross-fades (old text fades out, new text fades in) and the badge background color transitions over `400ms`.

### Hero & First-Load Sequence
The homepage hero should have a choreographed entrance on first load:

1. **Frame 0–400ms:** Background gradient/image fades in.
2. **Frame 200–800ms:** Pre-header label slides down from `translateY(-20px)` with fade.
3. **Frame 400–1200ms:** Main headline uses a per-word stagger, each word fading up with `60ms` delay between words.
4. **Frame 800–1400ms:** Body text fades in.
5. **Frame 1000–1600ms:** CTA buttons scale in with `--ease-spring`.
6. **Frame 1200–1800ms:** Scroll indicator (chevron or line) pulses into view.

This sequence runs once per session (use `sessionStorage` to skip on subsequent visits).

### Ambient & Continuous Animations
Subtle always-on motion that makes the interface feel alive without distracting:

- **Glow Pulse:** The primary CTA button's box-shadow gently pulses (`0 0 0 0` → `0 0 20px 4px rgba(255, 59, 63, 0.15)`) on a `3s` infinite cycle. Subtle enough to catch attention without being annoying.
- **Gradient Drift:** Section backgrounds with gradients should have a very slow `background-position` drift (cycle over `15–20s`), creating a living, breathing feel.
- **Floating Particles:** On the hero section and leaderboard spotlight, render a sparse canvas-based particle field — 15–25 small circles (`2–4px`, `rgba(255, 179, 173, 0.08)`), drifting upward at `0.2–0.5px/frame`. They evoke energy and competition. Cap at 20 particles on mobile for performance.
- **Live Indicator Pulse:** Any "live" or "active" status dot uses a concentric-ring pulse (`scale(1)` → `scale(2.5)` with `opacity: 1` → `0`), repeating every `2s`.

### Loading & State Transitions
- **Spinner:** A single thin ring (`border-2`) using `surface-container-highest` as the track and `primary` as the active arc, spinning at `0.8s` per revolution. Sharp-cornered (no `border-radius` on the outer element — only the ring itself is round).
- **Toast Notifications:** Slide in from the top-right with `translateY(-100%)` → `0` + fade, auto-dismiss after `4s` with a shrinking progress bar along the bottom edge.
- **Success Checkmark:** After form submission (e.g., match submitted), draw an SVG checkmark path over `400ms` using `stroke-dashoffset` animation, accompanied by a brief scale-bounce of the container.

## Interactive Effects

### Cursor-Aware Tilt (Desktop Only)
Cards on the leaderboard, player profile spotlights, and stat tiles should respond to cursor position:

- Track `mousemove` relative to the card center.
- Apply a subtle `perspective(800px) rotateX(±3deg) rotateY(±3deg)` transform based on cursor offset.
- Add a radial gradient highlight overlay that follows the cursor position (`rgba(255, 179, 173, 0.06)` center, transparent edges).
- Use `transition: transform 0.15s ease-out` for smooth tracking, and `transition: transform 0.4s ease-out` on `mouseleave` for a gentle settle-back.
- **Mobile:** Disabled entirely. No tilt on touch devices.

### Magnetic Buttons
Primary CTA buttons should have a "magnetic pull" effect:

- When the cursor enters a `60px` proximity zone around the button, the button nudges toward the cursor by `4–6px` (using `translate`).
- On `mouseleave`, the button springs back to origin with `--ease-spring`.
- On `click`, the button briefly compresses (`scale(0.96)` → `1.0` over `150ms`).

### Hover Micro-Interactions
| Element | Hover Effect |
|---|---|
| **Nav links** | Underline grows from center (`width: 0` → `100%`, `--duration-fast`) using a `::after` pseudo-element |
| **Leaderboard rows** | Background brightens to `surface-container-high`, row shifts right by `4px` |
| **Player cards** | Subtle lift (`translateY(-4px)`) + box-shadow fade-in |
| **Stat tiles** | Number text color transitions to `primary` (#ff3b3f) |
| **Buttons (ghost)** | Border color transitions from `outline-variant` to `primary-soft` |
| **Buttons (primary)** | Background shifts from `#ff3b3f` to `#e02b2f`, shadow intensifies |
| **Rating badge** | Gentle scale bounce (`1.0` → `1.05` → `1.0` with `--ease-spring`) |
| **Profile avatar** | Ring glow appears (2px `primary-soft` border with `box-shadow`) |

### Parallax Layers
The homepage hero section uses subtle depth parallax (scroll-linked, not mousemove):

- **Background layer** (image/gradient): Scrolls at `0.4×` the page scroll speed.
- **Midground layer** (headline text): Scrolls at `0.7×`.
- **Foreground layer** (CTA buttons, scroll indicator): Scrolls at `1.0×` (normal).
- Implementation via `transform: translateY(calc(var(--scroll-y) * <rate>))` updated on `requestAnimationFrame`.
- **Mobile:** Parallax disabled. Static positioning only — parallax on mobile is a performance and UX anti-pattern.

### Scroll Progress Indicator
A thin `2px` horizontal bar fixed to the top of the viewport, using `primary` color, that fills from `0%` to `100%` width as the user scrolls down the page. Visible only on long-scrolling pages (leaderboard, player profile with history). Uses `scaleX()` transform for GPU-accelerated rendering.

### Performance Guardrails
- All animations must use **compositor-only properties** where possible: `transform`, `opacity`, `clip-path`. Avoid animating `width`, `height`, `margin`, `padding`, `top/left`.
- Canvas particle effects must use `requestAnimationFrame` and pause when the tab is not visible (`document.hidden`).
- On devices reporting `prefers-reduced-motion: reduce`, replace all motion with instant state changes.
- On mobile, cap particle count at 20, disable parallax and cursor-aware tilt, and reduce stagger counts to max 5 items.