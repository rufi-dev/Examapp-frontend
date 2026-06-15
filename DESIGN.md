# Design

Visual system for Imtahan Platforması. **Calm and focused**: a soft **indigo** signature (hue ~270) on cool, slate-tinted neutrals. Light and dark, fully toggleable. Editorial display headlines over a clean, legible body. All tokens are OKLCH; neutrals are tinted cool toward the indigo hue. (Earlier warm-coral direction was dropped per user feedback in favor of a calmer palette; see `src/index.css` for the authoritative token values.) The logged-in account area uses a left **sidebar** dashboard layout (`AccountLayout`), not a top tab bar.

## Theme

Dual theme, user-toggleable, persisted to `localStorage`, defaulting to the OS preference. Implemented with a `.dark` class on `<html>` and CSS custom properties that the Tailwind config consumes (so every utility resolves to a token, not a hard-coded color). Never `#000` / `#fff`.

Scene: a 17-year-old reviewing a failed mock at 11pm on their phone in a dim room, and the same student on a laptop in a bright classroom at noon. Both must feel warm and motivating, not clinical. Hence both themes are tinted warm and the accent stays vivid in each.

## Color

Strategy: **Committed** warm neutrals + **one electric signature accent** (coral). Semantics added only where meaning requires. One restrained secondary (violet) reserved for achievement/streak moments.

Tokens (light):

- `--bg`: oklch(0.975 0.008 70) — warm cream page
- `--surface`: oklch(0.995 0.004 80) — cards/sheets
- `--surface-2`: oklch(0.945 0.012 72) — sunken / subtle fills
- `--border`: oklch(0.90 0.013 68)
- `--text`: oklch(0.26 0.02 55) — warm near-black
- `--text-muted`: oklch(0.52 0.02 58)
- `--primary`: oklch(0.63 0.21 34) — electric coral (CTAs, active, accents)
- `--primary-hover`: oklch(0.58 0.22 32)
- `--primary-fg`: oklch(0.99 0.012 70) — text/icons on coral
- `--accent-2`: oklch(0.56 0.17 295) — violet, achievements only
- `--success`: oklch(0.70 0.15 150)
- `--warning`: oklch(0.80 0.15 78)
- `--danger`: oklch(0.585 0.21 25)
- `--ring`: --primary at 45% alpha

Tokens (dark):

- `--bg`: oklch(0.195 0.012 60)
- `--surface`: oklch(0.235 0.014 62)
- `--surface-2`: oklch(0.285 0.016 62)
- `--border`: oklch(0.34 0.016 60)
- `--text`: oklch(0.95 0.008 75)
- `--text-muted`: oklch(0.72 0.013 66)
- `--primary`: oklch(0.67 0.20 36)
- `--primary-hover`: oklch(0.72 0.20 38)
- `--primary-fg`: oklch(0.17 0.02 50)
- `--accent-2`: oklch(0.66 0.16 295)
- `--success`: oklch(0.74 0.15 152)
- `--warning`: oklch(0.82 0.15 80)
- `--danger`: oklch(0.66 0.20 27)
- `--ring`: --primary at 50% alpha

Usage: coral carries CTAs, the active nav state, progress fills, focus rings, and "correct" emphasis sparingly. Most surface area is warm neutral. Wrong answers use `--danger`, correct uses `--success`, always paired with an icon/label (never color alone).

## Typography

- **Display** (headlines, hero, section titles): `"Bricolage Grotesque"`, weights 600–800. Editorial, characterful, warm. Tight leading (1.0–1.1), slightly negative tracking at large sizes. MUST be verified to render Azerbaijani "ə/Ə"; fallback `"Fraunces"` then system serif if a glyph is missing.
- **Body / UI**: `"Inter"`, weights 400–600 (confirmed full Azerbaijani coverage), `feature-settings: 'cv05','ss01'` optional. Fallback `system-ui`.
- Scale: modular ~1.25. Body 16px base, ≤70ch measure. Display uses `clamp()` for fluid hero sizes (e.g. clamp(2.5rem, 6vw, 5rem)).
- Hierarchy via scale + weight (≥1.25 step ratio). No gradient text. Emphasis through weight/size, not effects.

Fonts loaded via Google Fonts `<link>` (preconnect) in index.html.

## Components

- **Buttons**: `primary` (solid coral, `--primary-fg` text, soft lift on hover), `secondary` (1px border + surface, text-strong), `ghost` (transparent, hover surface-2), `danger`. Radius ~0.7rem. Loading state shows inline spinner. Min height 44px on touch.
- **Inputs / fields**: label above, surface-2 fill or 1px border, coral focus ring (`--ring`), helper/error text below; error pairs red + message. Generous padding.
- **Cards**: 1px `--border` + soft warm shadow, radius ~1rem, varied sizes (not identical grids). No nested cards. Used only where grouping truly helps.
- **Badges / pills**: role (student/teacher/admin), exam status, correct/incorrect — color + icon/label.
- **Nav**: sticky top bar, wordmark left, primary links center/right, **theme toggle**, avatar menu. Mobile: slide-in sheet. Active link marked with coral.
- **Exam runner**: quiet light surface even in dark-by-default contexts, large readable question, clear option targets, persistent progress + countdown timer (timer turns `--danger` near the end), prev/next, flag, submit.
- **Result visuals**: a score ring (SVG, coral fill) and per-type breakdown bars; pass/fail framed encouragingly.

## Layout

- App container max-width ~1200px; landing uses full-bleed sections with internal max-width.
- Spacing is varied for rhythm (not uniform padding); section vertical rhythm generous (80–140px on landing, tighter in app).
- Mobile-first; grids collapse to single column; sticky exam controls on mobile.
- Cards are not the default wrapper. Lists, dividers, and whitespace carry most structure.

## Motion

- Ease-out only (quint/expo), 150–400ms. No bounce/elastic. Never animate layout properties; use transform/opacity.
- Hover: subtle 1–2px rise + shadow on interactive cards/buttons. Page/section reveals: short fade+rise. Score ring animates its stroke on result reveal.
- Everything behind `prefers-reduced-motion: reduce` (motion removed, states still legible).
