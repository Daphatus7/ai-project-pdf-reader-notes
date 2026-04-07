# Atlas Notebook — Design System

A single source of truth for visual decisions on the landing page and beyond.
Reference this before writing any new UI — if a value isn't here, add it here first.

---

## Colors

| Role | Value | Usage |
|------|-------|-------|
| Primary | `#006aff` | CTAs, links, active states, accents |
| Primary dark | `rgb(0, 64, 153)` | CTA gradient endpoint |
| Foreground | `rgb(15, 23, 43)` | H1, body text, high-contrast labels |
| Background | `bg-card` (Tailwind CSS var) | Page background, section default |
| Surface | `bg-secondary` / `bg-secondary/30` | Alternating section backgrounds |
| Border | `border-border` (Tailwind CSS var) | All borders, dividers |
| Muted text | `text-muted-foreground` | Subtitles, captions, eyebrow labels |

Do not hardcode background or border colors — always use the Tailwind CSS vars so dark
mode works without changes.

---

## Gradients

```css
/* CTA buttons (hero, CTA section) */
background-image: linear-gradient(74.7176deg, rgb(0, 106, 255) 0.60002%, rgb(0, 64, 153) 103.57%);

/* H1 heading gradient — dark navy to brand blue */
background-image: linear-gradient(90deg, rgb(15, 23, 43) 0%, #006aff 100%);

/* Footer logo icon */
background-image: linear-gradient(135deg, rgb(49, 65, 88) 0%, rgb(67, 45, 215) 100%);
```

The H1 gradient requires:
```tsx
style={{
  backgroundImage: "linear-gradient(90deg, rgb(15, 23, 43) 0%, #006aff 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
}}
className="bg-clip-text text-transparent"
```

---

## Typography

| Element | Tailwind classes | Notes |
|---------|-----------------|-------|
| H1 | `text-4xl sm:text-5xl md:text-6xl font-bold` | With gradient (see above) |
| H2 | `text-4xl md:text-5xl font-bold` | Section headings |
| H3 | `text-2xl font-semibold` | Feature row titles, media row titles |
| Body large | `text-lg md:text-xl text-muted-foreground` | Hero subtitle |
| Body | `text-base text-muted-foreground leading-relaxed` | Section copy |
| Eyebrow | `text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground` | Section labels above H3 |
| Caption | `text-sm text-muted-foreground` | Footer, small labels |

**Font stack:** Inter (system default). Flagged for future replacement with a more
expressive typeface once the product is post-launch.

---

## Spacing Scale

| Use | Value |
|-----|-------|
| Section vertical padding (standard) | `py-20` (80px) |
| Section vertical padding (large) | `py-24` (96px) |
| Hero vertical padding | `py-16` |
| Max content width — prose | `max-w-4xl` |
| Max content width — media rows | `max-w-5xl` |
| Max content width — full bleed | `max-w-7xl` |
| Container horizontal padding | `px-4` |
| Gap between feature row number and text | `md:gap-16` |
| Gap between media row image and text | `gap-12` |

---

## Component Rules

### Cards
Only use `<Card>` / border-box styling when the card IS the interaction (clickable,
contains a form, etc.). Never use decorative card grids to display feature lists.

### Icons
Inline with text only. Never alone inside circles or boxes as decoration.
The `LucideZap`, `LucideSigma`, `LucideMousePointer` pattern in the hero feature pills
is the correct use.

### Badges and pills
Hero feature pills only. Use real semantic icons that describe the feature.
Not for decoration. Not for nav items.

### Border radius
| Element | Value |
|---------|-------|
| Cards, images, video wrappers | `rounded-xl` |
| Feature pills | `rounded-full` |
| Buttons | `rounded` or `rounded-xl` (hero CTAs use `rounded-xl`) |
| Input fields | `rounded-lg` |

### Buttons
Two variants:
1. **Primary CTA** — gradient background (see Gradients), `text-primary-foreground`, `rounded-xl`, `px-8 py-4`
2. **Secondary** — transparent, `border border-border`, `hover:border-[#006aff] hover:text-[#006aff]`, `rounded-lg`

No ghost buttons. No outline-only CTAs on white backgrounds — they disappear.

---

## Layout Patterns

### Section rhythm
Sections alternate background:
```
Hero          → bg-card (default)
PainPoint     → bg-card / bg-secondary (driven by scroll progress)
Features      → bg-secondary/30
How It Works  → bg-card (default)
Pricing       → bg-card (default)
CTA           → bg-card with border-t border-border
Footer        → bg-secondary
```

### Feature rows
Numbered 01/02/03, left-aligned:
```tsx
<div className="py-10 flex flex-col md:flex-row md:items-start gap-6 md:gap-16">
  <span className="text-5xl font-bold text-muted-foreground/25 leading-none shrink-0 w-16">01</span>
  <div>
    <h3 className="font-semibold text-xl text-foreground mb-2">Title</h3>
    <p className="text-muted-foreground leading-relaxed max-w-lg">Description</p>
  </div>
</div>
```

### Media rows (How It Works)
Alternating left/right, media at 3/5 width on desktop:
```tsx
{/* Row with media on left */}
<div className="flex flex-col md:flex-row items-center gap-12">
  <div className="w-full md:w-3/5 rounded-xl border border-border overflow-hidden shrink-0">
    {/* img or video */}
  </div>
  <div className="flex flex-col gap-4">
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Eyebrow</p>
    <h3 className="font-semibold text-2xl text-foreground leading-snug">Title</h3>
    <p className="text-base text-muted-foreground leading-relaxed">Description</p>
  </div>
</div>

{/* Row with media on right — use md:flex-row-reverse */}
<div className="flex flex-col md:flex-row-reverse items-center gap-12">
  ...
</div>
```

---

## Accessibility Baseline

- All `<section>` landmark content wrapped in `<main>`
- `<nav>` has `aria-label="Main navigation"`
- Decorative elements (progress dots, icon-only dividers) have `aria-hidden="true"`
- Minimum touch target: 44x44px for interactive elements
- `prefers-reduced-motion`: sticky scroll animations must have a static fallback
- Color contrast: verify `text-muted-foreground` at `text-[11px]` meets 4.5:1

---

## AI Slop Blacklist

Patterns banned from this codebase:

| Pattern | Why banned |
|---------|-----------|
| 3-column card grid for feature lists | Generic, looks template-generated |
| Dark gradient CTA section (navy → purple background) | Overused SaaS template pattern |
| Icon in a colored circle | Decoration without meaning |
| "Powered by AI" badges | Empty claim, noise |
| Nav links to nonexistent pages | Broken trust signal |
| Unsupported superlatives ("most reliable", "state-of-the-art") | Marketing fluff |
| Testimonials with no real user attribution | Fake social proof erodes trust |
