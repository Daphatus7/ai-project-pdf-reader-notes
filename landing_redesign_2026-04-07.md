# Landing Page Full Redesign Plan

**Branch:** dev-ai-slop
**Date:** 2026-04-07
**Status:** DRAFT — under design review

## Context

60-70 page interactions but only 1-2 signups (1.5-3% conversion). Diagnosis from
/office-hours + /design-review:
- 6 AI slop patterns fixed (3-column card grid, dark gradient CTA, dead nav links, etc.)
- 3 high-impact conversion issues remain: no product screenshot, no social proof, H1 gradient invisible
- Positioning gap: page doesn't clearly answer "why this vs ChatGPT with better formatting?"

## Target User

Engineering students and researchers who do the screenshot → ChatGPT →
Notion-formatting-breaks loop daily. Pain: equations, tables, and AI output
don't paste cleanly into note-taking tools.

## Positioning (one-liner)

"Stop copy-pasting equations. Ask your PDF anything — formulas, tables,
and code land perfectly in your notes."

---

## Section-by-Section Redesign Plan

### 1. Hero Section (PRIORITY: HIGH — conversion bottleneck)

**Current state:**
- H1: "You didn't spend years studying just to copy-paste and fix formatting." (good)
- Subtitle: 3 lines, awkward concatenation from i18n strings
- CTA: "Try for free →" (good)
- Feature pills: 3 icons (screenshot, formulas, macros)
- H1 gradient: navy (rgb 15,23,43) → dark indigo (rgb 49,44,133) — imperceptible on white

**Problems:**
1. No product screenshot — visitors can't see what they're signing up for
2. H1 gradient is effectively invisible (both colors are near-black)
3. Subtitle concatenates i18n strings with no separator — reads as one long run-on

**Plan:**
- Fix H1 gradient: change endpoint to `#006aff` (the brand blue) so the gradient is visible
- Rewrite subtitle in source to a single sentence with clear line break
- Add product screenshot below the CTA buttons, full-width with a subtle border
- Screenshot source: `/demo.png` already exists in `public/` and is used below

**File:** `src/frontend/pages/landing-page/landing-page.tsx`

---

### 2. Social Proof (NEW SECTION — between hero and pain points)

**Current state:** None.

**Problem:** New product with 0 visible users. No trust signal at all.
Visitors have no reason to believe this works for anyone besides the builder.

**Plan:**
Add a minimal social proof band between the hero and the pain point scroll section.
Options (choose one):
- A) Simple counter: "Join 100+ students and researchers"
  - Works even with low numbers. Honest. Easy to increment.
  - Risk: if number is too small, erodes trust instead of building it
- B) Quote strip: 1-2 short quotes from real use (even builder's own)
  - More concrete than a number
  - Risk: "testimonials" from 1 user look fake
- C) University/institution logos (if applicable)
  - Only if builder has actual institutional affiliation

**Recommended:** A (counter) with honest number, or skip entirely until 10+ real users.
"No social proof" is better than "fake social proof."

**File:** `src/frontend/pages/landing-page/landing-page.tsx` (new section)

---

### 3. Pain Point Section — MOVE AFTER FEATURES (IA Decision)

**Decision made:** Move pain point section to after the features section.
New page order: Hero → Social Proof → Features (01/02/03) → Pain Points → How It Works → Pricing → CTA

Rationale: visitors need to see the product before committing to a 700vh emotional scroll.
The pain points work better as REINFORCEMENT after the product reveal, not as a GATE before it.

**Implementation:** Reorder sections in `landing-page.tsx`:
```
<HeroSection />
<SocialProofBand />        {/* new */}
<FeaturesSection />         {/* id="product" */}
<PainPointSection />        {/* MOVED from before features */}
<HowItWorksSection />
<PricingSection />
<CTASection />
<Footer />
```

### 3-OLD. Pain Point Section (original notes — superseded by above)

**Current state:** 700vh Apple-style sticky scroll with 4 slides:
- Slide 0: "Most of your note-taking time isn't actually note-taking."
- Slide 1: Pain list (switching tabs, copy-pasting, retyping formulas, fixing formatting)
- Slide 2: "That's not thinking. That's busywork."
- Slide 3: "Atlas is built for one thing. The fastest path from reading to knowing." + CTA

**Assessment:** Good. Keep as-is. The 700vh is a bold commitment but intentional —
the sticky scroll reveal makes it feel premium.

**Minor issues:**
- The CTA in slide 3 links to `/signup` — ensure it matches hero CTA styling
- 700vh before features/pricing means heavy users see the product late in the scroll
---

### 4. Features Section (RECENTLY FIXED — numbered rows 01/02/03)

**Current state:** After /design-review, using clean numbered list layout.
Content pulled from i18n `t.features.*` strings.

**Plan:** No structural changes. Review copy for specificity:
- Step 1 (Screenshot) — should mention PDF specifically, not "any section"
- Step 2 (AI answers) — should mention equations/LaTeX specifically
- Step 3 (Notes) — should mention formatting preservation specifically

**File:** i18n strings in `src/frontend/i18n/`

---

### 5. How It Works — Alternating Rows

**Current state:**
- Row 1: `/demo.png` (left, the the function screen show) + "Document Q&A — Reading PDFs made easy"
- Row 2: `/an.mp4` (right workflow screen shot, showing supporting tables and formulas) + "Rich Output — Formulas, tables, any LLM output" (FIXED typo)

**Problems:**
- Row 1 copy: "powered by XAI Collection — State of Art Q&A — Most reliable answers you can get" — marketing fluff, not specific
- "State of Art" is a grammatical error (should be "State of the Art")
- Row 2 has a video but it's unclear if `/an.mp4` demonstrates the formatting feature clearly

**Plan:**
- Fix "State of Art" → "State-of-the-Art"
- Rewrite Row 1 description to be specific: name the use case (research papers, textbooks)
- Remove "Most reliable answers you can get" — unsupported claim

**File:** `src/frontend/pages/landing-page/landing-page.tsx` lines 260-290

**Specific copy fixes:**
- "powered by XAI Collection — State of Art Q&A — Most reliable answers you can get"
  → "Select any passage. Ask anything. Atlas uses Grok — XAI's frontier model — for answers."
- Remove the unsupported claim ("Most reliable answers you can get")

---

### 6. Pricing Section

**Current state:** Separate `PricingSection` component with Free and Pro tiers.

**Known issue (from /office-hours):** $15/month pricing may not cover API costs when
using reasoning models. Unit economics problem unresolved.

**Design plan (not cost plan):**
- Ensure "Free tier" limitations are crystal clear (what tokens/queries per month?)
- Ensure "Pro tier" value is obvious (unlimited? priority models?)
- Add "No credit card required" under the free CTA

**File:** `src/frontend/pages/landing-page/pricing.tsx`

---

### 7. Navigation (RECENTLY FIXED — now Product + Pricing only)

**Current state:** After /design-review, stripped to 2 working links + Login + Try for Free.

**Assessment:** Clean. No changes needed.

---

### 8. CTA Section (RECENTLY FIXED — clean bordered section)

**Assessment:** Good after /design-review. No changes needed.

---

### 9. Footer (RECENTLY FIXED — grid-cols-3)

**Remaining issue:** All footer links (`#roadmap`, `#docs`, `#api`, `#blog`, `#status`,
`#security`, `#contact`) still point to nonexistent anchors. Should either:
- Remove them until the pages exist
- Convert to placeholder pages (404 is better than broken anchor)

---

### 10. Mobile Experience (UNTESTED)

**Status:** Not reviewed. The page uses Tailwind responsive classes (`md:` breakpoints)
but mobile layout has not been visually verified.

**Plan:** Run /qa or /design-review with mobile viewport after above changes ship.

---

## Responsive & Accessibility (Pass 6 addition)

### Known mobile issues (pre-implementation)

**PainPointSection — 700vh on mobile:**
- 700vh ≈ 5,180px of scrolling on a 390px iPhone. This is a large commitment. No user research
  on whether mobile visitors scroll through it. Monitor scroll depth via analytics.
- Progress dots: `width: 5px / height: 5px` — purely decorative, no touch targets needed.
  But they're the only progress signal. On mobile screens they'll be ~2mm — barely visible.
  Add `aria-hidden="true"` since they're decorative. No accessibility requirement to fix the size.
- The scroll progress math (`getComputedStyle(...).overflowY`) correctly finds the
  `overflow-y-auto` container. Verified — the sticky scroll will work on mobile.

**`prefers-reduced-motion` — not handled:**
- The sticky scroll reveal drives opacity + translateY animations on every scroll tick.
- Users with vestibular disorders (affected by motion) have no fallback.
- Fix in `pain-point-section.tsx`: check `window.matchMedia('(prefers-reduced-motion: reduce)')`.
  If true, show all 4 slides statically stacked (no animation), remove sticky wrapper.
- This is a WCAG 2.3.3 (AAA) issue, but also basic craft. Should be in the implementation.

**H1 text at `text-5xl` on narrow screens:**
- `text-5xl` = 3rem on 320px screens. Two-line heading at 3rem may be fine,
  but `heading2` line length depends on i18n string length (Chinese vs English).
  Add `sm:text-4xl` as safety: `text-4xl sm:text-5xl md:text-6xl`.

**Autoplay video (`/an.mp4`) — no `prefers-reduced-motion` check:**
- `autoPlay loop muted playsInline` — the muted+loop combination means it autoplays on iOS.
  Add: `className="w-full block"` already exists; but wrap the `<video>` to respect
  `prefers-reduced-motion` by pausing via JS ref, or conditionally rendering a poster image.
  Lower priority than PainPoint fix.

### Accessibility gaps

| Issue | Severity | File | Fix |
|-------|----------|------|-----|
| No `<main>` landmark | Moderate | `landing-page.tsx` | Wrap main content in `<main>` |
| Footer dead anchors (`#roadmap` etc.) | Minor (for a11y) | `landing-page.tsx:334-361` | Remove or `disabled` style |
| PainPoint progress dots need `aria-hidden` | Minor | `pain-point-section.tsx:128-141` | Add `aria-hidden="true"` to dots wrapper |
| No `aria-label` on `<nav>` | Minor | `landing-page.tsx:60` | Add `aria-label="Main navigation"` |
| Eyebrow text at `text-[11px]` | Minor | multiple | 11px may fail 4.5:1 at small size — verify contrast |
| Autoplay video, no motion preference | Low | `landing-page.tsx:234-241` | Conditionally pause on reduced-motion |

### What this means for implementation order

Add to implementation order (after current list):
- Step 9: Add `<main>` landmark + `aria-hidden` to progress dots + `aria-label` to nav
- Step 10: Add `prefers-reduced-motion` fallback to PainPointSection
- Step 11: Mobile review with 390px viewport (iPhone) + 768px (iPad)

---

## Interaction States (Pass 2 addition)

The plan had no interaction state specs. Landing page CTAs are the only user action —
they need to handle errors gracefully.

| Feature | What user sees |
|---------|----------------|
| "Try for free" → /signup | Link navigation, no loading state needed (React Router) |
| Language toggle | Instant switch, no loading. If i18n fails, fall back to English silently |
| Pricing "Get Started Free" → /signup | Same — link, no loading state |
| Pricing "Subscribe" → checkout | Uses `usePayment` hook — add loading spinner on button, disabled state during API call |

**Gap identified:** The `startCheckout` function in `pricing.tsx` has no visual loading state
on the button. If Stripe/payment initialization takes >200ms, the button appears frozen.
Add to implementation: disable button + show loading indicator during `startCheckout`.

---

## Typography Decision

**H1 gradient:** Current is `rgb(15,23,43) → rgb(49,44,133)` — both near-black.
Options:
- A) `rgb(15,23,43) → #006aff` — dark navy to brand blue. Visible, on-brand.
- B) `rgb(0,0,0) → rgb(49,44,133)` — true black to indigo. More dramatic.
- C) Remove gradient entirely. Solid `text-foreground`. Cleaner.

**Recommendation:** A. Makes the gradient earn its keep without going off-brand.

**Specific value (Pass 4 decision):**
```css
/* H1 gradient — dark navy to brand blue */
background-image: linear-gradient(90deg, rgb(15, 23, 43) 0%, #006aff 100%);
```
This makes the gradient visible: starts near-black, ends at the brand accent color.

---

## Design System — CREATE BEFORE IMPLEMENTING (Pass 5 decision)

Decision: Create `DESIGN.md` BEFORE implementing the redesign.

**Contents:**

```markdown
# Atlas Notebook — Design System

## Colors
- Primary: `#006aff` (brand blue — used for CTAs, links, accents)
- Primary dark: `rgb(0, 64, 153)` (CTA gradient endpoint)
- Foreground: `rgb(15, 23, 43)` (near-black — used for H1, body text)
- Background: `bg-card` (white/light)
- Surface: `bg-secondary` (alternating section background)
- Border: `border-border` (Tailwind CSS var)
- Muted text: `text-muted-foreground`

## Gradients
- CTA button: `linear-gradient(74.7176deg, rgb(0, 106, 255), rgb(0, 64, 153))`
- H1 heading: `linear-gradient(90deg, rgb(15, 23, 43) 0%, #006aff 100%)`

## Typography
- Font: Inter (system default — flag for future replacement with a more expressive typeface)
- H1: `text-5xl md:text-6xl font-bold`
- H2: `text-4xl md:text-5xl font-bold`
- H3: `text-2xl font-semibold`
- Body: `text-base md:text-lg` / `text-muted-foreground`
- Eyebrow: `text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`

## Spacing Scale
- Section vertical padding: `py-20` (80px) or `py-24` (96px)
- Max content width: `max-w-4xl` (prose), `max-w-5xl` (media rows), `max-w-7xl` (full)
- Container horizontal padding: `px-4`

## Component Rules
- Cards: only when card IS the interaction (no decorative card grids)
- Icons: inline with text only, never alone in circles as decoration
- Badges/pills: for feature highlights in hero only, with real icons
- Border-radius: `rounded-xl` for cards/images, `rounded-full` for pills, `rounded` for buttons

## Layout Patterns
- Section rhythm: alternating `bg-card` / `bg-secondary/30`
- Feature rows: numbered (01/02/03) left-aligned, not card grid
- Media rows: `md:flex-row` alternating left/right with `md:w-3/5` for media
```

**File to create:** `DESIGN.md` at repo root

---

## Implementation Order

1. Fix H1 gradient (typography) — 5 min
2. Fix "State of Art" typo and rewrite Row 1 copy — 5 min
3. Fix footer dead links — 10 min
4. Add product screenshot to hero — 15 min
5. Rewrite subtitle to single line — 10 min
6. Add social proof (only if honest user count available) — 15 min
7. Create DESIGN.md — 20 min
8. Mobile review — after above ships

---

## Unresolved Design Decisions (Pass 7)

These are open questions the plan raises but does not answer.
Each needs a decision before or during implementation.

### Decision 1: Social proof — skip or counter?

Plan says: "skip if fewer than 10 real users."

**Question:** Do you have any real users besides yourself?
- If yes (even 3-5): use a quote strip with real words, not a number
- If no: skip the section entirely. "No social proof" beats "fake social proof"
- **Recommended default: skip for now.** The hero fix + screenshot will do more.

### Decision 2: Footer dead links — remove or stub?

All footer links (`#roadmap`, `#docs`, `#api`, `#blog`, `#status`, `#security`, `#contact`)
point to nonexistent anchors.

Options:
- A) Remove them — cleaner, no broken expectations
- B) Remove the whole Resources column — the "Product" column already has Features + Pricing
- **Recommended: B.** Product-only footer until the pages exist. Two columns + company info.

### Decision 3: `/an.mp4` — does the video show what it needs to?

The plan flags "unclear if `/an.mp4` demonstrates the formatting feature clearly."
This needs a human judgment call. Watch the video. Ask: does a first-time visitor
understand in 5 seconds that AI output with LaTeX/tables lands perfectly in notes?
If not, replace it with a screen recording that shows exactly that flow.

### Decision 4: Free tier limits — what are they?

`pricing.tsx` renders free tier via `<PricingCards>` but the plan says "what tokens/queries
per month?" is unspecified. This is a conversion blocker. Visitors can't sign up for
"Free" without knowing what they get.

Check `src/frontend/features/pricing/PricingCards.tsx` — whatever it says, make sure
it's specific: "X PDFs per month" or "X AI queries per day", not "limited usage."

---

## Implementation Order (Final — after all passes)

1. Create `DESIGN.md` at repo root — 20 min
2. Fix H1 gradient → `linear-gradient(90deg, rgb(15, 23, 43) 0%, #006aff 100%)` — 5 min
3. Fix "State of Art" copy → "Select any passage. Ask anything. Atlas uses Grok — XAI's frontier model — for answers." — 5 min
4. Fix footer: remove Resources column (dead links), keep Product column + company info — 10 min
5. Add product screenshot to hero (below CTA, above feature pills) — 15 min
6. Rewrite subtitle to single sentence (fix i18n string concatenation) — 10 min
7. Reorder sections: `<PainPointSection>` moves after `<FeaturesSection>` — 5 min
8. Add loading state to `startCheckout` button in `pricing.tsx` — 15 min
9. Add `<main>` landmark + `aria-hidden` on progress dots + `aria-label` on nav — 10 min
10. Add `prefers-reduced-motion` fallback to `PainPointSection` — 20 min
11. Add `sm:text-4xl` to H1 for 320px safety — 2 min
12. Social proof: skip for now (revisit when real users available)
13. Mobile review at 390px + 768px after all above ships

---

## Success Criteria

- Conversion rate from page interactions to signups improves from ~1.5% to 5%+
- A visitor who sees only the hero section should understand what Atlas does
- The page should not look AI-generated (pass the AI slop blacklist)
- Zero broken anchor links
- PainPointSection works under `prefers-reduced-motion`
